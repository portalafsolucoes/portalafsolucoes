'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

import Link from 'next/link'

import {
  getWorkOrderStatusLabel,
  getWorkOrderPriorityLabel,
  getWorkOrderTypeLabel,
} from '@/lib/status-labels'

interface DashboardStats {
  teamName: string
  totalMembers: number
  openWorkOrders: number
  inProgressWorkOrders: number
  completedThisMonth: number
  pendingRequests: number
  workOrders: Array<{
    id: string
    title: string
    status: string
    priority: string
    type: string
    dueDate?: string
    assignedTo?: { firstName: string; lastName: string }
  }>
  requests: Array<{
    id: string
    title: string
    priority: string
    urgency?: string
    createdBy: { firstName: string; lastName: string }
    createdAt: string
  }>
}

export default function TeamDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/team-dashboard')
      const data = await res.json()
      setStats(data.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE': return 'bg-success-light text-green-800'
      case 'IN_PROGRESS': return 'bg-primary/10 text-blue-800'
      case 'ON_HOLD': return 'bg-warning-light text-yellow-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-danger-light text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-warning-light text-yellow-800'
      case 'LOW': return 'bg-success-light text-green-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PREVENTIVE': return 'bg-purple-100 text-purple-800'
      case 'CORRECTIVE': return 'bg-primary/10 text-blue-800'
      case 'PREDICTIVE': return 'bg-indigo-100 text-indigo-800'
      case 'REACTIVE': return 'bg-danger-light text-red-800'
      default: return 'bg-muted text-foreground'
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  if (!stats) {
    return (
      <PageContainer>
          <Card>
            <CardContent className="py-12 text-center">
              <Icon name="warning" className="mx-auto text-5xl text-yellow-500 mb-4" />
              <p className="text-muted-foreground">Você não é líder de nenhuma equipe</p>
            </CardContent>
          </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
        <PageHeader
          title="Dashboard da Equipe"
          description={stats.teamName}
        />

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Membros</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalMembers}</p>
                </div>
                <Icon name="group" className="text-5xl text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">OS Abertas</p>
                  <p className="text-3xl font-bold text-foreground">{stats.openWorkOrders}</p>
                </div>
                <Icon name="construction" className="text-5xl text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Progresso</p>
                  <p className="text-3xl font-bold text-foreground">{stats.inProgressWorkOrders}</p>
                </div>
                <Icon name="schedule" className="text-5xl text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SS Pendentes</p>
                  <p className="text-3xl font-bold text-foreground">{stats.pendingRequests}</p>
                </div>
                <Icon name="assignment" className="text-5xl text-yellow-500" />
              </div>
              {stats.pendingRequests > 0 && (
                <Link 
                  href="/requests/approvals"
                  className="mt-3 text-sm text-primary hover:text-blue-800 font-medium"
                >
                  Ver aprovações →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ordens de Serviço da Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="construction" className="text-xl" />
                Ordens de Serviço Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.workOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma OS ativa</p>
              ) : (
                <div className="space-y-3">
                  {stats.workOrders.slice(0, 5).map((wo) => (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      className="block p-4 border rounded-[4px] hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">{wo.title}</h4>
                        <Badge className={getStatusColor(wo.status)}>
                          {getWorkOrderStatusLabel(wo.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge className={getTypeColor(wo.type)}>
                          {getWorkOrderTypeLabel(wo.type)}
                        </Badge>
                        <Badge className={getPriorityColor(wo.priority)}>
                          {getWorkOrderPriorityLabel(wo.priority)}
                        </Badge>
                        {wo.assignedTo && (
                          <span className="text-muted-foreground">
                            👤 {wo.assignedTo.firstName} {wo.assignedTo.lastName}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {stats.workOrders.length > 5 && (
                <Link
                  href="/work-orders"
                  className="mt-4 block text-center text-sm text-primary hover:text-blue-800 font-medium"
                >
                  Ver todas as OS →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Solicitações Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="assignment" className="text-xl" />
                Solicitações Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma solicitação pendente</p>
              ) : (
                <div className="space-y-3">
                  {stats.requests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="p-4 border rounded-[4px]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">{req.title}</h4>
                        <Badge className={getPriorityColor(req.priority)}>
                          {getWorkOrderPriorityLabel(req.priority)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Solicitante: {req.createdBy.firstName} {req.createdBy.lastName}</p>
                        {req.urgency && (
                          <Badge className="mt-1 bg-danger-light text-danger-light-foreground">
                            Urgência: {req.urgency}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {stats.requests.length > 0 && (
                <Link
                  href="/requests/approvals"
                  className="mt-4 block text-center text-sm text-primary hover:text-blue-800 font-medium"
                >
                  Ir para aprovações →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance do Mês */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="trending_up" className="text-xl" />
              Performance do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Icon name="check_circle" className="text-6xl text-green-500" />
              <div>
                <p className="text-4xl font-bold text-foreground">{stats.completedThisMonth}</p>
                <p className="text-muted-foreground">Ordens de Serviço Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
    </PageContainer>
  )
}
