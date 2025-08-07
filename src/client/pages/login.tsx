import { LoginForm } from '@/components/auth/login-form'
import { useSystemConfig } from '@/hooks/useSystemConfig'

export default function LoginPage() {
  const { data: systemConfig } = useSystemConfig()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
              {(systemConfig?.siteName || 'Leelo').charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome to {systemConfig?.siteName || 'Leelo'}</h1>
          <p className="text-muted-foreground mt-2">
            {systemConfig?.siteDescription || 'Your personal read-it-whenever app'}
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}