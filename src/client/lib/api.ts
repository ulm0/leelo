export interface User {
  id: string
  username: string
  email?: string
  isAdmin: boolean
  useGravatar: boolean
  identiconUrl?: string
  totpEnabled: boolean
  readingFont?: string
  customFontUrl?: string
  createdAt: string
  updatedAt?: string
}

export interface OIDCProvider {
  id: string
  name: string
  displayName: string
  clientId: string
  clientSecret: string
  issuerUrl: string
  scopes: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailConfig {
  id: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromName: string
  fromEmail: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SystemConfig {
  id: string
  baseUrl?: string | null
  registrationEnabled: boolean
  oidcRegistrationOnly: boolean
  siteName: string
  siteDescription: string
  createdAt: string
  updatedAt: string
}

export interface PublicSystemConfig {
  siteName: string
  siteDescription: string
  registrationEnabled: boolean
  oidcRegistrationOnly: boolean
}

export interface AdminStats {
  totalUsers: number
  totalArticles: number
  enabledOIDCProviders: number
  emailConfigured: boolean
  pendingJobs: number
}

export interface Invitation {
  id: string
  email: string
  token: string
  invitedBy: string
  expiresAt: string
  used: boolean
  usedAt?: string
  usedBy?: string
  createdAt: string
  updatedAt: string
  invitedByUser: {
    id: string
    username: string
  }
  usedByUser?: {
    id: string
    username: string
  }
}

export interface Article {
  id: string
  url: string
  title: string
  author?: string
  excerpt?: string
  content?: string
  wordCount?: number
  readingTime?: number
  publishedAt?: string
  favicon?: string
  image?: string
  isRead: boolean
  isArchived: boolean
  isFavorite: boolean
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed'
  extractionError?: string
  createdAt: string
  updatedAt: string
  tags: Tag[]
}

export interface Tag {
  id: string
  name: string
  color?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ArticlesResponse {
  articles: Article[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface StatsResponse {
  total: number
  read: number
  unread: number
  archived: number
  favorites: number
}

export interface Config {
  oidcEnabled: boolean
  registrationEnabled: boolean
  siteName: string
  siteDescription: string
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = ''
    this.token = localStorage.getItem('token')
  }

  setToken(token: string | null) {
    console.log('🔧 API Client - Setting token:', token ? `${token.substring(0, 50)}...` : 'null')
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }

    // Only set Content-Type to JSON if we have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
      console.log(`🌐 API Request to ${endpoint} - Token: ${this.token.substring(0, 50)}...`)
    } else {
      console.log(`🌐 API Request to ${endpoint} - No token`)
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<LoginResponse | { requiresTOTP: true; message: string }> {
    return this.request<LoginResponse | { requiresTOTP: true; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  async loginWithTOTP(username: string, password: string, totpToken: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login-totp', {
      method: 'POST',
      body: JSON.stringify({ username, password, totpToken }),
    })
  }

  async register(username: string, email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
  }

  getEnabledOIDCProviders = async (): Promise<{ providers: Array<{ id: string; name: string; displayName: string; issuerUrl: string }> }> => {
    return this.request<{ providers: Array<{ id: string; name: string; displayName: string; issuerUrl: string }> }>('/auth/oidc-providers')
  }

  getOIDCCallbackUrl = async (): Promise<{ callbackUrl: string; baseUrl: string; systemConfig: { baseUrl: string | null }; environment: any }> => {
    return this.request<{ callbackUrl: string; baseUrl: string; systemConfig: { baseUrl: string | null }; environment: any }>('/auth/oidc/callback-url')
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me')
  }

  // Public system configuration
  getPublicSystemConfig = async (): Promise<PublicSystemConfig> => {
    return this.request<PublicSystemConfig>('/auth/system-config')
  }

  // Article endpoints
  async getArticles(params: {
    page?: number
    limit?: number
    search?: string
    tag?: string
    isRead?: boolean
    isArchived?: boolean
    isFavorite?: boolean
  } = {}): Promise<ArticlesResponse> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const query = searchParams.toString()
    return this.request<ArticlesResponse>(`/articles${query ? `?${query}` : ''}`)
  }

  async getArticle(id: string): Promise<Article> {
    return this.request<Article>(`/articles/${id}`)
  }

  async addArticle(url: string, tags: string[] = []): Promise<{ article: Article; message: string }> {
    return this.request<{ article: Article; message: string }>('/articles', {
      method: 'POST',
      body: JSON.stringify({ url, tags }),
    })
  }

  async importCsv(csvData: string): Promise<{ 
    message: string; 
    imported: number; 
    skipped: number; 
    errors?: string[] 
  }> {
    return this.request<{ 
      message: string; 
      imported: number; 
      skipped: number; 
      errors?: string[] 
    }>('/articles/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvData }),
    })
  }

  async exportCsv(params: {
    search?: string
    tag?: string
    isRead?: boolean
    isArchived?: boolean
    isFavorite?: boolean
  } = {}): Promise<Blob> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const query = searchParams.toString()
    const url = `${this.baseUrl}/api/articles/export-csv${query ? `?${query}` : ''}`
    
    const headers: Record<string, string> = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.blob()
  }

  async updateArticle(id: string, updates: {
    isRead?: boolean
    isArchived?: boolean
    isFavorite?: boolean
    tags?: string[]
  }): Promise<Article> {
    return this.request<Article>(`/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async deleteArticle(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/articles/${id}`, {
      method: 'DELETE',
    })
  }

  async getTags(): Promise<{ tags: (Tag & { _count: { articles: number } })[] }> {
    return this.request<{ tags: (Tag & { _count: { articles: number } })[] }>('/articles/tags/list')
  }

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/articles/stats')
  }

