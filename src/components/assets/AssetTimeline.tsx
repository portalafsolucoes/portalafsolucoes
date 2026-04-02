'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Edit, RefreshCw, ClipboardList, Play, CheckCircle,
  FileText, ThumbsUp, ThumbsDown, Upload, Trash2, Package,
  AlertTriangle, Gauge, ListChecks, Calendar, MessageSquare,
  Star, ChevronDown, Filter, Clock, User, Loader2
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
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  ASSET_CREATED: { icon: Plus, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Ativo Criado' },
  ASSET_UPDATED: { icon: Edit, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Ativo Atualizado' },
  ASSET_STATUS_CHANGED: { icon: RefreshCw, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Status Alterado' },
  WORK_ORDER_CREATED: { icon: ClipboardList, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Criada' },
  WORK_ORDER_STARTED: { icon: Play, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Iniciada' },
  WORK_ORDER_COMPLETED: { icon: CheckCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'OS Concluída' },
  REQUEST_CREATED: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Criada' },
  REQUEST_APPROVED: { icon: ThumbsUp, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Aprovada' },
  REQUEST_REJECTED: { icon: ThumbsDown, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Solicitação Rejeitada' },
  FILE_UPLOADED: { icon: Upload, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Arquivo Anexado' },
  FILE_DELETED: { icon: Trash2, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Arquivo Removido' },
  PART_ADDED: { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Peça Adicionada' },
  PART_REMOVED: { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Peça Removida' },
  DOWNTIME_STARTED: { icon: AlertTriangle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Parada Iniciada' },
  DOWNTIME_ENDED: { icon: CheckCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Parada Encerrada' },
  METER_READING: { icon: Gauge, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Leitura de Medidor' },
  CHECKLIST_COMPLETED: { icon: ListChecks, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Checklist Concluído' },
  MAINTENANCE_SCHEDULED: { icon: Calendar, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Manutenção Agendada' },
  NOTE_ADDED: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Nota Adicionada' },
  CUSTOM: { icon: Star, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Evento Personalizado' }
}

export default function AssetTimeline({ assetId, assetName }: AssetTimelineProps) {
  const [events, setEvents] = useState<AssetHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [filterType, setFilterType] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      if (filterType) {
        params.append('eventType', filterType)
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
  }, [assetId, offset, filterType])

  const getConfig = (eventType: string) => {
    return eventTypeConfig[eventType] || eventTypeConfig.CUSTOM
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'HH:mm', { locale: ptBR })
  }

  const groupEventsByDate = (events: AssetHistoryEvent[]) => {
    const groups: Record<string, AssetHistoryEvent[]> = {}
    events.forEach(event => {
      const dateKey = formatDate(event.createdAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    return groups
  }

  const loadMore = () => {
    setOffset(prev => prev + limit)
  }

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

  const groupedEvents = groupEventsByDate(events)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Histórico do Ativo
            </h3>
            {assetName && (
              <p className="text-sm text-gray-500">{assetName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {total} evento{total !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters || filterType
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por tipo de evento
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setOffset(0)
              }}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="">Todos os eventos</option>
              {Object.entries(eventTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-6 py-4">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum evento registrado</p>
            <p className="text-sm text-gray-400 mt-1">
              O histórico aparecerá aqui conforme ações forem realizadas
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Data */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm font-medium text-gray-500 bg-white px-3">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Eventos do dia */}
                <div className="relative">
                  {/* Linha vertical */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {dateEvents.map((event, index) => {
                      const config = getConfig(event.eventType)
                      const Icon = config.icon

                      return (
                        <div key={event.id} className="relative flex gap-4">
                          {/* Ícone */}
                          <div
                            className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
                          >
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>

                          {/* Conteúdo */}
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
    </div>
  )
}
