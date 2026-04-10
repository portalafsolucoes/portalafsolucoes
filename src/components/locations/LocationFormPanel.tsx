'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'

interface Location {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  parentId?: string | null
}

interface Props {
  editingLocation: Location | null
  allLocations: Location[]
  onClose: () => void
  onSaved: () => void
  inPage?: boolean
}

export function LocationFormPanel({
  editingLocation,
  allLocations,
  onClose,
  onSaved,
  inPage = false,
}: Props) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    parentId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingLocation) {
      setFormData({
        name: editingLocation.name,
        address: editingLocation.address || '',
        latitude: editingLocation.latitude != null ? String(editingLocation.latitude) : '',
        longitude: editingLocation.longitude != null ? String(editingLocation.longitude) : '',
        parentId: editingLocation.parentId || '',
      })
    } else {
      setFormData({ name: '', address: '', latitude: '', longitude: '', parentId: '' })
    }
    setError('')
  }, [editingLocation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        parentId: formData.parentId || undefined,
      }

      const url = editingLocation
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations'
      const method = editingLocation ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }

      onSaved()
      onClose()
    } catch {
      setError('Erro de conexão')
    }

    setSaving(false)
  }

  // Excluir a própria localização das opções de pai (não pode ser pai de si mesmo)
  const parentOptions = allLocations.filter(l => l.id !== editingLocation?.id)

  const formTitle = editingLocation ? 'Editar Localização' : 'Nova Localização'

  const formContent = (
    <>
      {error && (
        <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
          {error}
        </div>
      )}
      <ModalSection title="Dados">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Localização Pai (Hierarquia)
            </label>
            <select
              value={formData.parentId}
              onChange={e => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhuma (nível raiz)</option>
              {parentOptions.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
        Cancelar
      </Button>
      <Button type="submit" disabled={saving} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Salvando...' : editingLocation ? 'Salvar Alterações' : 'Salvar'}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{formTitle}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formContent}
          </div>
          {formFooter}
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={formTitle}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formContent}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
