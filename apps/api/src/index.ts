import 'dotenv/config';
import express from 'express';
import { prisma } from './prisma';
import cookieParser from 'cookie-parser';
import { requireAuth, AuthenticatedRequest } from './middleware/requireAuth';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auditQueue } from './queue';
import { adminOnly } from './middleware/adminOnly';
import { getStripe } from './stripe';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { ReportGenerator } from './services/reportGenerator';
import { CSVExporter } from './services/csvExporter';
import { AnalyticsService } from './services/analyticsService';

interface Suggestion {
  type: string;
  message: string;
}

console.log('Starting API server...');
const app = express();
const port = process.env.PORT || 4001;

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.get('/api/tier', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tier = await prisma.tier.findUnique({ where: { id: user.tierId } });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    // Calculate all-time usage
    const auditsUsed = await prisma.usageLog.count({
      where: { userId: user.id, auditId: { not: null } },
    });
    const tokensUsedAgg = await prisma.usageLog.aggregate({
      where: { userId: user.id },
      _sum: { tokensUsed: true },
    });
    const tokensUsed = tokensUsedAgg._sum.tokensUsed || 0;
    res.json({
      tier: {
        name: tier.name,
        auditLimit: tier.auditLimit,
        tokenLimit: tier.tokenLimit,
        price: tier.price,
      },
      remainingAudits: Math.max(0, tier.auditLimit - auditsUsed),
      remainingTokens: Math.max(0, tier.tokenLimit - tokensUsed),
      auditsUsed,
      tokensUsed,
    });
  } catch (err: unknown) {
    next(err);
  }
});

// POST /api/audit - create audit, enforce quotas, enqueue job
app.post('/api/audit', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      projectId: z.string(),
      url: z.string().url(),
      competitors: z.array(z.string().url()).optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.errors });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user and tier
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tier = await prisma.tier.findUnique({ where: { id: user.tierId } });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });

    // Calculate current usage for this billing period
    const currentPeriodStart = (user as any).currentPeriodStart || new Date();
    const currentPeriodEnd = (user as any).currentPeriodEnd || new Date();

    const [auditsUsed, tokensUsed] = await Promise.all([
      prisma.usageLog.count({
        where: {
          userId: user.id,
          auditId: { not: null },
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd,
          },
        },
      }),
      prisma.usageLog.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd,
          },
        },
        _sum: { tokensUsed: true },
      }),
    ]);

    const totalTokensUsed = tokensUsed._sum.tokensUsed || 0;
    const auditUsagePercentage = tier.auditLimit > 0 ? (auditsUsed / tier.auditLimit) * 100 : 0;
    const tokenUsagePercentage =
      tier.tokenLimit > 0 ? (totalTokensUsed / tier.tokenLimit) * 100 : 0;

    // Check audit limit
    if (auditsUsed >= tier.auditLimit) {
      return res.status(429).json({
        error: 'Audit limit exceeded',
        details: {
          auditsUsed,
          auditLimit: tier.auditLimit,
          usagePercentage: Math.round(auditUsagePercentage),
          message: `You have reached your monthly audit limit (${tier.auditLimit}). Please upgrade your plan to continue.`,
          upgradeUrl: '/billing',
        },
      });
    }

    // Check token limit
    if (totalTokensUsed >= tier.tokenLimit) {
      return res.status(429).json({
        error: 'Token limit exceeded',
        details: {
          tokensUsed: totalTokensUsed,
          tokenLimit: tier.tokenLimit,
          usagePercentage: Math.round(tokenUsagePercentage),
          message: `You have reached your monthly token limit (${tier.tokenLimit.toLocaleString()}). Please upgrade your plan to continue.`,
          upgradeUrl: '/billing',
        },
      });
    }

    // Check for usage alerts (90% warning)
    const shouldSendAlert = auditUsagePercentage >= 90 || tokenUsagePercentage >= 90;
    const lastAlert = (user as any).lastUsageAlertAt;
    const canSendAlert =
      !lastAlert || new Date().getTime() - new Date(lastAlert).getTime() > 24 * 60 * 60 * 1000; // 24 hours

    if (shouldSendAlert && canSendAlert) {
      // Update last alert time
      await prisma.user.update({
        where: { id: req.user.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { lastUsageAlertAt: new Date() } as any,
      });

      // TODO: Send email alert
      console.log(
        `Usage alert: User ${user.email} is at ${Math.round(Math.max(auditUsagePercentage, tokenUsagePercentage))}% of their limits`,
      );
    }

    // Create Audit record
    const audit = await prisma.audit.create({
      data: {
        projectId: result.data.projectId,
        userId: req.user.id,
        url: result.data.url,
        status: 'processing',
      },
    });

    // Log usage (audit count, tokens will be updated after processing)
    await prisma.usageLog.create({
      data: {
        userId: user.id,
        auditId: audit.id,
        tokensUsed: 0, // Will be updated after audit processing
      },
    });

    // Enqueue BullMQ job
    await auditQueue.add('audit', {
      auditId: audit.id,
      userId: req.user.id,
      projectId: result.data.projectId,
      url: result.data.url,
      competitors: result.data.competitors || [],
    });

    res.status(202).json({
      message: 'Audit enqueued',
      auditId: audit.id,
      usage: {
        auditsUsed: auditsUsed + 1,
        auditLimit: tier.auditLimit,
        auditUsagePercentage: Math.round(((auditsUsed + 1) / tier.auditLimit) * 100),
        tokensUsed: totalTokensUsed,
        tokenLimit: tier.tokenLimit,
        tokenUsagePercentage: Math.round(tokenUsagePercentage),
        warning: shouldSendAlert
          ? 'You are approaching your usage limits. Consider upgrading your plan.'
          : null,
      },
    });
  } catch (err: unknown) {
    next(err);
  }
});

