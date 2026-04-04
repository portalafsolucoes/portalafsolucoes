'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/layout/AppLayout'
import { Wrench, Package, MapPin, ClipboardList, Box, TrendingUp, AlertCircle } from 'lucide-react'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { CorporateDashboard } from '@/components/dashboard/CorporateDashboard'

interface Stats {
  workOrders: { total: number; open: number; inProgress: number; completed: number }
  assets: { total: number; operational: number; down: number }
  requests: { total: number; pending: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      
      if (!meData.user || !hasPermission(meData.user.role as UserRole, 'dashboard', 'view')) {
        router.push('/work-orders')
        return
      }
      
      setHasAccess(true)
      setIsSuperAdmin(meData.user.role === 'SUPER_ADMIN')
      loadStats()
    } catch {
      router.push('/login')
    }
  }

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

  if (!hasAccess) {
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 lg:mt-2 text-sm lg:text-base text-gray-600">
            Visão geral do sistema de manutenção
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card Ordens de Serviço */}
            <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Ordens de Serviço</h3>
              <div className="text-3xl font-bold text-gray-900 mb-3">{stats?.workOrders.total}</div>
              <div className="flex gap-3 text-xs">
                <span className="text-gray-600">Abertas: <span className="font-semibold text-primary">{stats?.workOrders.open}</span></span>
                <span className="text-gray-600">Em Progresso: <span className="font-semibold text-gray-600">{stats?.workOrders.inProgress}</span></span>
              </div>
            </div>

            {/* Card Ativos */}
            <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-success-light rounded-lg">
                  <Box className="h-6 w-6 text-success" />
                </div>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Ativos</h3>
              <div className="text-3xl font-bold text-gray-900 mb-3">{stats?.assets.total}</div>
              <div className="flex gap-3 text-xs">
                <span className="text-gray-600">Operacionais: <span className="font-semibold text-success">{stats?.assets.operational}</span></span>
                <span className="text-gray-600">Inativos: <span className="font-semibold text-danger">{stats?.assets.down}</span></span>
              </div>
            </div>

            {/* Card Solicitações */}
            <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-gray-600" />
                </div>
                {stats?.requests.pending ? (
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Solicitações</h3>
              <div className="text-3xl font-bold text-gray-900 mb-3">{stats?.requests.total}</div>
              <div className="text-xs">
                <span className="text-gray-600">Pendentes: <span className="font-semibold text-gray-600">{stats?.requests.pending}</span></span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card Ordens Recentes */}
          <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordens de Serviço Recentes</h3>
            <p className="text-sm text-gray-600">
              Nenhuma ordem de serviço encontrada. Clique em "Ordens de Serviço" no menu para criar uma.
            </p>
          </div>

          {/* Card Alertas */}
          <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas</h3>
            <p className="text-sm text-gray-600">Nenhum alerta no momento.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
