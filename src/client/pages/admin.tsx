import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type OIDCProvider, type SystemConfig } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Plus, 
  Trash2, 
  Edit, 
  TestTube, 
  Save, 
  Mail, 
  Shield, 
  Users, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Home,
  Settings
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.getDashboardStats(),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statsData = stats?.stats

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData?.totalUsers || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData?.totalArticles || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">OIDC Providers</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData?.enabledOIDCProviders || 0}</div>
          <p className="text-xs text-muted-foreground">enabled</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Email Config</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {statsData?.emailConfigured ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <span className="text-sm">
              {statsData?.emailConfigured ? 'Configured' : 'Not set'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData?.pendingJobs || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}

function OIDCProviderForm({ 
  provider, 
  onSave, 
  onCancel,
  isLoading = false
}: { 
  provider?: OIDCProvider; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    displayName: provider?.displayName || '',
    clientId: provider?.clientId || '',
    clientSecret: provider?.clientSecret === '****' ? '' : (provider?.clientSecret || ''),
    issuerUrl: provider?.issuerUrl || '',
    scopes: provider?.scopes || 'openid email profile',
    enabled: provider?.enabled || false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Provider Name</Label>
          <Input
            id="name"
            placeholder="e.g., google, github"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            placeholder="e.g., Google, GitHub"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issuerUrl">Discovery URL</Label>
        <Input
          id="issuerUrl"
          placeholder="https://your-oidc-provider.com/.well-known/openid-configuration"
          value={formData.issuerUrl}
          onChange={(e) => setFormData({ ...formData, issuerUrl: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          The complete OIDC discovery endpoint URL. Usually ends with /.well-known/openid_configuration
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">
            Public identifier for your application from the OIDC provider.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientSecret">
            Client Secret {provider && <span className="text-xs text-muted-foreground">(leave empty to keep current)</span>}
          </Label>
          <Input
            id="clientSecret"
            type="password"
            value={formData.clientSecret}
            onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
            required={!provider}
          />
          <p className="text-xs text-muted-foreground">
            Secret key for your application from the OIDC provider. Keep this secure.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopes">Scopes</Label>
        <Input
          id="scopes"
          placeholder="openid email profile"
          value={formData.scopes}
          onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Space-separated list of OAuth scopes. Usually includes "openid email profile" at minimum.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label htmlFor="enabled">Enable this provider</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {provider ? 'Update' : 'Create'} Provider
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function OIDCProvidersTab() {
  const queryClient = useQueryClient()
  const [editingProvider, setEditingProvider] = useState<OIDCProvider | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [actualCallbackUrl, setActualCallbackUrl] = useState<string>('')

  // Get the current host for callback URL instructions
  const callbackUrl = `${window.location.origin}/api/auth/oidc/callback`

  // Get the actual callback URL from the backend
  const { data: callbackUrlData } = useQuery({
    queryKey: ['oidc', 'callback-url'],
    queryFn: () => api.getOIDCCallbackUrl(),
  })

  React.useEffect(() => {
    if (callbackUrlData?.callbackUrl) {
      setActualCallbackUrl(callbackUrlData.callbackUrl)
    }
  }, [callbackUrlData])

  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin', 'oidc-providers'],
    queryFn: () => api.getOIDCProviders(),
  })

  const createMutation = useMutation({
    mutationFn: api.createOIDCProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'oidc-providers'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      setShowCreateForm(false)
      toast.success('OIDC provider created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create OIDC provider')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateOIDCProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'oidc-providers'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      setEditingProvider(null)
      toast.success('OIDC provider updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update OIDC provider')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteOIDCProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'oidc-providers'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('OIDC provider deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete OIDC provider')
    },
  })

  const testMutation = useMutation({
    mutationFn: api.testOIDCProvider,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Test failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to test OIDC provider')
    },
  })

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">OIDC Providers</h3>
          <p className="text-sm text-muted-foreground">
            Configure external authentication providers for your users
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Setup Instructions */}
      <Card className="bg-muted/50 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            OIDC Provider Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Required Configuration in Your OIDC Provider:</h4>
            <div className="space-y-2 pl-4">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs bg-background px-2 py-1 rounded border min-w-fit">
                  Callback URL:
                </span>
                <div className="flex-1 space-y-1">
                  <code className="bg-background px-2 py-1 rounded border font-mono text-xs break-all block">
                    {actualCallbackUrl || callbackUrl}
                  </code>
                  {actualCallbackUrl && actualCallbackUrl !== callbackUrl && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Backend URL differs from frontend URL. Use the URL above.
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <div className="space-y-1">
                      {callbackUrlData?.systemConfig?.baseUrl ? (
                        <div>✅ Using System Config baseUrl: <code className="bg-muted px-1 rounded">{callbackUrlData.systemConfig.baseUrl}</code></div>
                      ) : callbackUrlData?.environment?.BASE_URL ? (
                        <div>📝 Using Environment Variable: <code className="bg-muted px-1 rounded">{callbackUrlData.environment.BASE_URL}</code></div>
                      ) : (
                        <div>🔄 Using auto-detected URL from request headers</div>
                      )}
                      <div className="text-xs opacity-75">
                        Final URL: <code className="bg-muted px-1 rounded">{callbackUrlData?.baseUrl}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs bg-background px-2 py-1 rounded border min-w-fit">
                  Scopes:
                </span>
                <code className="bg-background px-2 py-1 rounded border font-mono text-xs">
                  openid email profile
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs bg-background px-2 py-1 rounded border min-w-fit">
                  Discovery URL:
                </span>
                <code className="bg-background px-2 py-1 rounded border font-mono text-xs break-all">
                  Use the complete /.well-known/openid_configuration URL
                </code>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">Common Provider Examples:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-medium">Google:</p>
                <p className="text-muted-foreground">Discovery: https://accounts.google.com/.well-known/openid_configuration</p>
                <p className="text-muted-foreground">Console: console.cloud.google.com</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Microsoft:</p>
                <p className="text-muted-foreground">Discovery: https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration</p>
                <p className="text-muted-foreground">Portal: portal.azure.com</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Auth0:</p>
                <p className="text-muted-foreground">Discovery: https://YOUR_DOMAIN.auth0.com/.well-known/openid_configuration</p>
                <p className="text-muted-foreground">Dashboard: manage.auth0.com</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Tailscale:</p>
                <p className="text-muted-foreground">Discovery: https://id.tail21b62.ts.net/.well-known/openid_configuration</p>
                <p className="text-muted-foreground">Console: login.tailscale.com</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-red-800 dark:text-red-200 text-xs">
              <strong>⚠️ Getting "Invalid callback URL" error?</strong><br/>
              Make sure the <strong>exact</strong> callback URL shown above is configured in your OIDC provider's settings. 
              The URL must match <strong>exactly</strong> (including http/https, port, and path).
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-yellow-800 dark:text-yellow-200 text-xs">
              <strong>Setup Steps:</strong><br/>
              1. Copy the exact callback URL shown above<br/>
              2. In your OIDC provider (Tailscale/Google/etc), add this URL as an authorized redirect URI<br/>
              3. Use the complete discovery URL (including /.well-known/openid_configuration)<br/>
              4. Configure the required scopes in your provider's console before enabling
            </p>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create OIDC Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <OIDCProviderForm
              onSave={createMutation.mutate}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      {editingProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Edit OIDC Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <OIDCProviderForm
              provider={editingProvider}
              onSave={(data) => updateMutation.mutate({ id: editingProvider.id, data })}
              onCancel={() => setEditingProvider(null)}
              isLoading={updateMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {providers?.providers?.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {provider.displayName}
                    <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {provider.name} • {provider.issuerUrl}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate(provider.id)}
                    disabled={testMutation.isPending}
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingProvider(provider)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete OIDC Provider</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the {provider.displayName} provider? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(provider.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p><strong>Client ID:</strong> {provider.clientId}</p>
                <p><strong>Scopes:</strong> {provider.scopes}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {!providers?.providers?.length && (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No OIDC providers configured</h3>
              <p className="text-muted-foreground mb-4">
                Add external authentication providers to allow users to sign in with their existing accounts.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Provider
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function EmailConfigTab() {
  const queryClient = useQueryClient()
  const [testEmail, setTestEmail] = useState('')

  const { data: emailConfig, isLoading } = useQuery({
    queryKey: ['admin', 'email-config'],
    queryFn: () => api.getEmailConfig(),
  })

  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
    enabled: false,
  })

  // Update form when data loads
  React.useEffect(() => {
    if (emailConfig?.config) {
      const config = emailConfig.config
      setFormData({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: config.password === '****' ? '' : config.password,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        enabled: config.enabled,
      })
    }
  }, [emailConfig])

  const saveMutation = useMutation({
    mutationFn: api.saveEmailConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-config'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Email configuration saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save email configuration')
    },
  })

  const testMutation = useMutation({
    mutationFn: api.testEmailConfig,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Test failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to test email configuration')
    },
  })

  const sendTestMutation = useMutation({
    mutationFn: api.sendTestEmail,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message)
        setTestEmail('')
      } else {
        toast.error(data.error || 'Failed to send test email')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send test email')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Email Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure SMTP settings for sending email notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Settings</CardTitle>
          <CardDescription>
            Configure your email server settings to enable email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">SMTP Host</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="secure"
                checked={formData.secure}
                onCheckedChange={(secure) => setFormData({ ...formData, secure })}
              />
              <Label htmlFor="secure">Use TLS/SSL</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your-email@gmail.com"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {emailConfig?.config && <span className="text-xs text-muted-foreground">(leave empty to keep current)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!emailConfig?.config}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  placeholder="Leelo Notifications"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@yourdomain.com"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
              />
              <Label htmlFor="enabled">Enable email notifications</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                <TestTube className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {emailConfig?.config?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your configuration is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
              />
              <Button
                onClick={() => sendTestMutation.mutate(testEmail)}
                disabled={!testEmail || sendTestMutation.isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SystemSettingsTab() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    baseUrl: '',
    registrationEnabled: true,
    oidcRegistrationOnly: false,
    siteName: 'Leelo',
    siteDescription: 'Your personal read-it-whenever app',
  })

  const { data: configData, isLoading } = useQuery({
    queryKey: ['admin', 'system-config'],
    queryFn: () => api.getSystemConfig(),
  })

  const updateConfigMutation = useMutation({
    mutationFn: (updates: Partial<SystemConfig>) => api.updateSystemConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-config'] })
      toast.success('System settings updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update system settings')
    },
  })

  React.useEffect(() => {
    if (configData) {
      setFormData({
        baseUrl: configData.config.baseUrl || '',
        registrationEnabled: configData.config.registrationEnabled,
        oidcRegistrationOnly: configData.config.oidcRegistrationOnly,
        siteName: configData.config.siteName,
        siteDescription: configData.config.siteDescription,
      })
    }
  }, [configData])

  const handleSubmit = () => {
    updateConfigMutation.mutate({
      baseUrl: formData.baseUrl || null,
      registrationEnabled: formData.registrationEnabled,
      oidcRegistrationOnly: formData.oidcRegistrationOnly,
      siteName: formData.siteName,
      siteDescription: formData.siteDescription,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Configure global system settings for your Leelo instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://leelo.example.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                The base URL for OIDC callbacks and other external integrations. Leave empty to use environment variables.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                placeholder="Leelo"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Input
                id="siteDescription"
                placeholder="Your personal read-it-whenever app"
                value={formData.siteDescription}
                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Registration Settings</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register accounts
                  </p>
                </div>
                <Switch
                  checked={formData.registrationEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, registrationEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>OIDC Only Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Only allow registration through OIDC providers (when registration is enabled)
                  </p>
                </div>
                <Switch
                  checked={formData.oidcRegistrationOnly}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, oidcRegistrationOnly: checked })
                  }
                  disabled={!formData.registrationEnabled}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={updateConfigMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InvitationsTab() {
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newInvitation, setNewInvitation] = useState({ email: '', expiresInDays: 7 })

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: () => api.getInvitations(),
  })

  const createInvitationMutation = useMutation({
    mutationFn: (data: { email: string; expiresInDays: number }) => api.createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })
      setShowCreateForm(false)
      setNewInvitation({ email: '', expiresInDays: 7 })
      toast.success('Invitation sent successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation')
    },
  })

  const deleteInvitationMutation = useMutation({
    mutationFn: (id: string) => api.deleteInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })
      toast.success('Invitation deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete invitation')
    },
  })

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault()
    if (newInvitation.email.trim()) {
      createInvitationMutation.mutate(newInvitation)
    }
  }

  const handleDeleteInvitation = (id: string) => {
    deleteInvitationMutation.mutate(id)
  }

  const getStatusBadge = (invitation: any) => {
    if (invitation.used) {
      return <Badge variant="secondary" className="text-xs">Used</Badge>
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    }
    return <Badge variant="default" className="text-xs">Active</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations
              </CardTitle>
              <CardDescription>
                Send invitations to new users
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50">
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newInvitation.email}
                      onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresInDays">Expires in (days)</Label>
                    <Input
                      id="expiresInDays"
                      type="number"
                      min="1"
                      max="365"
                      value={newInvitation.expiresInDays}
                      onChange={(e) => setNewInvitation({ ...newInvitation, expiresInDays: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit"
                    disabled={createInvitationMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {createInvitationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Invitation
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {invitations?.invitations && invitations.invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{invitation.email}</span>
                          {getStatusBadge(invitation)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sent by {invitation.invitedByUser.username} on {new Date(invitation.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                          {invitation.used && invitation.usedByUser && (
                            <span> • Used by {invitation.usedByUser.username}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!invitation.used && new Date(invitation.expiresAt) > new Date() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No invitations found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.getUsers(),
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { isAdmin: boolean } }) =>
      api.updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User role updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user role')
    },
  })

  const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    updateUserMutation.mutate({
      id: userId,
      updates: { isAdmin: !currentIsAdmin }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.users && users.users.length > 0 ? (
              <div className="space-y-3">
                {users.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{user.username}</span>
                          {user.isAdmin && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email || 'No email'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground">
                        {user._count.articles} articles
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`admin-${user.id}`} className="text-sm">
                          Admin
                        </Label>
                        <Switch
                          id={`admin-${user.id}`}
                          checked={user.isAdmin}
                          onCheckedChange={() => handleToggleAdmin(user.id, user.isAdmin)}
                          disabled={updateUserMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()

  const handleBackToHome = () => {
    navigate('/')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Leelo instance configuration and settings
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleBackToHome}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <AdminStats />

      <Tabs defaultValue="oidc" className="space-y-4">
        <TabsList>
          <TabsTrigger value="oidc" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            OIDC Providers
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Configuration
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oidc">
          <OIDCProvidersTab />
        </TabsContent>

        <TabsContent value="email">
          <EmailConfigTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}