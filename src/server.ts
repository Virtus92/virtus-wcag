import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebCrawler } from './crawler';
import { EnhancedWCAGAuditor } from './auditor-enhanced';
import { ExecutiveReportGenerator } from './pdf-generator-executive';
import { auditRequestSchema, ValidatedAuditRequest } from './utils/validation';
import crypto from 'crypto';
import { auditConfig, jobConfig, loggingConfig, serverConfig } from './config';
import logger from './utils/logger';
import { chromium } from 'playwright';

config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = serverConfig.port;

// Job tracking
interface JobStatus {
  jobId: string;
  socketId: string;
  status: 'running' | 'complete' | 'error';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  timestamp: number;
}

const jobs = new Map<string, JobStatus>();
const metrics = {
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  pagesCrawled: 0,
  violationsFound: 0,
};

// Clean up old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.timestamp < oneHourAgo) {
      logger.info('Cleaning up old job', { jobId });
      jobs.delete(jobId);
    }
  }
}, jobConfig.cleanupIntervalMs); // Run on configured interval

// Trust proxy for rate limiter
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Ensure reports and HAR directories exist
const REPORTS_DIR = join(__dirname, '../reports');
mkdir(REPORTS_DIR, { recursive: true }).catch(err => logger.error('Failed to create reports dir', err));
mkdir(join(__dirname, '..', auditConfig.harDir), { recursive: true }).catch(() => {});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.debug('Client connected', { socketId: socket.id });

  // Client can request job status on reconnect
  socket.on('resume', (jobId: string) => {
    const job = jobs.get(jobId);
    if (job) {
      logger.debug('Client resuming job', { socketId: socket.id, jobId });
      job.socketId = socket.id; // Update socket ID

      if (job.status === 'complete') {
        socket.emit('complete', job.result);
      } else if (job.status === 'error') {
        socket.emit('error', { message: job.error });
      } else {
        socket.emit('progress', {
          message: job.message,
          progress: job.progress
        });
      }
    } else {
      socket.emit('error', { message: 'Job not found or expired' });
    }
  });
});

// Main audit endpoint - async job pattern
app.post('/api/audit', async (req: Request, res: Response, next: NextFunction) => {
  const socketId = req.body.socketId;

  try {
    // Validate request
    const validatedRequest = auditRequestSchema.parse(req.body) as ValidatedAuditRequest;

    // Generate unique job ID
    const jobId = crypto.randomBytes(16).toString('hex');

    console.log('Starting audit for:', validatedRequest.url, 'Job ID:', jobId);

  // Initialize job status
  jobs.set(jobId, {
      jobId,
      socketId,
      status: 'running',
      progress: 0,
      message: 'Starting...',
    timestamp: Date.now()
  });
    metrics.totalJobs += 1;

    // Return immediately with job accepted
    res.json({
      success: true,
      message: 'Audit job started',
      jobId: jobId,
      socketId: socketId
    });

    // Run audit in background
    runAuditJob(validatedRequest, jobId).catch(err => {
      console.error('Audit job error:', err);
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = err.message;
        io.to(job.socketId).emit('error', { message: err.message });
      }
    });

  } catch (error: any) {
    logger.error('Audit error', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
    }

    next(error);
  }
});

