import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';

// Helper function to create email transporter with improved configuration
async function createEmailTransporter(config: any) {
  const nodemailer = await import('nodemailer');
  
  // Create transport configuration based on port
  const transportConfig: any = {
    host: config.host,
    port: config.port,
    auth: {
      user: config.username,
      pass: config.password,
    },
    // Add connection timeout
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  // Configure security based on port
  if (config.port === 587) {
    // Port 587: Use STARTTLS (most common for modern providers)
    transportConfig.secure = false;
    transportConfig.requireTLS = true;
    transportConfig.ignoreTLS = false;
  } else if (config.port === 465) {
    // Port 465: Use SSL/TLS from the start
    transportConfig.secure = true;
    transportConfig.tls = {
      rejectUnauthorized: false, // Allow self-signed certificates
    };
  } else if (config.port === 25) {
    // Port 25: No encryption (not recommended)
    transportConfig.secure = false;
    transportConfig.ignoreTLS = true;
  } else {
    // Other ports: Use the config setting but be flexible
    transportConfig.secure = config.secure;
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  return nodemailer.createTransport(transportConfig);
}

// Validation schemas
const oidcProviderSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  issuerUrl: z.string().url(),
  scopes: z.string().optional().default('openid email profile'),
  enabled: z.boolean().optional().default(false),
});

const oidcProviderUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().optional(), // Allow empty string for updates (means keep current)
  issuerUrl: z.string().url().optional(),
  scopes: z.string().optional(),
  enabled: z.boolean().optional(),
});

const emailConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  secure: z.boolean().optional().default(true),
  username: z.string().min(1),
  password: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  enabled: z.boolean().optional().default(false),
});

const systemConfigSchema = z.object({
  baseUrl: z.string().url().optional().nullable(),
  registrationEnabled: z.boolean().optional(),
  oidcRegistrationOnly: z.boolean().optional(),
  siteName: z.string().min(1).optional(),
  siteDescription: z.string().min(1).optional(),
});

const userUpdateSchema = z.object({
  isAdmin: z.boolean(),
});

const invitationSchema = z.object({
  email: z.string().email(),
  expiresInDays: z.number().min(1).max(365).optional().default(7), // Default 7 days
});

