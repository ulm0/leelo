import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const configSchema = z.object({
  oidcEnabled: z.boolean().optional(),
  oidcClientId: z.string().optional(),
  oidcClientSecret: z.string().optional(),
  oidcIssuer: z.string().optional(),
  oidcScopes: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  siteName: z.string().optional(),
  siteDescription: z.string().optional(),
});

const configRoutes: FastifyPluginAsync = async (fastify) => {
  // Get public configuration
  fastify.get('/public', async () => {
    const configs = await fastify.prisma.appConfig.findMany({
      where: {
        key: {
          in: [
            'oidcEnabled',
            'registrationEnabled',
            'siteName',
            'siteDescription',
          ],
        },
      },
    });

    const configMap: Record<string, any> = {};
    configs.forEach(config => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    // Default values
    return {
      oidcEnabled: configMap.oidcEnabled || false,
      registrationEnabled: configMap.registrationEnabled !== false, // default true
      siteName: configMap.siteName || 'Leelo',
      siteDescription: configMap.siteDescription || 'A self-hosted read-it-later app',
    };
  });

  // Get all configuration (admin only)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const configs = await fastify.prisma.appConfig.findMany();
    
    const configMap: Record<string, any> = {};
    configs.forEach(config => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    // Merge with defaults
    return {
      oidcEnabled: configMap.oidcEnabled || false,
      oidcClientId: configMap.oidcClientId || '',
      oidcClientSecret: configMap.oidcClientSecret || '',
      oidcIssuer: configMap.oidcIssuer || '',
      oidcScopes: configMap.oidcScopes || 'openid profile email',
      registrationEnabled: configMap.registrationEnabled !== false,
      siteName: configMap.siteName || 'Leelo',
      siteDescription: configMap.siteDescription || 'A self-hosted read-it-later app',
    };
  });

  // Update configuration (admin only)
  fastify.patch('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      if (!request.user.isAdmin) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const updates = configSchema.parse(request.body);

      // Update each configuration key
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          await fastify.prisma.appConfig.upsert({
            where: { key },
            create: {
              key,
              value: JSON.stringify(value),
            },
            update: {
              value: JSON.stringify(value),
            },
          });
        }
      }

      // Return updated configuration
      const configs = await fastify.prisma.appConfig.findMany();
      
      const configMap: Record<string, any> = {};
      configs.forEach(config => {
        try {
          configMap[config.key] = JSON.parse(config.value);
        } catch {
          configMap[config.key] = config.value;
        }
      });

      return configMap;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Reset configuration to defaults (admin only)
  fastify.post('/reset', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    // Delete all configuration
    await fastify.prisma.appConfig.deleteMany();

    return { message: 'Configuration reset to defaults' };
  });
};

export default configRoutes;