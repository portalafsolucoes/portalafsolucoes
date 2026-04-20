'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface ActionPlanItem {
  item: number
  subject: string
  deadline: string
  actionDescription: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  linkedWorkOrderId?: string
  linkedWorkOrderNumber?: string
}

export interface PrintRAF {
  id: string
  rafNumber: string
  occurrenceDate: string
  occurrenceTime?: string | null
  panelOperator?: string | null
  failureType?: string | null
  stopExtension?: boolean | null
  failureBreakdown?: boolean | null
  productionLost?: number | null
  failureDescription?: string | null
  immediateAction?: string | null
  observation?: string | null
  actionPlan?: ActionPlanItem[] | null
  createdAt?: string | null
  createdBy?: { firstName: string; lastName: string } | null
  workOrder?: {
    id: string
    internalId?: string | null
    title?: string | null
    maintenanceArea?: { id: string; name: string; code?: string | null } | null
    asset?: { id: string; name: string; tag?: string | null; protheusCode?: string | null } | null
  } | null
  request?: {
    id: string
    requestNumber?: string | null
    title?: string | null
    maintenanceArea?: { id: string; name: string; code?: string | null } | null
    asset?: { id: string; name: string; tag?: string | null; protheusCode?: string | null } | null
  } | null
}

interface RAFPrintViewProps {
  rafId?: string
  data?: PrintRAF
  onClose?: () => void
  embedded?: boolean
}

function failureTypeLabel(type?: string | null): string {
  if (type === 'REPETITIVE') return 'REPETITIVA'
  if (type === 'RANDOM') return 'ALEATORIA'
  return type || '-'
}

function statusLabel(s?: string): string {
  if (s === 'COMPLETED') return 'CONCLUIDO'
  if (s === 'IN_PROGRESS') return 'ANDAMENTO'
  return 'PENDENTE'
}