async function adminRoutes(fastify: FastifyInstance) {
  // Middleware to ensure admin access
  const requireAdmin = async (request: any, reply: any) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }
  };

  // ==== OIDC PROVIDER ROUTES ====

  // Get all OIDC providers
  fastify.get('/oidc-providers', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    const providers = await fastify.prisma.oIDCProvider.findMany({
      orderBy: { displayName: 'asc' },
    });

    // Don't expose client secrets in the list
    return {
      providers: providers.map(provider => ({
        ...provider,
        clientSecret: provider.clientSecret ? '****' : '',
      })),
    };
  });

  // Get specific OIDC provider
  fastify.get('/oidc-providers/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any) => {
    const { id } = request.params;

    const provider = await fastify.prisma.oIDCProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      return { error: 'Provider not found' };
    }

    // Don't expose client secret
    return {
      provider: {
        ...provider,
        clientSecret: provider.clientSecret ? '****' : '',
      },
    };
  });

  // Create OIDC provider
  fastify.post('/oidc-providers', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    try {
      const data = oidcProviderSchema.parse(request.body);

      // Check if provider name already exists
      const existing = await fastify.prisma.oIDCProvider.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        return reply.code(400).send({ error: 'Provider name already exists' });
      }

      const provider = await fastify.prisma.oIDCProvider.create({
        data,
      });

      return {
        provider: {
          ...provider,
          clientSecret: '****',
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Update OIDC provider
  fastify.patch('/oidc-providers/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      let updates = oidcProviderUpdateSchema.parse(request.body);

      // Check if provider exists
      const existing = await fastify.prisma.oIDCProvider.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Provider not found' });
      }

      // Handle empty clientSecret (means keep current)
      if (updates.clientSecret === '') {
        delete updates.clientSecret;
      }

      // Check name uniqueness if updating name
      if (updates.name && updates.name !== existing.name) {
        const nameExists = await fastify.prisma.oIDCProvider.findUnique({
          where: { name: updates.name },
        });

        if (nameExists) {
          return reply.code(400).send({ error: 'Provider name already exists' });
        }
      }

      const provider = await fastify.prisma.oIDCProvider.update({
        where: { id },
        data: updates,
      });

      return {
        provider: {
          ...provider,
          clientSecret: '****',
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Delete OIDC provider
  fastify.delete('/oidc-providers/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    const { id } = request.params;

    try {
      await fastify.prisma.oIDCProvider.delete({
        where: { id },
      });

      return { message: 'Provider deleted successfully' };
    } catch (error) {
      return reply.code(404).send({ error: 'Provider not found' });
    }
  });

  // Test OIDC provider connection
  fastify.post('/oidc-providers/:id/test', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    const { id } = request.params;

    const provider = await fastify.prisma.oIDCProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      return reply.code(404).send({ error: 'Provider not found' });
    }

    try {
      // Use the issuerUrl directly as the discovery endpoint
      const discoveryUrl = provider.issuerUrl;
      
      const response = await fetch(discoveryUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Leelo/1.0'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. URL: ${discoveryUrl}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType}. Response starts with: ${text.substring(0, 100)}...`);
      }

      const config = await response.json();
      
      // Validate required OIDC fields
      if (!config.issuer || !config.authorization_endpoint || !config.token_endpoint) {
        throw new Error('Invalid OIDC discovery response: missing required endpoints');
      }
      
      return {
        success: true,
        message: 'OIDC provider configuration is valid',
        discovery: {
          issuer: config.issuer,
          authorization_endpoint: config.authorization_endpoint,
          token_endpoint: config.token_endpoint,
          userinfo_endpoint: config.userinfo_endpoint,
        },
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: `Failed to connect to OIDC provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // ==== EMAIL CONFIGURATION ROUTES ====

  // Get email configuration
  fastify.get('/email-config', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    const config = await fastify.prisma.emailConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return { config: null };
    }

    // Don't expose password
    return {
      config: {
        ...config,
        password: config.password ? '****' : '',
      },
    };
  });

  // Create or update email configuration
  fastify.post('/email-config', {
    preHandler: [fastify.authenticate, requireAdmin],
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
        errorResponseBuilder: () => ({
          code: 429,
          error: 'Too Many Email Config Updates',
          message: 'Too many email config update attempts. Please wait 1 hour before trying again.'
        })
      }
    }
  }, async (request: any, reply) => {
    try {
      const data = emailConfigSchema.parse(request.body);

      const config = await fastify.prisma.emailConfig.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...data },
        update: data,
      });

      return {
        config: {
          ...config,
          password: '****',
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Test email configuration
  fastify.post('/email-config/test', {
    preHandler: [fastify.authenticate, requireAdmin],
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
        errorResponseBuilder: () => ({
          code: 429,
          error: 'Too Many Email Test Attempts',
          message: 'Too many email test attempts. Please wait 1 hour before trying again.'
        })
      }
    }
  }, async (request: any, reply) => {
    const config = await fastify.prisma.emailConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return reply.code(404).send({ error: 'Email configuration not found' });
    }

    try {
      // Create transporter with improved configuration
      const transporter = await createEmailTransporter(config);

      await transporter.verify();

      return {
        success: true,
        message: 'Email configuration is valid and connection successful',
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: `Failed to connect to email server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // Send test email
  fastify.post('/email-config/test-send', {
    preHandler: [fastify.authenticate, requireAdmin],
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour',
        errorResponseBuilder: () => ({
          code: 429,
          error: 'Too Many Test Email Sends',
          message: 'Too many test email sends. Please wait 1 hour before trying again.'
        })
      }
    }
  }, async (request: any, reply) => {
    const { email } = request.body;

    if (!email || typeof email !== 'string') {
      return reply.code(400).send({ error: 'Email address required' });
    }

    const config = await fastify.prisma.emailConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config || !config.enabled) {
      return reply.code(400).send({ error: 'Email configuration not found or disabled' });
    }

    try {
      // Create transporter with improved configuration
      const transporter = await createEmailTransporter(config);

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: email,
        subject: 'Leelo - Test Email Configuration',
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email from your Leelo instance.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr>
          <p><small>Sent from Leelo - Your Read-it-Later PWA</small></p>
        `,
      });

      return {
        success: true,
        message: `Test email sent successfully to ${email}`,
      };
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // ==== SYSTEM CONFIGURATION ====

  // Get system configuration
  fastify.get('/system-config', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    let config = await fastify.prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    // Create default config if it doesn't exist
    if (!config) {
      config = await fastify.prisma.systemConfig.create({
        data: { id: 'default' },
      });
    }

    return { config };
  });

  // Update system configuration
  fastify.patch('/system-config', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any) => {
    const updates = systemConfigSchema.parse(request.body);

    // Create or update config
    const config = await fastify.prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updates },
      update: updates,
    });

    return { config };
  });

  // ==== SYSTEM STATUS ====

  // Get admin dashboard stats
  fastify.get('/dashboard-stats', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    const [
      totalUsers,
      totalArticles,
      oidcProviders,
      emailConfig,
      queueJobs,
    ] = await Promise.all([
      fastify.prisma.user.count(),
      fastify.prisma.article.count(),
      fastify.prisma.oIDCProvider.count({ where: { enabled: true } }),
      fastify.prisma.emailConfig.findUnique({ where: { id: 'default' } }),
      fastify.prisma.queueJob.count({ where: { status: 'pending' } }),
    ]);

    return {
      stats: {
        totalUsers,
        totalArticles,
        enabledOIDCProviders: oidcProviders,
        emailConfigured: emailConfig?.enabled || false,
        pendingJobs: queueJobs,
      },
    };
  });

  // ==== USER MANAGEMENT ====

  // Get all users
  fastify.get('/users', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    const users = await fastify.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { users };
  });

  // Update user role
  fastify.patch('/users/:id/role', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    const { id } = request.params;
    const updates = userUpdateSchema.parse(request.body);

    // Prevent admin from removing their own admin status
    if (request.user.userId === id && !updates.isAdmin) {
      return reply.code(400).send({
        error: 'You cannot remove your own admin status',
      });
    }

    const user = await fastify.prisma.user.update({
      where: { id },
      data: { isAdmin: updates.isAdmin },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { user };
  });

  // ==== INVITATION MANAGEMENT ====

  // Get all invitations
  fastify.get('/invitations', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async () => {
    const invitations = await fastify.prisma.invitation.findMany({
      include: {
        invitedByUser: {
          select: {
            id: true,
            username: true,
          },
        },
        usedByUser: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { invitations };
  });

  // Create invitation
  fastify.post('/invitations', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    try {
      const data = invitationSchema.parse(request.body);
      
      // Check if email already has a pending invitation
      const existingInvitation = await fastify.prisma.invitation.findFirst({
        where: {
          email: data.email,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        return reply.code(400).send({
          error: 'An active invitation already exists for this email',
        });
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

      const invitation = await fastify.prisma.invitation.create({
        data: {
          email: data.email,
          token,
          invitedBy: request.user.userId,
          expiresAt,
        },
        include: {
          invitedByUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Send invitation email if email is configured
      const emailConfig = await fastify.prisma.emailConfig.findUnique({
        where: { id: 'default' },
      });

      if (emailConfig?.enabled) {
        try {
          // Create transporter with improved configuration
          const transporter = await createEmailTransporter(emailConfig);

          const systemConfig = await fastify.prisma.systemConfig.findUnique({
            where: { id: 'default' },
          });

          const baseUrl = systemConfig?.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
          const inviteUrl = `${baseUrl}/register?invitation=${token}`;

          await transporter.sendMail({
            from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
            to: data.email,
            subject: `You've been invited to join ${systemConfig?.siteName || 'Leelo'}`,
            html: `
              <h2>You've been invited!</h2>
              <p>You've been invited to join ${systemConfig?.siteName || 'Leelo'} - Your personal read-it-whenever app.</p>
              <p>Click the link below to create your account:</p>
              <p><a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Create Account</a></p>
              <p>Or copy and paste this URL into your browser:</p>
              <p>${inviteUrl}</p>
              <p>This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
              <hr>
              <p><small>Sent from ${systemConfig?.siteName || 'Leelo'}</small></p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the request if email fails, just log it
        }
      }

      return { invitation };
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Failed to create invitation',
      });
    }
  });

  // Delete invitation
  fastify.delete('/invitations/:id', {
    preHandler: [fastify.authenticate, requireAdmin],
  }, async (request: any, reply) => {
    const { id } = request.params;

    const invitation = await fastify.prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return reply.code(404).send({
        error: 'Invitation not found',
      });
    }

    await fastify.prisma.invitation.delete({
      where: { id },
    });

    return { message: 'Invitation deleted successfully' };
  });
}

export default adminRoutes;