import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'

export class TOTPService {
  /**
   * Generate a new TOTP secret for a user
   */
  static generateSecret(username: string, issuer: string = 'Leelo'): string {
    return speakeasy.generateSecret({
      name: `${issuer}:${username}`,
      issuer: issuer,
      length: 32
    }).base32!
  }

  /**
   * Generate QR code URL for TOTP setup
   */
  static async generateQRCode(secret: string, username: string, issuer: string = 'Leelo'): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: username,
      issuer: issuer,
      algorithm: 'sha1',
      digits: 6,
      period: 30
    })

    return QRCode.toDataURL(otpauthUrl)
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window // Allow 1 period before/after for clock skew
    })
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }

  /**
   * Verify a backup code
   */
  static verifyBackupCode(code: string, backupCodes: string[]): { valid: boolean; remainingCodes: string[] } {
    const upperCode = code.toUpperCase()
    const index = backupCodes.findIndex(c => c === upperCode)
    
    if (index === -1) {
      return { valid: false, remainingCodes: backupCodes }
    }

    // Remove the used code
    const remainingCodes = backupCodes.filter((_, i) => i !== index)
    return { valid: true, remainingCodes }
  }

  /**
   * Setup TOTP for a user
   */
  static async setupTOTP(username: string, issuer: string = 'Leelo') {
    const secret = this.generateSecret(username, issuer)
    const qrCode = await this.generateQRCode(secret, username, issuer)
    const backupCodes = this.generateBackupCodes()

    return {
      secret,
      qrCode,
      backupCodes
    }
  }
}
