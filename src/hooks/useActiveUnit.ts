'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface UnitOption {
  id: string
  name: string
}

interface ActiveUnitData {
  activeUnitId: string | null
  availableUnits: UnitOption[]
}

async function fetchActiveUnit(): Promise<ActiveUnitData> {
  const res = await fetch('/api/user/active-unit')
  if (!res.ok) throw new Error('Failed to fetch active unit')
  return res.json()
}

async function switchUnit(unitId: string): Promise<{ success: boolean; unitId: string; unitName: string }> {
  const res = await fetch('/api/user/active-unit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitId }),
  })
  if (!res.ok) throw new Error('Failed to switch unit')
  return res.json()
}

export function useActiveUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['active-unit'],
    queryFn: fetchActiveUnit,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: switchUnit,
    onSuccess: () => {
      // Invalidar queries que dependem da unidade
      queryClient.invalidateQueries({ queryKey: ['active-unit'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  return {
    activeUnitId: data?.activeUnitId ?? null,
    availableUnits: data?.availableUnits ?? [],
    isLoading,
    switchUnit: mutation.mutate,
    isSwitching: mutation.isPending,
  }
}
