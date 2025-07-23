import puppeteer from 'puppeteer';
import { SEOAnalysis } from './auditEngine';

export interface AuditReportData {
  auditId: string;
  url: string;
  score: number;
  createdAt: string;
  analysis: SEOAnalysis;
  projectName: string;
  userName: string;
}

export class ReportGenerator {
  private async generateHTML(data: AuditReportData): Promise<string> {
    const { auditId, url, score, createdAt, analysis, projectName, userName } = data;

    const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
    const scoreText = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement';

    const issuesByCategory = analysis.issues.reduce(
      (acc, issue) => {
        if (!acc[issue.category]) acc[issue.category] = [];
        acc[issue.category].push(issue);
        return acc;
      },
      {} as Record<string, typeof analysis.issues>,
    );

    const recommendationsByPriority = analysis.recommendations.reduce(
      (acc, rec) => {
        if (!acc[rec.priority]) acc[rec.priority] = [];
        acc[rec.priority].push(rec);
        return acc;
      },
      {} as Record<string, typeof analysis.recommendations>,
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SEO Audit Report - ${url}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #1f2937;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .score-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(${scoreColor} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            position: relative;
          }
          .score-circle::before {
            content: '';
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: white;
            position: absolute;
          }
          .score-text {
            position: relative;
            z-index: 1;
            font-size: 24px;
            font-weight: 700;
            color: ${scoreColor};
          }
          .score-label {
            color: #6b7280;
            font-size: 14px;
            margin-top: 10px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 5px;
          }
          .metric-label {
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .section h2 {
            margin: 0 0 20px 0;
            color: #1f2937;
            font-size: 20px;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .issue-card {
            background: #f9fafb;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 0 8px 8px 0;
          }
          .issue-card.warning {
            border-left-color: #f59e0b;
          }
          .issue-card.info {
            border-left-color: #3b82f6;
          }
          .issue-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #1f2937;
          }
          .issue-description {
            color: #6b7280;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .issue-fix {
            background: #f0f9ff;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            color: #0369a1;
          }
          .recommendation-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
          }
          .recommendation-priority {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          .priority-high {
            background: #fef2f2;
            color: #dc2626;
          }
          .priority-medium {
            background: #fffbeb;
            color: #d97706;
          }
          .priority-low {
            background: #f0f9ff;
            color: #2563eb;
          }
          .competitor-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .competitor-table th,
          .competitor-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .competitor-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SEO Audit Report</h1>
          <p>Generated for ${projectName} • ${new Date(createdAt).toLocaleDateString()}</p>
        </div>

        <div class="score-section">
          <div class="score-circle">
            <div class="score-text">${score}</div>
          </div>
          <div class="score-label">${scoreText} • ${score}/100</div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${analysis.metrics.pageSpeed}</div>
            <div class="metric-label">Page Speed</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analysis.metrics.seoBasics}</div>
            <div class="metric-label">SEO Basics</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analysis.metrics.contentQuality}</div>
            <div class="metric-label">Content Quality</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analysis.metrics.technicalSEO}</div>
            <div class="metric-label">Technical SEO</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${analysis.metrics.mobileOptimization}</div>
            <div class="metric-label">Mobile Optimization</div>
          </div>
        </div>

        <div class="section">
          <h2>Issues Found (${analysis.issues.length})</h2>
          ${Object.entries(issuesByCategory)
            .map(
              ([category, issues]) => `
            <h3 style="color: #374151; margin: 20px 0 10px 0;">${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
            ${issues
              .map(
                (issue) => `
              <div class="issue-card ${issue.type}">
                <div class="issue-title">${issue.title}</div>
                <div class="issue-description">${issue.description}</div>
                <div class="issue-fix"><strong>How to fix:</strong> ${issue.fix}</div>
              </div>
            `,
              )
              .join('')}
          `,
            )
            .join('')}
        </div>

        <div class="section">
          <h2>Recommendations (${analysis.recommendations.length})</h2>
          ${Object.entries(recommendationsByPriority)
            .map(
              ([priority, recommendations]) => `
            <h3 style="color: #374151; margin: 20px 0 10px 0;">${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority</h3>
            ${recommendations
              .map(
                (rec) => `
              <div class="recommendation-card">
                <div class="recommendation-priority priority-${rec.priority}">${rec.priority.toUpperCase()}</div>
                <div style="font-weight: 600; margin-bottom: 5px;">${rec.title}</div>
                <div style="color: #6b7280; margin-bottom: 10px;">${rec.description}</div>
                <div style="font-size: 14px;">
                  <span style="color: #059669;">Impact: ${rec.impact}%</span> • 
                  <span style="color: #7c3aed;">Effort: ${rec.effort}</span>
                </div>
              </div>
            `,
              )
              .join('')}
          `,
            )
            .join('')}
        </div>

        ${
          analysis.competitors.length > 0
            ? `
          <div class="section">
            <h2>Competitor Analysis</h2>
            <table class="competitor-table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Score</th>
                  <th>Strengths</th>
                  <th>Weaknesses</th>
                  <th>Opportunities</th>
                </tr>
              </thead>
              <tbody>
                ${analysis.competitors
                  .map(
                    (comp) => `
                  <tr>
                    <td>${comp.url}</td>
                    <td style="font-weight: 600; color: ${comp.score >= 80 ? '#10B981' : comp.score >= 60 ? '#F59E0B' : '#EF4444'};">${comp.score}/100</td>
                    <td>${comp.strengths.slice(0, 2).join(', ')}</td>
                    <td>${comp.weaknesses.slice(0, 2).join(', ')}</td>
                    <td>${comp.gaps.slice(0, 2).join(', ')}</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        <div class="footer">
          <p>Generated by RankPilot • Audit ID: ${auditId}</p>
          <p>URL: ${url} • User: ${userName}</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  public async generatePDF(data: AuditReportData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      const html = await this.generateHTML(data);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
