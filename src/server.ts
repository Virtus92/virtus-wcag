import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebCrawler } from './crawler';
import { WCAGAuditor } from './auditor';
import { EnterpriseReportGenerator } from './pdf-generator-pro';
import { auditRequestSchema, ValidatedAuditRequest } from './utils/validation';
import crypto from 'crypto';

config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 3000;

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

// Clean up old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.timestamp < oneHourAgo) {
      console.log(`Cleaning up old job: ${jobId}`);
      jobs.delete(jobId);
    }
  }
}, 600000); // Run every 10 minutes

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

// Ensure reports directory exists
const REPORTS_DIR = join(__dirname, '../reports');
mkdir(REPORTS_DIR, { recursive: true }).catch(console.error);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Client can request job status on reconnect
  socket.on('resume', (jobId: string) => {
    const job = jobs.get(jobId);
    if (job) {
      console.log(`Client ${socket.id} resuming job ${jobId}`);
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
    console.error('Audit error:', error);

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
    console.log('Starting background audit for:', validatedRequest.url);
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
      validatedRequest.followExternal
    );

    await crawler.close();

    if (crawlResult.discoveredUrls.length === 0) {
      emitToJob('error', { message: 'No pages found to audit' });
      updateJobStatus({ status: 'error', error: 'No pages found to audit' });
      return;
    }

    console.log(`Discovered ${crawlResult.discoveredUrls.length} pages`);
    emitToJob('progress', {
      stage: 'discovered',
      message: `Found ${crawlResult.discoveredUrls.length} pages`,
      progress: 30,
      pages: crawlResult.discoveredUrls
    });
    updateJobStatus({ progress: 30, message: `Found ${crawlResult.discoveredUrls.length} pages` });

    // Initialize auditor
    const auditor = new WCAGAuditor();
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

    console.log(`Audit complete. Found ${auditReport.totalViolations} violations`);
    emitToJob('progress', {
      stage: 'generating',
      message: 'Generating PDF report...',
      progress: 90,
      violations: auditReport.totalViolations
    });
    updateJobStatus({ progress: 90, message: 'Generating PDF report...' });

    // Generate PDF with Enterprise generator
    const timestamp = new Date().getTime();
    const filename = `audit-report-${timestamp}.pdf`;
    const filepath = join(REPORTS_DIR, filename);

    const pdfGenerator = new EnterpriseReportGenerator();
    await pdfGenerator.generate(auditReport, filepath);

    console.log(`PDF report generated: ${filename}`);

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
      downloadUrl: `/api/download/${filename}`,
    };

    emitToJob('complete', resultData);
    updateJobStatus({ status: 'complete', progress: 100, message: 'Complete', result: resultData });

  } catch (error: any) {
    console.error('Background job error:', error);
    emitToJob('error', { message: error.message || 'Audit failed' });
    updateJobStatus({ status: 'error', error: error.message || 'Audit failed' });
  }
}

// Download PDF endpoint
app.get('/api/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;

    // Security: validate filename
    if (!/^audit-report-\d+\.pdf$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = join(REPORTS_DIR, filename);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Report not found' });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
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
