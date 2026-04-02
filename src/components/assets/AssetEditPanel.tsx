'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, Image as ImageIcon, Upload, FileText, Trash, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Asset {
  id?: string
  name: string
  description?: string
  locationId?: string
  parentAssetId?: string | null
  image?: string | null
  location?: { id: string; name: string }
  files?: { id: string; name: string; url: string }[]
  gutGravity?: number
  gutUrgency?: number
  gutTendency?: number
}

interface AssetEditPanelProps {
  asset: Asset
  onClose: () => void
  onSuccess: () => void
}

export function AssetEditPanel({ asset, onClose, onSuccess }: AssetEditPanelProps) {
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string>(asset.image || '')
  const [attachments, setAttachments] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState(asset.files || [])
  
  const [formData, setFormData] = useState<Asset>({
    name: asset.name || '',
    description: asset.description || '',
    locationId: asset.location?.id || asset.locationId || '',
    parentAssetId: asset.parentAssetId,
    gutGravity: asset.gutGravity || 1,
    gutUrgency: asset.gutUrgency || 1,
    gutTendency: asset.gutTendency || 1
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const locationsRes = await fetch('/api/locations')
      const locationsData = await locationsRes.json()
      setLocations(locationsData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setMainImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalFiles = existingFiles.length + attachments.length + files.length
    if (totalFiles <= 10) {
      setAttachments([...attachments, ...files])
    } else {
      alert('Máximo de 10 arquivos anexos permitido')
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const removeExistingFile = async (fileId: string) => {
    if (confirm('Deseja realmente excluir este arquivo?')) {
      try {
        await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
        setExistingFiles(existingFiles.filter(f => f.id !== fileId))
      } catch (error) {
        alert('Erro ao excluir arquivo')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      if (formData.description) {
        formDataToSend.append('description', formData.description)
      }
      if (formData.locationId) {
        formDataToSend.append('locationId', formData.locationId)
      }
      
      // Campos GUT
      if (formData.gutGravity) {
        formDataToSend.append('gutGravity', formData.gutGravity.toString())
      }
      if (formData.gutUrgency) {
        formDataToSend.append('gutUrgency', formData.gutUrgency.toString())
      }
      if (formData.gutTendency) {
        formDataToSend.append('gutTendency', formData.gutTendency.toString())
      }
      
      if (mainImage) {
        formDataToSend.append('mainImage', mainImage)
      }
      
      attachments.forEach((file, index) => {
        formDataToSend.append(`attachment_${index}`, file)
      })

      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        body: formDataToSend
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao salvar ativo')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Editar Ativo</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Nome */}
        <div>
          <Input
            label="Nome do Ativo *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Digite o nome do Ativo"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Adicione mais informações"
          />
        </div>

        {/* Localização (apenas se não tiver pai) */}
        {!asset.parentAssetId && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Localização
            </label>
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione uma localização</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Matriz GUT - Criticidade */}
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Matriz GUT (Criticidade)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Avalie de 1 (baixo) a 5 (alto) cada critério para definir a criticidade do ativo.
          </p>
          
          <div className="space-y-4">
            {/* Gravidade */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gravidade (G) - Impacto se falhar
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gutGravity: value })}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      formData.gutGravity === value
                        ? 'bg-red-500 text-white ring-2 ring-red-300'
                        : 'bg-secondary hover:bg-red-100 text-muted-foreground'
                    }`}
                  >
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutGravity === 1 && 'Sem gravidade'}
                  {formData.gutGravity === 2 && 'Pouco grave'}
                  {formData.gutGravity === 3 && 'Grave'}
                  {formData.gutGravity === 4 && 'Muito grave'}
                  {formData.gutGravity === 5 && 'Extremamente grave'}
                </span>
              </div>
            </div>

            {/* Urgência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Urgência (U) - Tempo disponível para resolver
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gutUrgency: value })}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      formData.gutUrgency === value
                        ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                        : 'bg-secondary hover:bg-orange-100 text-muted-foreground'
                    }`}
                  >
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutUrgency === 1 && 'Pode esperar'}
                  {formData.gutUrgency === 2 && 'Pouco urgente'}
                  {formData.gutUrgency === 3 && 'Urgente'}
                  {formData.gutUrgency === 4 && 'Muito urgente'}
                  {formData.gutUrgency === 5 && 'Ação imediata'}
                </span>
              </div>
            </div>

            {/* Tendência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tendência (T) - Piora se não tratado
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gutTendency: value })}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      formData.gutTendency === value
                        ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                        : 'bg-secondary hover:bg-yellow-100 text-muted-foreground'
                    }`}
                  >
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutTendency === 1 && 'Não piora'}
                  {formData.gutTendency === 2 && 'Piora a longo prazo'}
                  {formData.gutTendency === 3 && 'Piora a médio prazo'}
                  {formData.gutTendency === 4 && 'Piora a curto prazo'}
                  {formData.gutTendency === 5 && 'Piora rapidamente'}
                </span>
              </div>
            </div>

            {/* Score GUT */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Score GUT:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {(formData.gutGravity || 1) * (formData.gutUrgency || 1) * (formData.gutTendency || 1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({formData.gutGravity || 1} × {formData.gutUrgency || 1} × {formData.gutTendency || 1})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Foto Principal */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Foto Principal do Ativo
          </label>
          {mainImagePreview ? (
            <div className="relative">
              <img src={mainImagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setMainImage(null)
                  setMainImagePreview('')
                }}
                className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div onClick={() => mainImageInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-secondary">
              <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Clique para adicionar foto principal</p>
              <input
                ref={mainImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainImageChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Arquivos Anexos Existentes */}
        {existingFiles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Arquivos Anexos Existentes ({existingFiles.length}/10)
            </label>
            <div className="space-y-1">
              {existingFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingFile(file.id)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Novos Anexos */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Adicionar Novos Anexos (até {10 - existingFiles.length})
          </label>
          <input
            ref={attachmentsInputRef}
            type="file"
            multiple
            onChange={handleAttachmentsChange}
            className="hidden"
            disabled={existingFiles.length + attachments.length >= 10}
          />
          <div onClick={() => attachmentsInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-secondary">
            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Adicionar PDFs, fotos, etc.</p>
            <p className="text-xs text-muted-foreground">{existingFiles.length + attachments.length}/10 arquivos</p>
          </div>
          
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-primary/5 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                    <span className="text-xs text-primary">(novo)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
