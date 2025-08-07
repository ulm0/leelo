import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Check, X, User, Mail, Lock, Image, Type, Shield } from 'lucide-react'
import { FontSelector } from '@/components/font-selector'
import { useFontStore } from '@/stores/font'
import { SecuritySettings } from '@/components/auth/security-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const { setReadingFont } = useFontStore()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    useGravatar: false,
    readingFont: 'inter',
    customFontUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  })

  useEffect(() => {
    if (profileData) {
      setFormData({
        username: profileData.user.username,
        email: profileData.user.email || '',
        useGravatar: profileData.user.useGravatar,
        readingFont: profileData.user.readingFont || 'inter',
        customFontUrl: profileData.user.customFontUrl || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }
  }, [profileData])

  const updateProfileMutation = useMutation({
    mutationFn: (updates: any) => api.updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    },
    onError: (error: any) => {
      console.error('Profile update failed:', error)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    const updates: any = {
      username: formData.username,
      email: formData.email || undefined,
      useGravatar: formData.useGravatar,
      readingFont: formData.readingFont,
      customFontUrl: formData.customFontUrl || undefined,
    }

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        alert('Current password is required to change password')
        return
      }
      updates.currentPassword = formData.currentPassword
      updates.newPassword = formData.newPassword
    }

    updateProfileMutation.mutate(updates)
    // Update global font store with the saved preferences
    setReadingFont(formData.readingFont, formData.customFontUrl)
  }

  const handleCancel = () => {
    if (profileData) {
      setFormData({
        username: profileData.user.username,
        email: profileData.user.email || '',
        useGravatar: profileData.user.useGravatar,
        readingFont: profileData.user.readingFont || 'inter',
        customFontUrl: profileData.user.customFontUrl || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }
    setIsEditing(false)
  }

  const handleFontChange = (fontId: string, customUrl?: string) => {
    setFormData(prev => ({
      ...prev,
      readingFont: fontId,
      customFontUrl: customUrl || prev.customFontUrl,
    }))
    // Also update the global font store
    setReadingFont(fontId, customUrl)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
              <div className="bg-muted rounded-lg h-96"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-center text-muted-foreground">Failed to load profile</p>
          </div>
        </main>
      </div>
    )
  }

  const user = profileData.user

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar 
                username={user.username}
                email={user.email}
                useGravatar={user.useGravatar}
                identiconUrl={user.identiconUrl}
                size={48}
              />
              <div>
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <p className="text-sm text-muted-foreground">
                  {user.isAdmin && <Badge variant="secondary" className="mr-2">Admin</Badge>}
                  Manage your account settings
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Profile Information</CardTitle>
                    {!isEditing && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username
                    </label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                      required
                      minLength={3}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email (optional)
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Gravatar Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Avatar Settings
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="useGravatar"
                        checked={formData.useGravatar}
                        onChange={(e) => setFormData(prev => ({ ...prev, useGravatar: e.target.checked }))}
                        className="rounded border-input"
                      />
                      <label htmlFor="useGravatar" className="text-sm">
                        Use Gravatar avatar (requires email)
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When enabled, your profile picture will be loaded from Gravatar using your email address.
                    </p>
                  </div>

                  {/* Reading Font Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Reading Font
                    </h4>
                    <FontSelector
                      currentFont={formData.readingFont}
                      customFontUrl={formData.customFontUrl}
                      onFontChange={handleFontChange}
                    />
                  </div>

                  {/* Password Change */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Change Password (optional)
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Current Password</label>
                      <Input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">New Password</label>
                      <Input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Confirm New Password</label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Display Mode */}
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Username</p>
                        <p className="font-medium">{user.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avatar</p>
                        <p className="font-medium">
                          {user.useGravatar ? 'Using Gravatar' : 'Using initials'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Type className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Reading Font</p>
                        <p className="font-medium">
                          {user.readingFont === 'custom' ? 'Custom Font' : 
                           user.readingFont ? user.readingFont.charAt(0).toUpperCase() + user.readingFont.slice(1) : 'Inter'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Member since {formatDate(user.createdAt)}
                    </p>
                    {user.updatedAt && (
                      <p className="text-sm text-muted-foreground">
                        Last updated {formatDate(user.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {updateProfileMutation.isError && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                    Failed to update profile. Please try again.
                  </p>
                </div>
              )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              {profileData && (
                <>
                  {console.log('Profile - Passing user data:', profileData.user)}
                  <SecuritySettings user={profileData.user} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}