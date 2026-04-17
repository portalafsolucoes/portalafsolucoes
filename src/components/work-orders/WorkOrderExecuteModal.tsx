'use client'

import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ImageViewerModal } from '@/components/ui/ImageViewerModal'
import { Icon } from '@/components/ui/Icon'

interface WorkOrderExecuteModalProps {
  workOrder: {
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
  } | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  inPage?: boolean
}

interface FilePreview {
  id: string
  file: File | null
  preview?: string
  name: string
  type: string
  url?: string // Para arquivos existentes
}

export function WorkOrderExecuteModal({
  isOpen,
  onClose,
  workOrder,
  onSuccess,
  inPage = false
}: WorkOrderExecuteModalProps) {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [beforePhoto, setBeforePhoto] = useState<FilePreview | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<FilePreview | null>(null)
  const [attachments, setAttachments] = useState<FilePreview[]>([])
  const [observations, setObservations] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [workOrderDetails, setWorkOrderDetails] = useState<any>(null)
  const [imageViewer, setImageViewer] = useState<{url: string; name: string} | null>(null)

  const beforePhotoRef = useRef<HTMLInputElement>(null)
  const afterPhotoRef = useRef<HTMLInputElement>(null)
  const attachmentsRef = useRef<HTMLInputElement>(null)

  const _registerNow = (type: 'start' | 'end') => {
    const now = new Date().toISOString().slice(0, 16)
    if (type === 'start') {
      setStartTime(now)
    } else {
      setEndTime(now)
    }
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after' | 'attachments'
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (type === 'attachments') {
      const remaining = 10 - attachments.length
      const filesToAdd = Array.from(files).slice(0, remaining)
      
      const newAttachments = filesToAdd.map(file => ({
        id: Math.random().toString(36),
        file,
        name: file.name,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }))
      
      setAttachments([...attachments, ...newAttachments])
    } else {
      const file = files[0]
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      const filePreview = {
        id: Math.random().toString(36),
        file,
        name: file.name,
        type: file.type,
        preview
      }
      
      if (type === 'before') {
        setBeforePhoto(filePreview)
      } else {
        setAfterPhoto(filePreview)
      }
    }
    
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const handlePrint = () => {
    window.print()
  }

  const validateForm = () => {
    if (!startTime) {
      setError('Por favor, registre o horário de início')
      return false
    }
    if (!endTime) {
      setError('Por favor, registre o horário de término')
      return false
    }
    if (new Date(endTime) < new Date(startTime)) {
      setError('O horário de término deve ser após o horário de início')
      return false
    }
    if (!beforePhoto) {
      setError('A foto ANTES é obrigatória')
      return false
    }
    if (!afterPhoto) {
      setError('A foto DEPOIS é obrigatória')
      return false
    }
    if (!observations || observations.trim().length < 20) {
      setError('Por favor, descreva o trabalho realizado (mínimo 20 caracteres)')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    setError('')
    
    if (!workOrder || !validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('workOrderId', workOrder.id)
      formData.append('startTime', startTime)
      formData.append('endTime', endTime)
      formData.append('observations', observations)
      
      // Se beforePhoto tem file, é novo upload; se não, enviar URL existente
      if (beforePhoto!.file) {
        formData.append('beforePhoto', beforePhoto!.file)
      } else {
        formData.append('beforePhotoUrl', beforePhoto!.preview || '')
      }
      
      // Se afterPhoto tem file, é novo upload; se não, enviar URL existente
      if (afterPhoto!.file) {
        formData.append('afterPhoto', afterPhoto!.file)
      } else {
        formData.append('afterPhotoUrl', afterPhoto!.preview || '')
      }
      
      // Enviar apenas novos anexos (que têm file, não apenas URL)
      let newAttachmentIndex = 0
      attachments.forEach((att) => {
        if (att.file) {
          formData.append(`attachment_${newAttachmentIndex}`, att.file)
          newAttachmentIndex++
        }
      })

      const response = await fetch(`/api/work-orders/${workOrder.id}/complete`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao finalizar ordem de serviço')
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar ordem de serviço')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [activeTab, setActiveTab] = useState<'execution' | 'details'>('execution')

  useEffect(() => {
    if (workOrder && isOpen) {
      loadWorkOrderDetails()
    }
    // Reset file inputs quando modal fecha
    if (!isOpen) {
      if (beforePhotoRef.current) beforePhotoRef.current.value = ''
      if (afterPhotoRef.current) afterPhotoRef.current.value = ''
      if (attachmentsRef.current) attachmentsRef.current.value = ''
      setBeforePhoto(null)
      setAfterPhoto(null)
      setAttachments([])
      setObservations('')
      setStartTime('')
      setEndTime('')
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder, isOpen])

  const loadWorkOrderDetails = async () => {
    if (!workOrder) return
    try {
      const response = await fetch(`/api/work-orders/${workOrder.id}`)
      if (response.ok) {
        const data = await response.json()
        setWorkOrderDetails(data.data)
        
        // Carregar dados de execução existentes (se houver)
        const details = data.data
        if (details.executionNotes) {
          // Carregar observações do técnico
          setObservations(details.executionNotes)
        }
        
        // Carregar fotos existentes como preview (apenas URLs)
        if (details.beforePhotoUrl) {
          setBeforePhoto({
            id: 'existing-before',
            file: null as any, // Não temos o File original
            preview: details.beforePhotoUrl,
            name: 'foto-antes.jpg',
            type: 'image/jpeg'
          })
        }

        if (details.afterPhotoUrl) {
          setAfterPhoto({
            id: 'existing-after',
            file: null as any, // Não temos o File original
            preview: details.afterPhotoUrl,
            name: 'foto-depois.jpg',
            type: 'image/jpeg'
          })
        }
        
        // Se já foi completada, usar dados de completedOn para horários
        if (details.completedOn && details.actualDuration) {
          const endTime = new Date(details.completedOn)
          const startTime = new Date(endTime.getTime() - details.actualDuration * 60000)
          setStartTime(startTime.toISOString().slice(0, 16))
          setEndTime(endTime.toISOString().slice(0, 16))
        }
        
        // Carregar apenas anexos da EXECUÇÃO (não da SS)
        // Filtrar files que NÃO são da sourceRequest
        if (details.files && details.files.length > 0) {
          const sourceRequestFileIds = details.sourceRequest?.files?.map((f: any) => f.id) || []
          const executionFiles = details.files.filter((file: any) =>
            !sourceRequestFileIds.includes(file.id)
          )

          if (executionFiles.length > 0) {
            const existingAttachments = executionFiles.map((file: any) => ({
              id: file.id,
              file: null as any,
              name: file.name,
              type: file.type || 'application/octet-stream',
              preview: file.type?.startsWith('image/') ? file.url : undefined,
              url: file.url
            }))
            setAttachments(existingAttachments)
          }
        }
      }
    } catch (error) {
      console.error('Error loading work order details:', error)
    }
  }

  if (!workOrder) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      <div className="flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Icon name="description" className="text-xl md:text-2xl text-primary flex-shrink-0" />
            <h2 className="text-base md:text-xl font-bold text-foreground truncate">
              {workOrder.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-card/50 rounded-[4px] transition-colors flex-shrink-0">
            <Icon name="close" className="text-base md:text-xl text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-card">
          <button
            onClick={() => setActiveTab('execution')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'execution'
                ? 'border-b-2 border-on-surface-variant text-primary bg-primary/5'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name="check" className="text-sm md:text-base inline mr-1 md:mr-2" />
            Executar
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-on-surface-variant text-primary bg-primary/5'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name="description" className="text-sm md:text-base inline mr-1 md:mr-2" />
            Detalhes
          </button>
        </div>

        {error && (
          <div className="mx-2 md:mx-4 mt-2 md:mt-3 p-2 md:p-3 bg-danger-light border-l-4 border-red-500 rounded-r text-danger text-xs md:text-sm flex items-start gap-2">
            <Icon name="error" className="text-base md:text-xl flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className={`flex-1 ${activeTab === 'execution' ? 'overflow-y-auto px-2 md:px-4 py-2 md:py-3' : 'overflow-y-auto'}`}>
          {activeTab === 'execution' ? (
            <div className="space-y-2 md:space-y-3">
              {/* Horários */}
              <div className="bg-primary/5 rounded-[4px] p-2 md:p-3 border border-blue-200">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                  <Icon name="schedule" className="text-sm md:text-base text-primary" />
                  <h3 className="text-[10px] md:text-xs font-semibold text-foreground">Horários *</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] md:text-xs text-muted-foreground mb-1">Início:</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2 py-1.5 text-[10px] md:text-xs border border-input rounded focus:ring-1 focus:ring-ring bg-card"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs text-muted-foreground mb-1">Término:</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2 py-1.5 text-[10px] md:text-xs border border-input rounded focus:ring-1 focus:ring-ring bg-card"
                    />
                  </div>
                </div>
              </div>

              {/* Observações - SEGUNDO */}
              <div className="bg-amber-50 rounded-[4px] p-2 md:p-3 border border-amber-200">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                  <Icon name="description" className="text-sm md:text-base text-amber-600" />
                  <h3 className="text-[10px] md:text-xs font-semibold text-foreground">Observações * ({observations.length}/20)</h3>
                </div>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Descreva o trabalho realizado...\n\nEx: Substituí rolamento SKF 6308, limpei eixo, testei motor - funcionando normal"
                  className="w-full px-2 py-1.5 text-[10px] md:text-xs border border-input rounded focus:ring-1 focus:ring-amber-500 bg-card h-20 md:h-24"
                />
              </div>

              {/* Fotos - TERCEIRO */}
              <div className="bg-success-light rounded-[4px] p-2 md:p-3 border border-green-200">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                  <Icon name="photo_camera" className="text-sm md:text-base text-success" />
                  <h3 className="text-[10px] md:text-xs font-semibold text-foreground">Fotos Obrigatórias *</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <input 
                      ref={beforePhotoRef} 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => handleFileSelect(e, 'before')} 
                      className="hidden" 
                    />
                    {!beforePhoto ? (
                      <button 
                        type="button" 
                        onClick={() => beforePhotoRef.current?.click()} 
                        className="w-full py-6 md:py-4 border-2 border-dashed border-green-300 rounded hover:border-green-500 hover:bg-success-light bg-card"
                      >
                        <Icon name="photo_camera" className="text-3xl md:text-2xl mx-auto text-success mb-1" />
                        <p className="text-xs md:text-xs font-medium text-success">FOTO ANTES</p>
                        <p className="text-[10px] text-success mt-1">Tirar/Carregar</p>
                      </button>
                    ) : (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={beforePhoto.preview} alt="Antes" className="w-full h-32 md:h-24 object-cover rounded border-2 border-green-300" />
                        <button type="button" onClick={() => setBeforePhoto(null)} className="absolute top-1 right-1 p-1.5 md:p-1 bg-danger-light0 text-white rounded-full hover:bg-danger">
                          <Icon name="delete" className="text-base md:text-sm" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center">ANTES</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <input 
                      ref={afterPhotoRef} 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => handleFileSelect(e, 'after')} 
                      className="hidden" 
                    />
                    {!afterPhoto ? (
                      <button 
                        type="button" 
                        onClick={() => afterPhotoRef.current?.click()} 
                        className="w-full py-6 md:py-4 border-2 border-dashed border-green-300 rounded hover:border-green-500 hover:bg-success-light bg-card"
                      >
                        <Icon name="photo_camera" className="text-3xl md:text-2xl mx-auto text-success mb-1" />
                        <p className="text-xs md:text-xs font-medium text-success">FOTO DEPOIS</p>
                        <p className="text-[10px] text-success mt-1">Tirar/Carregar</p>
                      </button>
                    ) : (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={afterPhoto.preview} alt="Depois" className="w-full h-32 md:h-24 object-cover rounded border-2 border-green-300" />
                        <button type="button" onClick={() => setAfterPhoto(null)} className="absolute top-1 right-1 p-1.5 md:p-1 bg-danger-light0 text-white rounded-full hover:bg-danger">
                          <Icon name="delete" className="text-base md:text-sm" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center">DEPOIS</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anexos - QUARTO */}
              <div className="bg-purple-50 rounded-[4px] p-2 md:p-3 border border-purple-200">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2">
                  <Icon name="attach_file" className="text-sm md:text-base text-purple-600" />
                  <h3 className="text-[10px] md:text-xs font-semibold text-foreground">Anexos ({attachments.length}/10)</h3>
                </div>
                <input ref={attachmentsRef} type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" capture="environment" onChange={(e) => handleFileSelect(e, 'attachments')} className="hidden" />
                {attachments.length < 10 && (
                  <button type="button" onClick={() => attachmentsRef.current?.click()} className="w-full py-4 md:py-3 border-2 border-dashed border-purple-300 rounded hover:border-purple-500 hover:bg-purple-100 bg-card mb-2">
                    <Icon name="attach_file" className="text-2xl md:text-xl mx-auto text-purple-600 mb-1" />
                    <p className="text-xs md:text-xs font-medium text-purple-700">Adicionar Anexos (opcional)</p>
                  </button>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 md:p-1.5 bg-card rounded border border-purple-200">
                        {att.preview || (att.url && att.type?.startsWith('image/')) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.preview || att.url} alt={att.name} className="w-12 h-12 md:w-10 md:h-10 object-cover rounded cursor-pointer" onClick={() => att.url && window.open(att.url, '_blank')} />
                        ) : (
                          <div className="w-12 h-12 md:w-10 md:h-10 bg-purple-100 rounded flex items-center justify-center">
                            <Icon name="description" className="text-2xl md:text-xl text-purple-600" />
                          </div>
                        )}
                        <span className="flex-1 truncate text-[10px] md:text-xs font-medium text-foreground">{att.name}</span>
                        {att.url && (
                          <button type="button" onClick={() => window.open(att.url!, '_blank')} className="p-1 text-primary hover:bg-primary/5 rounded" title="Baixar/Visualizar">
                            <Icon name="download" className="text-base md:text-sm" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeAttachment(att.id)} className="p-1 text-danger hover:bg-danger-light rounded">
                          <Icon name="delete" className="text-base md:text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : workOrderDetails ? (
            <div id="printable-report" className="bg-card p-6">
              {/* Cabeçalho com Botão Imprimir */}
              <div className="border-b-2 border-input pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold text-foreground mb-2">{workOrderDetails.title}</h1>
                    <div className="flex gap-2 flex-wrap">
                      {workOrderDetails.externalId && (
                        <span className="inline-block font-mono bg-success-light px-3 py-1 rounded border border-green-300 text-sm font-semibold">
                          Proteus: {workOrderDetails.externalId}
                        </span>
                      )}
                      {workOrderDetails.internalId && (
                        <span className="inline-block font-mono bg-amber-100 px-3 py-1 rounded border border-amber-300 text-sm font-semibold">
                          Interno: {workOrderDetails.internalId}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={handlePrint} 
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 print:hidden transition-colors"
                  >
                    <Icon name="print" className="text-base" />
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
                    <label className="block text-sm font-semibold text-foreground mb-1">Descrição da Solicitação:</label>
                    <p className="text-sm md:text-base text-foreground whitespace-pre-wrap bg-card p-2 rounded border">
                      {workOrderDetails.description || 'Sem descrição'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                    {workOrderDetails.sourceRequest?.createdBy && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Solicitante (SS):</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {workOrderDetails.sourceRequest.createdBy.firstName} {workOrderDetails.sourceRequest.createdBy.lastName}
                        </p>
                      </div>
                    )}

                    {workOrderDetails.createdBy && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Atribuído por:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {workOrderDetails.createdBy.firstName} {workOrderDetails.createdBy.lastName}
                        </p>
                      </div>
                    )}

                    {workOrderDetails.createdAt && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Data da Solicitação:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {new Date(workOrderDetails.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}

                    {workOrderDetails.asset && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Ativo:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {workOrderDetails.asset.name}
                        </p>
                      </div>
                    )}

                    {workOrderDetails.location && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Localização:</label>
                        <p className="text-sm md:text-base text-foreground bg-card p-2 rounded border">
                          {workOrderDetails.location.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Imagens da Solicitação Original */}
                {workOrderDetails.sourceRequest?.files && workOrderDetails.sourceRequest.files.length > 0 && (
                  <div className="space-y-2 bg-secondary p-3 rounded-[4px] mt-3">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Imagens da Solicitação Original:</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {workOrderDetails.sourceRequest.files.filter((f: any) => f.type?.startsWith('image/')).map((file: any) => (
                        <div key={file.id} className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-32 object-cover rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all"
                            onClick={() => setImageViewer({url: file.url, name: file.name})}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DIVISOR */}
              <div className="my-6 border-t-4 border-dashed border-input"></div>

              {/* SEÇÃO 2: EXECUÇÃO */}
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 bg-success-light px-2 md:px-3 py-1.5 md:py-2 rounded-[4px] border-l-4 border-green-500">
                  ✅ INFORMAÇÕES DA EXECUÇÃO
                </h2>

                {/* Horários */}
                {workOrderDetails.completedOn && workOrderDetails.actualDuration && (
                  <div className="space-y-2 bg-secondary p-2 md:p-3 rounded-[4px] mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground">Horários:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Início:</label>
                        <p className="text-sm text-foreground bg-card p-2 rounded border">
                          {new Date(new Date(workOrderDetails.completedOn).getTime() - workOrderDetails.actualDuration * 60000).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Término:</label>
                        <p className="text-sm text-foreground bg-card p-2 rounded border">
                          {new Date(workOrderDetails.completedOn).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Duração:</label>
                        <p className="text-sm text-foreground bg-card p-2 rounded border font-semibold">
                          {workOrderDetails.actualDuration} min
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Descrição do Trabalho */}
                {workOrderDetails.executionNotes && (
                  <div className="space-y-2 bg-secondary p-3 rounded-[4px] mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Descrição do Trabalho Realizado:</h3>
                    <div className="text-sm text-foreground whitespace-pre-wrap bg-card p-3 rounded border">
                      {workOrderDetails.executionNotes}
                    </div>
                  </div>
                )}

                {/* Fotos ANTES e DEPOIS */}
                {(workOrderDetails.beforePhotoUrl || workOrderDetails.afterPhotoUrl) && (
                  <div className="space-y-2 bg-secondary p-3 rounded-[4px] mb-3">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Fotos de Execução:</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {workOrderDetails.beforePhotoUrl && (
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1 text-center">ANTES</label>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={workOrderDetails.beforePhotoUrl}
                            alt="Foto Antes"
                            className="w-full h-48 object-contain rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all bg-muted"
                            onClick={() => setImageViewer({url: workOrderDetails.beforePhotoUrl, name: 'Foto ANTES'})}
                          />
                        </div>
                      )}
                      {workOrderDetails.afterPhotoUrl && (
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1 text-center">DEPOIS</label>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={workOrderDetails.afterPhotoUrl}
                            alt="Foto Depois"
                            className="w-full h-48 object-contain rounded-[4px] border-2 border-input cursor-pointer hover:border-primary transition-all bg-muted"
                            onClick={() => setImageViewer({url: workOrderDetails.afterPhotoUrl, name: 'Foto DEPOIS'})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Anexos Adicionais da Execução */}
                {workOrderDetails.files && workOrderDetails.files.length > 0 && (() => {
                  const sourceRequestFileIds = workOrderDetails.sourceRequest?.files?.map((f: any) => f.id) || []
                  const executionFiles = workOrderDetails.files.filter((file: any) =>
                    !sourceRequestFileIds.includes(file.id)
                  )
                  return executionFiles.length > 0 && (
                    <div className="space-y-2 bg-secondary p-3 rounded-[4px]">
                      <h3 className="text-sm font-semibold text-foreground mb-2">Anexos Adicionais da Execução ({executionFiles.length}):</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {executionFiles.map((file: any) => (
                          <div key={file.id} className="flex items-center gap-2 p-2 bg-card rounded-[4px] hover:border-blue-400 transition-all">
                            {file.type?.startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
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
                              <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
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
                  )
                })()}
              </div>

              {/* Rodapé */}
              <div className="mt-6 pt-3 border-t border-input text-center text-xs text-muted-foreground">
                <p>Relatório gerado automaticamente - {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-on-surface-variant border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Footer - Botão Finalizar */}
        {activeTab === 'execution' && (
          <div className="px-4 py-3 border-t bg-gradient-to-r from-green-50 to-emerald-50">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-sm rounded-[4px] hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 ambient-shadow transition-all"
            >
              <Icon name="check" className="text-xl" />
              {isSubmitting ? 'Finalizando...' : 'FINALIZAR ORDEM'}
            </button>
          </div>
        )}
      </div>
      
      <ImageViewerModal
        isOpen={!!imageViewer}
        onClose={() => setImageViewer(null)}
        imageUrl={imageViewer?.url || ''}
        imageName={imageViewer?.name}
      />
    </Modal>
  )
}
