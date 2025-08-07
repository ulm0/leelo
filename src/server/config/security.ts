import { FastifyInstance } from 'fastify';

export interface SecurityConfig {
  isProduction: boolean;
  allowedOrigins: string[];
  enableHSTS: boolean;
}

export function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    isProduction,
    allowedOrigins: isProduction 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    enableHSTS: isProduction,
  };
}

export async function configureSecurityHeaders(fastify: FastifyInstance) {
  const config = getSecurityConfig();
  
  // Use helmet middleware with Fastify hooks
  const helmet = (await import('helmet')).default;
  const helmetMiddleware = helmet({
    // Content Security Policy - Configured for SPA and article content
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com"
        ],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'" // Required for React development
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com", 
          "data:", 
          "https:"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "blob:", 
          "*" // Allow external images for articles
        ],
        connectSrc: ["'self'"],
        mediaSrc: [
          "'self'", 
          "https:" // Allow external media for articles
        ],
        objectSrc: ["'none'"],
        frameSrc: [
          "'self'", 
          "https://www.youtube.com", 
          "https://youtube.com",
          "https://www.youtube-nocookie.com"
        ],
        workerSrc: ["'self'", "blob:"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disabled for development compatibility
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // DNS and network security
    dnsPrefetchControl: { allow: false },
    
    // Frame and embedding protection
    frameguard: { action: "deny" },
    
    // Information disclosure prevention
    hidePoweredBy: true,
    
    // HTTPS enforcement
    hsts: config.enableHSTS ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false,
    
    // Legacy browser protection
    ieNoOpen: false, // Disabled as IE is deprecated
    
    // Origin isolation
    originAgentCluster: false, // Disabled for compatibility
    
    // MIME type protection
    noSniff: true,
    
    // Browser feature restrictions - Using feature-policy header
    // Note: permissionsPolicy is not available in this version of helmet
    
    // Referrer information control
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // XSS protection
    xssFilter: true,
  });
  
  // Apply helmet middleware using Fastify hooks
  fastify.addHook('onRequest', async (request, reply) => {
    return new Promise((resolve, reject) => {
      helmetMiddleware(request.raw, reply.raw, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
