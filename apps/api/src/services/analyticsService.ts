import { prisma } from '../prisma';

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  subscriptionRevenue: number;
  averageAuditsPerUser: number;
  topPerformingUsers: Array<{
    userId: string;
    userName: string;
    email: string;
    auditsCreated: number;
    totalTokensUsed: number;
    subscriptionTier: string;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
}

export interface SEOTrends {
  averageScore: number;
  scoreImprovement: number;
  topIssues: Array<{
    issue: string;
    frequency: number;
    impact: number;
  }>;
  topRecommendations: Array<{
    recommendation: string;
    frequency: number;
    impact: number;
  }>;
  scoreDistribution: {
    excellent: number;
    good: number;
    needsImprovement: number;
  };
  trendsByCategory: {
    pageSpeed: { average: number; trend: number };
    seoBasics: { average: number; trend: number };
    contentQuality: { average: number; trend: number };
    technicalSEO: { average: number; trend: number };
    mobileOptimization: { average: number; trend: number };
  };
}

export interface CompetitorTracking {
  topCompetitors: Array<{
    url: string;
    averageScore: number;
    analysisCount: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  competitorGaps: Array<{
    gap: string;
    frequency: number;
    opportunity: number;
  }>;
  industryBenchmarks: {
    averageScore: number;
    topScore: number;
    bottomScore: number;
  };
}

export class AnalyticsService {
  public async getUserAnalytics(): Promise<UserAnalytics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get active users (users with audits in last 30 days)
    const activeUsers = await prisma.user.count({
      where: {
        audits: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    // Get new users this month
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get subscription revenue (calculate from user tiers)
    const usersWithTiers = await prisma.user.findMany({
      where: {
        subscriptionStatus: 'active',
      },
      include: {
        tier: true,
      },
    });

    const subscriptionRevenue = usersWithTiers.reduce((total: number, user: any) => {
      return total + (user.tier.price || 0);
    }, 0);

    // Get average audits per user
    const totalAudits = await prisma.audit.count();
    const averageAuditsPerUser = totalUsers > 0 ? totalAudits / totalUsers : 0;

    // Get top performing users
    const topPerformingUsers = await prisma.user.findMany({
      take: 10,
      orderBy: {
        audits: {
          _count: 'desc',
        },
      },
      include: {
        tier: true,
        audits: true,
        usageLogs: true,
      },
    });

    const topUsers = topPerformingUsers.map((user: any) => ({
      userId: user.id,
      userName: user.name || 'Unknown',
      email: user.email,
      auditsCreated: user.audits.length,
      totalTokensUsed: user.usageLogs.reduce(
        (sum: number, log: any) => sum + (log.tokensUsed || 0),
        0,
      ),
      subscriptionTier: user.tier.name,
    }));

    // Get user growth data
    const userGrowth = await this.getUserGrowthData();

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      subscriptionRevenue,
      averageAuditsPerUser,
      topPerformingUsers: topUsers,
      userGrowth,
    };
  }

  public async getSEOTrends(): Promise<SEOTrends> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all completed audits
    const audits = await prisma.audit.findMany({
      where: {
        status: 'completed',
        score: { not: null },
      },
    });

    // Calculate average score
    const scores = audits.map((audit: any) => audit.score!).filter((score: number) => score > 0);
    const averageScore =
      scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

    // Calculate score improvement (compare last 30 days vs previous 30 days)
    const recentAudits = audits.filter((audit: any) => audit.createdAt >= thirtyDaysAgo);
    const previousAudits = audits.filter(
      (audit: any) => audit.createdAt >= sixtyDaysAgo && audit.createdAt < thirtyDaysAgo,
    );

    const recentAverage =
      recentAudits.length > 0
        ? recentAudits.reduce((sum: number, audit: any) => sum + audit.score!, 0) /
          recentAudits.length
        : 0;
    const previousAverage =
      previousAudits.length > 0
        ? previousAudits.reduce((sum: number, audit: any) => sum + audit.score!, 0) /
          previousAudits.length
        : 0;

    const scoreImprovement =
      previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0;

    // Analyze top issues
    const allIssues = audits.flatMap((audit: any) => {
      const semanticData = audit.semanticData as any;
      return (semanticData?.issues || []).map((issue: any) => ({
        ...issue,
        auditId: audit.id,
      }));
    });

    const issueFrequency = allIssues.reduce(
      (acc: Record<string, { count: number; totalImpact: number }>, issue: any) => {
        const key = issue.title;
        if (!acc[key]) acc[key] = { count: 0, totalImpact: 0 };
        acc[key].count++;
        acc[key].totalImpact += this.getImpactValue(issue.impact);
        return acc;
      },
      {},
    );

    const topIssues = Object.entries(issueFrequency)
      .map(([issue, data]: [string, { count: number; totalImpact: number }]) => ({
        issue,
        frequency: data.count,
        impact: data.totalImpact / data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Analyze top recommendations
    const allRecommendations = audits.flatMap((audit: any) => {
      const semanticData = audit.semanticData as any;
      return (semanticData?.recommendations || []).map((rec: any) => ({
        ...rec,
        auditId: audit.id,
      }));
    });

    const recFrequency = allRecommendations.reduce(
      (acc: Record<string, { count: number; totalImpact: number }>, rec: any) => {
        const key = rec.title;
        if (!acc[key]) acc[key] = { count: 0, totalImpact: 0 };
        acc[key].count++;
        acc[key].totalImpact += rec.impact || 0;
        return acc;
      },
      {},
    );

    const topRecommendations = Object.entries(recFrequency)
      .map(([rec, data]: [string, { count: number; totalImpact: number }]) => ({
        recommendation: rec,
        frequency: data.count,
        impact: data.totalImpact / data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Calculate score distribution
    const scoreDistribution = {
      excellent: scores.filter((score) => score >= 80).length,
      good: scores.filter((score) => score >= 60 && score < 80).length,
      needsImprovement: scores.filter((score) => score < 60).length,
    };

    // Calculate trends by category
    const trendsByCategory = await this.getCategoryTrends(audits);

    return {
      averageScore,
      scoreImprovement,
      topIssues,
      topRecommendations,
      scoreDistribution,
      trendsByCategory,
    };
  }

  public async getCompetitorTracking(): Promise<CompetitorTracking> {
    const audits = await prisma.audit.findMany({
      where: {
        status: 'completed',
      },
    });

    // Analyze competitor data
    const competitorData = audits.flatMap((audit: any) => {
      const gaps = audit.competitorGaps as any;
      return Array.isArray(gaps)
        ? gaps.map((comp: any) => ({
            ...comp,
            auditId: audit.id,
          }))
        : [];
    });

    // Group by competitor URL
    const competitorGroups = competitorData.reduce((acc: any, comp: any) => {
      if (!acc[comp.url]) {
        acc[comp.url] = {
          url: comp.url,
          scores: [],
          strengths: [],
          weaknesses: [],
          gaps: [],
        };
      }
      acc[comp.url].scores.push(comp.score || 0);
      acc[comp.url].strengths.push(...(comp.strengths || []));
      acc[comp.url].weaknesses.push(...(comp.weaknesses || []));
      acc[comp.url].gaps.push(...(comp.gaps || []));
      return acc;
    }, {});

    // Calculate top competitors
    const topCompetitors = Object.values(competitorGroups)
      .map((comp: any) => ({
        url: comp.url,
        averageScore:
          comp.scores.length > 0
            ? comp.scores.reduce((a: number, b: number) => a + b, 0) / comp.scores.length
            : 0,
        analysisCount: comp.scores.length,
        strengths: [...new Set(comp.strengths)].slice(0, 5),
        weaknesses: [...new Set(comp.weaknesses)].slice(0, 5),
      }))
      .sort((a: any, b: any) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // Analyze competitor gaps
    const allGaps = competitorData.flatMap((comp: any) => comp.gaps || []);
    const gapFrequency = allGaps.reduce((acc: any, gap: any) => {
      acc[gap] = (acc[gap] || 0) + 1;
      return acc;
    }, {});

    const competitorGaps = Object.entries(gapFrequency)
      .map(([gap, frequency]: [string, any]) => ({
        gap,
        frequency: frequency as number,
        opportunity: (frequency as number) * 10, // Simple opportunity score
      }))
      .sort((a: any, b: any) => b.frequency - a.frequency)
      .slice(0, 10);

    // Calculate industry benchmarks
    const allScores = audits.map((audit: any) => audit.score!).filter((score: number) => score > 0);
    const industryBenchmarks = {
      averageScore:
        allScores.length > 0
          ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length
          : 0,
      topScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      bottomScore: allScores.length > 0 ? Math.min(...allScores) : 0,
    };

    return {
      topCompetitors: topCompetitors as any,
      competitorGaps,
      industryBenchmarks,
    };
  }

  private async getUserGrowthData(): Promise<
    Array<{ date: string; newUsers: number; activeUsers: number }>
  > {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const growthData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      const activeUsers = await prisma.user.count({
        where: {
          audits: {
            some: {
              createdAt: {
                gte: startOfDay,
                lt: endOfDay,
              },
            },
          },
        },
      });

      growthData.push({
        date: startOfDay.toISOString().split('T')[0],
        newUsers,
        activeUsers,
      });
    }

    return growthData;
  }

  private async getCategoryTrends(audits: any[]): Promise<SEOTrends['trendsByCategory']> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentAudits = audits.filter((audit) => audit.createdAt >= thirtyDaysAgo);
    const previousAudits = audits.filter(
      (audit) => audit.createdAt >= sixtyDaysAgo && audit.createdAt < thirtyDaysAgo,
    );

    const categories = [
      'pageSpeed',
      'seoBasics',
      'contentQuality',
      'technicalSEO',
      'mobileOptimization',
    ];
    const trends: any = {};

    for (const category of categories) {
      const recentScores = recentAudits
        .map((audit) => {
          const semanticData = audit.semanticData as any;
          return semanticData?.metrics?.[category];
        })
        .filter((score) => score !== undefined && score > 0);

      const previousScores = previousAudits
        .map((audit) => {
          const semanticData = audit.semanticData as any;
          return semanticData?.metrics?.[category];
        })
        .filter((score) => score !== undefined && score > 0);

      const recentAverage =
        recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
      const previousAverage =
        previousScores.length > 0
          ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
          : 0;

      const trend =
        previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0;

      trends[category] = {
        average: recentAverage,
        trend,
      };
    }

    return trends;
  }

  private getImpactValue(impact: string): number {
    switch (impact) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 1;
    }
  }
}
