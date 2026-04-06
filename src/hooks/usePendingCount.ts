'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

async function fetchPendingCount(): Promise<number> {
  const res = await fetch('/api/requests/pending-count')
  if (!res.ok) return 0
  const data = await res.json()
  return data.count ?? 0
}

export function usePendingCount() {
  const { role } = useAuth()
  const canSeeApprovals = role === 'SUPER_ADMIN' || role === 'GESTOR'

  const { data: count = 0 } = useQuery({
    queryKey: ['requests', 'pending-count'],
    queryFn: fetchPendingCount,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // polling a cada 60s
    enabled: canSeeApprovals,
  })

  return count
}
