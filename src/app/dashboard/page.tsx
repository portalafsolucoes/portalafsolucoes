'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'

import { hasPermission, type UserRole } from '@/lib/permissions'
import { CorporateDashboard } from '@/components/dashboard/CorporateDashboard'

interface Stats {
  workOrders: { total: number; open: number; inProgress: number; completed: number }
  assets: { total: number; operational: number; down: number }
  requests: { total: number; pending: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const role = user?.role ?? ''
  const hasAccess = !!user && hasPermission(role as UserRole, 'dashboard', 'view')
  const isSuperAdmin = role === 'SUPER_ADMIN'

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user.role as UserRole, 'dashboard', 'view')) {
      router.push('/work-orders')
      return
    }
    loadStats()
  }, [authLoading, user])

  const loadStats = async () => {
    try {
      // Usa API otimizada que retorna apenas contagens (não carrega registros inteiros)
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()

      if (data.data) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user || !hasAccess) {
    return null
  }

  // SUPER_ADMIN vê dashboard corporativo
  if (isSuperAdmin) {
    return (
      <AppLayout>
        <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <CorporateDashboard />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-6 lg:mb-8 pt-16 lg:pt-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-1 lg:mt-2 text-sm lg:text-base text-muted-foreground">
            Visão geral do sistema de manutenção
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card Ordens de Serviço */}
            <div className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/5 rounded-[4px]">
                  <Icon name="construction" className="text-2xl text-primary" />
                </div>
                <Icon name="trending_up" className="text-base text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Ordens de Serviço</h3>
              <div className="text-3xl font-bold text-foreground mb-3">{stats?.workOrders.total}</div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">Abertas: <span className="font-semibold text-primary">{stats?.workOrders.open}</span></span>
                <span className="text-muted-foreground">Em Progresso: <span className="font-semibold text-muted-foreground">{stats?.workOrders.inProgress}</span></span>
              </div>
            </div>

            {/* Card Ativos */}
            <div className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-success-light rounded-[4px]">
                  <Icon name="inventory_2" className="text-2xl text-success" />
                </div>
                <Icon name="trending_up" className="text-base text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Ativos</h3>
              <div className="text-3xl font-bold text-foreground mb-3">{stats?.assets.total}</div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">Operacionais: <span className="font-semibold text-success">{stats?.assets.operational}</span></span>
                <span className="text-muted-foreground">Inativos: <span className="font-semibold text-danger">{stats?.assets.down}</span></span>
              </div>
            </div>

            {/* Card Solicitações */}
            <div className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-surface rounded-[4px]">
                  <Icon name="assignment" className="text-2xl text-muted-foreground" />
                </div>
                {stats?.requests.pending ? (
                  <Icon name="error" className="text-base text-muted-foreground" />
                ) : (
                  <Icon name="trending_up" className="text-base text-muted-foreground" />
                )}
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Solicitações</h3>
              <div className="text-3xl font-bold text-foreground mb-3">{stats?.requests.total}</div>
              <div className="text-xs">
                <span className="text-muted-foreground">Pendentes: <span className="font-semibold text-muted-foreground">{stats?.requests.pending}</span></span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card Ordens Recentes */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ordens de Serviço Recentes</h3>
            <p className="text-sm text-muted-foreground">
              Nenhuma ordem de serviço encontrada. Clique em "Ordens de Serviço" no menu para criar uma.
            </p>
          </div>

          {/* Card Alertas */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Alertas</h3>
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