  // Config endpoints
  async getPublicConfig(): Promise<Config> {
    return this.request<Config>('/config/public')
  }

  async getConfig(): Promise<Config> {
    return this.request<Config>('/config')
  }

  async updateConfig(config: Partial<Config>): Promise<Config> {
    return this.request<Config>('/config', {
      method: 'PATCH',
      body: JSON.stringify(config),
    })
  }

  // User endpoints
  async getUserProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/users/profile')
  }

  async updateUserProfile(updates: {
    email?: string
    currentPassword?: string
    newPassword?: string
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async getUsers(): Promise<{ users: (User & { _count: { articles: number } })[] }> {
    return this.request<{ users: (User & { _count: { articles: number } })[] }>('/admin/users')
  }

  async updateUser(id: string, updates: { isAdmin?: boolean }): Promise<{ user: User }> {
    return this.request<{ user: User }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  // Invitation endpoints
  async getInvitations(): Promise<{ invitations: Invitation[] }> {
    return this.request<{ invitations: Invitation[] }>('/admin/invitations')
  }

  async createInvitation(data: { email: string; expiresInDays?: number }): Promise<{ invitation: Invitation }> {
    return this.request<{ invitation: Invitation }>('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteInvitation(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/invitations/${id}`, {
      method: 'DELETE',
    })
  }

  async validateInvitation(token: string): Promise<{ 
    valid: boolean; 
    invitation?: { email: string; expiresAt: string; invitedBy: string }; 
    error?: string 
  }> {
    return this.request<{ 
      valid: boolean; 
      invitation?: { email: string; expiresAt: string; invitedBy: string }; 
      error?: string 
    }>(`/auth/validate-invitation/${token}`)
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    })
  }

  // Article extraction endpoints
  async retryExtraction(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/articles/${id}/retry-extraction`, {
      method: 'POST',
    })
  }

  async getExtractionStatus(): Promise<{
    pending: number
    extracting: number
    completed: number
    failed: number
  }> {
    return this.request<{
      pending: number
      extracting: number
      completed: number
      failed: number
    }>('/articles/extraction-status')
  }

  async cleanupStuckExtractions(): Promise<{ message: string; cleaned: number }> {
    return this.request<{ message: string; cleaned: number }>('/articles/cleanup-stuck-extractions', {
      method: 'POST',
    })
  }

  // Profile endpoints
  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/users/profile')
  }

  async updateProfile(updates: {
    username?: string
    email?: string
    useGravatar?: boolean
    readingFont?: string
    customFontUrl?: string
    currentPassword?: string
    newPassword?: string
  }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async uploadCustomFont(file: File): Promise<{ message: string; fontUrl: string }> {
    const formData = new FormData()
    formData.append('font', file)
    
    return this.request<{ message: string; fontUrl: string }>('/users/upload-font', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }

  // Admin endpoints
  getDashboardStats = async (): Promise<{ stats: AdminStats }> => {
    return this.request<{ stats: AdminStats }>('/admin/dashboard-stats')
  }

  // OIDC Provider endpoints
  getOIDCProviders = async (): Promise<{ providers: OIDCProvider[] }> => {
    return this.request<{ providers: OIDCProvider[] }>('/admin/oidc-providers')
  }

  getOIDCProvider = async (id: string): Promise<{ provider: OIDCProvider }> => {
    return this.request<{ provider: OIDCProvider }>(`/admin/oidc-providers/${id}`)
  }

  createOIDCProvider = async (data: Omit<OIDCProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ provider: OIDCProvider }> => {
    return this.request<{ provider: OIDCProvider }>('/admin/oidc-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateOIDCProvider = async (id: string, data: Partial<Omit<OIDCProvider, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ provider: OIDCProvider }> => {
    return this.request<{ provider: OIDCProvider }>(`/admin/oidc-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  deleteOIDCProvider = async (id: string): Promise<{ message: string }> => {
    return this.request<{ message: string }>(`/admin/oidc-providers/${id}`, {
      method: 'DELETE',
    })
  }

  testOIDCProvider = async (id: string): Promise<{ success: boolean; message: string; discovery?: any; error?: string }> => {
    return this.request<{ success: boolean; message: string; discovery?: any; error?: string }>(`/admin/oidc-providers/${id}/test`, {
      method: 'POST',
    })
  }

  // Email Config endpoints
  getEmailConfig = async (): Promise<{ config: EmailConfig | null }> => {
    return this.request<{ config: EmailConfig | null }>('/admin/email-config')
  }

  saveEmailConfig = async (data: Omit<EmailConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ config: EmailConfig }> => {
    return this.request<{ config: EmailConfig }>('/admin/email-config', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  testEmailConfig = async (): Promise<{ success: boolean; message: string; error?: string }> => {
    return this.request<{ success: boolean; message: string; error?: string }>('/admin/email-config/test', {
      method: 'POST',
    })
  }

  sendTestEmail = async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    return this.request<{ success: boolean; message: string; error?: string }>('/admin/email-config/test-send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  // System Config endpoints
  getSystemConfig = async (): Promise<{ config: SystemConfig }> => {
    return this.request<{ config: SystemConfig }>('/admin/system-config')
  }

  updateSystemConfig = async (data: Partial<Omit<SystemConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ config: SystemConfig }> => {
    return this.request<{ config: SystemConfig }>('/admin/system-config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // TOTP methods
  setupTOTP = async (): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> => {
    return this.request<{ secret: string; qrCode: string; backupCodes: string[] }>('/auth/totp/setup', {
      method: 'POST',
    })
  }

  verifyTOTP = async (token: string): Promise<{ success: boolean; message: string; token?: string; user?: User }> => {
    return this.request<{ success: boolean; message: string; token?: string; user?: User }>('/auth/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  disableTOTP = async (token: string): Promise<{ success: boolean; message: string; token?: string; user?: User }> => {
    return this.request<{ success: boolean; message: string; token?: string; user?: User }>('/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  verifyBackupCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    return this.request<{ success: boolean; message: string }>('/auth/totp/backup-verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  // Passkey methods
  getPasskeyRegistrationOptions = async (): Promise<any> => {
    return this.request<any>('/auth/passkey/register-options', {
      method: 'POST',
    })
  }

  registerPasskey = async (response: any, name: string): Promise<{ success: boolean; message: string }> => {
    return this.request<{ success: boolean; message: string }>('/auth/passkey/register', {
      method: 'POST',
      body: JSON.stringify({ response, name }),
    })
  }

  getPasskeyAuthenticationOptions = async (): Promise<any> => {
    return this.request<any>('/auth/passkey/authenticate-options', {
      method: 'POST',
    })
  }

  getPasskeyLoginOptions = async (): Promise<any> => {
    return this.request<any>('/auth/passkey/login-options', {
      method: 'POST',
    })
  }

  loginWithPasskey = async (response: any): Promise<LoginResponse> => {
    return this.request<LoginResponse>('/auth/passkey/login', {
      method: 'POST',
      body: JSON.stringify({ response }),
    })
  }

  authenticatePasskey = async (response: any): Promise<{ success: boolean; message: string }> => {
    return this.request<{ success: boolean; message: string }>('/auth/passkey/authenticate', {
      method: 'POST',
      body: JSON.stringify({ response }),
    })
  }

  getPasskeys = async (): Promise<{ passkeys: Array<{ id: string; name: string; createdAt: string; lastUsedAt: string }> }> => {
    return this.request<{ passkeys: Array<{ id: string; name: string; createdAt: string; lastUsedAt: string }> }>('/auth/passkey/list')
  }

  deletePasskey = async (id: string): Promise<{ success: boolean; message: string }> => {
    return this.request<{ success: boolean; message: string }>(`/auth/passkey/${id}`, {
      method: 'DELETE',
    })
  }
}

export const api = new ApiClient()