import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Smartphone, 
  Key, 
  QrCode, 
  Copy, 
  Download, 
  Trash2, 
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { api } from '@/lib/api'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

interface SecuritySettingsProps {
  user: {
    id: string
    username: string
    totpEnabled: boolean
  }
}

export function SecuritySettings({ user }: SecuritySettingsProps) {
  const queryClient = useQueryClient()
  const [totpEnabled, setTotpEnabled] = useState(user.totpEnabled)
  const [totpSetup, setTotpSetup] = useState<{
    secret: string
    qrCode: string
    backupCodes: string[]
  } | null>(null)

  // Update local state when user prop changes
  useEffect(() => {
    console.log('SecuritySettings - User changed:', user)
    setTotpEnabled(user.totpEnabled)
  }, [user.totpEnabled, user])
  const [totpToken, setTotpToken] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [showDisableTOTP, setShowDisableTOTP] = useState(false)
  const [passkeys, setPasskeys] = useState<Array<{
    id: string
    name: string
    createdAt: string
    lastUsedAt: string
  }>>([])
  const [passkeyName, setPasskeyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadPasskeys()
  }, [])

  const loadPasskeys = async () => {
    try {
      const response = await api.getPasskeys()
      setPasskeys(response.passkeys)
    } catch (error) {
      console.error('Failed to load passkeys:', error)
    }
  }

  const handleTOTPSetup = async () => {
    setIsLoading(true)
    setMessage(null)
    
    try {
      const setup = await api.setupTOTP()
      setTotpSetup(setup)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to setup TOTP' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTPVerify = async () => {
    if (!totpToken) return
    
    setIsLoading(true)
    setMessage(null)
    
    try {
      const response = await api.verifyTOTP(totpToken)
      setTotpEnabled(true)
      setTotpSetup(null)
      setTotpToken('')
      setMessage({ type: 'success', text: 'TOTP enabled successfully!' })
      
      // Update token if provided
      if (response.token) {
        api.setToken(response.token)
        console.log('🔐 TOTP Enabled - Token updated')
      }
      
      // Invalidate profile query to refresh user data
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Invalid TOTP token' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTPDisable = async () => {
    if (!totpToken) return
    
    setIsLoading(true)
    setMessage(null)
    
    try {
      const response = await api.disableTOTP(totpToken)
      setTotpEnabled(false)
      setTotpToken('')
      setShowDisableTOTP(false)
      setMessage({ type: 'success', text: 'TOTP disabled successfully!' })
      
      // Update token if provided
      if (response.token) {
        api.setToken(response.token)
        console.log('🔐 TOTP Disabled - Token updated')
      }
      
      // Invalidate profile query to refresh user data
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      // Also invalidate current user data to refresh JWT token
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      
      console.log('🔐 TOTP Disabled - Invalidating queries')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disable TOTP' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackupCodeVerify = async () => {
    if (!backupCode) return
    
    setIsLoading(true)
    setMessage(null)
    
    try {
      await api.verifyBackupCode(backupCode)
      setBackupCode('')
      setMessage({ type: 'success', text: 'Backup code verified successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Invalid backup code' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeyRegister = async () => {
    if (!passkeyName) return
    
    setIsLoading(true)
    setMessage(null)
    
    try {
      // Get registration options
      const options = await api.getPasskeyRegistrationOptions()
      
      // Start registration
      const response = await startRegistration(options)
      
      // Complete registration
      await api.registerPasskey(response, passkeyName)
      
      setPasskeyName('')
      await loadPasskeys()
      setMessage({ type: 'success', text: 'Passkey registered successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to register passkey' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this passkey?')) return
    
    setIsLoading(true)
    setMessage(null)
    
    try {
      await api.deletePasskey(id)
      await loadPasskeys()
      setMessage({ type: 'success', text: 'Passkey deleted successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete passkey' })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
  }

  const downloadBackupCodes = () => {
    if (!totpSetup?.backupCodes) return
    
    const content = `Leelo Backup Codes\n\n${totpSetup.backupCodes.join('\n')}\n\nKeep these codes safe in case you lose your authenticator app.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leelo-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Security Settings</h2>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* TOTP Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Two-Factor Authentication (TOTP)</span>
            {totpEnabled && <Badge variant="secondary">Enabled</Badge>}
          </CardTitle>
          <CardDescription>
            Use an authenticator app like Google Authenticator, Authy, or Bitwarden for additional security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!totpEnabled ? (
            <div className="space-y-4">
              {!totpSetup ? (
                <Button onClick={handleTOTPSetup} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Setup TOTP
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan this QR code with your authenticator app:
                    </p>
                    <img src={totpSetup.qrCode} alt="TOTP QR Code" className="mx-auto" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Manual Entry Secret</Label>
                    <div className="flex space-x-2">
                      <Input value={totpSetup.secret} readOnly />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(totpSetup.secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Codes</Label>
                    <p className="text-xs text-muted-foreground">
                      Save these codes in a secure location. You can use them to access your account if you lose your authenticator.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {totpSetup.backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Backup Codes
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Verify Setup</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit code from your authenticator app to complete setup.
                    </p>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="000000"
                        value={totpToken}
                        onChange={(e) => setTotpToken(e.target.value)}
                        maxLength={6}
                      />
                      <Button onClick={handleTOTPVerify} disabled={isLoading || !totpToken}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">TOTP is enabled</span>
                <Button variant="destructive" size="sm" onClick={() => setShowDisableTOTP(true)}>
                  Disable TOTP
                </Button>
              </div>

              {showDisableTOTP && (
                <div className="space-y-2">
                  <Label>Confirm with TOTP Token</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="000000"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      maxLength={6}
                    />
                    <Button onClick={handleTOTPDisable} disabled={isLoading || !totpToken}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Disable'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowDisableTOTP(false)
                        setTotpToken('')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Backup Code Recovery</Label>
                <p className="text-xs text-muted-foreground">
                  Use a backup code if you can't access your authenticator app.
                </p>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Backup code"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                  />
                  <Button onClick={handleBackupCodeVerify} disabled={isLoading || !backupCode}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passkeys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Passkeys</span>
            <Badge variant="secondary">{passkeys.length}</Badge>
          </CardTitle>
          <CardDescription>
            Use biometric authentication or security keys for passwordless login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Add New Passkey</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Passkey name (e.g., iPhone, MacBook)"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
              />
              <Button onClick={handlePasskeyRegister} disabled={isLoading || !passkeyName}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add
              </Button>
            </div>
          </div>

          {passkeys.length > 0 && (
            <div className="space-y-2">
              <Label>Your Passkeys</Label>
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{passkey.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePasskeyDelete(passkey.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
