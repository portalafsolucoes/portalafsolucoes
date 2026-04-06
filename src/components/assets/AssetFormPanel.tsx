'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Asset {
  id?: string
  name: string
  description?: string
  barCode?: string
  acquisitionCost?: number
  area?: number
  status: string
  locationId?: string
  categoryId?: string
  primaryUserId?: string
  parentAssetId?: string | null
  location?: { id: string; name: string }
  primaryUser?: { id: string; firstName: string; lastName: string }
}

interface AssetFormPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentAsset?: { id: string; name: string }
  editAsset?: Asset
}

export function AssetFormPanel({ isOpen, onClose, onSuccess, parentAsset, editAsset }: AssetFormPanelProps) {
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  
  const [formData, setFormData] = useState<Asset>({
    name: '',
    description: '',
    barCode: '',
    acquisitionCost: undefined,
    area: undefined,
    status: 'OPERATIONAL',
    locationId: '',
    primaryUserId: '',
    parentAssetId: parentAsset?.id || null
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (editAsset) {
        // Preencher formulário com dados do ativo para edição
        setFormData({
          name: editAsset.name || '',
          description: editAsset.description || '',
          barCode: editAsset.barCode || '',
          acquisitionCost: editAsset.acquisitionCost,
          area: editAsset.area,
          status: editAsset.status || 'OPERATIONAL',
          locationId: editAsset.location?.id || '',
          primaryUserId: editAsset.primaryUser?.id || '',
          parentAssetId: editAsset.parentAssetId
        })
      } else if (parentAsset) {
        // Reset e set parent para novo subativo
        setFormData({
          name: '',
          description: '',
          barCode: '',
          acquisitionCost: undefined,
          area: undefined,
          status: 'OPERATIONAL',
          locationId: '',
          primaryUserId: '',
          parentAssetId: parentAsset.id
        })
      } else {
        // Reset para novo ativo
        setFormData({
          name: '',
          description: '',
          barCode: '',
          acquisitionCost: undefined,
          area: undefined,
          status: 'OPERATIONAL',
          locationId: '',
          primaryUserId: '',
          parentAssetId: null
        })
      }
    }
  }, [isOpen, editAsset, parentAsset])

  const loadData = async () => {
    try {
      const [locationsRes, usersRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/users')
      ])
      
      const locationsData = await locationsRes.json()
      const usersData = await usersRes.json()
      
      setLocations(locationsData.data || [])
      setUsers(usersData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        acquisitionCost: formData.acquisitionCost ? parseFloat(String(formData.acquisitionCost)) : undefined,
        area: formData.area ? parseFloat(String(formData.area)) : undefined,
        locationId: formData.locationId || undefined,
        primaryUserId: formData.primaryUserId || undefined
      }

      const url = editAsset ? `/api/assets/${editAsset.id}` : '/api/assets'
      const method = editAsset ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          name: '',
          description: '',
          barCode: '',
          acquisitionCost: undefined,
          area: undefined,
          status: 'OPERATIONAL',
          locationId: '',
          primaryUserId: '',
          parentAssetId: null
        })
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao salvar ativo')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-card shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-foreground">
            {editAsset ? 'Editar Ativo' : parentAsset ? `Novo Subativo de ${parentAsset.name}` : 'Cadastrar novo Ativo'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Parent Asset Info */}
          {parentAsset && (
            <div className="bg-primary/5 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Ativo Pai:</strong> {parentAsset.name}
              </p>
            </div>
          )}

          {/* Nome */}
          <div>
            <Input
              label="Nome do Ativo *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 40) })}
              maxLength={40}
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

          {/* Ativo ou Local */}
          {!parentAsset && (
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

          {/* Código de Barras e Custo */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código de Barras"
              value={formData.barCode}
              onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
              placeholder="Código de Barras"
            />
            <Input
              label="Custo de Aquisição"
              type="number"
              step="0.01"
              value={formData.acquisitionCost || ''}
              onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="R$ 0,00"
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Responsável
            </label>
            <select
              value={formData.primaryUserId}
              onChange={(e) => setFormData({ ...formData, primaryUserId: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione um Responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Criticidade e Área */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="OPERATIONAL">Operacional</option>
                <option value="DOWN">Parado</option>
                <option value="MAINTENANCE">Em Manutenção</option>
              </select>
            </div>
            <Input
              label="Área (m²)"
              type="number"
              step="0.01"
              value={formData.area || ''}
              onChange={(e) => setFormData({ ...formData, area: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0.00"
            />
          </div>

          {/* Adicionar Imagem */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Adicionar Imagem do Ativo
            </label>
            <div className="border-2 border-dashed border-input rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique para adicionar ou arraste uma imagem
              </p>
              <input type="file" className="hidden" accept="image/*" />
            </div>
          </div>

          {/* Buttons */}
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
              {loading ? 'Salvando...' : editAsset ? 'Salvar Alterações' : 'Criar Ativo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
