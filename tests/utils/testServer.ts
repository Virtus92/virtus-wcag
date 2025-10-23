import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createReadStream, promises as fs } from 'fs';
import { join, resolve, extname } from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export async function startTestServer(rootDir: string): Promise<TestServer> {
  const root = resolve(rootDir);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');

      // Map "/" to "/index.html"
      let filePath = join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));

      // Prevent path traversal
      if (!filePath.startsWith(root)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      // Special: robots.txt default if not present
      if (url.pathname === '/robots.txt') {
        const robots = 'User-agent: *\nAllow: /\n';
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(robots);
        return;
      }

      try {
        await fs.access(filePath);
      } catch {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const type = CONTENT_TYPES[extname(filePath)] || 'application/octet-stream';
      res.statusCode = 200;
      res.setHeader('Content-Type', type);
      const stream = createReadStream(filePath);
      stream.pipe(res);
    } catch (err: any) {
      res.statusCode = 500;
      res.end('Server error: ' + (err?.message || 'unknown'));
    }
  });

  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (address && typeof address === 'object') {
    const url = `http://127.0.0.1:${address.port}`;
    return {
      url,
      close: () => new Promise<void>(resolve => server.close(() => resolve())),
    };
  }
  throw new Error('Failed to start test server');
}

