import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from './prisma';
import { AuditEngine } from './services/auditEngine';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const auditQueue = new Queue('audit', { connection });

// Initialize audit engine
const auditEngine = new AuditEngine();

// Worker: implement audit processing logic here
export const auditWorker = new Worker(
  'audit',
  async (job: Job) => {
    const { auditId, url, competitors } = job.data;
    try {
      console.log(`Processing audit ${auditId} for URL: ${url}`);

      // Update audit status to processing
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: 'processing' },
      });

      // Run comprehensive SEO analysis
      const analysis = await auditEngine.analyzePage(url);

      // Analyze competitors if provided
      const competitorGaps = [];
      if (competitors && competitors.length > 0) {
        for (const competitorUrl of competitors.slice(0, 3)) {
          // Limit to 3 competitors
          try {
            const competitorAnalysis = await auditEngine.analyzePage(competitorUrl);
            competitorGaps.push({
              url: competitorUrl,
              score: competitorAnalysis.score,
              strengths: competitorAnalysis.recommendations
                .filter((rec) => rec.priority === 'high')
                .map((rec) => rec.title),
              weaknesses: competitorAnalysis.issues
                .filter((issue) => issue.impact === 'high')
                .map((issue) => issue.title),
              gaps: analysis.recommendations
                .filter((rec) => rec.priority === 'high')
                .map((rec) => rec.title),
            });
          } catch (error) {
            console.error(`Failed to analyze competitor ${competitorUrl}:`, error);
            competitorGaps.push({
              url: competitorUrl,
              error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }

      // Calculate tokens used (estimate based on analysis complexity)
      const tokensUsed = 1000 + competitorGaps.length * 500 + analysis.issues.length * 50;

      // Save comprehensive audit results
      await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: 'completed',
          score: analysis.score,
          competitorGaps: competitorGaps.length > 0 ? competitorGaps : undefined,
          schemaJSON: {
            analysis: {
              score: analysis.score,
              metrics: analysis.metrics,
              timestamp: new Date().toISOString(),
            },
          },
          semanticData: JSON.parse(
            JSON.stringify({
              issues: analysis.issues,
              recommendations: analysis.recommendations,
              metrics: analysis.metrics,
              competitorAnalysis: competitorGaps,
            }),
          ),
        },
      });

      // Create audit snapshot for history
      await prisma.auditSnapshot.create({
        data: {
          auditId,
          score: analysis.score,
        },
      });

      // Update usage log with actual tokens used
      await prisma.usageLog.updateMany({
        where: { auditId },
        data: { tokensUsed },
      });

      console.log(`Audit ${auditId} completed successfully with score: ${analysis.score}`);
      return { success: true, score: analysis.score };
    } catch (err) {
      console.error(`Audit ${auditId} failed:`, err);

      // Mark audit as failed
      await prisma.audit.update({
        where: { id: auditId },
        data: {
          status: 'failed',
          semanticData: {
            error: err instanceof Error ? err.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        },
      });
      throw err;
    }
  },
  { connection },
);

auditWorker.on('completed', (job) => {
  console.log(`Audit job ${job.id} completed successfully.`);
});

auditWorker.on('failed', (job, err) => {
  console.error(`Audit job ${job?.id} failed:`, err);
});
