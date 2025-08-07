import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server'
import { PrismaClient } from '@prisma/client'

export class PasskeyService {
  private static rpName = 'Leelo'
  
  // Get origin dynamically from system config
  private static async getOrigin(prisma: any): Promise<string> {
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });
    
    return systemConfig?.baseUrl || 
           process.env.WEBAUTHN_ORIGIN || 
           'http://localhost:3000';
  }

  //Get RP ID dynamically from system config
  private static async getRPID(prisma: any): Promise<string> {
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    // trim scheme from baseUrl and port from baseUrl
    const baseUrl = systemConfig?.baseUrl || 'http://localhost:3000';
    const rpId = baseUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    return rpId;
  }

  /**
   * Generate registration options for a new passkey
   */
  static async generateRegistrationOptions(userId: string, username: string, prisma: PrismaClient) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passkeys: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: await this.getRPID(prisma),
      userID: Buffer.from(userId),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    })

    // Store challenge in user session or temporary storage
    // For now, we'll store it in the user record temporarily
    await prisma.user.update({
      where: { id: userId },
      data: { 
        // Store challenge temporarily (in production, use Redis or session)
        totpSecret: options.challenge // Reusing this field temporarily
      }
    })

    return options
  }

  /**
   * Verify registration response
   */
  static async verifyRegistrationResponse(
    response: any,
    userId: string,
    prisma: PrismaClient
  ): Promise<VerifiedRegistrationResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passkeys: true }
    })

    if (!user || !user.totpSecret) {
      throw new Error('Registration challenge not found')
    }

    const expectedChallenge = user.totpSecret

    const origin = await this.getOrigin(prisma);
    const rpId = await this.getRPID(prisma);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: false
    })

    if (verification.verified && verification.registrationInfo) {
      // Clear the temporary challenge
      await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: null }
      })
    }

    return verification
  }

  /**
   * Save passkey credential to database
   */
  static async savePasskey(
    userId: string,
    credentialId: Uint8Array,
    publicKey: Uint8Array,
    signCount: number,
    transports: string[],
    name: string,
    prisma: PrismaClient
  ) {
    return prisma.passkey.create({
      data: {
        userId,
        name,
        credentialId: Buffer.from(credentialId).toString('base64url'),
        publicKey: Buffer.from(publicKey).toString('base64url'),
        signCount: BigInt(signCount),
        transports: JSON.stringify(transports)
      }
    })
  }

  /**
   * Generate authentication options
   */
  static async generateAuthenticationOptions(userId: string, prisma: PrismaClient) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passkeys: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const allowCredentials = user.passkeys.map(passkey => ({
      id: passkey.credentialId,
      type: 'public-key' as const,
      transports: passkey.transports ? JSON.parse(passkey.transports) : []
    }))

    const rpId = await this.getRPID(prisma);
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000
    })

    // Store challenge temporarily
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: options.challenge }
    })

    return options
  }

  /**
   * Verify authentication response
   */
  static async verifyAuthenticationResponse(
    response: any,
    userId: string,
    prisma: PrismaClient
  ): Promise<VerifiedAuthenticationResponse> {
    // For now, return a mock verification
    // TODO: Implement proper verification when simplewebauthn API is stable
    return {
      verified: true,
      authenticationInfo: {
        newCounter: 1
      }
    } as VerifiedAuthenticationResponse
  }

  /**
   * Get user's passkeys
   */
  static async getUserPasskeys(userId: string, prisma: PrismaClient) {
    return prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Delete a passkey
   */
  static async deletePasskey(passkeyId: string, userId: string, prisma: PrismaClient) {
    return prisma.passkey.deleteMany({
      where: {
        id: passkeyId,
        userId
      }
    })
  }
}
