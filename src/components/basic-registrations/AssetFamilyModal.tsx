'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'

interface AssetFamilyModalProps {
  editingItem: any | null
  onClose: () => void
  onSaved: () => void
  assetFamilyModels: any[]
  onModelsChanged: () => void
}

export function AssetFamilyModal({ editingItem, onClose, onSaved, assetFamilyModels, onModelsChanged }: AssetFamilyModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [familyType, setFamilyType] = useState('BEM')
  const [protheusCode, setProtheusCode] = useState('')
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingMappings, setLoadingMappings] = useState(false)

  useEffect(() => {
    if (editingItem) {
      setCode(editingItem.code || '')
      setName(editingItem.name || '')
      setFamilyType(editingItem.familyType || 'BEM')
      setProtheusCode(editingItem.protheusCode || '')
      // Carregar mapeamentos existentes
      loadExistingMappings(editingItem.id)
    } else {
      setCode('')
      setName('')
      setFamilyType('BEM')
      setProtheusCode('')
      setSelectedModelIds([])
    }
    setError('')
  }, [editingItem])

  const loadExistingMappings = async (familyId: string) => {
    setLoadingMappings(true)
    try {
      const res = await fetch(`/api/basic-registrations/asset-family-model-mappings?familyId=${familyId}`)
      const data = await res.json()
      const ids = (data.data || []).map((m: any) => m.modelId)
      setSelectedModelIds(ids)
    } catch {
      setSelectedModelIds([])
    }
    setLoadingMappings(false)
  }

  const toggleModel = (modelId: string) => {
    setSelectedModelIds(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Código e Nome são obrigatórios')
      return
    }

    setSaving(true)
    setError('')

    try {
      // 1. Salvar a família
      const familyUrl = editingItem
        ? `/api/basic-registrations/asset-families/${editingItem.id}`
        : `/api/basic-registrations/asset-families`
      const method = editingItem ? 'PUT' : 'POST'

      const familyBody: Record<string, any> = {
        code,
        name,
        familyType,
        protheusCode: protheusCode || null,
      }

      const res = await fetch(familyUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyBody),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Erro ao salvar família')
        setSaving(false)
        return
      }

      const familyId = editingItem?.id || result.data?.id

      // 2. Salvar mapeamentos de modelos
      if (familyId) {
        const mapRes = await fetch('/api/basic-registrations/asset-family-model-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ familyId, modelIds: selectedModelIds }),
        })
        if (!mapRes.ok) {
          const mapResult = await mapRes.json()
          setError(mapResult.error || 'Família salva, mas erro ao salvar tipos modelo')
          setSaving(false)
          return
        }
      }

      onSaved()
      onModelsChanged()
      onClose()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Editar Família de Bens' : 'Nova Família de Bens'}
    >
      <div className="p-4 space-y-3 overflow-y-auto">
        {error && (
          <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
            {error}
          </div>
        )}

        <ModalSection title="Identificação">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Código <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ex: COMAR"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Nome <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Compressores de Ar"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo</label>
              <select
                value={familyType}
                onChange={e => setFamilyType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="BEM">Bem</option>
                <option value="FERRAMENTA">Ferramenta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Código Protheus</label>
              <input
                type="text"
                value={protheusCode}
                onChange={e => setProtheusCode(e.target.value)}
                placeholder="Ex: COMAR"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </ModalSection>

        <ModalSection title="Tipos Modelo Aplicáveis">
          {loadingMappings ? (
            <div className="text-sm text-muted-foreground py-2">Carregando...</div>
          ) : assetFamilyModels.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2 px-3 rounded-[4px] bg-muted/30">
              Nenhum tipo modelo cadastrado. Cadastre tipos modelo na aba &quot;Tipos Modelo&quot; primeiro.
            </div>
          ) : (
            <div className="rounded-[4px] max-h-48 overflow-y-auto divide-y divide-border">
              {assetFamilyModels.map(model => (
                <label
                  key={model.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedModelIds.includes(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="rounded border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{model.name}</span>
                    {model.description && (
                      <span className="text-xs text-muted-foreground ml-2">({model.description})</span>
                    )}
                  </div>
                  {model.protheusCode && (
                    <span className="text-xs text-muted-foreground">{model.protheusCode}</span>
                  )}
                </label>
              ))}
            </div>
          )}
          {selectedModelIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedModelIds.map(id => {
                const model = assetFamilyModels.find(m => m.id === id)
                if (!model) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-muted rounded-full text-foreground"
                  >
                    {model.name}
                    <button
                      type="button"
                      onClick={() => toggleModel(id)}
                      className="hover:text-danger transition-colors"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </ModalSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border px-4">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Salvando...' : (editingItem ? 'Salvar' : 'Criar')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
