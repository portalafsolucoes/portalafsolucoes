'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

interface ExecutionModalProps {
  item: Record<string, unknown>
  type: 'workorder' | 'request'
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
}

export function ExecutionModal({ item, type, onClose, onSuccess, inPage = false }: ExecutionModalProps) {
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

      // Simular upload - em producao, usar endpoint real
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
    } catch {
      alert('Erro ao fazer upload da imagem')
    } finally {
      if (type === 'before') setUploadingBefore(false)
      else setUploadingAfter(false)
    }
  }

  const handleStartExecution = async () => {
    if (!beforePhoto) {
      alert('Foto "antes" e obrigatoria para iniciar')
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
        alert('Execucao iniciada com sucesso!')
        setStep('complete')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao iniciar execucao')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteExecution = async () => {
    if (!afterPhoto) {
      alert('Foto "depois" e obrigatoria para completar')
      return
    }

    if (!executionNotes.trim()) {
      alert('Notas de execucao sao obrigatorias')
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
        alert('Execucao completada com sucesso!')
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao completar execucao')
      }
    } catch {
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

  const title = type === 'workorder' ? 'Ordem de Servico' : 'Solicitacao de Servico'

  const bodyContent = (
    <>
      <div className="p-4 space-y-3">
        {type === 'workorder' && item.internalId && (
          <p className="text-sm font-mono text-muted-foreground">{item.internalId}</p>
        )}

        <ModalSection title="Informacoes Basicas">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
            <div className="flex gap-2 items-center">
              {getPriorityBadge(item.priority)}
              {isCompleted && <Badge className="bg-success-light0">Concluida</Badge>}
              {isStarted && !isCompleted && <Badge className="bg-warning-light0">Em Execucao</Badge>}
              {!isStarted && <Badge className="bg-secondary0">Nao Iniciada</Badge>}
            </div>
          </div>

          {item.description && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Descricao
              </label>
              <p className="text-foreground bg-surface p-4 rounded-[4px]">{item.description}</p>
            </div>
          )}
        </ModalSection>

        {/* Apenas visualizacao (completado) */}
        {isCompleted && (
          <ModalSection title="Registro de Execucao">
            {/* Fotos */}
            <div className="grid grid-cols-2 gap-4">
              {beforePhoto && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Foto ANTES
                  </label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforePhoto}
                    alt="Antes"
                    className="w-full h-64 object-cover rounded-[4px] border-2 border-border"
                  />
                </div>
              )}
              {afterPhoto && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Foto DEPOIS
                  </label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Notas de Execucao
                </label>
                <p className="text-foreground bg-surface p-4 rounded-[4px] whitespace-pre-wrap">{executionNotes}</p>
              </div>
            )}
          </ModalSection>
        )}

        {/* Iniciar Execucao */}
        {!isCompleted && step === 'start' && (
          <ModalSection title="Iniciar Execucao">
            <div className="space-y-6 bg-primary/5 p-6 rounded-[4px]">
              <div className="text-center mb-4">
                <Icon name="play_arrow" className="text-5xl mx-auto text-primary mb-2" />
                <h4 className="text-lg font-semibold text-foreground">Iniciar Execucao</h4>
                <p className="text-sm text-muted-foreground">Tire uma foto do estado atual antes de comecar</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Foto ANTES da Execucao *
                </label>
                <div className="border-2 border-dashed border-border rounded-[4px] p-6 text-center bg-card">
                  {beforePhoto ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG ate 10MB</p>
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
                    Iniciar Execucao
                  </>
                )}
              </Button>
            </div>
          </ModalSection>
        )}

        {/* Completar Execucao */}
        {!isCompleted && step === 'complete' && (
          <ModalSection title="Completar Execucao">
            <div className="space-y-6 bg-success-light p-6 rounded-[4px]">
              <div className="text-center mb-4">
                <Icon name="check_circle" className="text-5xl mx-auto text-success mb-2" />
                <h4 className="text-lg font-semibold text-foreground">Completar Execucao</h4>
                <p className="text-sm text-muted-foreground">Documente o trabalho realizado</p>
              </div>

              {/* Foto Antes (read-only) */}
              {beforePhoto && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Foto ANTES (registrada)
                  </label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforePhoto}
                    alt="Antes"
                    className="max-h-48 mx-auto rounded-[4px] border-2 border-border"
                  />
                </div>
              )}

              {/* Foto Depois */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Foto DEPOIS da Execucao *
                </label>
                <div className="border-2 border-dashed border-border rounded-[4px] p-6 text-center bg-card">
                  {afterPhoto ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG ate 10MB</p>
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
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Notas de Execucao *
                </label>
                <textarea
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Descreva o trabalho realizado, pecas utilizadas, observacoes, etc..."
                />
                <p className="text-xs text-muted-foreground mt-1">Seja o mais detalhado possivel</p>
              </div>

              <Button
                onClick={handleCompleteExecution}
                disabled={!afterPhoto || !executionNotes.trim() || loading}
                className="w-full bg-success hover:bg-primary-graphite"
              >
                {loading ? 'Finalizando...' : (
                  <>
                    <Icon name="check_circle" className="text-base mr-2" />
                    Finalizar Execucao
                  </>
                )}
              </Button>
            </div>
          </ModalSection>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button onClick={onClose} variant="outline" className="flex-1">
          {isCompleted ? 'Fechar' : 'Cancelar'}
        </Button>
        {!isCompleted && (
          <Button className="flex-1" disabled>
            <Icon name="info" className="text-base mr-2" />
            Criada em: {formatDate(item.createdAt)}
          </Button>
        )}
      </div>
    </>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {bodyContent}
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      size="wide"
    >
      {bodyContent}
    </Modal>
  )
}
