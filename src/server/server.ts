import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

import authRoutes from './routes/auth.js';
import articleRoutes from './routes/articles.js';
import userRoutes from './routes/users.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';
import { setupQueue, cleanupStuckExtractions } from './services/queue.js';
import { createDefaultAdmin } from './services/auth.js';
import { configureSecurityHeaders } from './config/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
});

// Register plugins
const { allowedOrigins } = await import('./config/security.js').then(m => m.getSecurityConfig());

await server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
});

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
});

await server.register(multipart);

// Configure security headers
await configureSecurityHeaders(server);

// Configure rate limiting
await server.register(rateLimit, {
  global: true,
  max: 100, // Default: 100 requests per window
  timeWindow: '1 minute', // Default window
  allowList: ['127.0.0.1', '::1'], // Allow localhost
  errorResponseBuilder: () => ({
    code: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded, please try again later'
  }),
  // Custom rate limit for specific routes
  keyGenerator: (request) => {
    // Use user ID if authenticated, otherwise use IP
    return request.user?.userId || request.ip;
  }
});

// Serve frontend static files
const projectRoot = path.resolve(__dirname, '..', '..');
const publicPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'public')  // dist/public (when compiled)
  : path.join(projectRoot, 'dist', 'public'); // dist/public (when running via tsx)



await server.register(staticFiles, {
  root: publicPath,
  prefix: '/',
  decorateReply: false
});

// Note: User assets will be handled by the root static handler
// They should be placed in dist/public/assets/ for now

// Add Prisma to server context
server.decorate('prisma', prisma);

// Authentication decorator
server.decorate('authenticate', async function (request, reply) {
  try {
    console.log('🔐 Auth middleware - Headers:', {
      authorization: request.headers.authorization ? `${request.headers.authorization.substring(0, 20)}...` : 'missing',
      url: request.url
    });
    
    await request.jwtVerify();
    
    console.log('✅ Auth middleware - JWT verified, user:', request.user);
  } catch (err) {
    console.error('❌ Auth middleware - JWT verification failed:', err instanceof Error ? err.message : err);
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API Health check
server.get('/api/health', async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error) {
    return { 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// API routes
await server.register(authRoutes, { prefix: '/api/auth' });
await server.register(articleRoutes, { prefix: '/api/articles' });
await server.register(userRoutes, { prefix: '/api/users' });
await server.register(configRoutes, { prefix: '/api/config' });
await server.register(adminRoutes, { prefix: '/api/admin' });

// SPA fallback - serve index.html for all non-API routes
server.setNotFoundHandler(async (request, reply) => {
  const url = request.url;
  
  // If it's an API route, return 404
  if (url.startsWith('/api/')) {
    reply.code(404).send({ error: 'API endpoint not found' });
    return;
  }
  
  // Serve the index.html for SPA routing
  const indexPath = path.join(publicPath, 'index.html');
  try {
    const html = await fs.readFile(indexPath, 'utf-8');
    reply.type('text/html').send(html);
  } catch (error) {
    reply.code(500).send({ error: 'Frontend not built. Please wait for initial build to complete.' });
  }
});

// Global error handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.code(500).send({ error: 'Internal Server Error' });
});

// Startup sequence
const start = async () => {
  try {
    // Setup queue
    await setupQueue(prisma);
    
    // Cleanup any stuck extractions from previous runs
    await cleanupStuckExtractions();
    
    // Create default admin user
    await createDefaultAdmin(prisma);
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    
    server.log.info(`🚀 Leelo server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Shutting down server...');
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();