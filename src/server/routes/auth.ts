import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../services/auth.js';
import { identiconGenerator } from '../services/identicon.js';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { TOTPService } from '../services/totp.js'
import { PasskeyService } from '../services/passkey.js'
import { RateLimitService } from '../services/rateLimit.js';

// Global type extension for OIDC state storage
declare global {
  var oidcStates: Map<string, { providerId: string; timestamp: number }> | undefined;
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(6),
  invitationToken: z.string().optional(),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper function to get base URL from system config or environment
  const getBaseUrl = async (request: any) => {
    const systemConfig = await fastify.prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });
    
    // Use system config baseUrl if available, otherwise fall back to environment
    return systemConfig?.baseUrl || 
           process.env.BASE_URL || 
           `${request.protocol}://${request.headers.host}`;
  };
  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.password) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check if TOTP is enabled
      console.log('🔐 Login - User TOTP status:', { username: user.username, totpEnabled: user.totpEnabled })
      if (user.totpEnabled) {
        return reply.code(200).send({ 
          requiresTOTP: true,
          message: 'TOTP verification required'
        });
      }

      const token = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          totpEnabled: user.totpEnabled,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Validate invitation token
  fastify.get('/validate-invitation/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      const invitation = await fastify.prisma.invitation.findUnique({
        where: { token },
        include: {
          invitedByUser: {
            select: {
              username: true,
            },
          },
        },
      });

      if (!invitation) {
        return reply.code(404).send({ 
          valid: false, 
          error: 'Invalid invitation token' 
        });
      }

      if (invitation.used) {
        return reply.code(400).send({ 
          valid: false, 
          error: 'Invitation has already been used' 
        });
      }

      if (invitation.expiresAt < new Date()) {
        return reply.code(400).send({ 
          valid: false, 
          error: 'Invitation has expired' 
        });
      }

      return {
        valid: true,
        invitation: {
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          invitedBy: invitation.invitedByUser.username,
        },
      };
    } catch (error) {
      return reply.code(500).send({ 
        valid: false, 
        error: 'Failed to validate invitation' 
      });
    }
  });

  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      // Check system configuration first
      const systemConfig = await fastify.prisma.systemConfig.findUnique({
        where: { id: 'default' },
      });

      // If registration is disabled, return error
      if (systemConfig && !systemConfig.registrationEnabled) {
        return reply.code(403).send({ 
          error: 'User registration is currently disabled' 
        });
      }

      // If only OIDC registration is allowed, return error
      if (systemConfig && systemConfig.oidcRegistrationOnly) {
        return reply.code(403).send({ 
          error: 'Only OIDC registration is allowed. Please use an OIDC provider to sign up.' 
        });
      }

      const { username, email, password, invitationToken } = registerSchema.parse(request.body);

      // Validate invitation if provided
      let invitation = null;
      if (invitationToken) {
        invitation = await fastify.prisma.invitation.findUnique({
          where: { token: invitationToken },
        });

        if (!invitation) {
          return reply.code(400).send({ error: 'Invalid invitation token' });
        }

        if (invitation.used) {
          return reply.code(400).send({ error: 'Invitation has already been used' });
        }

        if (invitation.expiresAt < new Date()) {
          return reply.code(400).send({ error: 'Invitation has expired' });
        }

        // If invitation has an email, it must match the registration email
        if (invitation.email && email && invitation.email !== email) {
          return reply.code(400).send({ error: 'Email does not match invitation' });
        }
      }

      // Check if username already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return reply.code(400).send({ error: 'Username already exists' });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await fastify.prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) {
          return reply.code(400).send({ error: 'Email already exists' });
        }
      }

      const hashedPassword = await hashPassword(password);

      // Check if this is the first user (make them admin)
      const userCount = await fastify.prisma.user.count();
      const isFirstUser = userCount === 0;

      const user = await fastify.prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          isAdmin: isFirstUser,
        },
      });

      // Mark invitation as used if provided
      if (invitation) {
        await fastify.prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            used: true,
            usedAt: new Date(),
            usedBy: user.id,
          },
        });
      }

      // Mark user for identicon generation (generated on-demand now)
      try {
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { identiconUrl: 'identicon' } // Flag to indicate identicon should be generated
        });
      } catch (error) {
        console.error('Failed to update user for identicon:', error);
      }

      const token = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    console.log('🔍 /api/auth/me - Auth headers:', {
      authorization: request.headers.authorization ? `${request.headers.authorization.substring(0, 20)}...` : 'missing',
      userId: request.user?.userId || 'missing'
    });

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        useGravatar: true,
        identiconUrl: true,
        createdAt: true,
      },
    });

    // Generate identicon data URI if not using Gravatar
    if (user && !user.useGravatar) {
      const identiconDataUri = identiconGenerator.generateIdenticonDataUri(user.id);
      user.identiconUrl = identiconDataUri;
    }

    console.log('✅ /api/auth/me - User found:', user ? { id: user.id, username: user.username } : 'null');

    return { user };
  });

  // Get public system configuration (public endpoint)
  fastify.get('/system-config', async () => {
    const systemConfig = await fastify.prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    // Return only public information
    return {
      siteName: systemConfig?.siteName || 'Leelo',
      siteDescription: systemConfig?.siteDescription || 'Your personal read-it-whenever app',
      registrationEnabled: systemConfig?.registrationEnabled ?? true,
      oidcRegistrationOnly: systemConfig?.oidcRegistrationOnly ?? false,
    };
  });

  // Get enabled OIDC providers (public endpoint)
  fastify.get('/oidc-providers', async () => {
    const providers = await fastify.prisma.oIDCProvider.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        issuerUrl: true,
      },
      orderBy: { displayName: 'asc' }
    });

    return { providers };
  });

  // Debug endpoint to show callback URL
  fastify.get('/oidc/callback-url', async (request: any) => {
    const baseUrl = await getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/auth/oidc/callback`;
    
    const systemConfig = await fastify.prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });
    
    return {
      callbackUrl: redirectUri,
      baseUrl,
      systemConfig: {
        baseUrl: systemConfig?.baseUrl || null,
      },
      environment: {
        BASE_URL: process.env.BASE_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    };
  });

  // Start OIDC login flow
  fastify.get('/oidc/:providerId/login', async (request: any, reply) => {
    const { providerId } = request.params;

    const provider = await fastify.prisma.oIDCProvider.findUnique({
      where: { id: providerId, enabled: true },
    });

    if (!provider) {
      return reply.code(404).send({ error: 'Provider not found or disabled' });
    }

    try {
      // Get OIDC configuration
      const discoveryResponse = await fetch(provider.issuerUrl);
      const config = await discoveryResponse.json();

      // Generate state parameter for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store state in session/memory (for simplicity, using a Map - in production use Redis)
      if (!global.oidcStates) global.oidcStates = new Map();
      global.oidcStates.set(state, { providerId, timestamp: Date.now() });

      // Build authorization URL
      const baseUrl = await getBaseUrl(request);
      const redirectUri = `${baseUrl}/api/auth/oidc/callback`;
      
      console.log('OIDC Login Debug:', {
        baseUrl,
        redirectUri,
        providerId,
        clientId: provider.clientId,
        state
      });
      
      const authUrl = new URL(config.authorization_endpoint);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', provider.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', provider.scopes);
      authUrl.searchParams.set('state', state);

      // Redirect to OIDC provider
      return reply.redirect(authUrl.toString());
    } catch (error) {
      console.error('OIDC login error:', error);
      return reply.code(500).send({ error: 'Failed to initiate OIDC login' });
    }
  });

  // Handle OIDC callback
  fastify.get('/oidc/callback', async (request: any, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.code(400).send({ error: `OIDC error: ${error}` });
    }

    if (!code || !state) {
      return reply.code(400).send({ error: 'Missing code or state parameter' });
    }

    try {
      // Verify state parameter
      if (!global.oidcStates || !global.oidcStates.has(state)) {
        return reply.code(400).send({ error: 'Invalid state parameter' });
      }

      const stateData = global.oidcStates.get(state);
      global.oidcStates.delete(state); // Use state only once

      if (!stateData) {
        return reply.code(400).send({ error: 'Invalid state parameter' });
      }

      // Check state age (5 minutes max)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return reply.code(400).send({ error: 'State parameter expired' });
      }

      const provider = await fastify.prisma.oIDCProvider.findUnique({
        where: { id: stateData.providerId },
      });

      if (!provider) {
        return reply.code(404).send({ error: 'Provider not found' });
      }

      // Get OIDC configuration
      const discoveryResponse = await fetch(provider.issuerUrl);
      const config = await discoveryResponse.json();

      // Exchange code for tokens
      const baseUrl = await getBaseUrl(request);
      const redirectUri = `${baseUrl}/api/auth/oidc/callback`;
      
      console.log('OIDC Callback Debug:', {
        baseUrl,
        redirectUri,
        code: code ? 'present' : 'missing',
        state: state ? 'present' : 'missing'
      });

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      console.log('Token exchange request:', {
        endpoint: config.token_endpoint,
        params: {
          grant_type: 'authorization_code',
          client_id: provider.clientId,
          client_secret: provider.clientSecret ? '[PRESENT]' : '[MISSING]',
          code: code ? '[PRESENT]' : '[MISSING]',
          redirect_uri: redirectUri,
        }
      });

      const tokenResponse = await fetch(config.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams,
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText
        });
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange successful:', {
        access_token: tokens.access_token ? '[PRESENT]' : '[MISSING]',
        token_type: tokens.token_type,
        expires_in: tokens.expires_in
      });

      // Get user info
      console.log('Fetching user info from:', config.userinfo_endpoint);
      const userInfoResponse = await fetch(config.userinfo_endpoint, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('User info request failed:', {
          status: userInfoResponse.status,
          statusText: userInfoResponse.statusText,
          body: errorText
        });
        throw new Error(`Failed to get user info: ${userInfoResponse.status} ${userInfoResponse.statusText} - ${errorText}`);
      }

      const userInfo = await userInfoResponse.json();
      console.log('User info received:', {
        sub: userInfo.sub,
        email: userInfo.email,
        preferred_username: userInfo.preferred_username,
        name: userInfo.name
      });

      // Find or create user
      console.log('Looking for existing user with oidcSub:', userInfo.sub);
      let user = await fastify.prisma.user.findUnique({
        where: { oidcSub: userInfo.sub },
      });

      if (!user && userInfo.email) {
        // Check if user exists by email (account linking)
        console.log('No user found by oidcSub, checking by email:', userInfo.email);
        user = await fastify.prisma.user.findUnique({
          where: { email: userInfo.email },
        });

        if (user) {
          // Link existing account with OIDC
          console.log('Found existing user by email, linking OIDC account:', user.id);
          user = await fastify.prisma.user.update({
            where: { id: user.id },
            data: {
              oidcSub: userInfo.sub,
              oidcProvider: provider.name,
            },
          });
          console.log('Account linked successfully');
        }
      }

      if (!user) {
        // Create new user
        console.log('Creating new user');
        const userData = {
          username: userInfo.preferred_username || userInfo.email || userInfo.sub,
          email: userInfo.email,
          oidcSub: userInfo.sub,
          oidcProvider: provider.name,
          password: null, // OIDC users don't have passwords
          identiconUrl: 'identicon', // Flag for identicon generation
        };
        console.log('User data for creation:', userData);
        
        user = await fastify.prisma.user.create({
          data: userData,
        });
        console.log('New user created:', { id: user.id, username: user.username });
      } else if (user.oidcSub) {
        // Update existing OIDC user info
        console.log('Updating existing OIDC user:', user.id);
        user = await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            email: userInfo.email,
            oidcProvider: provider.name,
          },
        });
        console.log('OIDC user updated');
      }

      // Generate JWT token
      console.log('Generating JWT token for user:', user.id);
      const token = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });
      console.log('JWT token generated successfully');

      // Redirect to frontend with token (unified server)
      const redirectUrl = `/?token=${token}`;
      
      console.log('Redirecting to frontend:', {
        redirectUrl,
        NODE_ENV: process.env.NODE_ENV
      });
      
      return reply.redirect(redirectUrl);
    } catch (error) {
      console.error('OIDC callback error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        code,
        state
      });
      
      // Redirect to frontend with error (unified server)
      const errorMessage = encodeURIComponent(error instanceof Error ? error.message : 'Unknown error');
      const redirectUrl = `/?oidc_error=${errorMessage}`;
      
      return reply.redirect(redirectUrl);
    }
  });

  // Logout (client-side token removal)
  fastify.post('/logout', async () => {
    return { message: 'Logged out successfully' };
  });

  // Complete login with TOTP
  fastify.post('/login-totp', async (request, reply) => {
    try {
      const { username, password, totpToken } = z.object({
        username: z.string(),
        password: z.string(),
        totpToken: z.string()
      }).parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      if (!user.password) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      if (!user.totpEnabled || !user.totpSecret) {
        return reply.code(400).send({ error: 'TOTP not enabled for this user' });
      }

      // Verify TOTP token
      const totpValid = TOTPService.verifyToken(totpToken, user.totpSecret);
      if (!totpValid) {
        return reply.code(401).send({ error: 'Invalid TOTP token' });
      }

      const token = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          totpEnabled: user.totpEnabled,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // TOTP routes
  fastify.post('/totp/setup', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      if (user.totpEnabled) {
        return reply.code(400).send({ error: 'TOTP is already enabled' })
      }

      const { secret, qrCode, backupCodes } = await TOTPService.setupTOTP(user.username)

      // Store the secret temporarily (user needs to verify before enabling)
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { totpSecret: secret }
      })

      return {
        secret,
        qrCode,
        backupCodes
      }
    } catch (error) {
      console.error('TOTP setup error:', error)
      return reply.code(500).send({ error: 'Failed to setup TOTP' })
    }
  })

  fastify.post('/totp/verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(request.body)
      const userId = request.user.userId

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.totpSecret) {
        return reply.code(400).send({ error: 'TOTP not setup' })
      }

      const isValid = TOTPService.verifyToken(token, user.totpSecret)

      if (!isValid) {
        return reply.code(400).send({ error: 'Invalid TOTP token' })
      }

      // Enable TOTP and store backup codes
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { 
          totpEnabled: true,
          backupCodes: JSON.stringify(TOTPService.generateBackupCodes())
        }
      })

      // Generate new token with updated TOTP status
      const newToken = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return { 
        success: true, 
        message: 'TOTP enabled successfully',
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          totpEnabled: true,
        }
      }
    } catch (error) {
      console.error('TOTP verification error:', error)
      return reply.code(500).send({ error: 'Failed to verify TOTP' })
    }
  })

  fastify.post('/totp/disable', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(request.body)
      const userId = request.user.userId

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.totpEnabled) {
        return reply.code(400).send({ error: 'TOTP not enabled' })
      }

      const isValid = TOTPService.verifyToken(token, user.totpSecret!)

      if (!isValid) {
        return reply.code(400).send({ error: 'Invalid TOTP token' })
      }

      // Disable TOTP
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { 
          totpEnabled: false,
          totpSecret: null,
          backupCodes: null
        }
      })

      console.log('🔐 TOTP Disabled - User ID:', userId)

      // Generate new token with updated TOTP status
      const newToken = await reply.jwtSign({
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });

      return { 
        success: true, 
        message: 'TOTP disabled successfully',
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          totpEnabled: false,
        }
      }
    } catch (error) {
      console.error('TOTP disable error:', error)
      return reply.code(500).send({ error: 'Failed to disable TOTP' })
    }
  })

  fastify.post('/totp/backup-verify', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { code } = z.object({ code: z.string() }).parse(request.body)
      const userId = request.user.userId

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.backupCodes) {
        return reply.code(400).send({ error: 'No backup codes found' })
      }

      const backupCodes = JSON.parse(user.backupCodes)
      const { valid, remainingCodes } = TOTPService.verifyBackupCode(code, backupCodes)

      if (!valid) {
        return reply.code(400).send({ error: 'Invalid backup code' })
      }

      // Update remaining backup codes
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { backupCodes: JSON.stringify(remainingCodes) }
      })

      return { success: true, message: 'Backup code verified successfully' }
    } catch (error) {
      console.error('Backup code verification error:', error)
      return reply.code(500).send({ error: 'Failed to verify backup code' })
    }
  })

  // Passkey routes
  fastify.post('/passkey/register-options', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      const options = await PasskeyService.generateRegistrationOptions(
        userId,
        user.username,
        fastify.prisma
      )

      return options
    } catch (error) {
      console.error('Passkey registration options error:', error)
      return reply.code(500).send({ error: 'Failed to generate registration options' })
    }
  })

  fastify.post('/passkey/register', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { response, name } = z.object({
        response: z.any(),
        name: z.string()
      }).parse(request.body)

      const userId = request.user.userId

      const verification = await PasskeyService.verifyRegistrationResponse(
        response,
        userId,
        fastify.prisma
      )

      if (!verification.verified || !verification.registrationInfo) {
        return reply.code(400).send({ error: 'Passkey registration failed' })
      }

      // Save the passkey (simplified for now)
      await fastify.prisma.passkey.create({
        data: {
          userId,
          name,
          credentialId: Buffer.from(verification.registrationInfo.credential.id).toString('base64url'),
          publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64url'),
          signCount: BigInt(verification.registrationInfo.credential.counter),
          transports: JSON.stringify(response.response.transports || [])
        }
      })

      return { success: true, message: 'Passkey registered successfully' }
    } catch (error) {
      console.error('Passkey registration error:', error)
      return reply.code(500).send({ error: 'Failed to register passkey' })
    }
  })

  // Passkey authentication for login (no auth required)
  fastify.post('/passkey/login-options', {
    preHandler: [
      async (request, reply) => {
        // Apply rate limiting for passkey operations
        const rateLimitConfig = RateLimitService.getPasskeyRateLimitConfig();
        const key = request.ip; // Use IP for unauthenticated requests
        
        // Simple in-memory rate limiting for this specific endpoint
        const now = Date.now();
        const windowMs = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (!fastify.rateLimitStore) {
          fastify.rateLimitStore = new Map();
        }
        
        const userKey = `passkey_login_options:${key}`;
        const userData = fastify.rateLimitStore.get(userKey);
        
        if (userData && (now - userData.timestamp) < windowMs) {
          if (userData.count >= rateLimitConfig.max) {
            return reply.code(429).send({
              code: 429,
              error: 'Too Many Passkey Operations',
              message: 'Too many passkey operations. Please wait 1 hour before trying again.'
            });
          }
          userData.count++;
        } else {
          fastify.rateLimitStore.set(userKey, { count: 1, timestamp: now });
        }
      }
    ]
  }, async (request, reply) => {
    try {
      // Get all users with passkeys
      const usersWithPasskeys = await fastify.prisma.user.findMany({
        where: {
          passkeys: {
            some: {}
          }
        },
        include: {
          passkeys: true
        }
      })

      if (usersWithPasskeys.length === 0) {
        return reply.code(400).send({ error: 'No users with passkeys found' })
      }

      // For now, we'll use the first user with passkeys
      // In a real implementation, you might want to show a user selection
      const user = usersWithPasskeys[0]

      const options = await PasskeyService.generateAuthenticationOptions(
        user.id,
        fastify.prisma
      )

      return options
    } catch (error) {
      console.error('Passkey login options error:', error)
      return reply.code(500).send({ error: 'Failed to generate login options' })
    }
  })

  fastify.post('/passkey/login', {
    preHandler: [
      async (request, reply) => {
        // Apply rate limiting for passkey authentication
        const rateLimitConfig = RateLimitService.getAuthRateLimitConfig();
        const key = request.ip; // Use IP for unauthenticated requests
        
        // Simple in-memory rate limiting for this specific endpoint
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        if (!fastify.rateLimitStore) {
          fastify.rateLimitStore = new Map();
        }
        
        const userKey = `passkey_login:${key}`;
        const userData = fastify.rateLimitStore.get(userKey);
        
        if (userData && (now - userData.timestamp) < windowMs) {
          if (userData.count >= rateLimitConfig.max) {
            return reply.code(429).send({
              code: 429,
              error: 'Too Many Authentication Attempts',
              message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
            });
          }
          userData.count++;
        } else {
          fastify.rateLimitStore.set(userKey, { count: 1, timestamp: now });
        }
      }
    ]
  }, async (request, reply) => {
    try {
      const { response } = z.object({
        response: z.any()
      }).parse(request.body)

      // Find the user by credential ID
      const credentialId = response.id
      const passkey = await fastify.prisma.passkey.findUnique({
        where: { credentialId },
        include: { user: true }
      })

      if (!passkey) {
        return reply.code(400).send({ error: 'Passkey not found' })
      }

      const verification = await PasskeyService.verifyAuthenticationResponse(
        response,
        passkey.userId,
        fastify.prisma
      )

      if (!verification.verified) {
        return reply.code(400).send({ error: 'Passkey authentication failed' })
      }

      // Generate JWT token
      const token = await reply.jwtSign({
        userId: passkey.user.id,
        username: passkey.user.username,
        isAdmin: passkey.user.isAdmin,
      })

      return {
        token,
        user: {
          id: passkey.user.id,
          username: passkey.user.username,
          email: passkey.user.email,
          isAdmin: passkey.user.isAdmin,
          totpEnabled: passkey.user.totpEnabled,
        },
      }
    } catch (error) {
      console.error('Passkey login error:', error)
      return reply.code(500).send({ error: 'Failed to login with passkey' })
    }
  })

  fastify.post('/passkey/authenticate-options', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId

      const options = await PasskeyService.generateAuthenticationOptions(
        userId,
        fastify.prisma
      )

      return options
    } catch (error) {
      console.error('Passkey authentication options error:', error)
      return reply.code(500).send({ error: 'Failed to generate authentication options' })
    }
  })

  fastify.post('/passkey/authenticate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { response } = z.object({
        response: z.any()
      }).parse(request.body)

      const userId = request.user.userId

      const verification = await PasskeyService.verifyAuthenticationResponse(
        response,
        userId,
        fastify.prisma
      )

      if (!verification.verified) {
        return reply.code(400).send({ error: 'Passkey authentication failed' })
      }

      return { success: true, message: 'Passkey authentication successful' }
    } catch (error) {
      console.error('Passkey authentication error:', error)
      return reply.code(500).send({ error: 'Failed to authenticate with passkey' })
    }
  })

  fastify.get('/passkey/list', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId

      const passkeys = await PasskeyService.getUserPasskeys(userId, fastify.prisma)

      return {
        passkeys: passkeys.map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: p.lastUsedAt.toISOString()
        }))
      }
    } catch (error) {
      console.error('Passkey list error:', error)
      return reply.code(500).send({ error: 'Failed to get passkeys' })
    }
  })

  fastify.delete('/passkey/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const userId = request.user.userId

      const result = await PasskeyService.deletePasskey(id, userId, fastify.prisma)

      if (result.count === 0) {
        return reply.code(404).send({ error: 'Passkey not found' })
      }

      return { success: true, message: 'Passkey deleted successfully' }
    } catch (error) {
      console.error('Passkey deletion error:', error)
      return reply.code(500).send({ error: 'Failed to delete passkey' })
    }
  })
};

export default authRoutes;