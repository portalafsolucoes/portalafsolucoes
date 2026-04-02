'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  Box, 
  User,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import Link from 'next/link'

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [workOrder, setWorkOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadWorkOrder()
    }
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
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent"></div>
        </div>
      </AppLayout>
    )
  }

  if (!workOrder) {
    return null
  }

  const displayId = workOrder.externalId || workOrder.internalId || workOrder.customId || workOrder.id.slice(0, 8)

  return (
    <AppLayout>
      <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  OS {displayId}
                </h1>
                {workOrder.systemStatus === 'IN_SYSTEM' ? (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-success-light text-success-light-foreground border border-gray-300">
                    ✅ No Sistema
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-200 text-gray-800 border border-gray-300">
                    📝 Fora do Sistema
                  </span>
                )}
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(workOrder.status)}`}>
                  {workOrder.status}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(workOrder.priority)}`}>
                  {workOrder.priority}
                </span>
              </div>
              <p className="text-lg text-gray-600">{workOrder.title}</p>
            </div>

            <div className="flex gap-3">
              <Link href={`/work-orders/${params.id}/edit`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-danger hover:text-danger hover:bg-danger-light"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </div>

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
                  <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
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
                    {workOrder.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.label}
                          </p>
                          {task.notes && (
                            <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
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
                    <Box className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Ativo</p>
                      <p className="font-medium text-gray-900">{workOrder.asset.name}</p>
                    </div>
                  </div>
                )}

                {workOrder.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Localização</p>
                      <p className="font-medium text-gray-900">{workOrder.location.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Criado em</p>
                    <p className="font-medium text-gray-900">{formatDate(workOrder.createdAt)}</p>
                  </div>
                </div>

                {workOrder.dueDate && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Vencimento</p>
                      <p className="font-medium text-gray-900">{formatDate(workOrder.dueDate)}</p>
                    </div>
                  </div>
                )}

                {workOrder.completedOn && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Concluído em</p>
                      <p className="font-medium text-gray-900">{formatDate(workOrder.completedOn)}</p>
                    </div>
                  </div>
                )}

                {workOrder.createdBy && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Criado por</p>
                      <p className="font-medium text-gray-900">
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
                    {workOrder.assignedUsers.map((user: any) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-danger-light flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja excluir a ordem de serviço <strong>{displayId}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="bg-danger hover:bg-gray-700 text-white"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
