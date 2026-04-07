'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Icon } from '@/components/ui/Icon'


interface AssetCriticality {
  id: string
  name: string
  customId: string | null
  area: string | null
  status: string
  location: { id: string; name: string } | null
  category: { id: string; name: string } | null
  gutGravity: number
  gutUrgency: number
  gutTendency: number
  gutScore: number
  openRequestsCount: number
  openWorkOrdersCount: number
  rafCount: number
  totalScore: number
  classification: 'critical' | 'warning' | 'ok'
}

interface Summary {
  critical: number
  warning: number
  ok: number
  total: number
}

const classificationConfig = {
  critical: {
    label: 'Crítico',
    color: 'bg-primary-graphite',
    textColor: 'text-foreground',
    bgLight: 'bg-surface-low',
    borderColor: 'border-border',
    icon: 'warning'
  },
  warning: {
    label: 'Alerta',
    color: 'bg-on-surface-variant',
    textColor: 'text-muted-foreground',
    bgLight: 'bg-surface',
    borderColor: 'border-border',
    icon: 'error'
  },
  ok: {
    label: 'OK',
    color: 'bg-on-surface-variant',
    textColor: 'text-muted-foreground',
    bgLight: 'bg-surface',
    borderColor: 'border-border',
    icon: 'check_circle'
  }
}

