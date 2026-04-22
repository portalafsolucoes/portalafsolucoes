import type { CanonicalUserRole } from './user-roles'
import { getDefaultCmmsPath } from './user-roles'

export type ProductSlug = 'CMMS' | 'GVP' | 'GPA'
export type ProductStatus = 'ACTIVE' | 'COMING_SOON' | 'DISABLED'

export type ProductRecord = {
  id: string
  slug: ProductSlug
  name: string
  description: string | null
  icon: string | null
  order: number
  status: ProductStatus
  enabled?: boolean // habilitado para a empresa do usuário
}

/** Retorna a href raiz de cada produto */
export function getProductHref(slug: ProductSlug): string {
  const MAP: Record<ProductSlug, string> = {
    CMMS: '/dashboard',
    GVP: '/gvp',
    GPA: '/portaria',
  }
  return MAP[slug] ?? '/hub'
}

export type ProductDefaultPathContext =
  | CanonicalUserRole
  | null
  | { role: CanonicalUserRole | string | null; companyId?: string | null }

/** Retorna o path padrão considerando a role e o companyId do usuário */
export function getProductDefaultPath(slug: ProductSlug, ctx: ProductDefaultPathContext): string {
  if (slug === 'CMMS') {
    return getDefaultCmmsPath(ctx as Parameters<typeof getDefaultCmmsPath>[0])
  }
  return getProductHref(slug)
}

/** Metadados visuais estáticos por produto (não precisam vir do banco) */
export const PRODUCT_META: Record<ProductSlug, {
  shortName: string
  features: string[]
  image: string
}> = {
  CMMS: {
    shortName: 'CMMS',
    features: ['Ordens de Serviço', 'Planos Preventivos', 'Gestão de Ativos', 'KPIs & Dashboards', 'Mobilidade'],
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
  },
  GVP: {
    shortName: 'GVP',
    features: ['Leituras em Tempo Real', 'Alertas Automáticos', 'Dashboards Analíticos'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  },
  GPA: {
    shortName: 'GPA',
    features: ['Leitura de Placas (LPR)', 'Controle de Cancelas', 'Histórico e Auditoria'],
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80',
  },
}
