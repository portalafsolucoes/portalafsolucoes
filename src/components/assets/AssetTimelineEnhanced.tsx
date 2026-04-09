'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, isThisYear, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@/components/ui/Icon'

interface AssetHistoryEvent {
  id: string
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  assetId: string
  workOrderId: string | null
  requestId: string | null
  fileId: string | null
  userId: string | null
  userName: string | null
}

interface AssetTimelineProps {
  assetId: string
  assetName?: string
  defaultFilter?: string
  compact?: boolean
}

const eventTypeConfig: Record<string, { icon: string; color: string; bgColor: string; label: string; category: string }> = {
  ASSET_CREATED: { icon: 'add', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Ativo Criado', category: 'asset' },
  ASSET_UPDATED: { icon: 'edit', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Ativo Atualizado', category: 'asset' },
  ASSET_STATUS_CHANGED: { icon: 'refresh', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Status Alterado', category: 'asset' },
  WORK_ORDER_CREATED: { icon: 'assignment', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Criada', category: 'workorder' },
  WORK_ORDER_STARTED: { icon: 'play_arrow', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Iniciada', category: 'workorder' },
  WORK_ORDER_COMPLETED: { icon: 'check_circle', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Concluída', category: 'workorder' },
  REQUEST_CREATED: { icon: 'description', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Criada', category: 'request' },
  REQUEST_APPROVED: { icon: 'thumb_up', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Aprovada', category: 'request' },
  REQUEST_REJECTED: { icon: 'thumb_down', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Rejeitada', category: 'request' },
  FILE_UPLOADED: { icon: 'upload', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Arquivo Anexado', category: 'file' },
  FILE_DELETED: { icon: 'delete', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Arquivo Removido', category: 'file' },
  ATTACHMENT_ADDED: { icon: 'attach_file', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Anexo Adicionado', category: 'attachment' },
  ATTACHMENT_REMOVED: { icon: 'link_off', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Anexo Removido', category: 'attachment' },
  TECHNICAL_INFO_ADDED: { icon: 'code', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Info Técnica', category: 'attachment' },
  TIP_ADDED: { icon: 'lightbulb', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Dica Adicionada', category: 'attachment' },
  PART_ADDED: { icon: 'inventory_2', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Peça Adicionada', category: 'part' },
  PART_REMOVED: { icon: 'inventory_2', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Peça Removida', category: 'part' },
  DOWNTIME_STARTED: { icon: 'warning', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Parada Iniciada', category: 'downtime' },
  DOWNTIME_ENDED: { icon: 'check_circle', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Parada Encerrada', category: 'downtime' },
  METER_READING: { icon: 'speed', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Leitura de Medidor', category: 'meter' },
  CHECKLIST_COMPLETED: { icon: 'checklist', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Checklist Concluído', category: 'maintenance' },
  MAINTENANCE_SCHEDULED: { icon: 'calendar_today', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Manutenção Agendada', category: 'maintenance' },
  NOTE_ADDED: { icon: 'chat', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Nota Adicionada', category: 'note' },
  CUSTOM: { icon: 'star', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Evento Personalizado', category: 'custom' }
}

// Category groups for filtering
const eventCategories = [
  { id: 'all', label: 'Todos os Eventos', icon: 'list' },
  { id: 'workorder', label: 'Ordens de Serviço', icon: 'assignment' },
  { id: 'attachment', label: 'Anexos e Documentos', icon: 'attach_file' },
  { id: 'file', label: 'Arquivos', icon: 'upload' },
  { id: 'request', label: 'Solicitações', icon: 'description' },
  { id: 'part', label: 'Peças', icon: 'inventory_2' },
  { id: 'downtime', label: 'Paradas', icon: 'warning' },
  { id: 'maintenance', label: 'Manutenção', icon: 'calendar_today' },
  { id: 'asset', label: 'Alterações do Ativo', icon: 'edit' },
  { id: 'meter', label: 'Leituras', icon: 'speed' },
  { id: 'note', label: 'Notas', icon: 'chat' },
]

export default function AssetTimeline({ assetId, assetName, defaultFilter, compact = false }: AssetTimelineProps) {
  const [events, setEvents] = useState<AssetHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [filterCategory, setFilterCategory] = useState<string>(defaultFilter || 'all')
  const [filterEventType, setFilterEventType] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'grouped'>('timeline')

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      if (filterEventType) {
        params.append('eventType', filterEventType)
      }

      const response = await fetch(`/api/assets/${assetId}/history?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico')
      }
      const result = await response.json()
      setEvents(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (assetId) {
      fetchHistory()
    }
  }, [assetId, offset, filterEventType])

  // Filter events by category and search
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const config = eventTypeConfig[event.eventType] || eventTypeConfig.CUSTOM
      
      // Category filter
      if (filterCategory !== 'all' && config.category !== filterCategory) {
        return false
      }
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesTitle = event.title.toLowerCase().includes(searchLower)
        const matchesDescription = event.description?.toLowerCase().includes(searchLower)
        const matchesLabel = config.label.toLowerCase().includes(searchLower)
        if (!matchesTitle && !matchesDescription && !matchesLabel) {
          return false
        }
      }
      
      return true
    })
  }, [events, filterCategory, searchQuery])

  // Group events by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, AssetHistoryEvent[]> = {}
    filteredEvents.forEach(event => {
      const date = new Date(event.createdAt)
      let dateKey: string
      
      if (isToday(date)) {
        dateKey = 'Hoje'
      } else if (isYesterday(date)) {
        dateKey = 'Ontem'
      } else if (isThisYear(date)) {
        dateKey = format(date, "dd 'de' MMMM", { locale: ptBR })
      } else {
        dateKey = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    return groups
  }, [filteredEvents])

  // Group events by type/category
  const groupedByType = useMemo(() => {
    const groups: Record<string, AssetHistoryEvent[]> = {}
    filteredEvents.forEach(event => {
      const config = eventTypeConfig[event.eventType] || eventTypeConfig.CUSTOM
      const category = config.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(event)
    })
    return groups
  }, [filteredEvents])

  const getConfig = (eventType: string) => {
    return eventTypeConfig[eventType] || eventTypeConfig.CUSTOM
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'HH:mm', { locale: ptBR })
  }

  const loadMore = () => {
    setOffset(prev => prev + limit)
  }

  const resetFilters = () => {
    setFilterCategory('all')
    setFilterEventType('')
    setSearchQuery('')
    setOffset(0)
  }

  const hasActiveFilters = filterCategory !== 'all' || filterEventType !== '' || searchQuery !== ''

  const hasMore = offset + limit < total

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="progress_activity" className="text-3xl animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface rounded-[4px] p-4 text-foreground">
        <p className="font-medium">Erro ao carregar histórico</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[4px] ambient-shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Histórico do Ativo
            </h3>
            {assetName && !compact && (
              <p className="text-sm text-muted-foreground">{assetName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredEvents.length} de {total} evento{total !== 1 ? 's' : ''}
            </span>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface-low rounded-[4px] p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded ${viewMode === 'timeline' ? 'bg-white ambient-shadow' : ''}`}
                title="Visualização em Timeline"
              >
                <Icon name="list" className="text-base" />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded ${viewMode === 'grouped' ? 'bg-white ambient-shadow' : ''}`}
                title="Agrupado por Tipo"
              >
                <Icon name="grid_view" className="text-base" />
              </button>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-[4px] transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-surface-low text-muted-foreground'
                  : 'bg-surface-low text-muted-foreground hover:bg-surface-high'
              }`}
            >
              <Icon name="filter_list" className="text-base" />
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Search */}
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar no histórico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-[4px] text-sm focus:ring-2 focus:ring-gray-500 focus:border-border"
              />
            </div>
            
            {/* Category Filter Pills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Filtrar por Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {eventCategories.map(cat => {
                  const isActive = filterCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setFilterCategory(cat.id)
                        setOffset(0)
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-graphite text-white'
                          : 'bg-surface-low text-foreground hover:bg-surface-high'
                      }`}
                    >
                      <Icon name={cat.icon} className="text-sm" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tipo de Evento Específico
              </label>
              <select
                value={filterEventType}
                onChange={(e) => {
                  setFilterEventType(e.target.value)
                  setOffset(0)
                }}
                className="w-full sm:w-64 px-3 py-2 rounded-[4px] text-sm focus:ring-2 focus:ring-gray-500 focus:border-border"
              >
                <option value="">Todos os tipos</option>
                {Object.entries(eventTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Icon name="close" className="text-base" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="px-6 py-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="schedule" className="text-5xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'Nenhum evento encontrado com os filtros aplicados'
                  : 'Nenhum evento registrado'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByDate).map(([date, dateEvents]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-surface-high" />
                    <span className="text-sm font-medium text-muted-foreground bg-white px-3">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-surface-high" />
                  </div>

                  {/* Events for this day */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-high" />

                    <div className="space-y-4">
                      {dateEvents.map((event) => {
                        const config = getConfig(event.eventType)
                        const iconName = config.icon || 'star'

                        return (
                          <div key={event.id} className="relative flex gap-4">
                            {/* Icon */}
                            <div
                              className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
                            >
                              <Icon name={iconName} className={`text-xl ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="bg-surface rounded-[4px] p-4 hover:bg-surface-low transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground">
                                      {event.title}
                                    </p>
                                    <p className={`text-xs font-medium ${config.color} mt-0.5`}>
                                      {config.label}
                                    </p>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(event.createdAt)}
                                  </span>
                                </div>

                                {event.description && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {event.description}
                                  </p>
                                )}

                                {event.userName && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Icon name="person" className="text-sm" />
                                    <span>{event.userName}</span>
                                  </div>
                                )}

                                {/* Metadata */}
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <details className="group">
                                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                                        <Icon name="expand_more" className="text-sm group-open:rotate-180 transition-transform" />
                                        Detalhes adicionais
                                      </summary>
                                      <pre className="mt-2 text-xs text-muted-foreground bg-white p-2 rounded overflow-x-auto">
                                        {JSON.stringify(event.metadata, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-surface rounded-[4px] hover:bg-surface-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Icon name="progress_activity" className="text-base animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Icon name="expand_more" className="text-base" />
                    Carregar mais eventos
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped View */}
      {viewMode === 'grouped' && (
        <div className="px-6 py-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="schedule" className="text-5xl text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'Nenhum evento encontrado com os filtros aplicados'
                  : 'Nenhum evento registrado'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventCategories.filter(cat => cat.id !== 'all' && groupedByType[cat.id]).map(cat => {
                const categoryEvents = groupedByType[cat.id] || []
                if (categoryEvents.length === 0) return null
                
                return (
                  <div key={cat.id} className="bg-surface rounded-[4px] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name={cat.icon} className="text-xl text-muted-foreground" />
                      <h4 className="font-medium text-foreground">{cat.label}</h4>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {categoryEvents.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {categoryEvents.slice(0, 5).map(event => {
                        const config = getConfig(event.eventType)
                        return (
                          <div 
                            key={event.id} 
                            className="bg-white rounded p-2 text-sm"
                          >
                            <p className="font-medium text-foreground truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )
                      })}
                      {categoryEvents.length > 5 && (
                        <button
                          onClick={() => {
                            setFilterCategory(cat.id)
                            setViewMode('timeline')
                          }}
                          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
                        >
                          Ver todos ({categoryEvents.length})
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