// GET /api/audits - list user's audits with pagination and optional project filter
app.get('/api/audits', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '10', 10);
    const projectId = req.query.projectId as string | undefined;
    let projectIds: string[];
    if (projectId) {
      // Only audits for the specified project (must belong to user)
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      projectIds = [projectId];
    } else {
      projectIds = (
        await prisma.project.findMany({ where: { userId: req.user.id }, select: { id: true } })
      ).map((p: { id: string }) => p.id);
    }
    const [audits, total] = await Promise.all([
      prisma.audit.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.audit.count({ where: { projectId: { in: projectIds } } }),
    ]);
    res.json({ audits, total, page, pageSize });
  } catch (err: unknown) {
    next(err);
  }
});

// GET /api/audit/:id - audit details (full)
app.get('/api/audit/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const audit = await prisma.audit.findUnique({ where: { id } });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    // Only allow access if user owns the project
    const project = await prisma.project.findUnique({ where: { id: audit.projectId } });
    if (!project || project.userId !== req.user?.id)
      return res.status(403).json({ error: 'Forbidden' });
    // Get snapshots
    const snapshots = await prisma.auditSnapshot.findMany({
      where: { auditId: id },
      orderBy: { timestamp: 'asc' },
    });
    // Compose response
    let suggestions: Suggestion[] = [];
    if (
      audit.semanticData &&
      typeof audit.semanticData === 'object' &&
      'suggestions' in audit.semanticData
    ) {
      const sd = audit.semanticData as Record<string, unknown>;
      if (Array.isArray(sd.suggestions)) {
        suggestions = sd.suggestions as Suggestion[];
      }
    }
    res.json({
      id: audit.id,
      projectId: audit.projectId,
      url: audit.url,
      status: audit.status,
      score: audit.score,
      createdAt: audit.createdAt,
      suggestions,
      competitorGaps: audit.competitorGaps,
      schemaJSON: audit.schemaJSON,
      semanticData: audit.semanticData,
      snapshots,
    });
  } catch (err: unknown) {
    next(err);
  }
});

// POST /api/schema - generate/validate JSON-LD
app.post('/api/schema', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({ auditId: z.string() });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.errors });
    const { auditId } = result.data;
    // Fetch audit and related data
    const audit = await prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    // Only allow access if user owns the project
    const project = await prisma.project.findUnique({ where: { id: audit.projectId } });
    if (!project || project.userId !== req.user?.id)
      return res.status(403).json({ error: 'Forbidden' });
    // Generate JSON-LD (example: Article)
    let description: string | undefined = undefined;
    if (
      audit.semanticData &&
      typeof audit.semanticData === 'object' &&
      !Array.isArray(audit.semanticData) &&
      'summary' in audit.semanticData
    ) {
      const sd = audit.semanticData as Record<string, unknown>;
      if (typeof sd.summary === 'string') {
        description = sd.summary;
      }
    }
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: audit.url,
      name: project.name,
      dateCreated: audit.createdAt.toISOString(),
      ...(description ? { description: description } : {}),
      ...(audit.score !== null
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: audit.score,
              bestRating: 100,
              worstRating: 0,
            },
          }
        : {}),
    };
    // Simulate validation (in real world, call Google Rich Results API)
    const isValid = !!jsonLd.url && !!jsonLd.name;
    const validation = {
      valid: isValid,
      warnings: isValid ? [] : ['Missing required fields'],
      errors: isValid ? [] : ['Schema is missing url or name'],
    };
    res.json({ schema: jsonLd, validation });
  } catch (err: unknown) {
    next(err);
  }
});

