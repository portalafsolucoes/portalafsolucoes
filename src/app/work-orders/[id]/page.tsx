'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'

type WorkOrderDetail = {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  systemStatus?: string
  externalId?: string | null
  internalId?: string | null
  customId?: string | null
  createdAt: string
  dueDate?: string | null
  completedOn?: string | null
  asset?: { id: string; name: string } | null
  location?: { id: string; name: string } | null
  createdBy?: { firstName: string; lastName: string } | null
  tasks?: { id: string; completed: boolean; label: string; notes?: string }[]
  assignedUsers?: { id: string; firstName: string; lastName: string; email: string }[]
}

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadWorkOrder()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const loadWorkOrder = async () => {
    try {
      const res = await fetch(`/api/work-orders/${params.id}`)
      const data = await res.json()
      
      if (res.ok) {
        setWorkOrder(data.data)
      } else {
        alert('Ordem de serviço não encontrada')
        router.push('/work-orders')
      }
    } catch (error) {
      console.error('Error loading work order:', error)
      alert('Erro ao carregar ordem de serviço')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/work-orders/${params.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Ordem de serviço excluída com sucesso!')
        router.push('/work-orders')
      } else {
        alert('Erro ao excluir ordem de serviço')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <PageContainer variant="narrow">
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  if (!workOrder) {
    return null
  }

  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)

  return (
    <PageContainer variant="narrow">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <Icon name="arrow_back" className="text-xl mr-2" />
          Voltar
        </button>

        <PageHeader
          title={`OS ${displayId}`}
          description={workOrder.title}
          actions={
            <>
              {workOrder.systemStatus === 'IN_SYSTEM' ? (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-success-light text-success-light-foreground">
                  No Sistema
                </span>
              ) : (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-surface-high text-foreground">
                  Fora do Sistema
                </span>
              )}
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(workOrder.status)}`}>
                {workOrder.status}
              </span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(workOrder.priority)}`}>
                {workOrder.priority}
              </span>
              <Link href={`/work-orders/${params.id}/edit`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Icon name="edit" className="text-base" />
                  Editar
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-danger hover:text-danger hover:bg-danger-light"
                onClick={() => setShowDeleteModal(true)}
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </Button>
            </>
          }
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {workOrder.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{workOrder.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            {workOrder.tasks && workOrder.tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tarefas ({workOrder.tasks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workOrder.tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 bg-surface rounded-[4px]">
                        {task.completed ? (
                          <Icon name="check_circle" className="text-xl text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-border rounded flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.label}
                          </p>
                          {task.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workOrder.asset && (
                  <div className="flex items-start gap-3">
                    <Icon name="inventory_2" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ativo</p>
                      <p className="font-medium text-foreground">{workOrder.asset.name}</p>
                    </div>
                  </div>
                )}

                {workOrder.location && (
                  <div className="flex items-start gap-3">
                    <Icon name="location_on" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Localização</p>
                      <p className="font-medium text-foreground">{workOrder.location.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Icon name="calendar_today" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium text-foreground">{formatDate(workOrder.createdAt)}</p>
                  </div>
                </div>

                {workOrder.dueDate && (
                  <div className="flex items-start gap-3">
                    <Icon name="schedule" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vencimento</p>
                      <p className="font-medium text-foreground">{formatDate(workOrder.dueDate)}</p>
                    </div>
                  </div>
                )}

                {workOrder.completedOn && (
                  <div className="flex items-start gap-3">
                    <Icon name="check_circle" className="text-xl text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Concluído em</p>
                      <p className="font-medium text-foreground">{formatDate(workOrder.completedOn)}</p>
                    </div>
                  </div>
                )}

                {workOrder.createdBy && (
                  <div className="flex items-start gap-3">
                    <Icon name="person" className="text-xl text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Criado por</p>
                      <p className="font-medium text-foreground">
                        {workOrder.createdBy.firstName} {workOrder.createdBy.lastName}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned Users */}
            {workOrder.assignedUsers && workOrder.assignedUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsáveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workOrder.assignedUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
              <Icon name="error" className="text-2xl text-danger" />
            </div>
            <p className="text-foreground">
              Tem certeza que deseja excluir a ordem de serviço <strong>{displayId}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-danger hover:bg-primary-graphite text-white"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