export function RAFPrintView({ rafId, data, onClose, embedded = false }: RAFPrintViewProps) {
  const { user } = useAuth()
  const [raf, setRaf] = useState<PrintRAF | null>(data || null)
  const [loading, setLoading] = useState(!data && !!rafId)
  const printRef = useRef<HTMLDivElement>(null)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    if (data) {
      setRaf(data)
      setLoading(false)
      return
    }
    if (!rafId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/rafs/${rafId}`)
        if (res.ok) {
          const json = await res.json()
          setRaf(json.data || null)
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [rafId, data])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    if (embedded) {
      return (
        <div className="p-6 text-center text-[11px] text-gray-500">Carregando RAF...</div>
      )
    }
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!raf) {
    if (embedded) {
      return <div className="p-6 text-center text-[11px] text-gray-500">Erro ao carregar RAF.</div>
    }
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar RAF.</p>
          {onClose && (
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
          )}
        </div>
      </div>
    )
  }

  const origin = raf.workOrder
    ? { kind: 'OS', label: raf.workOrder.internalId || raf.workOrder.id.slice(0, 8), title: raf.workOrder.title, area: raf.workOrder.maintenanceArea, asset: raf.workOrder.asset }
    : raf.request
      ? { kind: 'SS', label: raf.request.requestNumber || raf.request.id.slice(0, 8), title: raf.request.title, area: raf.request.maintenanceArea, asset: raf.request.asset }
      : null

  const assetName = origin?.asset?.name || '-'
  const assetTag = origin?.asset?.tag || origin?.asset?.protheusCode || '-'
  const areaLabel = origin?.area
    ? (origin.area.code ? `${origin.area.code} - ${origin.area.name}` : origin.area.name)
    : '-'

  const actionPlan = (raf.actionPlan || []).filter(a => a && (a.subject || a.actionDescription))

  const page = (
    <div
      ref={printRef}
      className="bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed raf-print-page"
    >
      {/* === CABEÇALHO === */}
      <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-4">
        <div className="flex-shrink-0 w-[45mm]">
          {companyLogo ? (
            <div className="bg-gray-600 rounded px-3 py-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={companyLogo}
                alt={companyName}
                className="max-h-[14mm] max-w-[40mm] object-contain object-left"
              />
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-900">{companyName}</span>
          )}
        </div>

        <div className="flex-1 px-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Relatorio de Analise de Falha</p>
          <p className="text-[10px] text-gray-600 mt-0.5">Emitido em {formatDate(new Date().toISOString())}</p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">RAF</p>
          <p className="text-xl font-black text-gray-900 mt-0.5">{raf.rafNumber}</p>
          <p className="text-[9px] text-gray-500">{failureTypeLabel(raf.failureType)}</p>
        </div>
      </div>

      {/* === IDENTIFICAÇÃO === */}
      <div className="mb-3">
        <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
          <span className="font-bold text-[10px] uppercase tracking-wider">Identificacao</span>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
          <div>
            <p className="text-[9px] font-bold text-gray-500 uppercase">Data da Ocorrencia</p>
            <p className="font-medium">{formatDate(raf.occurrenceDate)}</p>
          </div>
          {raf.occurrenceTime && (
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase">Horario</p>
              <p className="font-medium">{raf.occurrenceTime}</p>
            </div>
          )}
          {raf.panelOperator && (
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase">Operador do Painel</p>
              <p className="font-medium">{raf.panelOperator}</p>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold text-gray-500 uppercase">Tipo de Falha</p>
            <p className="font-medium">{failureTypeLabel(raf.failureType)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-500 uppercase">Extensao de Parada</p>
            <p className="font-medium">{raf.stopExtension ? 'SIM' : 'NAO'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-500 uppercase">Breakdown</p>
            <p className="font-medium">{raf.failureBreakdown ? 'SIM' : 'NAO'}</p>
          </div>
          {raf.productionLost != null && (
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase">Producao Perdida</p>
              <p className="font-medium">{raf.productionLost} ton</p>
            </div>
          )}
          <div className="col-span-3 border-t border-gray-200 pt-2 mt-1">
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Origem</p>
                <p className="font-medium">
                  {origin ? `${origin.kind} ${origin.label}` : 'SEM VINCULO'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Codigo do Bem</p>
                <p className="font-medium font-mono">{assetTag}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Area de Manutencao</p>
                <p className="font-medium">{areaLabel}</p>
              </div>
              <div className="col-span-3">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Ativo</p>
                <p className="font-medium">{assetName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === DESCRIÇÃO DA FALHA === */}
      {raf.failureDescription && (
        <div className="mb-3">
          <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
            <span className="font-bold text-[10px] uppercase tracking-wider">Descricao da Falha</span>
          </div>
          <p className="px-1 whitespace-pre-wrap text-[11px]">{raf.failureDescription}</p>
        </div>
      )}

      {/* === AÇÃO IMEDIATA === */}
      {raf.immediateAction && (
        <div className="mb-3">
          <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
            <span className="font-bold text-[10px] uppercase tracking-wider">Acao Imediata</span>
          </div>
          <p className="px-1 whitespace-pre-wrap text-[11px]">{raf.immediateAction}</p>
        </div>
      )}

      {/* === PLANO DE AÇÃO === */}
      {actionPlan.length > 0 && (
        <div className="mb-3">
          <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
            <span className="font-bold text-[10px] uppercase tracking-wider">Plano de Acao ({actionPlan.length})</span>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px] w-8">#</th>
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Assunto</th>
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Descricao</th>
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px] w-20">Prazo</th>
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px] w-20">Status</th>
                <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px] w-20">OS</th>
              </tr>
            </thead>
            <tbody>
              {actionPlan.map((a, i) => (
                <tr key={i} className="border-b border-gray-200 align-top">
                  <td className="py-0.5 px-1 font-mono">{a.item || i + 1}</td>
                  <td className="py-0.5 px-1">{a.subject || '-'}</td>
                  <td className="py-0.5 px-1">{a.actionDescription || '-'}</td>
                  <td className="py-0.5 px-1">{a.deadline ? formatDate(a.deadline) : '-'}</td>
                  <td className="py-0.5 px-1">{statusLabel(a.status)}</td>
                  <td className="py-0.5 px-1 font-mono">{a.linkedWorkOrderNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === OBSERVAÇÕES === */}
      {raf.observation && (
        <div className="mb-3">
          <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
            <span className="font-bold text-[10px] uppercase tracking-wider">Observacoes</span>
          </div>
          <p className="px-1 whitespace-pre-wrap text-[11px]">{raf.observation}</p>
        </div>
      )}

      {/* === ASSINATURAS === */}
      <div className="mt-8 grid grid-cols-2 gap-8 px-4">
        <div className="text-center">
          <div className="border-t border-gray-900 pt-1 mt-10">
            <p className="text-[9px] font-bold uppercase text-gray-500">Responsavel pela Analise</p>
            {raf.createdBy && (
              <p className="text-[9px] text-gray-600 mt-0.5">{raf.createdBy.firstName} {raf.createdBy.lastName}</p>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-900 pt-1 mt-10">
            <p className="text-[9px] font-bold uppercase text-gray-500">Gestor de Manutencao</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return page
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Visualizacao de Impressao - RAF {raf.rafNumber}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-[4px] hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center py-8 print:py-0 print:block">
        {page}
      </div>
    </div>
  )
}
