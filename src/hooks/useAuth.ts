'use client'

import { useQuery } from '@tanstack/react-query'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  jobTitle?: string
  companyId: string
  unitId?: string
  company?: {
    id: string
    name: string
    tradeName?: string
  }
  location?: {
    id: string
    name: string
  }
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return null
  const data = await res.json()
  return data.user || null
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutos - auth muda raramente
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    role: user?.role ?? '',
  }
}
