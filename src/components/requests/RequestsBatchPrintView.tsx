'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'

interface BatchPrintRequest {
  id: string
  requestNumber?: string | null
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate?: string | null
  createdAt?: string | null
  createdBy?: { firstName: string; lastName: string } | null
  team?: { id: string; name: string } | null
  asset?: {
    id: string
    name: string
    protheusCode?: string | null
    tag?: string | null
    parentAssetId?: string | null
  } | null
  maintenanceArea?: { id: string; name: string; code?: string | null } | null
  generatedWorkOrder?: {
    id: string
    title: string
    status: string
  } | null
  files?: { id?: string; name: string; url: string; type?: string | null }[]
}

interface Props {
  requestIds: string[]
  onClose: () => void
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'HIGH': return 'ALTA'
    case 'MEDIUM': return 'MEDIA'
    case 'LOW': return 'BAIXA'
    default: return 'NENHUMA'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'PENDENTE'
    case 'APPROVED': return 'APROVADA'
    case 'REJECTED': return 'REJEITADA'
    case 'CANCELLED': return 'CANCELADA'
    case 'COMPLETED': return 'FINALIZADA'
    default: return status
  }
}

export function RequestsBatchPrintView({ requestIds, onClose }: Props) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<BatchPrintRequest[]>([])
  const [loading, setLoading] = useState(true)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        if (requestIds.length === 0) {
          setRequests([])
          setLoading(false)
          return
        }
        const res = await fetch(`/api/requests?ids=${requestIds.join(',')}`)
        if (res.ok) {
          const json = await res.json()
          setRequests((json.data || []) as BatchPrintRequest[])
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [requestIds])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando SSs...</p>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nenhuma SS disponivel para impressao.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          Impressao em Lote - {requests.length} SS{requests.length > 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-[4px] hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center py-8 print:py-0 print:block gap-8 print:gap-0">
        {requests.map((ss, idx) => (
          <div
            key={ss.id}
            className={`bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed ${
              idx < requests.length - 1 ? 'print:break-after-page' : ''
            }`}
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
                <p className="text-[14px] font-black uppercase tracking-wider text-gray-900">Solicitacao de Servico</p>
                <p className="text-[9px] text-gray-500 mt-1">Emitido em {new Date().toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                {ss.requestNumber && (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Solicitacao</p>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{ss.requestNumber}</p>
                  </>
                )}
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mt-1">Status</p>
                <p className="text-sm font-bold text-gray-900">{getStatusLabel(ss.status)}</p>
              </div>
            </div>

            {/* === RESUMO === */}
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Resumo da Solicitacao</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                <div className="col-span-3">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Titulo</p>
                  <p className="font-bold text-[12px]">{ss.title}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Prioridade</p>
                  <p className="font-medium">{getPriorityLabel(ss.priority)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Status</p>
                  <p className="font-medium">{getStatusLabel(ss.status)}</p>
                </div>
                {ss.createdAt && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Criado em</p>
                    <p className="font-medium">{formatDateTime(ss.createdAt)}</p>
                  </div>
                )}
                {ss.createdBy && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Solicitado por</p>
                    <p className="font-medium">{ss.createdBy.firstName} {ss.createdBy.lastName}</p>
                  </div>
                )}
                {ss.team && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Equipe</p>
                    <p className="font-medium">{ss.team.name}</p>
                  </div>
                )}
                {ss.dueDate && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Prazo</p>
                    <p className="font-medium">{formatDate(ss.dueDate)}</p>
                  </div>
                )}
                {ss.maintenanceArea && (
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Area de Manutencao</p>
                    <p className="font-medium">
                      {ss.maintenanceArea.code
                        ? `${ss.maintenanceArea.code} - ${ss.maintenanceArea.name}`
                        : ss.maintenanceArea.name}
                    </p>
                  </div>
                )}
              </div>
              {ss.description && (
                <div className="mt-2 px-1">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Descricao</p>
                  <p className="font-medium whitespace-pre-wrap">{ss.description}</p>
                </div>
              )}
            </div>

            {/* === ATIVO === */}
            {ss.asset && (
              <div className="mb-3">
                <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider">Ativo Vinculado</span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Codigo do Bem</p>
                    <p className="font-medium font-mono">{ss.asset.protheusCode || ss.asset.tag || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Nome do Bem</p>
                    <p className="font-medium">{ss.asset.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* === OS GERADA === */}
            {ss.generatedWorkOrder && (
              <div className="mb-3">
                <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider">Ordem de Servico Gerada</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Titulo</p>
                    <p className="font-medium">{ss.generatedWorkOrder.title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Status da OS</p>
                    <p className="font-medium">{ss.generatedWorkOrder.status}</p>
                  </div>
                </div>
              </div>
            )}

            {/* === OBSERVAÇÕES === */}
            <div className="mt-6">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-3">
                <span className="font-bold text-[10px] uppercase tracking-wider">Observacoes</span>
              </div>
              <div className="space-y-4 px-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border-b border-gray-300 pb-1"></div>
                ))}
              </div>
            </div>

            {/* === ASSINATURAS === */}
            <div className="mt-8 grid grid-cols-2 gap-8 px-4">
              <div className="text-center">
                <div className="border-t border-gray-900 pt-1 mt-8">
                  <p className="text-[9px] font-bold uppercase text-gray-500">Solicitante</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-900 pt-1 mt-8">
                  <p className="text-[9px] font-bold uppercase text-gray-500">Responsavel</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
