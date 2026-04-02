'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, isThisYear, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Edit, RefreshCw, ClipboardList, Play, CheckCircle,
  FileText, ThumbsUp, ThumbsDown, Upload, Trash2, Package,
  AlertTriangle, Gauge, ListChecks, Calendar, MessageSquare,
  Star, ChevronDown, Filter, Clock, User, Loader2, X,
  Paperclip, Unlink, FileCode, Lightbulb, BookOpen,
  FileSpreadsheet, PenTool, Camera, Video, Award, Shield,
  ClipboardCheck, ListOrdered, File, Search, LayoutList, Grid3X3
} from 'lucide-react'

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

// Map of event types to their icons
const iconMap: Record<string, React.ElementType> = {
  Plus, Edit, RefreshCw, ClipboardList, Play, CheckCircle,
  FileText, ThumbsUp, ThumbsDown, Upload, Trash2, Package,
  AlertTriangle, Gauge, ListChecks, Calendar, MessageSquare,
  Star, Paperclip, Unlink, FileCode, Lightbulb, BookOpen,
  FileSpreadsheet, PenTool, Camera, Video, Award, Shield,
  ClipboardCheck, ListOrdered, File
}

const eventTypeConfig: Record<string, { icon: string; color: string; bgColor: string; label: string; category: string }> = {
  // Asset Events
  ASSET_CREATED: { icon: 'Plus', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Ativo Criado', category: 'asset' },
  ASSET_UPDATED: { icon: 'Edit', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Ativo Atualizado', category: 'asset' },
  ASSET_STATUS_CHANGED: { icon: 'RefreshCw', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Status Alterado', category: 'asset' },
  
  // Work Order Events
  WORK_ORDER_CREATED: { icon: 'ClipboardList', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Criada', category: 'workorder' },
  WORK_ORDER_STARTED: { icon: 'Play', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Iniciada', category: 'workorder' },
  WORK_ORDER_COMPLETED: { icon: 'CheckCircle', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Concluída', category: 'workorder' },
  
  // Request Events
  REQUEST_CREATED: { icon: 'FileText', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Criada', category: 'request' },
  REQUEST_APPROVED: { icon: 'ThumbsUp', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Aprovada', category: 'request' },
  REQUEST_REJECTED: { icon: 'ThumbsDown', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Rejeitada', category: 'request' },
  
  // File Events
  FILE_UPLOADED: { icon: 'Upload', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Arquivo Anexado', category: 'file' },
  FILE_DELETED: { icon: 'Trash2', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Arquivo Removido', category: 'file' },
  
  // Attachment Events
  ATTACHMENT_ADDED: { icon: 'Paperclip', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Anexo Adicionado', category: 'attachment' },
  ATTACHMENT_REMOVED: { icon: 'Unlink', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Anexo Removido', category: 'attachment' },
  TECHNICAL_INFO_ADDED: { icon: 'FileCode', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Info Técnica', category: 'attachment' },
  TIP_ADDED: { icon: 'Lightbulb', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Dica Adicionada', category: 'attachment' },
  
  // Part Events
  PART_ADDED: { icon: 'Package', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Peça Adicionada', category: 'part' },
  PART_REMOVED: { icon: 'Package', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Peça Removida', category: 'part' },
  
  // Downtime Events
  DOWNTIME_STARTED: { icon: 'AlertTriangle', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Parada Iniciada', category: 'downtime' },
  DOWNTIME_ENDED: { icon: 'CheckCircle', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Parada Encerrada', category: 'downtime' },
  
  // Meter Events
  METER_READING: { icon: 'Gauge', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Leitura de Medidor', category: 'meter' },
  
  // Maintenance Events
  CHECKLIST_COMPLETED: { icon: 'ListChecks', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Checklist Concluído', category: 'maintenance' },
  MAINTENANCE_SCHEDULED: { icon: 'Calendar', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Manutenção Agendada', category: 'maintenance' },
  
  // Note Events
  NOTE_ADDED: { icon: 'MessageSquare', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Nota Adicionada', category: 'note' },
  
  // Custom Events
  CUSTOM: { icon: 'Star', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Evento Personalizado', category: 'custom' }
}

// Category groups for filtering
const eventCategories = [
  { id: 'all', label: 'Todos os Eventos', icon: LayoutList },
  { id: 'workorder', label: 'Ordens de Serviço', icon: ClipboardList },
  { id: 'attachment', label: 'Anexos e Documentos', icon: Paperclip },
  { id: 'file', label: 'Arquivos', icon: Upload },
  { id: 'request', label: 'Solicitações', icon: FileText },
  { id: 'part', label: 'Peças', icon: Package },
  { id: 'downtime', label: 'Paradas', icon: AlertTriangle },
  { id: 'maintenance', label: 'Manutenção', icon: Calendar },
  { id: 'asset', label: 'Alterações do Ativo', icon: Edit },
  { id: 'meter', label: 'Leituras', icon: Gauge },
  { id: 'note', label: 'Notas', icon: MessageSquare },
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
        <p className="font-medium">Erro ao carregar histórico</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Histórico do Ativo
            </h3>
            {assetName && !compact && (
              <p className="text-sm text-gray-500">{assetName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {filteredEvents.length} de {total} evento{total !== 1 ? 's' : ''}
            </span>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded ${viewMode === 'timeline' ? 'bg-white shadow-sm' : ''}`}
                title="Visualização em Timeline"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded ${viewMode === 'grouped' ? 'bg-white shadow-sm' : ''}`}
                title="Agrupado por Tipo"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar no histórico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            {/* Category Filter Pills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {eventCategories.map(cat => {
                  const Icon = cat.icon
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
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Evento Específico
              </label>
              <select
                value={filterEventType}
                onChange={(e) => {
                  setFilterEventType(e.target.value)
                  setOffset(0)
                }}
                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
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
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {hasActiveFilters 
                  ? 'Nenhum evento encontrado com os filtros aplicados'
                  : 'Nenhum evento registrado'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
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
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-sm font-medium text-gray-500 bg-white px-3">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  {/* Events for this day */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-4">
                      {dateEvents.map((event) => {
                        const config = getConfig(event.eventType)
                        const IconComponent = iconMap[config.icon] || Star

                        return (
                          <div key={event.id} className="relative flex gap-4">
                            {/* Icon */}
                            <div
                              className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
                            >
                              <IconComponent className={`h-5 w-5 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">
                                      {event.title}
                                    </p>
                                    <p className={`text-xs font-medium ${config.color} mt-0.5`}>
                                      {config.label}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatTime(event.createdAt)}
                                  </span>
                                </div>

                                {event.description && (
                                  <p className="mt-2 text-sm text-gray-600">
                                    {event.description}
                                  </p>
                                )}

                                {event.userName && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                    <User className="h-3 w-3" />
                                    <span>{event.userName}</span>
                                  </div>
                                )}

                                {/* Metadata */}
                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <details className="group">
                                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                                        <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                        Detalhes adicionais
                                      </summary>
                                      <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded overflow-x-auto">
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
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
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
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
                
                const Icon = cat.icon
                
                return (
                  <div key={cat.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{cat.label}</h4>
                      <span className="ml-auto text-sm text-gray-500">
                        {categoryEvents.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {categoryEvents.slice(0, 5).map(event => {
                        const config = getConfig(event.eventType)
                        return (
                          <div 
                            key={event.id} 
                            className="bg-white rounded p-2 text-sm border border-gray-200"
                          >
                            <p className="font-medium text-gray-900 truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-gray-500">
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
                          className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-2"
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