export default function CriticalityPage() {
  const [assets, setAssets] = useState<AssetCriticality[]>([])
  const [summary, setSummary] = useState<Summary>({ critical: 0, warning: 0, ok: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all')
  const [sortBy, setSortBy] = useState<'totalScore' | 'gutScore' | 'openRequestsCount' | 'openWorkOrdersCount'>('totalScore')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Estado para edição GUT
  const [editingAsset, setEditingAsset] = useState<AssetCriticality | null>(null)
  const [editGutValues, setEditGutValues] = useState({ gutGravity: 1, gutUrgency: 1, gutTendency: 1 })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('classification', filter)
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      const response = await fetch(`/api/criticality?${params}`)
      const result = await response.json()
      
      if (result.data) {
        setAssets(result.data)
        setSummary(result.summary)
      }
    } catch (error) {
      console.error('Error fetching criticality data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filter, sortBy, sortOrder])

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Funções para edição GUT
  const openGutEditor = (asset: AssetCriticality, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingAsset(asset)
    setEditGutValues({
      gutGravity: asset.gutGravity,
      gutUrgency: asset.gutUrgency,
      gutTendency: asset.gutTendency
    })
  }

  const closeGutEditor = () => {
    setEditingAsset(null)
    setEditGutValues({ gutGravity: 1, gutUrgency: 1, gutTendency: 1 })
  }

  const saveGutValues = async () => {
    if (!editingAsset) return
    
    setSaving(true)
    try {
      const formData = new FormData()
      // Precisamos enviar o nome também pois é requerido na API
      formData.append('name', editingAsset.name)
      formData.append('gutGravity', editGutValues.gutGravity.toString())
      formData.append('gutUrgency', editGutValues.gutUrgency.toString())
      formData.append('gutTendency', editGutValues.gutTendency.toString())

      const response = await fetch(`/api/assets/${editingAsset.id}`, {
        method: 'PATCH',
        body: formData
      })

      if (response.ok) {
        closeGutEditor()
        fetchData() // Recarregar dados
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao salvar valores GUT')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return null
    return sortOrder === 'desc' ? <Icon name="expand_more" className="text-base" /> : <Icon name="expand_less" className="text-base" />
  }

  return (
    <AppLayout>
      <div className="h-full overflow-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Icon name="monitoring" className="text-2xl text-primary" />
                Análise de Criticidade de Ativos
              </h1>
              <p className="text-muted-foreground mt-1">
                Priorização baseada em Matriz GUT, solicitações, ordens de serviço e falhas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="px-3 py-2 rounded-[4px] hover:bg-accent/10 transition-colors"
                title="Sobre o sistema"
              >
                <Icon name="info" className="text-xl" />
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-[4px] hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icon name="refresh" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Info Panel */}
          {showInfo && (
            <div className="mt-4 p-4 bg-surface rounded-[4px]">
              <h3 className="font-semibold text-foreground mb-2">Como funciona a análise de criticidade?</h3>
              <div className="text-sm text-foreground space-y-2">
                <p><strong>Matriz GUT (35% do score):</strong> Gravidade × Urgência × Tendência (1-5 cada)</p>
                <p><strong>Solicitações Abertas (20%):</strong> Quantidade de SS pendentes/aprovadas</p>
                <p><strong>Ordens de Serviço (20%):</strong> Quantidade de OS em aberto/andamento</p>
                <p><strong>Relatórios de Falha (15%):</strong> Quantidade de RAFs registradas</p>
                <p><strong>Status do Ativo (10%):</strong> DOWN = crítico, OPERATIONAL = ok</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-graphite"></span> Crítico: ≥70 pontos</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-on-surface-variant"></span> Alerta: 40-69 pontos</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-on-surface-variant"></span> OK: &lt;40 pontos</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total de Ativos</span>
              <Icon name="monitoring" className="text-xl text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{summary.total}</p>
          </button>

          <button
            onClick={() => setFilter('critical')}
            className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'critical' ? 'border-on-surface bg-surface-low' : 'border-border hover:border-border'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Críticos</span>
              <Icon name="warning" className="text-xl text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{summary.critical}</p>
            <p className="text-xs text-muted-foreground mt-1">Requer ação imediata</p>
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'warning' ? 'border-on-surface-variant bg-surface' : 'border-border hover:border-border'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Em Alerta</span>
              <Icon name="error" className="text-xl text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-muted-foreground mt-2">{summary.warning}</p>
            <p className="text-xs text-muted-foreground mt-1">Monitorar de perto</p>
          </button>

          <button
            onClick={() => setFilter('ok')}
            className={`p-4 rounded-[4px] border-2 transition-all ${filter === 'ok' ? 'border-border bg-surface' : 'border-border hover:border-border'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">OK</span>
              <Icon name="check_circle" className="text-xl text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-muted-foreground mt-2">{summary.ok}</p>
            <p className="text-xs text-muted-foreground mt-1">Operação normal</p>
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-[4px] ambient-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ativo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Localização
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                    onClick={() => toggleSort('gutScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GUT <SortIcon field="gutScore" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                    onClick={() => toggleSort('openRequestsCount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Icon name="assignment" className="text-base" /> SS <SortIcon field="openRequestsCount" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                    onClick={() => toggleSort('openWorkOrdersCount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Icon name="construction" className="text-base" /> OS <SortIcon field="openWorkOrdersCount" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Icon name="warning" className="text-base" /> RAF
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                    onClick={() => toggleSort('totalScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Score <SortIcon field="totalScore" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Icon name="refresh" className="text-3xl animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Carregando dados...</p>
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum ativo encontrado
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => {
                    const config = classificationConfig[asset.classification]
                    const iconName = config.icon
                    const isExpanded = expandedId === asset.id

                    return (
                      <React.Fragment key={asset.id}>
                        <tr 
                          className={`hover:bg-muted/30 cursor-pointer transition-colors ${config.bgLight}`}
                          onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${config.color}`}></span>
                              <Icon name={iconName} className={`text-xl ${config.textColor}`} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground">{asset.name}</p>
                              {asset.customId && (
                                <p className="text-xs text-muted-foreground">{asset.customId}</p>
                              )}
                              {asset.status === 'DOWN' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-high text-foreground mt-1">
                                  PARADO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {asset.location?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center group relative">
                              <span className="font-bold text-foreground">{asset.gutScore}</span>
                              <span className="text-xs text-muted-foreground">
                                {asset.gutGravity}×{asset.gutUrgency}×{asset.gutTendency}
                              </span>
                              <button
                                onClick={(e) => openGutEditor(asset, e)}
                                className="absolute -top-1 -right-1 p-1 bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90"
                                title="Editar valores GUT"
                              >
                                <Icon name="edit" className="text-sm" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.openRequestsCount > 0 ? 'bg-surface-low text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                              {asset.openRequestsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.openWorkOrdersCount > 0 ? 'bg-surface-low text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                              {asset.openWorkOrdersCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${asset.rafCount > 0 ? 'bg-surface-high text-foreground' : 'bg-surface-low text-muted-foreground'}`}>
                              {asset.rafCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[4px] ${config.color} text-white font-bold text-lg`}>
                              {asset.totalScore}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${asset.id}-expanded`} className={config.bgLight}>
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-white rounded-[4px] border">
                                  <p className="text-xs text-muted-foreground mb-1">Área</p>
                                  <p className="font-medium">{asset.area || 'Não definida'}</p>
                                </div>
                                <div className="p-3 bg-white rounded-[4px] border">
                                  <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                                  <p className="font-medium">{asset.category?.name || 'Não definida'}</p>
                                </div>
                                <div className="p-3 bg-white rounded-[4px] border">
                                  <p className="text-xs text-muted-foreground mb-1">Gravidade (G)</p>
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(n => (
                                      <span key={n} className={`w-4 h-4 rounded ${n <= asset.gutGravity ? 'bg-primary-graphite' : 'bg-surface-high'}`}></span>
                                    ))}
                                    <span className="ml-2 font-bold">{asset.gutGravity}</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-white rounded-[4px] border">
                                  <p className="text-xs text-muted-foreground mb-1">Urgência (U)</p>
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(n => (
                                      <span key={n} className={`w-4 h-4 rounded ${n <= asset.gutUrgency ? 'bg-on-surface-variant' : 'bg-surface-high'}`}></span>
                                    ))}
                                    <span className="ml-2 font-bold">{asset.gutUrgency}</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-white rounded-[4px] border">
                                  <p className="text-xs text-muted-foreground mb-1">Tendência (T)</p>
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(n => (
                                      <span key={n} className={`w-4 h-4 rounded ${n <= asset.gutTendency ? 'bg-on-surface-variant' : 'bg-surface-high'}`}></span>
                                    ))}
                                    <span className="ml-2 font-bold">{asset.gutTendency}</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-white rounded-[4px] border col-span-3">
                                  <p className="text-xs text-muted-foreground mb-1">Recomendação</p>
                                  <p className="font-medium">
                                    {asset.classification === 'critical' && 'Ação imediata necessária. Priorizar manutenção corretiva ou preventiva.'}
                                    {asset.classification === 'warning' && 'Monitorar de perto. Agendar manutenção preventiva em breve.'}
                                    {asset.classification === 'ok' && 'Manter rotina de manutenção preventiva programada.'}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Edição GUT */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeGutEditor}>
          <div 
            className="bg-card rounded-[4px] ambient-shadow max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Editar Matriz GUT</h3>
                <p className="text-sm text-muted-foreground">{editingAsset.name}</p>
              </div>
              <button
                onClick={closeGutEditor}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Icon name="close" className="text-xl text-muted-foreground" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4">
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
                      onClick={() => setEditGutValues({ ...editGutValues, gutGravity: value })}
                      className={`w-10 h-10 rounded-[4px] font-bold transition-all ${
                        editGutValues.gutGravity === value
                          ? 'bg-primary-graphite text-white ring-2 ring-gray-400'
                          : 'bg-secondary hover:bg-surface-high text-muted-foreground'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editGutValues.gutGravity === 1 && 'Sem gravidade'}
                  {editGutValues.gutGravity === 2 && 'Pouco grave'}
                  {editGutValues.gutGravity === 3 && 'Grave'}
                  {editGutValues.gutGravity === 4 && 'Muito grave'}
                  {editGutValues.gutGravity === 5 && 'Extremamente grave'}
                </p>
              </div>

              {/* Urgência */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Urgência (U) - Tempo para resolver
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditGutValues({ ...editGutValues, gutUrgency: value })}
                      className={`w-10 h-10 rounded-[4px] font-bold transition-all ${
                        editGutValues.gutUrgency === value
                          ? 'bg-on-surface-variant text-white ring-2 ring-gray-400'
                          : 'bg-secondary hover:bg-surface-low text-muted-foreground'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editGutValues.gutUrgency === 1 && 'Pode esperar'}
                  {editGutValues.gutUrgency === 2 && 'Pouco urgente'}
                  {editGutValues.gutUrgency === 3 && 'Urgente'}
                  {editGutValues.gutUrgency === 4 && 'Muito urgente'}
                  {editGutValues.gutUrgency === 5 && 'Ação imediata'}
                </p>
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
                      onClick={() => setEditGutValues({ ...editGutValues, gutTendency: value })}
                      className={`w-10 h-10 rounded-[4px] font-bold transition-all ${
                        editGutValues.gutTendency === value
                          ? 'bg-on-surface-variant text-white ring-2 ring-gray-400'
                          : 'bg-secondary hover:bg-surface-high text-muted-foreground'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editGutValues.gutTendency === 1 && 'Não piora'}
                  {editGutValues.gutTendency === 2 && 'Piora a longo prazo'}
                  {editGutValues.gutTendency === 3 && 'Piora a médio prazo'}
                  {editGutValues.gutTendency === 4 && 'Piora a curto prazo'}
                  {editGutValues.gutTendency === 5 && 'Piora rapidamente'}
                </p>
              </div>

              {/* Score Preview */}
              <div className="p-3 bg-muted rounded-[4px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Novo Score GUT:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">
                      {editGutValues.gutGravity * editGutValues.gutUrgency * editGutValues.gutTendency}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({editGutValues.gutGravity}×{editGutValues.gutUrgency}×{editGutValues.gutTendency})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border">
              <button
                onClick={closeGutEditor}
                className="flex-1 px-4 py-2 rounded-[4px] hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveGutValues}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Icon name="refresh" className="text-base animate-spin" />
                ) : (
                  <Icon name="save" className="text-base" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