// Background job runner
async function runAuditJob(validatedRequest: ValidatedAuditRequest, jobId: string) {
  const getJob = () => jobs.get(jobId);
  const emitToJob = (event: string, data: any) => {
    const job = getJob();
    if (job) {
      io.to(job.socketId).emit(event, data);
    }
  };
  const updateJobStatus = (updates: Partial<JobStatus>) => {
    const job = getJob();
    if (job) {
      Object.assign(job, updates, { timestamp: Date.now() });
    }
  };

  try {
    logger.info('Starting background audit', { url: validatedRequest.url });
    emitToJob('progress', { stage: 'crawling', message: 'Initializing crawler...', progress: 5 });
    updateJobStatus({ progress: 5, message: 'Initializing crawler...' });

    // Initialize crawler
    const crawler = new WebCrawler();
    await crawler.initialize();

    emitToJob('progress', { stage: 'crawling', message: `Crawling ${validatedRequest.url}...`, progress: 10 });
    updateJobStatus({ progress: 10, message: `Crawling ${validatedRequest.url}...` });

    // Crawl website
    const crawlResult = await crawler.crawl(
      validatedRequest.url,
      validatedRequest.maxPages,
      validatedRequest.includeSubdomains,
      { maxDepth: auditConfig.crawlMaxDepth, maxTimeMs: auditConfig.crawlMaxTimeMs, respectRobotsTxt: true }
    );

    await crawler.close();

    if (crawlResult.discoveredUrls.length === 0) {
      emitToJob('error', { message: 'No pages found to audit' });
      updateJobStatus({ status: 'error', error: 'No pages found to audit' });
      return;
    }

    const totalDiscovered = crawlResult.discoveredUrls.length;
    const unvisitedCount = crawlResult.unvisitedUrls.length;
    const failedCount = crawlResult.failedUrls.length;
    metrics.pagesCrawled += totalDiscovered;

    logger.info('Crawl complete', { visited: totalDiscovered, unvisited: unvisitedCount, failed: failedCount });

    emitToJob('progress', {
      stage: 'discovered',
      message: `Crawled ${totalDiscovered} pages${unvisitedCount > 0 ? ` (${unvisitedCount} discovered but not visited)` : ''}`,
      progress: 30,
      pages: crawlResult.discoveredUrls,
      unvisitedPages: crawlResult.unvisitedUrls,
      failedPages: crawlResult.failedUrls
    });
    updateJobStatus({
      progress: 30,
      message: `Crawled ${totalDiscovered} pages${unvisitedCount > 0 ? ` (${unvisitedCount} skipped)` : ''}`
    });

    // Initialize auditor
    const auditor = new EnhancedWCAGAuditor();
    await auditor.initialize();

    emitToJob('progress', { stage: 'auditing', message: 'Starting accessibility audit...', progress: 40 });
    updateJobStatus({ progress: 40, message: 'Starting accessibility audit...' });

    // Audit all discovered pages with progress updates
    const auditReport = await auditor.auditMultiplePages(crawlResult.discoveredUrls, (current, total) => {
      const auditProgress = 40 + (50 * current / total);
      const progressData = {
        stage: 'auditing',
        message: `Auditing page ${current}/${total}`,
        progress: Math.round(auditProgress),
        currentPage: crawlResult.discoveredUrls[current - 1]
      };
      emitToJob('progress', progressData);
      updateJobStatus({ progress: Math.round(auditProgress), message: `Auditing page ${current}/${total}` });
    });

    await auditor.close();

    logger.info('Audit complete', { totalViolations: auditReport.totalViolations });
    metrics.violationsFound += auditReport.totalViolations;
    emitToJob('progress', {
      stage: 'generating',
      message: 'Generating PDF report...',
      progress: 90,
      violations: auditReport.totalViolations
    });
    updateJobStatus({ progress: 90, message: 'Generating PDF report...' });

    // Generate PDF with Enterprise generator
    const timestamp = new Date().getTime();
    const baseName = `audit-report-${timestamp}`;
    const pdfFile = `${baseName}.pdf`;
    const jsonFile = `${baseName}.json`;
    const pdfPath = join(REPORTS_DIR, pdfFile);
    const jsonPath = join(REPORTS_DIR, jsonFile);

    const pdfGenerator = new ExecutiveReportGenerator();
    // Persist machine-readable JSON next to PDF for reproducibility
    const enriched = {
      meta: {
        generatedAt: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development',
        axeCoreVersion: require('axe-core/package.json').version,
        config: {
          audit: auditConfig,
        },
      },
      report: auditReport,
    };
    await writeFile(jsonPath, JSON.stringify(enriched, null, 2), 'utf-8');

    await pdfGenerator.generate(auditReport, pdfPath);

    logger.info('Reports generated', { pdf: pdfFile, json: jsonFile });

    // Send completion via WebSocket
    const resultData = {
      success: true,
      report: {
        baseUrl: auditReport.baseUrl,
        totalPages: auditReport.totalPages,
        totalViolations: auditReport.totalViolations,
        criticalIssues: auditReport.criticalIssues,
        seriousIssues: auditReport.seriousIssues,
        moderateIssues: auditReport.moderateIssues,
        minorIssues: auditReport.minorIssues,
        scanDate: auditReport.scanDate,
        wcagVersion: auditReport.wcagVersion,
        conformanceLevel: auditReport.conformanceLevel,
      },
      downloadUrl: `/api/download/${pdfFile}`,
      jsonUrl: `/api/download/${jsonFile}`,
    };

    emitToJob('complete', resultData);
    updateJobStatus({ status: 'complete', progress: 100, message: 'Complete', result: resultData });
    metrics.completedJobs += 1;

  } catch (error: any) {
    console.error('Background job error:', error);
    emitToJob('error', { message: error.message || 'Audit failed' });
    updateJobStatus({ status: 'error', error: error.message || 'Audit failed' });
    metrics.failedJobs += 1;
  }
}

// Download PDF endpoint
app.get('/api/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;

    // Security: validate filename (pdf or json)
    if (!/^audit-report-\d+\.(pdf|json)$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = join(REPORTS_DIR, filename);

    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('Download error', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Report not found' });
        }
      }
    });
  } catch (error) {
    logger.error('Download error', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Server error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Basic metrics endpoint (JSON)
app.get('/api/metrics', (req: Request, res: Response) => {
  res.json({
    ...metrics,
    runningJobs: Array.from(jobs.values()).filter(j => j.status === 'running').length,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`WCAG Audit Tool running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`WebSocket support enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
