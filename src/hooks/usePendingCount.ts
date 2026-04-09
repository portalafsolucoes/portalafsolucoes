'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { isApproverRole } from '@/lib/user-roles'

async function fetchPendingCount(): Promise<number> {
  const res = await fetch('/api/requests/pending-count')
  if (!res.ok) return 0
  const data = await res.json()
  return data.count ?? 0
}

export function usePendingCount() {
  const { user, role } = useAuth()
  const canSeeApprovals = isApproverRole(user ?? role)

  const { data: count = 0 } = useQuery({
    queryKey: ['requests', 'pending-count'],
    queryFn: fetchPendingCount,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: canSeeApprovals,
  })

  return count
}
