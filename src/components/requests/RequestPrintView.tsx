'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'

interface PrintRequest {
  id: string
  requestNumber?: string | null
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate?: string | null
  createdAt?: string | null
  teamApprovalStatus?: string | null
  createdBy?: { firstName: string; lastName: string } | null
  team?: { id: string; name: string } | null
  asset?: {
    id: string
    name: string
    protheusCode?: string | null
    tag?: string | null
    parentAssetId?: string | null
  } | null
  generatedWorkOrder?: {
    id: string
    title: string
    status: string
    externalId?: string | null
    internalId?: string | null
  } | null
  files?: { id?: string; name: string; url: string; type?: string | null }[]
}

interface RequestPrintViewProps {
  requestId: string
  onClose: () => void
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'HIGH': return 'Alta'
    case 'MEDIUM': return 'Media'
    case 'LOW': return 'Baixa'
    default: return 'Nenhuma'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Pendente'
    case 'APPROVED': return 'Aprovada'
    case 'REJECTED': return 'Rejeitada'
    case 'CANCELLED': return 'Cancelada'
    case 'COMPLETED': return 'Finalizada'
    default: return status
  }
}

function getWOStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Pendente'
    case 'RELEASED': return 'Liberada'
    case 'IN_PROGRESS': return 'Em Progresso'
    case 'ON_HOLD': return 'Em Espera'
    case 'COMPLETE': return 'Concluida'
    default: return status
  }
}

export function RequestPrintView({ requestId, onClose }: RequestPrintViewProps) {
  const { user } = useAuth()
  const [request, setRequest] = useState<PrintRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/requests/${requestId}`)
        if (res.ok) {
          const { data } = await res.json()
          setRequest(data)
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [requestId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar solicitacao.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
        </div>
      </div>
    )
  }

  const imageFiles = (request.files || []).filter(f => {
    if (f.type?.startsWith('image/')) return true
    const lower = (f.name || f.url).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => lower.endsWith(ext))
  })

  const documentFiles = (request.files || []).filter(f => !imageFiles.includes(f))

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Visualizacao de Impressao - Solicitacao de Servico</h2>
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

      {/* A4 Page */}
      <div className="flex justify-center py-8 print:py-0 print:block">
        <div
          ref={printRef}
          className="bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed"
        >
          {/* === CABECALHO === */}
          <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-4">
            {/* Logo */}
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

            {/* Titulo central */}
            <div className="flex-1 px-4 text-center">
              <p className="text-[14px] font-black uppercase tracking-wider text-gray-900">Solicitacao de Servico</p>
              <p className="text-[9px] text-gray-500 mt-1">Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
            </div>

            {/* Número e Status */}
            <div className="flex-shrink-0 text-right">
              {request.requestNumber && (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Solicitacao</p>
                  <p className="text-xl font-black text-gray-900 mt-0.5">{request.requestNumber}</p>
                </>
              )}
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mt-1">Status</p>
              <p className="text-sm font-bold text-gray-900">{getStatusLabel(request.status)}</p>
            </div>
          </div>

          {/* === 1. RESUMO === */}
          <div className="mb-3">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Resumo da Solicitacao</span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
              <div className="col-span-3">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Titulo</p>
                <p className="font-bold text-[12px]">{request.title}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Prioridade</p>
                <p className="font-medium">{getPriorityLabel(request.priority)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Status</p>
                <p className="font-medium">{getStatusLabel(request.status)}</p>
              </div>
              {request.createdAt && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Criado em</p>
                  <p className="font-medium">{formatDateTime(request.createdAt)}</p>
                </div>
              )}
              {request.createdBy && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Solicitado por</p>
                  <p className="font-medium">{request.createdBy.firstName} {request.createdBy.lastName}</p>
                </div>
              )}
              {request.team && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Equipe Atribuida</p>
                  <p className="font-medium">{request.team.name}</p>
                </div>
              )}
              {request.dueDate && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Data Desejada</p>
                  <p className="font-medium">{formatDate(request.dueDate)}</p>
                </div>
              )}
            </div>
            {request.description && (
              <div className="mt-2 px-1">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Descricao</p>
                <p className="font-medium whitespace-pre-wrap">{request.description}</p>
              </div>
            )}
          </div>

          {/* === 2. ATIVO === */}
          {request.asset && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Ativo Vinculado</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Codigo do Bem</p>
                  <p className="font-medium">{request.asset.protheusCode || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Nome do Bem</p>
                  <p className="font-medium">{request.asset.name}</p>
                </div>
                {request.asset.tag && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">TAG</p>
                    <p className="font-medium">{request.asset.tag}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === 3. OS GERADA === */}
          {request.generatedWorkOrder && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Ordem de Servico Gerada</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Numero</p>
                  <p className="font-medium">
                    {request.generatedWorkOrder.externalId || request.generatedWorkOrder.internalId || request.generatedWorkOrder.id.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Titulo</p>
                  <p className="font-medium">{request.generatedWorkOrder.title}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Status da OS</p>
                  <p className="font-medium">{getWOStatusLabel(request.generatedWorkOrder.status)}</p>
                </div>
              </div>
            </div>
          )}

          {/* === 4. ANEXOS === */}
          {(request.files || []).length > 0 && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Anexos ({(request.files || []).length})</span>
              </div>
              {documentFiles.length > 0 && (
                <div className="px-1 mb-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Documentos</p>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-0.5 px-1 font-bold text-gray-500 uppercase text-[8px]">Nome do Arquivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentFiles.map((file, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-0.5 px-1">{file.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {imageFiles.length > 0 && (
                <div className="px-1">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Imagens</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imageFiles.map((file, i) => (
                      <div key={i} className="border border-gray-200 rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.url} alt={file.name} className="w-full h-[25mm] object-cover" />
                        <p className="text-[8px] text-gray-500 px-1 py-0.5 truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === OBSERVACOES (linhas em branco) === */}
          <div className="mt-6">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-3">
              <span className="font-bold text-[10px] uppercase tracking-wider">Observacoes</span>
            </div>
            <div className="space-y-4 px-1">
              {Array.from({ length: 8 }).map((_, i) => (
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
      </div>
    </div>
  )
}
