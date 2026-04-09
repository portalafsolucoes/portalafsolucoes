'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
}

const eventTypeConfig: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  ASSET_CREATED: { icon: 'add', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Ativo Criado' },
  ASSET_UPDATED: { icon: 'edit', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Ativo Atualizado' },
  ASSET_STATUS_CHANGED: { icon: 'refresh', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Status Alterado' },
  WORK_ORDER_CREATED: { icon: 'assignment', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Criada' },
  WORK_ORDER_STARTED: { icon: 'play_arrow', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Iniciada' },
  WORK_ORDER_COMPLETED: { icon: 'check_circle', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'OS Concluída' },
  REQUEST_CREATED: { icon: 'description', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Criada' },
  REQUEST_APPROVED: { icon: 'thumb_up', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Aprovada' },
  REQUEST_REJECTED: { icon: 'thumb_down', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Solicitação Rejeitada' },
  FILE_UPLOADED: { icon: 'upload', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Arquivo Anexado' },
  FILE_DELETED: { icon: 'delete', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Arquivo Removido' },
  PART_ADDED: { icon: 'inventory_2', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Peça Adicionada' },
  PART_REMOVED: { icon: 'inventory_2', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Peça Removida' },
  DOWNTIME_STARTED: { icon: 'warning', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Parada Iniciada' },
  DOWNTIME_ENDED: { icon: 'check_circle', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Parada Encerrada' },
  METER_READING: { icon: 'speed', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Leitura de Medidor' },
  CHECKLIST_COMPLETED: { icon: 'checklist', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Checklist Concluído' },
  MAINTENANCE_SCHEDULED: { icon: 'calendar_today', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Manutenção Agendada' },
  NOTE_ADDED: { icon: 'chat', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Nota Adicionada' },
  CUSTOM: { icon: 'star', color: 'text-muted-foreground', bgColor: 'bg-surface-low', label: 'Evento Personalizado' }
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

  const groupedEvents = groupEventsByDate(events)

  return (
    <div className="bg-white rounded-[4px] ambient-shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Histórico do Ativo
            </h3>
            {assetName && (
              <p className="text-sm text-muted-foreground">{assetName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {total} evento{total !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-[4px] transition-colors ${
                showFilters || filterType
                  ? 'bg-surface-low text-muted-foreground'
                  : 'bg-surface-low text-muted-foreground hover:bg-surface-high'
              }`}
            >
              <Icon name="filter_list" className="text-base" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="block text-sm font-medium text-foreground mb-2">
              Filtrar por tipo de evento
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setOffset(0)
              }}
              className="w-full sm:w-64 px-3 py-2 rounded-[4px] text-sm focus:ring-2 focus:ring-gray-500 focus:border-border"
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
            <Icon name="schedule" className="text-5xl text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum evento registrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              O histórico aparecerá aqui conforme ações forem realizadas
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Data */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-surface-high" />
                  <span className="text-sm font-medium text-muted-foreground bg-white px-3">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-surface-high" />
                </div>

                {/* Eventos do dia */}
                <div className="relative">
                  {/* Linha vertical */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-high" />

                  <div className="space-y-4">
                    {dateEvents.map((event, index) => {
                      const config = getConfig(event.eventType)
                      const iconName = config.icon

                      return (
                        <div key={event.id} className="relative flex gap-4">
                          {/* Ícone */}
                          <div
                            className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}
                          >
                            <Icon name={iconName} className={`text-xl ${config.color}`} />
                          </div>

                          {/* Conteúdo */}
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
    </div>
  )
}
