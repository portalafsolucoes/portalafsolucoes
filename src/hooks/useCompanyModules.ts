'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export interface CompanyModule {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  order: number
}

async function fetchCompanyModules(): Promise<CompanyModule[]> {
  const res = await fetch('/api/modules')
  if (!res.ok) return []
  return res.json()
}

/**
 * Retorna os módulos habilitados para a empresa do usuário logado.
 * O slug de cada módulo mapeia para as rotas do sistema.
 */
export function useCompanyModules() {
  const { user } = useAuth()

  const { data: modules, isLoading } = useQuery({
    queryKey: ['company-modules'],
    queryFn: fetchCompanyModules,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min - módulos mudam raramente
  })

  const enabledSlugs = new Set((modules || []).map(m => m.slug))

  return {
    modules: modules || [],
    isLoading,
    isModuleEnabled: (slug: string) => enabledSlugs.has(slug),
    enabledSlugs,
  }
}
