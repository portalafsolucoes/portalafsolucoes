'use client'

import { useQuery } from '@tanstack/react-query'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  canonicalRole?: string
  legacyRole?: string
  jobTitle?: string
  companyId: string
  companyName: string
  unitId?: string
  activeUnitId?: string | null
  unitIds: string[]
  company?: {
    id: string
    name: string
    tradeName?: string
    logo?: string
  }
  location?: {
    id: string
    name: string
  }
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', {
    cache: 'no-store',
    credentials: 'same-origin',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user || null
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    role: user?.role ?? '',
    unitId: user?.activeUnitId ?? user?.unitId ?? null,
    unitIds: user?.unitIds ?? [],
    companyName: user?.companyName ?? user?.company?.name ?? '',
  }
}