// POST /api/create-checkout - Stripe Checkout session
app.post('/api/create-checkout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: 'Missing priceId' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://yourapp.com/success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://yourapp.com/cancel',
      metadata: { userId: user.id },
    });
    res.json({ url: session.url });
  } catch (err: unknown) {
    next(err);
  }
});

// POST /api/webhooks/stripe - Stripe webhook
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const sig = req.headers['stripe-signature'];
      if (!sig) return res.status(400).send('Missing signature');
      const stripe = await getStripe();
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || '',
        );
      } catch (err: unknown) {
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }
      // Handle subscription events
      if (
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.created'
      ) {
        const subscription = event.data.object as unknown as {
          metadata?: { userId: string };
          items: { data: { price: { id: string } }[] };
        };
        const userId = subscription.metadata?.userId;
        const priceId = subscription.items.data[0].price.id;
        // Stripe priceId to tier name mapping (replace with your real price IDs)
        const priceIdToTierName: Record<string, string> = {
          price_123: 'Free',
          price_456: 'Starter',
          price_789: 'Pro',
          price_abc: 'Enterprise',
        };
        const tierName = priceIdToTierName[priceId];
        const tier = tierName ? await prisma.tier.findFirst({ where: { name: tierName } }) : null;
        if (userId && tier) {
          await prisma.user.update({ where: { id: userId }, data: { tierId: tier.id } });
        }
      }
      // TODO: Handle cancellations, downgrades, etc.
      res.json({ received: true });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// GET /api/projects - list user's projects with audit count
app.get('/api/projects', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    // Get audit count for each project
    const projectIds = projects.map((p: { id: string }) => p.id);
    const auditCounts = await prisma.audit.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });
    const projectsWithCounts = projects.map((p: { id: string; name: string; createdAt: Date }) => ({
      ...p,
      auditCount:
        auditCounts.find((a: { projectId: string; _count: { id: number } }) => a.projectId === p.id)
          ?._count.id || 0,
    }));
    res.json({ projects: projectsWithCounts });
  } catch (err: unknown) {
    next(err);
  }
});

// POST /api/project - create project
app.post('/api/project', requireAuth, async (req: any, res) => {
  try {
    const result = z
      .object({
        name: z.string().min(1).max(100),
      })
      .safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: 'Invalid project name' });
    }

    const { name } = result.data;

    // Check if user has reached project limit (let's say 10 projects per user)
    const projectCount = await prisma.project.count({
      where: { userId: req.user.id },
    });

    if (projectCount >= 10) {
      return res.status(429).json({
        error: 'Project limit exceeded',
        details: {
          currentProjects: projectCount,
          projectLimit: 10,
          message:
            'You have reached the maximum number of projects (10). Please contact support if you need more.',
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        userId: req.user.id,
      },
    });

    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// POST /api/register - user registration
app.post('/api/register', async (req, res, next) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2),
      orgName: z.string().optional(),
      email: z.string().email(),
      mobile: z.string().min(6).max(20).optional(),
      password: z.string().min(6),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.errors });
    const { fullName, orgName, email, mobile, password } = result.data;
    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    // Get default tier (Free)
    const defaultTier = await prisma.tier.findFirst({ where: { name: 'Free' } });
    if (!defaultTier) return res.status(500).json({ error: 'Default tier not found' });
    // TODO: Ensure User model has a 'password' field (string)
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        password: hashed,
        tierId: defaultTier.id,
        orgName: orgName || null,
        mobile: mobile || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    res.status(201).json({ message: 'User registered', userId: user.id });
  } catch (err: unknown) {
    next(err);
  }
});

// GET /api/admin/users - paginated user list (admin only)
app.get(
  '/api/admin/users',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count(),
      ]);
      res.json({ users, total, page, pageSize });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// GET /api/admin/user/:id - user details, usage, audits (admin only)
