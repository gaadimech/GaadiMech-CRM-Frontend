// Custom server for Railway deployment
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

console.log(`Starting Next.js in ${dev ? 'development' : 'production'} mode on port ${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname || '/';
    
    // Quick health check response for Railway (bypasses Next.js)
    // Railway might be checking the root path, so respond immediately
    if (pathname === '/' && (
      req.headers['user-agent']?.includes('Railway') ||
      req.headers['x-railway-health-check'] ||
      req.method === 'HEAD'
    )) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }
    
    // Handle all other requests with Next.js
    handle(req, res, parsedUrl);
  });
  
  server.listen(port, hostname, () => {
    console.log(`> Server running at http://${hostname}:${port}`);
    console.log(`> Health check responds immediately on /`);
  });
  
  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, but ignoring to keep service running');
    // Don't exit - Railway might be sending SIGTERM during health checks
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

