'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, Play, CheckCircle, FileText, Camera } from 'lucide-react'
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
      HIGH: 'bg-gray-500',
      MEDIUM: 'bg-warning-light0',
      LOW: 'bg-success-light0',
      NONE: 'bg-secondary0'
    }
    return <Badge className={colors[priority as keyof typeof colors] || colors.NONE}>{priority}</Badge>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {type === 'workorder' ? 'Ordem de Serviço' : 'Solicitação de Serviço'}
            </h2>
            {type === 'workorder' && item.internalId && (
              <p className="text-sm text-gray-500 font-mono">{item.internalId}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <div className="flex gap-2 items-center">
              {getPriorityBadge(item.priority)}
              {isCompleted && <Badge className="bg-success-light0">Concluída</Badge>}
              {isStarted && !isCompleted && <Badge className="bg-warning-light0">Em Execução</Badge>}
              {!isStarted && <Badge className="bg-secondary0">Não Iniciada</Badge>}
            </div>
          </div>

          {item.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Descrição
              </label>
              <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{item.description}</p>
            </div>
          )}

          {/* Apenas visualização (completado) */}
          {isCompleted && (
            <div className="space-y-6">
              {/* Fotos */}
              <div className="grid grid-cols-2 gap-4">
                {beforePhoto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Foto ANTES
                    </label>
                    <img 
                      src={beforePhoto} 
                      alt="Antes" 
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}
                {afterPhoto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Foto DEPOIS
                    </label>
                    <img 
                      src={afterPhoto} 
                      alt="Depois" 
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Notas */}
              {executionNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notas de Execução
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{executionNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Iniciar Execução */}
          {!isCompleted && step === 'start' && (
            <div className="space-y-6 bg-primary/5 p-6 rounded-lg">
              <div className="text-center mb-4">
                <Play className="w-12 h-12 mx-auto text-primary mb-2" />
                <h4 className="text-lg font-semibold text-gray-900">Iniciar Execução</h4>
                <p className="text-sm text-gray-600">Tire uma foto do estado atual antes de começar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Camera className="w-4 h-4 inline mr-1" />
                  Foto ANTES da Execução *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-card">
                  {beforePhoto ? (
                    <div className="relative">
                      <img src={beforePhoto} alt="Antes" className="max-h-64 mx-auto rounded-lg" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => beforeInputRef.current?.click()}
                        className="mt-4"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <Button
                        size="sm"
                        onClick={() => beforeInputRef.current?.click()}
                        disabled={uploadingBefore}
                      >
                        {uploadingBefore ? 'Enviando...' : (
                          <>
                            <Upload className="w-4 h-4 mr-1" />
                            Selecionar Foto
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG até 10MB</p>
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
                className="w-full bg-primary hover:bg-gray-700"
              >
                {loading ? 'Iniciando...' : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar Execução
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Completar Execução */}
          {!isCompleted && step === 'complete' && (
            <div className="space-y-6 bg-success-light p-6 rounded-lg">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 mx-auto text-success mb-2" />
                <h4 className="text-lg font-semibold text-gray-900">Completar Execução</h4>
                <p className="text-sm text-gray-600">Documente o trabalho realizado</p>
              </div>

              {/* Foto Antes (read-only) */}
              {beforePhoto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Camera className="w-4 h-4 inline mr-1" />
                    Foto ANTES (registrada)
                  </label>
                  <img 
                    src={beforePhoto} 
                    alt="Antes" 
                    className="max-h-48 mx-auto rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}

              {/* Foto Depois */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Camera className="w-4 h-4 inline mr-1" />
                  Foto DEPOIS da Execução *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-card">
                  {afterPhoto ? (
                    <div className="relative">
                      <img src={afterPhoto} alt="Depois" className="max-h-64 mx-auto rounded-lg" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => afterInputRef.current?.click()}
                        className="mt-4"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <Button
                        size="sm"
                        onClick={() => afterInputRef.current?.click()}
                        disabled={uploadingAfter}
                      >
                        {uploadingAfter ? 'Enviando...' : (
                          <>
                            <Upload className="w-4 h-4 mr-1" />
                            Selecionar Foto
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG até 10MB</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Notas de Execução *
                </label>
                <textarea
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Descreva o trabalho realizado, peças utilizadas, observações, etc..."
                />
                <p className="text-xs text-gray-500 mt-1">Seja o mais detalhado possível</p>
              </div>

              <Button
                onClick={handleCompleteExecution}
                disabled={!afterPhoto || !executionNotes.trim() || loading}
                className="w-full bg-success hover:bg-gray-700"
              >
                {loading ? 'Finalizando...' : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar Execução
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-500">
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
