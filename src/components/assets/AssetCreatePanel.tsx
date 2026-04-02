'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, Image as ImageIcon, Upload, FileText, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AssetCreatePanelProps {
  onClose: () => void
  onSuccess: () => void
  parentAsset?: { id: string; name: string }
}

export function AssetCreatePanel({ onClose, onSuccess, parentAsset }: AssetCreatePanelProps) {
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string>('')
  const [attachments, setAttachments] = useState<File[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: '',
    parentAssetId: parentAsset?.id || ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (parentAsset) {
      setFormData(prev => ({ ...prev, parentAssetId: parentAsset.id }))
    }
  }, [parentAsset])

  const loadData = async () => {
    try {
      const [locationsRes, assetsRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/assets')
      ])
      
      const locationsData = await locationsRes.json()
      const assetsData = await assetsRes.json()
      
      setLocations(locationsData.data || [])
      setAssets(assetsData.data || [])
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
    if (attachments.length + files.length <= 10) {
      setAttachments([...attachments, ...files])
    } else {
      alert('Máximo de 10 arquivos anexos permitido')
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
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
      if (formData.parentAssetId) {
        formDataToSend.append('parentAssetId', formData.parentAssetId)
      }
      formDataToSend.append('status', 'OPERATIONAL')
      
      if (mainImage) {
        formDataToSend.append('mainImage', mainImage)
      }
      
      attachments.forEach((file, index) => {
        formDataToSend.append(`attachment_${index}`, file)
      })

      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formDataToSend
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao criar ativo')
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
        <h2 className="text-xl font-bold text-foreground">
          {parentAsset ? `Novo Subativo de ${parentAsset.name}` : 'Cadastrar novo Ativo'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ativo Pai */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Ativo Pai {parentAsset && <span className="text-xs text-muted-foreground">(via menu contexto)</span>}
          </label>
          <select
            value={formData.parentAssetId}
            onChange={(e) => setFormData({ ...formData, parentAssetId: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={!!parentAsset}
          >
            <option value="">Nenhum (Ativo Raiz)</option>
            {assets.filter(a => !a.parentAssetId).map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          {!formData.parentAssetId && (
            <p className="text-xs text-muted-foreground mt-1">Deixe vazio para criar um ativo raiz</p>
          )}
        </div>

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
        {!formData.parentAssetId && (
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

        {/* Anexos */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Arquivos Anexos (até 10)
          </label>
          <input
            ref={attachmentsInputRef}
            type="file"
            multiple
            onChange={handleAttachmentsChange}
            className="hidden"
            disabled={attachments.length >= 10}
          />
          <div onClick={() => attachmentsInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-secondary">
            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Adicionar PDFs, fotos, etc.</p>
            <p className="text-xs text-muted-foreground">{attachments.length}/10 arquivos</p>
          </div>
          
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
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
            {loading ? 'Criando...' : 'Criar Ativo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
