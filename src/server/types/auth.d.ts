export interface TOTPSetupResponse {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface TOTPVerifyRequest {
  token: string
}

export interface TOTPVerifyResponse {
  success: boolean
  message: string
}

export interface PasskeyRegistrationOptions {
  challenge: string
  rp: {
    name: string
    id: string
  }
  user: {
    id: string
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    type: string
    alg: number
  }>
  timeout: number
  attestation: string
  authenticatorSelection: {
    authenticatorAttachment: string
    userVerification: string
  }
}

export interface PasskeyAuthenticationOptions {
  challenge: string
  rpId: string
  allowCredentials: Array<{
    type: string
    id: string
    transports: string[]
  }>
  timeout: number
  userVerification: string
}

export interface PasskeyCredential {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string
}