app.get(
  '/api/admin/user/:id',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const audits = await prisma.audit.findMany({
        where: {
          projectId: {
            in: (
              await prisma.project.findMany({ where: { userId: id }, select: { id: true } })
            ).map((p: { id: string }) => p.id),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const usage = await prisma.usageLog.aggregate({
        where: { userId: id },
        _sum: { tokensUsed: true },
        _count: { auditId: true },
      });
      res.json({
        user,
        audits,
        usage: {
          auditsUsed: usage._count.auditId,
          tokensUsed: usage._sum.tokensUsed || 0,
        },
      });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// PATCH /api/admin/user/:id/admin - promote/demote admin status (admin only)
app.patch(
  '/api/admin/user/:id/admin',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const { isAdmin } = req.body;
      if (typeof isAdmin !== 'boolean')
        return res.status(400).json({ error: 'isAdmin must be boolean' });
      // Explicitly cast to the correct Prisma type
      const user = await prisma.user.update({ where: { id }, data: { isAdmin: Boolean(isAdmin) } });
      res.json({ user });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// GET /api/admin/analytics/usage - usage stats (admin only)
app.get(
  '/api/admin/analytics/usage',
  requireAuth,
  adminOnly,
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      // Usage analytics
      const totalUsers = await prisma.user.count();
      const totalAudits = await prisma.audit.count();
      const totalTokens = await prisma.usageLog.aggregate({ _sum: { tokensUsed: true } });
      const tiers = await prisma.tier.findMany();
      const usersPerTier = await Promise.all(
        tiers.map(async (t: { id: string; name: string }) => ({
          tier: t.name,
          users: await prisma.user.count({ where: { tierId: t.id } }),
        })),
      );
      res.json({
        totalUsers,
        totalAudits,
        totalTokens: totalTokens._sum.tokensUsed || 0,
        auditsPerTier: usersPerTier,
      });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// GET /api/admin/analytics/business - business metrics (admin only)
app.get(
  '/api/admin/analytics/business',
  requireAuth,
  adminOnly,
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      // Simulate revenue and growth metrics (replace with real Stripe integration as needed)
      const tiers = await prisma.tier.findMany();
      const users = await prisma.user.findMany();
      const revenue = users.reduce((sum: number, u: { tierId: string }) => {
        const tier = tiers.find((t: { id: string; price: number }) => t.id === u.tierId);
        return sum + (tier ? tier.price : 0);
      }, 0);
      const planDistribution = tiers.map((t: { id: string; name: string }) => ({
        tier: t.name,
        users: users.filter((u: { tierId: string }) => u.tierId === t.id).length,
      }));
      res.json({
        revenue,
        planDistribution,
        // TODO: Add MRR, churn, growth trends with Stripe integration
      });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// GET /api/admin/settings - list all settings (admin only)
app.get(
  '/api/admin/settings',
  requireAuth,
  adminOnly,
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      const settings = await prisma.setting.findMany();
      res.json({ settings });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// POST /api/admin/settings - update or create a setting (admin only)
app.post(
  '/api/admin/settings',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { key, value } = req.body;
      if (!key || typeof value !== 'string')
        return res.status(400).json({ error: 'Invalid key or value' });
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      res.json({ setting });
    } catch (err: unknown) {
      next(err);
    }
  },
);

// Stripe Customer Creation
app.post('/api/stripe/create-customer', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((user as any).stripeCustomerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return res.json({ customerId: (user as any).stripeCustomerId });
    }

    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { stripeCustomerId: customer.id } as any,
    });

    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Create Checkout Session
app.post('/api/stripe/create-checkout-session', requireAuth, async (req: any, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure customer exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let customerId = (user as any).stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { stripeCustomerId: customer.id } as any,
      });
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user.id },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create Portal Session
app.post('/api/stripe/create-portal-session', requireAuth, async (req: any, res) => {
  try {
    const { returnUrl } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(user as any)?.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await getStripe().billingPortal.sessions.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customer: (user as any).stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session creation error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Stripe Webhook
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { stripeCustomerId: subscription.customer as string } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          } as any,
        });
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { stripeCustomerId: deletedSubscription.customer as string } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: {
            subscriptionStatus: 'canceled',
            currentPeriodEnd: new Date(deletedSubscription.canceled_at! * 1000),
          } as any,
        });
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const user = await prisma.user.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: { stripeCustomerId: invoice.customer as string } as any,
          });
          if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma as any).billingHistory.create({
              data: {
                userId: user.id,
                stripeInvoiceId: invoice.id,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status || 'paid',
                description: `Subscription payment for ${invoice.lines.data[0]?.description || 'Unknown'}`,
              },
            });
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get User Billing Info
app.get('/api/billing', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get tier information
    const tier = await prisma.tier.findUnique({
      where: { id: user.tierId },
    });

    if (!tier) return res.status(404).json({ error: 'Tier not found' });

    // Get billing history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billingHistory = await (prisma as any).billingHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get current usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodStart = (user as any).currentPeriodStart || new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPeriodEnd = (user as any).currentPeriodEnd || new Date();

    const usage = await prisma.usageLog.aggregate({
      where: {
        userId: user.id,
        createdAt: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
      _sum: { tokensUsed: true },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscriptionStatus: (user as any).subscriptionStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodStart: (user as any).currentPeriodStart,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodEnd: (user as any).currentPeriodEnd,
        tier: tier,
      },
      usage: {
        tokensUsed: usage._sum.tokensUsed || 0,
        tokenLimit: tier.tokenLimit,
        usagePercentage:
          tier.tokenLimit > 0
            ? Math.round(((usage._sum.tokensUsed || 0) / tier.tokenLimit) * 100)
            : 0,
      },
      billingHistory: billingHistory,
    });
  } catch (error) {
    console.error('Billing info error:', error);
    res.status(500).json({ error: 'Failed to get billing info' });
  }
});

