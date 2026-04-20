'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FileUploader } from './FileUploader'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'

interface UploadedFile {
  name: string
  url: string
  size: number
  type: string
}

interface Team {
  id: string
  name: string
}

interface MaintenanceArea {
  id: string
  name: string
  code?: string | null
}

interface AssetOption {
  id: string
  name: string
  protheusCode?: string
  tag?: string
  parentAssetId?: string
  parentAsset?: { id: string; name: string; protheusCode?: string } | null
}

interface AssetHierarchy {
  id: string
  name: string
  protheusCode?: string
  children: AssetHierarchy[]
}

interface RequestEditPayload {
  id: string
  title?: string | null
  description?: string | null
  priority?: string | null
  dueDate?: string | null
  teamId?: string | null
  assetId?: string | null
  maintenanceAreaId?: string | null
  files?: Array<{ name: string; url: string; size?: number; type?: string }> | null
  asset?: AssetOption | null
}

interface RequestFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  request?: RequestEditPayload
  inPage?: boolean
}

export function RequestFormModal({ isOpen, onClose, onSuccess, request, inPage = false }: RequestFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [maintenanceAreas, setMaintenanceAreas] = useState<MaintenanceArea[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])

  // Asset autocomplete state
  const [assetCodeSearch, setAssetCodeSearch] = useState('')
  const [assetNameSearch, setAssetNameSearch] = useState('')
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([])
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null)
  const [assetHierarchy, setAssetHierarchy] = useState<AssetHierarchy[]>([])
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [activeSearchField, setActiveSearchField] = useState<'code' | 'name' | null>(null)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const assetDropdownRef = useRef<HTMLDivElement>(null)
  const assetCodeInputRef = useRef<HTMLInputElement>(null)
  const assetNameInputRef = useRef<HTMLInputElement>(null)
  const assetSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'NONE',
    dueDate: '',
    teamId: '',
    assetId: '',
    maintenanceAreaId: ''
  })

  useEffect(() => {
    const shouldInit = inPage || isOpen
    if (shouldInit) {
      loadTeams()
      loadMaintenanceAreas()
      if (request) {
        setFormData({
          title: request.title || '',
          description: request.description || '',
          priority: request.priority || 'NONE',
          dueDate: request.dueDate ? new Date(request.dueDate).toISOString().split('T')[0] : '',
          teamId: request.teamId || '',
          assetId: request.assetId || '',
          maintenanceAreaId: request.maintenanceAreaId || ''
        })
        setFiles((request.files || []).map((f) => ({
          name: f.name,
          url: f.url,
          size: f.size ?? 0,
          type: f.type ?? '',
        })))
        if (request.asset) {
          setSelectedAsset(request.asset)
          setAssetCodeSearch(request.asset.protheusCode || '')
          setAssetNameSearch(request.asset.name || '')
          loadAssetHierarchy(request.asset.id)
        }
      } else {
        resetForm()
      }
    }
  }, [isOpen, request, inPage])

  const updateDropdownPosition = useCallback((field: 'code' | 'name') => {
    const inputRef = field === 'code' ? assetCodeInputRef : assetNameInputRef
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (assetDropdownRef.current?.contains(target)) return
      if (assetCodeInputRef.current?.contains(target)) return
      if (assetNameInputRef.current?.contains(target)) return
      setShowAssetDropdown(false)
      setActiveSearchField(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'NONE',
      dueDate: '',
      teamId: '',
      assetId: '',
      maintenanceAreaId: ''
    })
    setFiles([])
    setSelectedAsset(null)
    setAssetCodeSearch('')
    setAssetNameSearch('')
    setAssetHierarchy([])
    setAssetOptions([])
  }

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      setTeams(data.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const loadMaintenanceAreas = async () => {
    try {
      const response = await fetch('/api/basic-registrations/maintenance-areas')
      const data = await response.json()
      setMaintenanceAreas(data.data || [])
    } catch (error) {
      console.error('Error loading maintenance areas:', error)
    }
  }

  const searchAssets = useCallback(async (term: string, field: 'code' | 'name') => {
    if (term.length < 2) {
      setAssetOptions([])
      setShowAssetDropdown(false)
      return
    }
    setLoadingAssets(true)
    try {
      const res = await fetch(`/api/assets?summary=true&limit=15&search=${encodeURIComponent(term)}`)
      const data = await res.json()
      const results: AssetOption[] = data.data || []
      setAssetOptions(results.slice(0, 10))
      if (results.length > 0) {
        setActiveSearchField(field)
        updateDropdownPosition(field)
        setShowAssetDropdown(true)
      } else {
        setShowAssetDropdown(false)
      }
    } catch (error) {
      console.error('Error searching assets:', error)
    } finally {
      setLoadingAssets(false)
    }
  }, [updateDropdownPosition])

  const handleAssetSearchChange = (value: string, field: 'code' | 'name') => {
    if (field === 'code') {
      setAssetCodeSearch(value)
    } else {
      setAssetNameSearch(value)
    }

    if (selectedAsset) {
      setSelectedAsset(null)
      setFormData(prev => ({ ...prev, assetId: '' }))
      setAssetHierarchy([])
      if (field === 'code') setAssetNameSearch('')
      else setAssetCodeSearch('')
    }
    if (assetSearchTimerRef.current) clearTimeout(assetSearchTimerRef.current)
    assetSearchTimerRef.current = setTimeout(() => searchAssets(value, field), 300)
  }

  const loadAssetHierarchy = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets?summary=true&limit=500`)
      const data = await res.json()
      const allAssets: AssetOption[] = data.data || []

      // Build hierarchy: find ancestors (parents going up)
      const buildAncestorChain = (id: string): AssetHierarchy[] => {
        const asset = allAssets.find(a => a.id === id)
        if (!asset) return []

        const node: AssetHierarchy = {
          id: asset.id,
          name: asset.name,
          protheusCode: asset.protheusCode,
          children: []
        }

        if (asset.parentAssetId) {
          const parentChain = buildAncestorChain(asset.parentAssetId)
          if (parentChain.length > 0) {
            // The last item in the chain should contain this node as child
            let current = parentChain[0]
            while (current.children.length > 0) {
              current = current.children[0]
            }
            current.children.push(node)
            return parentChain
          }
        }
        return [node]
      }

      // Find direct children of the selected asset
      const children = allAssets
        .filter(a => a.parentAssetId === assetId)
        .map(child => ({
          id: child.id,
          name: child.name,
          protheusCode: child.protheusCode,
          children: allAssets
            .filter(gc => gc.parentAssetId === child.id)
            .map(gc => ({ id: gc.id, name: gc.name, protheusCode: gc.protheusCode, children: [] }))
        }))

      const chain = buildAncestorChain(assetId)
      if (chain.length > 0) {
        // Add children to the selected asset node
        const findNode = (nodes: AssetHierarchy[]): AssetHierarchy | null => {
          for (const n of nodes) {
            if (n.id === assetId) return n
            const found = findNode(n.children)
            if (found) return found
          }
          return null
        }
        const selectedNode = findNode(chain)
        if (selectedNode) {
          selectedNode.children = children
        }
        setAssetHierarchy(chain)
      }
    } catch (error) {
      console.error('Error loading asset hierarchy:', error)
    }
  }

  const handleSelectAsset = (asset: AssetOption) => {
    setSelectedAsset(asset)
    setAssetCodeSearch(asset.protheusCode || '')
    setAssetNameSearch(asset.name)
    setFormData(prev => ({ ...prev, assetId: asset.id }))
    setShowAssetDropdown(false)
    loadAssetHierarchy(asset.id)
  }

  const handleClearAsset = () => {
    setSelectedAsset(null)
    setAssetCodeSearch('')
    setAssetNameSearch('')
    setFormData(prev => ({ ...prev, assetId: '' }))
    setAssetHierarchy([])
    setAssetOptions([])
  }

  const renderHierarchyTree = (nodes: AssetHierarchy[], depth: number = 0, selectedId?: string) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: depth * 16 }}>
        <div className={`flex items-center gap-1.5 py-0.5 ${node.id === selectedId ? 'font-bold text-accent-orange' : 'text-gray-700'}`}>
          <Icon
            name={node.children.length > 0 ? 'account_tree' : 'settings'}
            className={`text-sm ${node.id === selectedId ? 'text-accent-orange' : 'text-gray-400'}`}
          />
          <span className="text-xs">
            {node.protheusCode && <span className="text-gray-500 mr-1">[{node.protheusCode}]</span>}
            {node.name}
          </span>
        </div>
        {node.children.length > 0 && renderHierarchyTree(node.children, depth + 1, selectedId)}
      </div>
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.maintenanceAreaId) {
      alert('Selecione a Área de Manutenção')
      return
    }

    setLoading(true)

    try {
      const url = request ? `/api/requests/${request.id}` : '/api/requests'
      const method = request ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          dueDate: formData.dueDate,
          teamId: formData.teamId,
          assetId: formData.assetId || null,
          maintenanceAreaId: formData.maintenanceAreaId,
          files: files.map(f => ({
            name: f.name,
            url: f.url,
            size: f.size,
            type: f.type
          }))
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao salvar solicitação')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  const formFields = (
    <>
      <ModalSection title="Identificação do Bem">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Campo Código do Bem */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Código do Bem
            </label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
              <input
                ref={assetCodeInputRef}
                type="text"
                value={assetCodeSearch}
                onChange={(e) => handleAssetSearchChange(e.target.value, 'code')}
                onFocus={() => {
                  if (assetOptions.length > 0 && !selectedAsset) {
                    setActiveSearchField('code')
                    updateDropdownPosition('code')
                    setShowAssetDropdown(true)
                  }
                }}
                placeholder="Digite o código..."
                className={`w-full pl-10 pr-10 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring ${
                  selectedAsset ? 'border-green-300 bg-green-50' : 'border-input'
                }`}
                readOnly={!!selectedAsset}
              />
              {selectedAsset && (
                <button
                  type="button"
                  onClick={handleClearAsset}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="close" className="text-base" />
                </button>
              )}
              {loadingAssets && activeSearchField === 'code' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-surface-variant" />
                </div>
              )}
            </div>
          </div>

          {/* Campo Nome do Bem */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Nome do Bem
            </label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
              <input
                ref={assetNameInputRef}
                type="text"
                value={assetNameSearch}
                onChange={(e) => handleAssetSearchChange(e.target.value, 'name')}
                onFocus={() => {
                  if (assetOptions.length > 0 && !selectedAsset) {
                    setActiveSearchField('name')
                    updateDropdownPosition('name')
                    setShowAssetDropdown(true)
                  }
                }}
                placeholder="Digite o nome do bem..."
                className={`w-full pl-10 pr-10 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring ${
                  selectedAsset ? 'border-green-300 bg-green-50' : 'border-input'
                }`}
                readOnly={!!selectedAsset}
              />
              {loadingAssets && activeSearchField === 'name' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-surface-variant" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown de resultados via portal */}
        {showAssetDropdown && !selectedAsset && dropdownPos && typeof document !== 'undefined' && createPortal(
          <div
            ref={assetDropdownRef}
            className="fixed bg-white border border-gray-200 rounded-[4px] shadow-lg max-h-60 overflow-auto"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999
            }}
          >
            {assetOptions.map(asset => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelectAsset(asset)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon name="precision_manufacturing" className="text-base text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                    <div className="text-xs text-gray-500">
                      {asset.protheusCode && <span>Código: {asset.protheusCode}</span>}
                      {asset.protheusCode && asset.tag && <span> | </span>}
                      {asset.tag && <span>TAG: {asset.tag}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}

        {/* Dados do bem selecionado + Hierarquia */}
        {selectedAsset && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-[4px] p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-1">
              <div>
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Código</span>
                <span className="text-[13px] font-medium text-gray-900">{selectedAsset.protheusCode || '-'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Nome do Bem</span>
                <span className="text-[13px] font-medium text-gray-900">{selectedAsset.name}</span>
              </div>
              {selectedAsset.tag && (
                <div>
                  <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">TAG</span>
                  <span className="text-[13px] font-medium text-gray-900">{selectedAsset.tag}</span>
                </div>
              )}
            </div>

            {/* Hierarquia do bem */}
            {assetHierarchy.length > 0 && (
              <div className="border-t border-gray-200 pt-2 mt-2">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Estrutura Hierárquica</span>
                <div className="bg-white border border-gray-100 rounded p-2">
                  {renderHierarchyTree(assetHierarchy, 0, selectedAsset.id)}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalSection>

      <ModalSection title="Solicitação">
        <Input
          label="Título *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="Ex: Vazamento no banheiro"
        />

        <div className="mt-3">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Área de Manutenção *
          </label>
          <select
            value={formData.maintenanceAreaId}
            onChange={(e) => setFormData({ ...formData, maintenanceAreaId: e.target.value })}
            required
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione a área...</option>
            {maintenanceAreas.map(area => (
              <option key={area.id} value={area.id}>
                {area.code ? `${area.code} - ${area.name}` : area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => {
              const normalized = e.target.value
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
              setFormData({ ...formData, description: normalized })
            }}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Descreva detalhadamente o problema ou necessidade..."
          />
        </div>
      </ModalSection>

      <ModalSection title="Prioridade e Prazo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="NONE">Nenhuma</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data Desejada (Opcional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Icon name="calendar_today" className="absolute right-3 top-2.5 text-xl text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </ModalSection>

      <ModalSection title="Atribuição">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Atribuir a Equipe (Opcional)
          </label>
          <select
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Nenhuma equipe</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            A equipe poderá aceitar ou recusar esta solicitação
          </p>
        </div>
      </ModalSection>

      <ModalSection title="Anexos">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          maxFiles={10}
        />
      </ModalSection>
    </>
  )

  const renderFooter = (isInPage: boolean) => (
    <div className={isInPage
      ? 'flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200'
      : 'flex gap-3 px-4 py-4 border-t border-border'
    }>
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        className="flex-1"
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading} className="flex-1 bg-gray-900 text-white hover:bg-gray-800">
        <Icon name="save" className="text-base mr-2" />
        {loading ? 'Salvando...' : request ? 'Salvar Alterações' : 'Salvar'}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-900">
            {request ? 'Editar Solicitação' : 'Nova Solicitação'}
          </h2>
          <PanelCloseButton onClick={handleClose} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formFields}
          </div>
          {renderFooter(true)}
        </form>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={request ? 'Editar Solicitação de Serviço (SC)' : 'Nova Solicitação de Serviço (SC)'}
    >
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formFields}
        </div>
        {renderFooter(false)}
      </form>
    </Modal>
  )
}
