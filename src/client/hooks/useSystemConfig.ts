import { useQuery } from '@tanstack/react-query'
import { api, type PublicSystemConfig } from '@/lib/api'

export function useSystemConfig() {
  return useQuery<PublicSystemConfig>({
    queryKey: ['system-config', 'public'],
    queryFn: () => api.getPublicSystemConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}