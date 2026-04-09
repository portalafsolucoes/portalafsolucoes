'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatDate } from '@/lib/utils'

interface ExecutionModalProps {
  item: any
  type: 'workorder' | 'request'
  onClose: () => void
  onSuccess: () => void
}

export function ExecutionModal({ item, type, onClose, onSuccess }: ExecutionModalProps) {
  const [step, setStep] = useState<'view' | 'start' | 'complete'>('view')
  const [beforePhoto, setBeforePhoto] = useState<string | null>(item.beforePhotoUrl || null)
  const [afterPhoto, setAfterPhoto] = useState<string | null>(item.afterPhotoUrl || null)
  const [executionNotes, setExecutionNotes] = useState(item.executionNotes || '')
  const [loading, setLoading] = useState(false)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)

  const isCompleted = type === 'workorder' 
    ? item.status === 'COMPLETE'
    : item.executionCompletedAt

  const isStarted = type === 'workorder'
    ? item.status === 'IN_PROGRESS' || item.beforePhotoUrl
    : item.executionStartedAt

  // Determinar step inicial
  useEffect(() => {
    if (isCompleted) {
      setStep('view')
    } else if (isStarted && !isCompleted) {
      setStep('complete')
    } else {
      setStep('start')
    }
  }, [isCompleted, isStarted])

  const handleImageUpload = async (file: File, type: 'before' | 'after') => {
    if (!file) return

    if (type === 'before') setUploadingBefore(true)
    else setUploadingAfter(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // Simular upload - em produção, usar endpoint real
      // const res = await fetch('/api/upload', { method: 'POST', body: formData })
      // const data = await res.json()
      
      // Por enquanto, criar URL local
      const reader = new FileReader()
      reader.onloadend = () => {
        const url = reader.result as string
        if (type === 'before') {
          setBeforePhoto(url)
        } else {
          setAfterPhoto(url)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      alert('Erro ao fazer upload da imagem')
    } finally {
      if (type === 'before') setUploadingBefore(false)
      else setUploadingAfter(false)
    }
  }

  const handleStartExecution = async () => {
    if (!beforePhoto) {
      alert('Foto "antes" é obrigatória para iniciar')
      return
    }

    setLoading(true)
    try {
      const endpoint = type === 'workorder'
        ? `/api/work-orders/${item.id}/execute`
        : `/api/requests/${item.id}/start-execution`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforePhotoUrl: beforePhoto })
      })

      if (res.ok) {
        alert('Execução iniciada com sucesso!')
        setStep('complete')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao iniciar execução')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteExecution = async () => {
    if (!afterPhoto) {
      alert('Foto "depois" é obrigatória para completar')
      return
    }

    if (!executionNotes.trim()) {
      alert('Notas de execução são obrigatórias')
      return
    }

    setLoading(true)
    try {
      const endpoint = type === 'workorder'
        ? `/api/work-orders/${item.id}/execute`
        : `/api/requests/${item.id}/complete-execution`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterPhotoUrl: afterPhoto,
          executionNotes,
          status: 'COMPLETE'
        })
      })

      if (res.ok) {
        alert('Execução completada com sucesso!')
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao completar execução')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-danger-light0',
      HIGH: 'bg-on-surface-variant',
      MEDIUM: 'bg-warning-light0',
      LOW: 'bg-success-light0',
      NONE: 'bg-secondary0'
    }
    return <Badge className={colors[priority as keyof typeof colors] || colors.NONE}>{priority}</Badge>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-[4px] ambient-ambient-shadow max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {type === 'workorder' ? 'Ordem de Serviço' : 'Solicitação de Serviço'}
            </h2>
            {type === 'workorder' && item.internalId && (
              <p className="text-sm text-muted-foreground font-mono">{item.internalId}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
            <Icon name="close" className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
            <div className="flex gap-2 items-center">
              {getPriorityBadge(item.priority)}
              {isCompleted && <Badge className="bg-success-light0">Concluída</Badge>}
              {isStarted && !isCompleted && <Badge className="bg-warning-light0">Em Execução</Badge>}
              {!isStarted && <Badge className="bg-secondary0">Não Iniciada</Badge>}
            </div>
          </div>

          {item.description && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Icon name="description" className="text-base inline mr-1" />
                Descrição
              </label>
              <p className="text-foreground bg-surface p-4 rounded-[4px]">{item.description}</p>
            </div>
          )}

          {/* Apenas visualização (completado) */}
          {isCompleted && (
            <div className="space-y-6">
              {/* Fotos */}
              <div className="grid grid-cols-2 gap-4">
                {beforePhoto && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Icon name="photo_camera" className="text-base inline mr-1" />
                      Foto ANTES
                    </label>
                    <img 
                      src={beforePhoto} 
                      alt="Antes" 
                      className="w-full h-64 object-cover rounded-[4px] border-2 border-border"
                    />
                  </div>
                )}
                {afterPhoto && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Icon name="photo_camera" className="text-base inline mr-1" />
                      Foto DEPOIS
                    </label>
                    <img 
                      src={afterPhoto} 
                      alt="Depois" 
                      className="w-full h-64 object-cover rounded-[4px] border-2 border-border"
                    />
                  </div>
                )}
              </div>

              {/* Notas */}
              {executionNotes && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Icon name="description" className="text-base inline mr-1" />
                    Notas de Execução
                  </label>
                  <p className="text-foreground bg-surface p-4 rounded-[4px] whitespace-pre-wrap">{executionNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Iniciar Execução */}
          {!isCompleted && step === 'start' && (
            <div className="space-y-6 bg-primary/5 p-6 rounded-[4px]">
              <div className="text-center mb-4">
                <Icon name="play_arrow" className="text-5xl mx-auto text-primary mb-2" />
                <h4 className="text-lg font-semibold text-foreground">Iniciar Execução</h4>
                <p className="text-sm text-muted-foreground">Tire uma foto do estado atual antes de começar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  <Icon name="photo_camera" className="text-base inline mr-1" />
                  Foto ANTES da Execução *
                </label>
                <div className="border-2 border-dashed border-border rounded-[4px] p-6 text-center bg-card">
                  {beforePhoto ? (
                    <div className="relative">
                      <img src={beforePhoto} alt="Antes" className="max-h-64 mx-auto rounded-[4px]" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => beforeInputRef.current?.click()}
                        className="mt-4"
                      >
                        <Icon name="upload" className="text-base mr-1" />
                        Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Icon name="image" className="text-5xl mx-auto text-muted-foreground mb-3" />
                      <Button
                        size="sm"
                        onClick={() => beforeInputRef.current?.click()}
                        disabled={uploadingBefore}
                      >
                        {uploadingBefore ? 'Enviando...' : (
                          <>
                            <Icon name="upload" className="text-base mr-1" />
                            Selecionar Foto
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG até 10MB</p>
                    </div>
                  )}
                  <input
                    ref={beforeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'before')
                    }}
                  />
                </div>
              </div>

              <Button
                onClick={handleStartExecution}
                disabled={!beforePhoto || loading}
                className="w-full bg-primary hover:bg-primary-graphite"
              >
                {loading ? 'Iniciando...' : (
                  <>
                    <Icon name="play_arrow" className="text-base mr-2" />
                    Iniciar Execução
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Completar Execução */}
          {!isCompleted && step === 'complete' && (
            <div className="space-y-6 bg-success-light p-6 rounded-[4px]">
              <div className="text-center mb-4">
                <Icon name="check_circle" className="text-5xl mx-auto text-success mb-2" />
                <h4 className="text-lg font-semibold text-foreground">Completar Execução</h4>
                <p className="text-sm text-muted-foreground">Documente o trabalho realizado</p>
              </div>

              {/* Foto Antes (read-only) */}
              {beforePhoto && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Icon name="photo_camera" className="text-base inline mr-1" />
                    Foto ANTES (registrada)
                  </label>
                  <img 
                    src={beforePhoto} 
                    alt="Antes" 
                    className="max-h-48 mx-auto rounded-[4px] border-2 border-border"
                  />
                </div>
              )}

              {/* Foto Depois */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  <Icon name="photo_camera" className="text-base inline mr-1" />
                  Foto DEPOIS da Execução *
                </label>
                <div className="border-2 border-dashed border-border rounded-[4px] p-6 text-center bg-card">
                  {afterPhoto ? (
                    <div className="relative">
                      <img src={afterPhoto} alt="Depois" className="max-h-64 mx-auto rounded-[4px]" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => afterInputRef.current?.click()}
                        className="mt-4"
                      >
                        <Icon name="upload" className="text-base mr-1" />
                        Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Icon name="image" className="text-5xl mx-auto text-muted-foreground mb-3" />
                      <Button
                        size="sm"
                        onClick={() => afterInputRef.current?.click()}
                        disabled={uploadingAfter}
                      >
                        {uploadingAfter ? 'Enviando...' : (
                          <>
                            <Icon name="upload" className="text-base mr-1" />
                            Selecionar Foto
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG até 10MB</p>
                    </div>
                  )}
                  <input
                    ref={afterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'after')
                    }}
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Icon name="description" className="text-base inline mr-1" />
                  Notas de Execução *
                </label>
                <textarea
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Descreva o trabalho realizado, peças utilizadas, observações, etc..."
                />
                <p className="text-xs text-muted-foreground mt-1">Seja o mais detalhado possível</p>
              </div>

              <Button
                onClick={handleCompleteExecution}
                disabled={!afterPhoto || !executionNotes.trim() || loading}
                className="w-full bg-success hover:bg-primary-graphite"
              >
                {loading ? 'Finalizando...' : (
                  <>
                    <Icon name="check_circle" className="text-base mr-2" />
                    Finalizar Execução
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between items-center bg-surface">
          <div className="text-sm text-muted-foreground">
            Criada em: {formatDate(item.createdAt)}
          </div>
          <Button onClick={onClose} variant="outline">
            {isCompleted ? 'Fechar' : 'Cancelar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