// Initialize services
const reportGenerator = new ReportGenerator();
const csvExporter = new CSVExporter();
const analyticsService = new AnalyticsService();

// Export PDF Report
app.get('/api/audit/:id/export/pdf', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const auditId = req.params.id;
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        project: true,
        user: true,
      },
    });

    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    if (audit.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const reportData = {
      auditId: audit.id,
      url: audit.url,
      score: audit.score || 0,
      createdAt: audit.createdAt.toISOString(),
      analysis: audit.semanticData as any,
      projectName: audit.project.name,
      userName: audit.user.name || 'Unknown',
    };

    const pdfBuffer = await reportGenerator.generatePDF(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-report-${auditId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    next(err);
  }
});

// Export CSV Data
app.get('/api/export/audits.csv', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const audits = await prisma.audit.findMany({
      where: { userId: req.user.id },
      include: {
        project: true,
        user: true,
      },
    });

    const csvData = audits.map((audit: any) => ({
      auditId: audit.id,
      url: audit.url,
      score: audit.score || 0,
      createdAt: audit.createdAt.toISOString(),
      projectName: audit.project.name,
      userName: audit.user.name || 'Unknown',
      pageSpeed: (audit.semanticData as any)?.metrics?.pageSpeed || 0,
      seoBasics: (audit.semanticData as any)?.metrics?.seoBasics || 0,
      contentQuality: (audit.semanticData as any)?.metrics?.contentQuality || 0,
      technicalSEO: (audit.semanticData as any)?.metrics?.technicalSEO || 0,
      mobileOptimization: (audit.semanticData as any)?.metrics?.mobileOptimization || 0,
      issuesCount: (audit.semanticData as any)?.issues?.length || 0,
      recommendationsCount: (audit.semanticData as any)?.recommendations?.length || 0,
      competitorsCount: (audit.semanticData as any)?.competitorAnalysis?.length || 0,
    }));

    const csv = csvExporter.exportAuditsToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audits-export.csv"');
    res.send(csv);
  } catch (err: unknown) {
    next(err);
  }
});

// Analytics endpoints (admin only)
app.get(
  '/api/admin/analytics/users',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userAnalytics = await analyticsService.getUserAnalytics();
      res.json(userAnalytics);
    } catch (err: unknown) {
      next(err);
    }
  },
);

app.get(
  '/api/admin/analytics/seo-trends',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const seoTrends = await analyticsService.getSEOTrends();
      res.json(seoTrends);
    } catch (err: unknown) {
      next(err);
    }
  },
);

app.get(
  '/api/admin/analytics/competitors',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const competitorTracking = await analyticsService.getCompetitorTracking();
      res.json(competitorTracking);
    } catch (err: unknown) {
      next(err);
    }
  },
);

app.get(
  '/api/admin/export/analytics.csv',
  requireAuth,
  adminOnly,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          tier: true,
          audits: true,
          usageLogs: true,
        },
      });

      const analyticsData = users.map((user: any) => ({
        userId: user.id,
        userName: user.name || 'Unknown',
        email: user.email,
        tierName: user.tier.name,
        auditsCreated: user.audits.length,
        totalTokensUsed: user.usageLogs.reduce(
          (sum: number, log: any) => sum + (log.tokensUsed || 0),
          0,
        ),
        lastAuditDate:
          user.audits.length > 0 ? user.audits[user.audits.length - 1].createdAt.toISOString() : '',
        subscriptionStatus: user.subscriptionStatus || 'none',
        monthlyRevenue: user.subscriptionStatus === 'active' ? user.tier.price : 0,
      }));

      const csv = csvExporter.exportAnalyticsToCSV(analyticsData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="user-analytics.csv"');
      res.send(csv);
    } catch (err: unknown) {
      next(err);
    }
  },
);

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});

export default app;
