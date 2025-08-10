import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export interface RateLimitConfig {
  max: number;
  timeWindow: string;
  keyGenerator?: (request: FastifyRequest) => string;
  errorResponseBuilder?: (request: FastifyRequest, context: any) => any;
}

export class RateLimitService {
  /**
   * Apply rate limiting to a specific route with custom configuration
   */
  static async applyRouteRateLimit(
    fastify: FastifyInstance,
    route: string,
    config: RateLimitConfig
  ) {
    await fastify.register(rateLimit, {
      ...config,
      keyGenerator: config.keyGenerator || ((request) => request.user?.userId || request.ip),
      errorResponseBuilder: config.errorResponseBuilder || (() => ({
        code: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later'
      }))
    });
  }

  /**
   * Get rate limit configuration for authentication endpoints
   * These need stricter limits to prevent brute force attacks
   */
  static getAuthRateLimitConfig(): RateLimitConfig {
    return {
      max: 5, // 5 attempts per window
      timeWindow: '15 minutes', // 15 minute window
      errorResponseBuilder: () => ({
        code: 429,
        error: 'Too Many Authentication Attempts',
        message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
      })
    };
  }

  /**
   * Get rate limit configuration for file upload endpoints
   * These need moderate limits to prevent abuse
   */
  static getUploadRateLimitConfig(): RateLimitConfig {
    return {
      max: 10, // 10 uploads per window
      timeWindow: '1 hour', // 1 hour window
      errorResponseBuilder: () => ({
        code: 429,
        error: 'Too Many Uploads',
        message: 'Too many file uploads. Please wait 1 hour before uploading more files.'
      })
    };
  }

  /**
   * Get rate limit configuration for passkey operations
   * These need moderate limits to prevent abuse
   */
  static getPasskeyRateLimitConfig(): RateLimitConfig {
    return {
      max: 20, // 20 operations per window
      timeWindow: '1 hour', // 1 hour window
      errorResponseBuilder: () => ({
        code: 429,
        error: 'Too Many Passkey Operations',
        message: 'Too many passkey operations. Please wait 1 hour before trying again.'
      })
    };
  }

  /**
   * Get rate limit configuration for general API endpoints
   * These can have more lenient limits
   */
  static getGeneralRateLimitConfig(): RateLimitConfig {
    return {
      max: 100, // 100 requests per window
      timeWindow: '1 minute', // 1 minute window
      errorResponseBuilder: () => ({
        code: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later.'
      })
    };
  }
}
