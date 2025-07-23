import { prisma } from './prisma';
import nodemailer from 'nodemailer';

const SENDGRID_USER = process.env.SENDGRID_USER;
const SENDGRID_PASS = process.env.SENDGRID_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'RankPilot <noreply@rankpilot.com>';

const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: SENDGRID_USER,
    pass: SENDGRID_PASS,
  },
});

async function sendUsageAlert(
  email: string,
  name: string | null,
  type: 'audits' | 'tokens',
  used: number,
  limit: number,
) {
  const percent = Math.round((used / limit) * 100);
  const subject = `RankPilot: ${type === 'audits' ? 'Audit' : 'Token'} Quota Alert`;
  const text = `Hi${name ? ` ${name}` : ''},\n\nYou have used ${percent}% of your ${type} quota (${used} of ${limit}).\n\nPlease consider upgrading your plan or monitoring your usage.\n\n- RankPilot Team`;
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject,
    text,
  });
}

async function checkUsageAlerts() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const tier = await prisma.tier.findUnique({ where: { id: user.tierId } });
    if (!tier) continue;
    const usage = await prisma.usageLog.aggregate({
      where: { userId: user.id },
      _sum: { tokensUsed: true },
      _count: { auditId: true },
    });
    const auditsUsed = usage._count.auditId;
    const tokensUsed = usage._sum.tokensUsed || 0;
    const now = new Date();
    const alertThreshold = 0.8;
    const alertCooldownMs = 1000 * 60 * 60 * 24; // 24 hours
    // Audit quota alert
    if (
      auditsUsed > alertThreshold * tier.auditLimit &&
      (!user.lastUsageAlertAt || now.getTime() - user.lastUsageAlertAt.getTime() > alertCooldownMs)
    ) {
      await sendUsageAlert(user.email, user.name, 'audits', auditsUsed, tier.auditLimit);
      await prisma.user.update({ where: { id: user.id }, data: { lastUsageAlertAt: now } });
      continue;
    }
    // Token quota alert
    if (
      tokensUsed > alertThreshold * tier.tokenLimit &&
      (!user.lastUsageAlertAt || now.getTime() - user.lastUsageAlertAt.getTime() > alertCooldownMs)
    ) {
      await sendUsageAlert(user.email, user.name, 'tokens', tokensUsed, tier.tokenLimit);
      await prisma.user.update({ where: { id: user.id }, data: { lastUsageAlertAt: now } });
    }
  }
}

checkUsageAlerts().then(() => {
  console.log('Usage alerts checked.');
  process.exit(0);
});
