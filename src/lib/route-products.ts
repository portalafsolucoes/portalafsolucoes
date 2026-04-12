export type ProductSlugLiteral = 'CMMS' | 'GVP' | 'GPA'

/**
 * Mapeamento estático de prefixo de rota para produto.
 * Usado pelo middleware para gating e pela sidebar para filtro por produto.
 * Rotas não listadas aqui são compartilhadas (hub, login, admin, profile, settings).
 */
export const ROUTE_TO_PRODUCT: Record<string, ProductSlugLiteral> = {
  // CMMS
  '/dashboard': 'CMMS',
  '/work-orders': 'CMMS',
  '/requests': 'CMMS',
  '/approvals': 'CMMS',
  '/assets': 'CMMS',
  '/maintenance-plan': 'CMMS',
  '/planning': 'CMMS',
  '/rafs': 'CMMS',
  '/locations': 'CMMS',
  '/criticality': 'CMMS',
  '/people-teams': 'CMMS',
  '/basic-registrations': 'CMMS',
  '/tree': 'CMMS',
  '/kpi': 'CMMS',
  '/technician': 'CMMS',
  '/team-dashboard': 'CMMS',
  '/teams': 'CMMS',
  '/people': 'CMMS',
  '/parts': 'CMMS',
  '/analytics': 'CMMS',
  '/cmms': 'CMMS',
  // GVP
  '/gvp': 'GVP',
  '/gep': 'GVP',
  // GPA
  '/portaria': 'GPA',
  '/gpa': 'GPA',
}

/**
 * Retorna o produto de uma rota, verificando por prefixo.
 * Retorna null para rotas compartilhadas (hub, login, admin, profile, etc).
 */
export function getProductForPath(pathname: string): ProductSlugLiteral | null {
  // Verificação exata primeiro
  if (ROUTE_TO_PRODUCT[pathname]) return ROUTE_TO_PRODUCT[pathname]
  // Verificação por prefixo (para /work-orders/[id] etc)
  for (const [prefix, product] of Object.entries(ROUTE_TO_PRODUCT)) {
    if (pathname.startsWith(prefix + '/')) return product
  }
  return null
}
