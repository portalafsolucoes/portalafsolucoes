'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
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
    if (inPage) {
      if (requestId) loadRequest()
    } else {
      if (isOpen && requestId) loadRequest()
    }
  }, [isOpen, requestId, inPage])

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
    if (!inPage) onClose()
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
      onDelete(requestId)
      if (!inPage) onClose()
    }
  }

  const isImage = (file: any) => {
    if (file.type?.startsWith('image/')) return true
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

  const inPageBody = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
        <p className="mt-2 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  ) : error ? (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <Icon name="description" className="text-5xl text-muted-foreground mx-auto mb-4" />
        <p className="text-sm font-medium text-foreground mb-1">{error}</p>
        <p className="text-xs text-muted-foreground">A solicitação pode ter sido excluída ou você não tem permissão para visualizá-la.</p>
      </div>
    </div>
  ) : request ? (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <button
            onClick={handleEdit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
          >
            <Icon name="edit" className="text-base" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
          >
            <Icon name="delete" className="text-base" />
            Excluir
          </button>
        </div>

        {/* Badges */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
              {getPriorityLabel(request.priority)}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-info-light-foreground">
              {request.status}
            </span>
          </div>
        </div>

        {/* Descrição */}
        {request.description && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Descrição</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>
        )}

        {/* Dados */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {request.createdBy && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Solicitado por</p>
                <p className="text-sm text-foreground">
                  {request.createdBy.firstName} {request.createdBy.lastName}
                </p>
              </div>
            )}
            {request.team && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Equipe Atribuída</p>
                <p className="text-sm text-foreground">{request.team.name}</p>
              </div>
            )}
            {request.dueDate && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Data Desejada</p>
                <p className="text-sm text-foreground">{formatDate(request.dueDate)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-sm text-foreground">{formatDate(request.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Anexos */}
        {request.files && request.files.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Icon name="attach_file" className="text-base" />
              Anexos ({request.files.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {request.files.map((file: any, index: number) => (
                <div key={index}>
                  {isImage(file) ? (
                    <div className="border border-border rounded-[4px] overflow-hidden">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3 bg-secondary border-t border-border">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <a
                          href={file.url}
                          download={file.name}
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          <Icon name="download" className="text-sm" />
                          Baixar imagem
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border border-border rounded-[4px] hover:bg-secondary">
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
    </>
  ) : (
    <div className="flex-1 flex items-center justify-center p-6">
      <p className="text-muted-foreground">Solicitação não encontrada.</p>
    </div>
  )

  const overlayContent = loading ? (
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
    <>
      {/* Body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-4 md:px-6">
        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
            {getPriorityLabel(request.priority)}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-info-light-foreground">
            {request.status}
          </span>
        </div>

        {/* Descrição */}
        {request.description && (
          <div>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>
        )}

        {/* Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {request.createdBy && (
            <div className="flex items-start gap-3">
              <Icon name="person" className="text-xl text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Solicitado por</p>
                <p className="text-sm text-muted-foreground">
                  {request.createdBy.firstName} {request.createdBy.lastName}
                </p>
              </div>
            </div>
          )}

          {request.team && (
            <div className="flex items-start gap-3">
              <Icon name="group" className="text-xl text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Equipe Atribuída</p>
                <p className="text-sm text-muted-foreground">{request.team.name}</p>
              </div>
            </div>
          )}

          {request.dueDate && (
            <div className="flex items-start gap-3">
              <Icon name="calendar_today" className="text-xl text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Data Desejada</p>
                <p className="text-sm text-muted-foreground">{formatDate(request.dueDate)}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Icon name="schedule" className="text-xl text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Criado em</p>
              <p className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Anexos */}
        {request.files && request.files.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Icon name="attach_file" className="text-base" />
              Anexos ({request.files.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {request.files.map((file: any, index: number) => (
                <div key={index}>
                  {isImage(file) ? (
                    <div className="border border-border rounded-[4px] overflow-hidden">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3 bg-secondary border-t border-border">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <a
                          href={file.url}
                          download={file.name}
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          <Icon name="download" className="text-sm" />
                          Baixar imagem
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border border-border rounded-[4px] hover:bg-secondary">
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

      {/* Action buttons + footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50 space-y-2">
        <button
          onClick={handleEdit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
        >
          <Icon name="edit" className="text-base" />
          Editar
        </button>
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
        >
          <Icon name="delete" className="text-base" />
          Excluir
        </button>
      </div>
    </>
  ) : (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Solicitação não encontrada.</p>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-black text-gray-900">
            {request?.title || 'Solicitação'}
          </h2>
          <PanelCloseButton onClick={onClose} />
        </div>
        {inPageBody}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-border px-4 md:px-6 pt-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="description" className="text-2xl text-primary" />
              <h2 className="text-lg md:text-2xl font-bold text-foreground">{request?.title || 'Solicitação'}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-[4px] transition-colors"
            >
              <Icon name="close" className="text-2xl text-muted-foreground" />
            </button>
          </div>
        </div>
        {overlayContent}
      </div>
    </Modal>
  )
}
