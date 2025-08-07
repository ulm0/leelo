import { RegisterForm } from '@/components/auth/register-form'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const { data: systemConfig, isLoading } = useSystemConfig()

  // If registration is disabled, redirect to login
  if (!isLoading && systemConfig && !systemConfig.registrationEnabled) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
              {(systemConfig?.siteName || 'Leelo').charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-3xl font-bold">Join {systemConfig?.siteName || 'Leelo'}</h1>
          <p className="text-muted-foreground mt-2">
            Create your account to start saving articles
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}