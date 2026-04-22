'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/lib/permissions'
import { CorporateDashboard } from '@/components/dashboard/CorporateDashboard'
import { TenantDashboard } from '@/components/dashboard/TenantDashboard'
import { isSuperAdminRole, normalizeUserRole } from '@/lib/user-roles'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const hasAccess = !!user && hasPermission(user, 'dashboard', 'view')
  const isSuperAdmin = isSuperAdminRole(user ?? null)
  // Dashboard é somente visualização para todos os perfis que nao sao ADMIN/SUPER_ADMIN.
  // ADMIN/SUPER_ADMIN ja tem acesso pleno ao resto do sistema e operam via outras telas.
  const canonical = normalizeUserRole(user ?? null)
  const readOnly = canonical !== 'SUPER_ADMIN' && canonical !== 'ADMIN'

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'dashboard', 'view')) {
      router.push('/work-orders')
    }
  }, [authLoading, user, router])

  if (authLoading || !user || !hasAccess) return null

  const headerTitle = isSuperAdmin ? 'Dashboard Corporativo' : 'Dashboard'
  const headerDescription = isSuperAdmin
    ? 'Visão consolidada de todas as unidades'
    : 'Indicadores de manutenção em tempo real'

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader className="mb-0" title={headerTitle} description={headerDescription} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-surface">
          <div className="w-full overflow-auto p-4 md:p-6">
            {isSuperAdmin ? <CorporateDashboard /> : <TenantDashboard readOnly={readOnly} />}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
