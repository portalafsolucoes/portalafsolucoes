'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ImageViewerModal } from '../ui/ImageViewerModal'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface WorkOrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onEdit: (workOrder: any) => void
  onDelete: (workOrderId: string) => void
  currentUserId?: string
  inPage?: boolean
}

export function WorkOrderDetailModal({ 
  isOpen, 
  onClose, 
  workOrderId,
  onEdit,
  onDelete,
  currentUserId,
  inPage = false
}: WorkOrderDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [workOrder, setWorkOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageViewer, setImageViewer] = useState<{url: string; name: string} | null>(null)

  const isOnlyExecutor = () => {
    if (!currentUserId || !workOrder) return false
    return workOrder.assignedToId === currentUserId
  }

  useEffect(() => {
    if (isOpen && workOrderId) {
      loadWorkOrder()
    }
  }, [isOpen, workOrderId])

  const loadWorkOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/work-orders/${workOrderId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Ordem de serviço não encontrada.')
        } else {
          setError('Erro ao carregar ordem de serviço.')
        }
        setWorkOrder(null)
        return
      }
      
      const data = await response.json()
      if (data.data) {
        setWorkOrder(data.data)
      } else {
        setError('Ordem de serviço não encontrada.')
        setWorkOrder(null)
      }
    } catch (error) {
      console.error('Error loading work order:', error)
      setError('Erro ao conectar ao servidor.')
      setWorkOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    onEdit(workOrder)
    onClose()
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      onDelete(workOrderId)
      onClose()
    }
  }

  const handlePrint = () => {
    window.print()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-primary/10 text-info-light-foreground'
      case 'IN_PROGRESS': return 'bg-warning-light text-warning-light-foreground'
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800'
      case 'COMPLETE': return 'bg-success-light text-success-light-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-danger-light text-danger-light-foreground'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-warning-light text-warning-light-foreground'
      case 'LOW': return 'bg-success-light text-success-light-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '🔴 Crítica'
      case 'HIGH': return '🟠 Alta'
      case 'MEDIUM': return '🟡 Média'
      case 'LOW': return '🟢 Baixa'
      default: return 'Nenhuma'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberta'
      case 'IN_PROGRESS': return 'Em Progresso'
      case 'ON_HOLD': return 'Em Espera'
      case 'COMPLETE': return 'Concluída'
      default: return status
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <Icon name="description" className="text-5xl text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">A ordem de serviço pode ter sido excluída ou você não tem permissão para visualizá-la.</p>
          </div>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      ) : workOrder ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b px-4 md:px-6 pt-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Icon name="description" className="text-2xl text-primary" />
                <h2 className="text-lg md:text-2xl font-bold text-foreground">{workOrder.title}</h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                {workOrder.systemStatus === 'IN_SYSTEM' ? (
                  <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-success-light text-success-light-foreground">
                    ✅ Sistema
                  </span>
                ) : (
                  <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-amber-100 text-amber-800">
                    📝 Fora
                  </span>
                )}
                <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                  {getStatusLabel(workOrder.status)}
                </span>
                <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getPriorityColor(workOrder.priority)}`}>
                  {getPriorityLabel(workOrder.priority)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!isOnlyExecutor() && (
                <>
                  <button
                    onClick={() => {
                      onClose()
                      onEdit(workOrder)
                    }}
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
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-[4px] transition-colors"
              >
                <Icon name="close" className="text-2xl text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Body - Relatório Completo */}
          <div id="printable-report" className="flex-1 overflow-y-auto bg-card p-3 md:p-6">
            {/* Cabeçalho com Botão Imprimir */}
            <div className="border-b-2 border-input pb-3 md:pb-4 mb-4 md:mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                <div>
                  <h1 className="text-base md:text-xl font-bold text-foreground mb-2">{workOrder.title}</h1>
                  <div className="flex gap-1.5 md:gap-2 flex-wrap">
                    {workOrder.externalId && (
                      <span className="inline-block font-mono bg-success-light px-2 py-0.5 md:px-3 md:py-1 rounded border border-green-300 text-xs md:text-sm font-semibold">
                        Proteus: {workOrder.externalId}
                      </span>
                    )}
                    {workOrder.internalId && (
                      <span className="inline-block font-mono bg-amber-100 px-2 py-0.5 md:px-3 md:py-1 rounded border border-amber-300 text-xs md:text-sm font-semibold">
                        Interno: {workOrder.internalId}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handlePrint} 
                  className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 print:hidden transition-colors text-xs md:text-sm"
                >
                  <Icon name="print" className="text-sm md:text-base" />
                  Imprimir
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: SOLICITAÇÃO ORIGINAL (SS) */}
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-primary/5 px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-primary">
                📋 INFORMAÇÕES DA SOLICITAÇÃO (SS)
              </h2>
              
              <div className="space-y-2 md:space-y-3 bg-secondary p-2 md:p-3 rounded-[4px]">
                <div>
                  <label className="block text-sm md:text-sm font-semibold text-foreground mb-1">Descrição da Solicitação:</label>
                  <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                    {workOrder.description || 'Sem descrição'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {workOrder.sourceRequest?.createdBy && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Solicitante (SS):</label>
                      <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                        {workOrder.sourceRequest.createdBy.firstName} {workOrder.sourceRequest.createdBy.lastName}
                      </p>
                    </div>
                  )}

                  {workOrder.createdBy && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Atribuído por:</label>
                      <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                        {workOrder.createdBy.firstName} {workOrder.createdBy.lastName}
                      </p>
                    </div>
                  )}

                  {workOrder.createdAt && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Data da Solicitação:</label>
                      <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                        {new Date(workOrder.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {workOrder.asset && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Ativo:</label>
                      <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                        {workOrder.asset.name}
                      </p>
                    </div>
                  )}

                  {workOrder.location && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Localização:</label>
                      <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                        {workOrder.location.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Imagens da Solicitação Original */}
              {workOrder.sourceRequest?.files && workOrder.sourceRequest.files.length > 0 && (
                <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                  <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Imagens da Solicitação Original:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {workOrder.sourceRequest.files.filter((f: any) => f.type?.startsWith('image/')).map((file: any) => (
                      <div key={file.id} className="relative group">
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="w-full h-24 md:h-32 object-cover rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all"
                          onClick={() => setImageViewer({url: file.url, name: file.name})}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] md:text-xs p-1 rounded-b-lg truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DIVISOR */}
            <div className="my-4 md:my-6 border-t-4 border-dashed border-input"></div>

            {/* SEÇÃO 2: EXECUÇÃO */}
            {workOrder.status === 'COMPLETE' && (
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-green-500">
                  ✅ INFORMAÇÕES DA EXECUÇÃO
                </h2>

                {/* Horários */}
                {workOrder.completedOn && workOrder.actualDuration && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">Horários:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Início:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {new Date(new Date(workOrder.completedOn).getTime() - workOrder.actualDuration * 60000).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Término:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {new Date(workOrder.completedOn).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Duração:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border font-semibold">
                          {workOrder.actualDuration} min
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Descrição do Trabalho */}
                {workOrder.executionNotes && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">Descrição do Trabalho Realizado:</h3>
                    <div className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 md:p-3 rounded border">
                      {workOrder.executionNotes}
                    </div>
                  </div>
                )}

                {/* Etapas de Execução */}
                {workOrder.executionSteps && Array.isArray(workOrder.executionSteps) && workOrder.executionSteps.length > 0 && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">
                      Etapas de Execução ({workOrder.executionSteps.filter((s: any) => s.completed).length}/{workOrder.executionSteps.length}):
                    </h3>
                    <div className="space-y-1.5">
                      {workOrder.executionSteps.map((step: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-card rounded border text-sm">
                          {step.completed ? (
                            <Icon name="check_box" className="text-base text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <Icon name="check_box_outline_blank" className="text-base text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={step.completed ? 'text-foreground' : 'text-muted-foreground'}>
                              {step.stepName}
                            </span>
                            {step.optionType === 'RESPONSE' && step.responseValue && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-blue-700 dark:text-blue-400">
                                <Icon name="chat" className="text-sm" />
                                <span className="font-medium">Resposta:</span> {step.responseValue}
                              </div>
                            )}
                            {step.optionType === 'OPTION' && step.selectedOption && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-purple-700 dark:text-purple-400">
                                <Icon name="list" className="text-sm" />
                                <span className="font-medium">Opção:</span> {step.selectedOption}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fotos ANTES e DEPOIS */}
                {(workOrder.beforePhotoUrl || workOrder.afterPhotoUrl) && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Fotos de Execução:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                      {workOrder.beforePhotoUrl && (
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-foreground mb-1 text-center">ANTES</label>
                          <img 
                            src={workOrder.beforePhotoUrl} 
                            alt="Foto Antes" 
                            className="w-full h-40 md:h-48 object-contain rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all bg-muted"
                            onClick={() => setImageViewer({url: workOrder.beforePhotoUrl, name: 'Foto ANTES'})}
                          />
                        </div>
                      )}
                      {workOrder.afterPhotoUrl && (
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-foreground mb-1 text-center">DEPOIS</label>
                          <img 
                            src={workOrder.afterPhotoUrl} 
                            alt="Foto Depois" 
                            className="w-full h-40 md:h-48 object-contain rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all bg-muted"
                            onClick={() => setImageViewer({url: workOrder.afterPhotoUrl, name: 'Foto DEPOIS'})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Anexos Adicionais */}
                {workOrder.files && workOrder.files.length > 0 && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px]">
                    <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">Anexos Adicionais ({workOrder.files.length}):</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {workOrder.files.map((file: any) => (
                        <div key={file.id} className="flex items-center gap-2 p-2 bg-card rounded-[4px] hover:border-blue-400 transition-all">
                          {file.type?.startsWith('image/') ? (
                            <img 
                              src={file.url} 
                              alt={file.name} 
                              className="w-12 h-12 object-cover rounded cursor-pointer"
                              onClick={() => setImageViewer({url: file.url, name: file.name})}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Icon name="description" className="text-2xl text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.type || 'Arquivo'}</p>
                          </div>
                          <button 
                            onClick={() => window.open(file.url, '_blank')}
                            className="p-1.5 text-primary hover:bg-primary/5 rounded transition-colors"
                            title="Baixar/Visualizar"
                          >
                            <Icon name="download" className="text-base" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rodapé */}
            <div className="mt-4 md:mt-6 pt-2 md:pt-3 border-t border-input text-center text-xs md:text-sm text-muted-foreground">
              <p>Relatório gerado automaticamente - {new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 md:gap-3 pt-3 md:pt-4 border-t px-3 md:px-6 pb-3 md:pb-4">
            <Button variant="outline" onClick={onClose} className="text-sm md:text-base">
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ordem de serviço não encontrada.</p>
        </div>
      )}
      
      {imageViewer && (
        <ImageViewerModal
          isOpen={!!imageViewer}
          onClose={() => setImageViewer(null)}
          imageUrl={imageViewer.url}
          imageName={imageViewer.name}
        />
      )}
    </Modal>
  )
}
