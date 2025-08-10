import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { identiconGenerator } from './identicon.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createDefaultAdmin(prisma: PrismaClient) {
  try {
    // Check if any admin exists
    const adminExists = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (adminExists) {
      return;
    }

    // Create default admin user
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    
    const hashedPassword = await hashPassword(password);
    
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        isAdmin: true,
      },
    });

    // Mark admin user for identicon generation (generated on-demand now)
    try {
      await prisma.user.update({
        where: { id: newUser.id },
        data: { identiconUrl: 'identicon' } // Flag to indicate identicon should be generated
      });
    } catch (error) {
      console.error('Failed to update admin user for identicon:', error);
    }

    console.log('✅ Default admin user created successfully');
  } catch (error) {
    console.error('Failed to create default admin user:', error);
  }
}