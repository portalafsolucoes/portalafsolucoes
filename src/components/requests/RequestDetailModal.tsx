'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'

interface RequestDetailModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  onEdit: (request: any) => void
  onDelete: (requestId: string) => void
  inPage?: boolean
}

export function RequestDetailModal({ 
  isOpen, 
  onClose, 
  requestId,
  onEdit,
  onDelete,
  inPage = false
}: RequestDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequest()
    }
  }, [isOpen, requestId])

  const loadRequest = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/requests/${requestId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Solicitação não encontrada.')
        } else {
          setError('Erro ao carregar solicitação.')
        }
        setRequest(null)
        return
      }
      
      const data = await response.json()
      if (data.data) {
        setRequest(data.data)
      } else {
        setError('Solicitação não encontrada.')
        setRequest(null)
      }
    } catch (error) {
      console.error('Error loading request:', error)
      setError('Erro ao conectar ao servidor.')
      setRequest(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    onEdit(request)
    onClose()
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
      onDelete(requestId)
      onClose()
    }
  }

  const isImage = (file: any) => {
    // Verificar pelo tipo MIME
    if (file.type?.startsWith('image/')) {
      return true
    }
    
    // Verificar pela extensão do arquivo (fallback)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico']
    const fileName = file.name?.toLowerCase() || file.url?.toLowerCase() || ''
    return imageExtensions.some(ext => fileName.endsWith(ext))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-danger-light text-danger-light-foreground'
      case 'MEDIUM': return 'bg-warning-light text-warning-light-foreground'
      case 'LOW': return 'bg-success-light text-success-light-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴 Alta'
      case 'MEDIUM': return '🟡 Média'
      case 'LOW': return '🟢 Baixa'
      default: return 'Nenhuma'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-on-surface-variant border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <Icon name="description" className="text-5xl text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">A solicitação pode ter sido excluída ou você não tem permissão para visualizá-la.</p>
          </div>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      ) : request ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b px-4 md:px-6 pt-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="description" className="text-2xl text-primary" />
                <h2 className="text-lg md:text-2xl font-bold text-foreground">{request.title}</h2>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getPriorityColor(request.priority)}`}>
                  {getPriorityLabel(request.priority)}
                </span>
                <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-primary/10 text-info-light-foreground">
                  {request.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-muted rounded-[4px] transition-colors"
                title="Editar"
              >
                <Icon name="edit" className="text-xl text-muted-foreground" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-danger-light rounded-[4px] transition-colors"
                title="Excluir"
              >
                <Icon name="delete" className="text-xl text-danger" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-[4px] transition-colors"
              >
                <Icon name="close" className="text-2xl text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4 md:px-6">
            {/* Descrição */}
            {request.description && (
              <div>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Descrição</h3>
                <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">{request.description}</p>
              </div>
            )}

            {/* Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.createdBy && (
                <div className="flex items-start gap-3">
                  <Icon name="person" className="text-xl text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm md:text-base font-medium text-foreground">Solicitado por</p>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {request.createdBy.firstName} {request.createdBy.lastName}
                    </p>
                  </div>
                </div>
              )}

              {request.team && (
                <div className="flex items-start gap-3">
                  <Icon name="group" className="text-xl text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm md:text-base font-medium text-foreground">Equipe Atribuída</p>
                    <p className="text-sm md:text-base text-muted-foreground">{request.team.name}</p>
                  </div>
                </div>
              )}

              {request.dueDate && (
                <div className="flex items-start gap-3">
                  <Icon name="calendar_today" className="text-xl text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm md:text-base font-medium text-foreground">Data Desejada</p>
                    <p className="text-sm md:text-base text-muted-foreground">{formatDate(request.dueDate)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Icon name="schedule" className="text-xl text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm md:text-base font-medium text-foreground">Criado em</p>
                  <p className="text-sm md:text-base text-muted-foreground">{formatDate(request.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Anexos */}
            {request.files && request.files.length > 0 && (
              <div>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="attach_file" className="text-base" />
                  Anexos ({request.files.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {request.files.map((file: any, index: number) => (
                    <div key={index}>
                      {isImage(file) ? (
                        <div className="border rounded-[4px] overflow-hidden">
                          <img 
                            src={file.url} 
                            alt={file.name}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-3 bg-secondary border-t">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <a 
                              href={file.url} 
                              download={file.name}
                              className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              <Icon name="download" className="text-sm" />
                              Baixar imagem
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 border rounded-[4px] hover:bg-secondary">
                          <Icon name="description" className="text-3xl text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <a 
                              href={file.url} 
                              download={file.name}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Icon name="download" className="text-sm" />
                              Baixar arquivo
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Solicitação não encontrada.</p>
        </div>
      )}
    </Modal>
  )
}
