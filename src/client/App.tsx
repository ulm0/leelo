import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Toaster } from 'sonner'

// Pages
import HomePage from '@/pages/home'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import ArticlePage from '@/pages/article'
import ProfilePage from '@/pages/profile'
import AdminPage from '@/pages/admin'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// OIDC Token Handler Component
function OIDCTokenHandler() {
  const location = useLocation()
  const { loginWithToken } = useAuthStore()

  useEffect(() => {
    console.log('🔍 OIDCTokenHandler - Location changed:', location.pathname + location.search)
    
    const urlParams = new URLSearchParams(location.search)
    const token = urlParams.get('token')
    const oidcError = urlParams.get('oidc_error')
    
    console.log('🔍 OIDCTokenHandler - URL params:', { 
      hasToken: !!token, 
      hasError: !!oidcError,
      search: location.search
    })
    
    if (token) {
      console.log('🔐 OIDCTokenHandler - OIDC Token found:', token.substring(0, 50) + '...')
      
      // Remove token from URL
      window.history.replaceState({}, document.title, location.pathname)
      
      // Authenticate with token
      loginWithToken(token).then(() => {
        console.log('✅ OIDCTokenHandler - OIDC login successful')
      }).catch((error) => {
        console.error('❌ OIDCTokenHandler - OIDC login failed:', error)
      })
    }
    
    if (oidcError) {
      // Remove error from URL
      window.history.replaceState({}, document.title, location.pathname)
      
      // Show error to user
      console.error('OIDC authentication error:', decodeURIComponent(oidcError))
      alert(`OIDC Login Failed: ${decodeURIComponent(oidcError)}`)
    }
  }, [location, loginWithToken])

  return null // This component doesn't render anything
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth()
      } finally {
        setIsChecking(false)
      }
    }
    verifyAuth()
  }, [checkAuth])

  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public Route component (redirect to home if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Admin Route component (require admin access)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth()
      } finally {
        setIsChecking(false)
      }
    }
    verifyAuth()
  }, [checkAuth])

  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  const { theme } = useThemeStore()

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark', 'warm')
    root.classList.add(theme)
  }, [theme])



  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <OIDCTokenHandler />
          <Toaster richColors position="top-right" />
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/articles/:id"
              element={
                <ProtectedRoute>
                  <ArticlePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App