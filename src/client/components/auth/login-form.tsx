import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { Shield, Smartphone, Key } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpToken, setTotpToken] = useState('')
  const [requiresTOTP, setRequiresTOTP] = useState(false)
  const [isPasskeyLogin, setIsPasskeyLogin] = useState(false)
  const { login, loginWithTOTP, loginWithPasskey } = useAuthStore()
  
  // Fetch system configuration
  const { data: systemConfig } = useSystemConfig()

  // Fetch enabled OIDC providers
  const { data: oidcProviders } = useQuery({
    queryKey: ['oidc-providers'],
    queryFn: () => api.getEnabledOIDCProviders(),
  })

  console.log('🔐 Login Form - OIDC Providers:', oidcProviders)

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (result) => {
      if (result.requiresTOTP) {
        setRequiresTOTP(true)
      }
    },
    onError: (error) => {
      console.error('Login failed:', error)
    },
  })

  const totpMutation = useMutation({
    mutationFn: () => loginWithTOTP(username, password, totpToken),
    onError: (error) => {
      console.error('TOTP verification failed:', error)
    },
  })

  const passkeyMutation = useMutation({
    mutationFn: () => loginWithPasskey(),
    onError: (error) => {
      console.error('Passkey authentication failed:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim() && password.trim()) {
      loginMutation.mutate()
    }
  }

  const handleTOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (totpToken.trim()) {
      totpMutation.mutate()
    }
  }

  const handleBackToLogin = () => {
    setRequiresTOTP(false)
    setTotpToken('')
  }

  const handlePasskeyLogin = () => {
    setIsPasskeyLogin(true)
    passkeyMutation.mutate()
  }

  const handleBackFromPasskey = () => {
    setIsPasskeyLogin(false)
  }

  const handleOIDCLogin = (provider: any) => {
    console.log('🔐 OIDC Login - Clicked provider:', provider)
    // Redirect to OIDC login endpoint
    const loginUrl = `/api/auth/oidc/${provider.id}/login`
    console.log('🔐 OIDC Login - Redirecting to:', loginUrl)
    window.location.href = loginUrl
  }



  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {requiresTOTP ? 'Two-Factor Authentication' : isPasskeyLogin ? 'Passkey Authentication' : 'Sign in'}
        </CardTitle>
        <CardDescription className="text-center">
          {requiresTOTP 
            ? 'Enter the 6-digit code from your authenticator app'
            : isPasskeyLogin
            ? 'Use your biometric authentication or security key'
            : 'Enter your credentials to access your account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Login Form - Normal credentials */}
        {!requiresTOTP && !isPasskeyLogin && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginMutation.error && (
              <div className="text-sm text-destructive">
                {loginMutation.error.message}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={loginMutation.isPending || passkeyMutation.isPending}
            >
              {passkeyMutation.isPending ? (
                <>
                  <Key className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Sign in with Passkey
                </>
              )}
            </Button>
          </form>
        )}

        {/* TOTP Form - Only for normal login flow */}
        {requiresTOTP && !isPasskeyLogin && (
          <form onSubmit={handleTOTPSubmit} className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Authenticator App</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="totp" className="text-sm font-medium">
                6-Digit Code
              </label>
              <Input
                id="totp"
                type="text"
                placeholder="000000"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {totpMutation.error && (
              <div className="text-sm text-destructive">
                {totpMutation.error.message}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={totpMutation.isPending}
              >
                {totpMutation.isPending ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={totpMutation.isPending}
              >
                Back to Login
              </Button>
            </div>
          </form>
        )}

        {/* Passkey Authentication Form */}
        {isPasskeyLogin && (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>Passkey Authentication</span>
              </div>
            </div>

            {passkeyMutation.error && (
              <div className="text-sm text-destructive">
                {passkeyMutation.error.message}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBackFromPasskey}
                disabled={passkeyMutation.isPending}
              >
                Back to Login
              </Button>
            </div>
          </div>
        )}

        {/* OIDC Providers - Only show in normal login mode */}
        {!requiresTOTP && !isPasskeyLogin && oidcProviders?.providers && oidcProviders.providers.length > 0 && (
          <>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {oidcProviders.providers.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOIDCLogin(provider)}
                >
                  Sign in with {provider.displayName}
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Registration links - Only show in normal login mode */}
        {!requiresTOTP && !isPasskeyLogin && (
          <>
            {systemConfig?.registrationEnabled && (
              <div className="mt-4 text-center text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            )}
            
            {systemConfig?.registrationEnabled === false && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Registration is currently disabled.
                {oidcProviders?.providers && oidcProviders.providers.length > 0 && 
                  ' Please use an OIDC provider to sign in.'
                }
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}