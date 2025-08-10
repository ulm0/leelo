import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword } from '../services/auth.js';
import { identiconGenerator } from '../services/identicon.js';
import path from 'path';
import fs from 'fs/promises';

const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  useGravatar: z.boolean().optional(),
  readingFont: z.string().optional(),
  customFontUrl: z.string().url().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.userId;
    
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        useGravatar: true,
        identiconUrl: true,
        readingFont: true,
        customFontUrl: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate identicon data URI if not using Gravatar
    if (user && !user.useGravatar) {
      const identiconDataUri = identiconGenerator.generateIdenticonDataUri(user.id);
      user.identiconUrl = identiconDataUri;
    }

    console.log('👤 Profile - User data:', { id: user?.id, username: user?.username, totpEnabled: user?.totpEnabled })

    return { user };
  });

  // Update user profile
  fastify.patch('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const updates = updateProfileSchema.parse(request.body);
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const updateData: any = {};

      // Update username if provided
      if (updates.username) {
        // Check if username is already taken
        const existingUser = await fastify.prisma.user.findUnique({
          where: { username: updates.username },
        });

        if (existingUser && existingUser.id !== userId) {
          return reply.code(400).send({ error: 'Username already in use' });
        }

        updateData.username = updates.username;
      }

      // Update email if provided
      if (updates.email !== undefined) {
        if (updates.email) {
          // Check if email is already taken
          const existingUser = await fastify.prisma.user.findUnique({
            where: { email: updates.email },
          });

          if (existingUser && existingUser.id !== userId) {
            return reply.code(400).send({ error: 'Email already in use' });
          }
        }

        updateData.email = updates.email;
      }

      // Update gravatar setting if provided
      if (updates.useGravatar !== undefined) {
        updateData.useGravatar = updates.useGravatar;
        
        // If disabling Gravatar, mark that user should get identicon
        if (!updates.useGravatar) {
          updateData.identiconUrl = 'identicon'; // Flag to indicate identicon should be generated
        }
      }

      // Update reading font preferences if provided
      if (updates.readingFont !== undefined) {
        updateData.readingFont = updates.readingFont;
      }

      if (updates.customFontUrl !== undefined) {
        updateData.customFontUrl = updates.customFontUrl;
      }

      // Update password if provided
      if (updates.newPassword) {
        if (!updates.currentPassword) {
          return reply.code(400).send({ error: 'Current password required to set new password' });
        }

        if (!user.password) {
          return reply.code(400).send({ error: 'Cannot update password for OIDC user' });
        }

        // Verify current password
        const bcrypt = await import('bcrypt');
        const isValidPassword = await bcrypt.compare(updates.currentPassword, user.password);
        
        if (!isValidPassword) {
          return reply.code(400).send({ error: 'Current password is incorrect' });
        }

        updateData.password = await hashPassword(updates.newPassword);
      }

      // Perform update
      const updatedUser = await fastify.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          useGravatar: true,
          identiconUrl: true,
          readingFont: true,
          customFontUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Generate identicon data URI if not using Gravatar
      if (updatedUser && !updatedUser.useGravatar) {
        const identiconDataUri = identiconGenerator.generateIdenticonDataUri(updatedUser.id);
        updatedUser.identiconUrl = identiconDataUri;
      }

      return { user: updatedUser };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.issues });
      }
      throw error;
    }
  });

  // Admin: Get all users
  fastify.get('/list', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

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

  // Admin: Update user
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };
    const { isAdmin } = z.object({
      isAdmin: z.boolean().optional(),
    }).parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const updatedUser = await fastify.prisma.user.update({
      where: { id },
      data: { isAdmin },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { user: updatedUser };
  });

  // Admin: Delete user
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };

    // Prevent deleting self
    if (id === request.user.userId) {
      return reply.code(400).send({ error: 'Cannot delete your own account' });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await fastify.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  });

  // Admin: Ensure all users have identicon flags  
  fastify.post('/setup-identicons', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    try {
      // Find users without identicon flags who don't use Gravatar
      const usersWithoutIdenticons = await fastify.prisma.user.findMany({
        where: {
          OR: [
            { identiconUrl: null },
            { identiconUrl: '' }
          ],
          useGravatar: false
        },
        select: { id: true, username: true }
      });

      let updatedCount = 0;

      for (const user of usersWithoutIdenticons) {
        try {
          await fastify.prisma.user.update({
            where: { id: user.id },
            data: { identiconUrl: 'identicon' } // Flag for identicon generation
          });

          updatedCount++;
        } catch (error) {
          console.error(`Failed to setup identicon for user ${user.id}:`, error);
        }
      }

      return { 
        message: `Set up identicon flags for ${updatedCount} users`,
        updated: updatedCount,
        total: usersWithoutIdenticons.length
      };
    } catch (error) {
      console.error('Failed to setup identicons:', error);
      return reply.code(500).send({ error: 'Failed to setup identicons' });
    }
  });

  // Upload custom font
  fastify.post('/upload-font', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      
      // Check if multipart data is available
      if (!request.isMultipart()) {
        return reply.code(400).send({ error: 'Multipart data required' });
      }

      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({ error: 'Invalid file type. Only WOFF, WOFF2, TTF, and OTF fonts are allowed.' });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (data.file.bytesRead > maxSize) {
        return reply.code(400).send({ error: 'File too large. Maximum size is 5MB.' });
      }

      // Create fonts directory if it doesn't exist
      const fontsDir = path.join(process.cwd(), 'public', 'fonts');
      await fs.mkdir(fontsDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(data.filename);
      const fileName = `font_${userId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(fontsDir, fileName);

      // Save file
      await fs.writeFile(filePath, await data.toBuffer());

      // Update user's custom font URL
      const fontUrl = `/fonts/${fileName}`;
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { customFontUrl: fontUrl }
      });

      return { 
        message: 'Font uploaded successfully',
        fontUrl: fontUrl
      };
    } catch (error) {
      console.error('Font upload failed:', error);
      return reply.code(500).send({ error: 'Failed to upload font' });
    }
  });
};

export default userRoutes;