import { Parser } from 'json2csv';

export interface AuditCSVData {
  auditId: string;
  url: string;
  score: number;
  createdAt: string;
  projectName: string;
  userName: string;
  pageSpeed: number;
  seoBasics: number;
  contentQuality: number;
  technicalSEO: number;
  mobileOptimization: number;
  issuesCount: number;
  recommendationsCount: number;
  competitorsCount: number;
}

export interface AnalyticsCSVData {
  userId: string;
  userName: string;
  email: string;
  tierName: string;
  auditsCreated: number;
  totalTokensUsed: number;
  lastAuditDate: string;
  subscriptionStatus: string;
  monthlyRevenue: number;
}

export class CSVExporter {
  public exportAuditsToCSV(audits: AuditCSVData[]): string {
    const fields = [
      'auditId',
      'url',
      'score',
      'createdAt',
      'projectName',
      'userName',
      'pageSpeed',
      'seoBasics',
      'contentQuality',
      'technicalSEO',
      'mobileOptimization',
      'issuesCount',
      'recommendationsCount',
      'competitorsCount',
    ];

    const opts = { fields };
    const parser = new Parser(opts);

    return parser.parse(audits);
  }

  public exportAnalyticsToCSV(analytics: AnalyticsCSVData[]): string {
    const fields = [
      'userId',
      'userName',
      'email',
      'tierName',
      'auditsCreated',
      'totalTokensUsed',
      'lastAuditDate',
      'subscriptionStatus',
      'monthlyRevenue',
    ];

    const opts = { fields };
    const parser = new Parser(opts);

    return parser.parse(analytics);
  }

  public exportIssuesToCSV(issues: any[]): string {
    const fields = [
      'auditId',
      'url',
      'issueType',
      'category',
      'title',
      'description',
      'impact',
      'fix',
    ];

    const opts = { fields };
    const parser = new Parser(opts);

    return parser.parse(issues);
  }

  public exportRecommendationsToCSV(recommendations: any[]): string {
    const fields = [
      'auditId',
      'url',
      'priority',
      'category',
      'title',
      'description',
      'effort',
      'impact',
    ];

    const opts = { fields };
    const parser = new Parser(opts);

    return parser.parse(recommendations);
  }
}
