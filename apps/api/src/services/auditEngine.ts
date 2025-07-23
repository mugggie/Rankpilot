import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface SEOAnalysis {
  score: number;
  metrics: {
    pageSpeed: number;
    seoBasics: number;
    contentQuality: number;
    technicalSEO: number;
    mobileOptimization: number;
  };
  issues: SEOIssue[];
  recommendations: Recommendation[];
  competitors: CompetitorAnalysis[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: 'technical' | 'content' | 'performance' | 'mobile';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  effort: 'easy' | 'medium' | 'hard';
  impact: number; // 1-100
}

export interface CompetitorAnalysis {
  url: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
}

export class AuditEngine {
  private async fetchPage(url: string): Promise<{ html: string; responseTime: number }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.com/bot)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const responseTime = Date.now() - startTime;

      return { html, responseTime };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Page took too long to load');
      }
      throw new Error(`Failed to fetch page: ${error}`);
    }
  }

  private analyzePageSpeed(responseTime: number): number {
    // Score based on response time (lower is better)
    if (responseTime < 500) return 100;
    if (responseTime < 1000) return 90;
    if (responseTime < 2000) return 75;
    if (responseTime < 3000) return 60;
    if (responseTime < 5000) return 40;
    return 20;
  }

  private analyzeSEOBasics(dom: JSDOM): { score: number; issues: SEOIssue[] } {
    const document = dom.window.document;
    const issues: SEOIssue[] = [];
    let score = 100;

    // Check title tag
    const title = document.querySelector('title');
    if (!title || !title.textContent?.trim()) {
      issues.push({
        type: 'error',
        category: 'technical',
        title: 'Missing Title Tag',
        description: 'Every page should have a unique, descriptive title tag.',
        impact: 'high',
        fix: 'Add a unique title tag that describes the page content (50-60 characters).',
      });
      score -= 15;
    } else if (title.textContent.length > 60) {
      issues.push({
        type: 'warning',
        category: 'technical',
        title: 'Title Too Long',
        description: 'Title tag is longer than recommended 60 characters.',
        impact: 'medium',
        fix: 'Shorten the title to 50-60 characters for better display in search results.',
      });
      score -= 5;
    }

    // Check meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc || !metaDesc.getAttribute('content')?.trim()) {
      issues.push({
        type: 'error',
        category: 'technical',
        title: 'Missing Meta Description',
        description: 'Meta description helps with click-through rates from search results.',
        impact: 'high',
        fix: 'Add a compelling meta description (150-160 characters) that summarizes the page content.',
      });
      score -= 10;
    } else if (metaDesc.getAttribute('content')!.length > 160) {
      issues.push({
        type: 'warning',
        category: 'technical',
        title: 'Meta Description Too Long',
        description: 'Meta description exceeds recommended 160 characters.',
        impact: 'medium',
        fix: 'Shorten the meta description to 150-160 characters.',
      });
      score -= 3;
    }

    // Check headings structure
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      issues.push({
        type: 'error',
        category: 'content',
        title: 'Missing H1 Tag',
        description: 'Every page should have exactly one H1 tag.',
        impact: 'high',
        fix: 'Add a single H1 tag that describes the main topic of the page.',
      });
      score -= 10;
    } else if (h1s.length > 1) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Multiple H1 Tags',
        description: 'Page has multiple H1 tags, which can confuse search engines.',
        impact: 'medium',
        fix: 'Use only one H1 tag per page and use H2-H6 for other headings.',
      });
      score -= 5;
    }

    // Check images for alt text
    const images = document.querySelectorAll('img');
    const imagesWithoutAlt = Array.from(images).filter((img) => !img.getAttribute('alt'));
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        category: 'technical',
        title: 'Images Missing Alt Text',
        description: `${imagesWithoutAlt.length} images are missing alt text.`,
        impact: 'medium',
        fix: 'Add descriptive alt text to all images for accessibility and SEO.',
      });
      score -= Math.min(10, imagesWithoutAlt.length * 2);
    }

    return { score: Math.max(0, score), issues };
  }

  private analyzeContentQuality(dom: JSDOM): { score: number; issues: SEOIssue[] } {
    const document = dom.window.document;
    const issues: SEOIssue[] = [];
    let score = 100;

    // Extract readable content
    const article = new Readability(document).parse();
    const content = article?.textContent || '';
    const wordCount = content.split(/\s+/).length;

    // Check content length
    if (wordCount < 300) {
      issues.push({
        type: 'warning',
        category: 'content',
        title: 'Content Too Short',
        description: `Page has only ${wordCount} words. Longer content typically ranks better.`,
        impact: 'medium',
        fix: 'Add more valuable, relevant content to provide comprehensive information.',
      });
      score -= 15;
    } else if (wordCount < 500) {
      issues.push({
        type: 'info',
        category: 'content',
        title: 'Content Could Be Longer',
        description: `Page has ${wordCount} words. Consider adding more content for better rankings.`,
        impact: 'low',
        fix: 'Expand the content with more detailed information and examples.',
      });
      score -= 5;
    }

    // Check for keyword density (basic analysis)
    const title = document.querySelector('title')?.textContent?.toLowerCase() || '';
    const h1 = document.querySelector('h1')?.textContent?.toLowerCase() || '';
    const contentLower = content.toLowerCase();

    // Extract potential keywords from title and H1
    const potentialKeywords = [
      ...new Set([...title.split(/\s+/), ...h1.split(/\s+/)].filter((word) => word.length > 3)),
    ];

    potentialKeywords.forEach((keyword) => {
      const keywordCount = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      const density = (keywordCount / wordCount) * 100;

      if (density > 5) {
        issues.push({
          type: 'warning',
          category: 'content',
          title: 'Potential Keyword Stuffing',
          description: `Keyword "${keyword}" appears ${keywordCount} times (${density.toFixed(1)}% density).`,
          impact: 'medium',
          fix: 'Reduce keyword density to 1-3% and focus on natural, valuable content.',
        });
        score -= 10;
      }
    });

    return { score: Math.max(0, score), issues };
  }

  private analyzeTechnicalSEO(dom: JSDOM, url: string): { score: number; issues: SEOIssue[] } {
    const document = dom.window.document;
    const issues: SEOIssue[] = [];
    let score = 100;

    // Check for canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      issues.push({
        type: 'warning',
        category: 'technical',
        title: 'Missing Canonical URL',
        description: 'Canonical URL helps prevent duplicate content issues.',
        impact: 'medium',
        fix: 'Add a canonical URL pointing to the preferred version of this page.',
      });
      score -= 5;
    }

    // Check for robots meta tag
    const robots = document.querySelector('meta[name="robots"]');
    if (robots && robots.getAttribute('content')?.includes('noindex')) {
      issues.push({
        type: 'error',
        category: 'technical',
        title: 'Page Blocked from Indexing',
        description: 'This page is set to not be indexed by search engines.',
        impact: 'high',
        fix: 'Remove "noindex" from robots meta tag if you want this page to rank in search results.',
      });
      score -= 50;
    }

    // Check for structured data
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
    if (structuredData.length === 0) {
      issues.push({
        type: 'info',
        category: 'technical',
        title: 'No Structured Data',
        description: 'Structured data helps search engines understand your content better.',
        impact: 'low',
        fix: 'Add structured data (JSON-LD) to help search engines understand your content.',
      });
      score -= 3;
    }

    // Check for internal links
    const internalLinks = Array.from(document.querySelectorAll('a[href]')).filter((link) => {
      const href = link.getAttribute('href');
      return href && (href.startsWith('/') || href.includes(new URL(url).hostname));
    });

    if (internalLinks.length < 3) {
      issues.push({
        type: 'info',
        category: 'technical',
        title: 'Few Internal Links',
        description: `Page has only ${internalLinks.length} internal links.`,
        impact: 'low',
        fix: 'Add more internal links to help users navigate and improve SEO.',
      });
      score -= 3;
    }

    return { score: Math.max(0, score), issues };
  }

  private analyzeMobileOptimization(dom: JSDOM): { score: number; issues: SEOIssue[] } {
    const document = dom.window.document;
    const issues: SEOIssue[] = [];
    let score = 100;

    // Check for viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      issues.push({
        type: 'error',
        category: 'mobile',
        title: 'Missing Viewport Meta Tag',
        description: 'Viewport meta tag is essential for mobile optimization.',
        impact: 'high',
        fix: 'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      });
      score -= 20;
    }

    // Check for touch-friendly elements
    const buttons = document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"]',
    );
    const smallButtons = Array.from(buttons).filter((button) => {
      const style = button.getAttribute('style') || '';
      const width = style.match(/width:\s*(\d+)px/)?.[1];
      const height = style.match(/height:\s*(\d+)px/)?.[1];
      return (width && parseInt(width) < 44) || (height && parseInt(height) < 44);
    });

    if (smallButtons.length > 0) {
      issues.push({
        type: 'warning',
        category: 'mobile',
        title: 'Small Touch Targets',
        description: `${smallButtons.length} elements may be too small for mobile users.`,
        impact: 'medium',
        fix: 'Ensure all clickable elements are at least 44x44 pixels for mobile usability.',
      });
      score -= 10;
    }

    return { score: Math.max(0, score), issues };
  }

  private generateRecommendations(issues: SEOIssue[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group issues by category
    const technicalIssues = issues.filter((issue) => issue.category === 'technical');
    const contentIssues = issues.filter((issue) => issue.category === 'content');
    const performanceIssues = issues.filter((issue) => issue.category === 'performance');
    const mobileIssues = issues.filter((issue) => issue.category === 'mobile');

    // High priority recommendations
    if (technicalIssues.some((issue) => issue.impact === 'high')) {
      recommendations.push({
        priority: 'high',
        category: 'Technical SEO',
        title: 'Fix Critical Technical Issues',
        description: 'Address high-impact technical SEO issues to improve search rankings.',
        effort: 'medium',
        impact: 85,
      });
    }

    if (contentIssues.some((issue) => issue.impact === 'high')) {
      recommendations.push({
        priority: 'high',
        category: 'Content',
        title: 'Improve Content Quality',
        description: 'Enhance content to provide more value to users and search engines.',
        effort: 'hard',
        impact: 90,
      });
    }

    // Medium priority recommendations
    if (performanceIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        title: 'Optimize Page Speed',
        description: 'Improve page loading speed for better user experience and rankings.',
        effort: 'medium',
        impact: 70,
      });
    }

    if (mobileIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Mobile',
        title: 'Enhance Mobile Experience',
        description: 'Improve mobile optimization for better mobile search rankings.',
        effort: 'medium',
        impact: 65,
      });
    }

    return recommendations;
  }

  public async analyzePage(url: string): Promise<SEOAnalysis> {
    console.log(`Starting SEO analysis for: ${url}`);

    // Fetch the page
    const { html, responseTime } = await this.fetchPage(url);

    // Parse HTML
    const dom = new JSDOM(html, { url });

    // Run all analyses
    const pageSpeedScore = this.analyzePageSpeed(responseTime);
    const seoBasics = this.analyzeSEOBasics(dom);
    const contentQuality = this.analyzeContentQuality(dom);
    const technicalSEO = this.analyzeTechnicalSEO(dom, url);
    const mobileOptimization = this.analyzeMobileOptimization(dom);

    // Combine all issues
    const allIssues = [
      ...seoBasics.issues,
      ...contentQuality.issues,
      ...technicalSEO.issues,
      ...mobileOptimization.issues,
    ];

    // Generate recommendations
    const recommendations = this.generateRecommendations(allIssues);

    // Calculate overall score
    const metrics = {
      pageSpeed: pageSpeedScore,
      seoBasics: seoBasics.score,
      contentQuality: contentQuality.score,
      technicalSEO: technicalSEO.score,
      mobileOptimization: mobileOptimization.score,
    };

    const overallScore = Math.round(
      (metrics.pageSpeed +
        metrics.seoBasics +
        metrics.contentQuality +
        metrics.technicalSEO +
        metrics.mobileOptimization) /
        5,
    );

    console.log(`SEO analysis completed. Score: ${overallScore}/100`);

    return {
      score: overallScore,
      metrics,
      issues: allIssues,
      recommendations,
      competitors: [], // Will be implemented in next step
    };
  }
}
