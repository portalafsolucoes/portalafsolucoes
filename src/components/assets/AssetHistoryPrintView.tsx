'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { AssetHistoryEvent, WorkOrderFullDetail, RequestFullDetail } from '@/types/assetHistory'

interface AssetData {
  id: string
  name: string
  status: string
  protheusCode?: string
  tag?: string
  assetCategoryType?: string
  assetPriority?: string
  ownershipType?: string
  maintenanceStatus?: string
  manufacturer?: string
  modelName?: string
  serialNumber?: string
  hasStructure?: boolean
  hasCounter?: boolean
  counterType?: string
  counterPosition?: number
  lifeValue?: number
  lifeUnit?: string
  purchaseValue?: number
  hourlyCost?: number
  purchaseDate?: string
  installationDate?: string
  supplierCode?: string
  supplierStore?: string
  warrantyPeriod?: number
  warrantyUnit?: string
  warrantyDate?: string
  acquisitionCost?: number
  location?: { id: string; name: string } | null
  shiftCode?: string
  parentAsset?: {
    id: string
    name: string
    protheusCode?: string
    parentAsset?: {
      id: string
      name: string
      protheusCode?: string
    } | null
  } | null
  childAssets?: {
    id: string
    name: string
    protheusCode?: string
  }[]
}

interface AssetHistoryPrintViewProps {
  assetId: string
  startDate: string
  endDate: string
  sourceFilter: 'all' | 'os' | 'ss'
  onClose: () => void
}

const eventTypeLabels: Record<string, string> = {
  ASSET_CREATED: 'Ativo Criado',
  ASSET_UPDATED: 'Ativo Atualizado',
  ASSET_STATUS_CHANGED: 'Status Alterado',
  WORK_ORDER_CREATED: 'OS Criada',
  WORK_ORDER_STARTED: 'OS Iniciada',
  WORK_ORDER_COMPLETED: 'OS Concluída',
  REQUEST_CREATED: 'SS Criada',
  REQUEST_APPROVED: 'SS Aprovada',
  REQUEST_REJECTED: 'SS Rejeitada',
  FILE_UPLOADED: 'Arquivo Anexado',
  FILE_DELETED: 'Arquivo Removido',
  ATTACHMENT_ADDED: 'Anexo Adicionado',
  ATTACHMENT_REMOVED: 'Anexo Removido',
  TECHNICAL_INFO_ADDED: 'Info Técnica',
  TIP_ADDED: 'Dica Adicionada',
  PART_ADDED: 'Peça Adicionada',
  PART_REMOVED: 'Peça Removida',
  DOWNTIME_STARTED: 'Parada Iniciada',
  DOWNTIME_ENDED: 'Parada Encerrada',
  METER_READING: 'Leitura de Medidor',
  CHECKLIST_COMPLETED: 'Checklist Concluído',
  MAINTENANCE_SCHEDULED: 'Manutenção Agendada',
  NOTE_ADDED: 'Nota Adicionada',
  CUSTOM: 'Evento Personalizado',
}

const typeLabel: Record<string, string> = {
  PREVENTIVE: 'PREVENTIVA',
  CORRECTIVE: 'CORRETIVA',
  PREDICTIVE: 'PREDITIVA',
  REACTIVE: 'REATIVA',
}

const requestStatusLabel: Record<string, string> = {
  PENDING: 'PENDENTE',
  APPROVED: 'APROVADA',
  REJECTED: 'REJEITADA',
  IN_PROGRESS: 'EM ANDAMENTO',
  COMPLETED: 'CONCLUÍDA',
  CANCELLED: 'CANCELADA',
}

function getSourceLabel(source: 'all' | 'os' | 'ss'): string {
  switch (source) {
    case 'os': return 'Somente OSs'
    case 'ss': return 'Somente SSs'
    default: return 'Todos'
  }
}

// Sub-componente: detalhes de OS para impressão (sem interatividade)
function PrintableWorkOrderDetails({ wo }: { wo: WorkOrderFullDetail }) {
  const osNumber = wo.sequenceNumber != null
    ? `MAN-${String(wo.sequenceNumber).padStart(6, '0')}`
    : wo.internalId || '-'
  const mpNumber = wo.maintenancePlanExec?.planNumber
    ? `#${wo.maintenancePlanExec.planNumber}`
    : wo.assetMaintenancePlan?.sequence != null
      ? `#${wo.assetMaintenancePlan.sequence}`
      : null
  const mpName = wo.assetMaintenancePlan?.name || null
  const totalCost =
    (wo.laborCost || 0) +
    (wo.partsCost || 0) +
    (wo.thirdPartyCost || 0) +
    (wo.toolsCost || 0)

  return (
    <div className="mt-2 border border-gray-300 rounded-[2px] bg-gray-50 p-2">
      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Detalhes da OS
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Número da OS</p>
          <p className="text-[9px] font-mono font-semibold text-gray-900">{osNumber}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Tipo de Manutenção</p>
          <p className="text-[9px] text-gray-900">{wo.type ? (typeLabel[wo.type] || wo.type) : '-'}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Tipo de Serviço</p>
          <p className="text-[9px] text-gray-900">{wo.serviceType?.name || '-'}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Área de Manutenção</p>
          <p className="text-[9px] text-gray-900">{wo.maintenanceArea?.name || '-'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[8px] font-bold text-gray-400 uppercase">Plano de Manutenção</p>
          <p className="text-[9px] text-gray-900">
            {mpNumber || mpName
              ? `${mpNumber || ''}${mpNumber && mpName ? ' — ' : ''}${mpName || ''}`
              : '-'}
          </p>
        </div>
        {wo.createdAt && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Criada em</p>
            <p className="text-[9px] text-gray-900">{formatDate(wo.createdAt)}</p>
          </div>
        )}
        {wo.completedOn && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Finalizada em</p>
            <p className="text-[9px] text-gray-900">{formatDate(wo.completedOn)}</p>
          </div>
        )}
      </div>

      {/* Recursos aplicados */}
      <div className="mt-1.5">
        <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Recursos Aplicados</p>
        {wo.woResources && wo.woResources.length > 0 ? (
          <ul className="space-y-0.5">
            {wo.woResources.map((r) => {
              const name = r.resource?.name
                || (r.user ? `${r.user.firstName} ${r.user.lastName}` : null)
                || r.jobTitle?.name
                || (r.resourceType || 'Recurso')
              const qty = r.quantity != null ? `${r.quantity}${r.unit ? ' ' + r.unit : ''}` : null
              const hrs = r.hours != null ? `${r.hours}h` : null
              const meta = [qty, hrs].filter(Boolean).join(' · ')
              return (
                <li key={r.id} className="flex items-start justify-between gap-2 text-[9px]">
                  <span className="text-gray-800">{name}</span>
                  {meta && <span className="text-gray-500 whitespace-nowrap">{meta}</span>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[9px] text-gray-500">Nenhum recurso registrado</p>
        )}
      </div>

      {/* Observações */}
      {wo.executionNotes && (
        <div className="mt-1.5">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Observações</p>
          <p className="text-[9px] text-gray-800 whitespace-pre-wrap">{wo.executionNotes}</p>
        </div>
      )}

      {/* Custos */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-200">
        <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Custos</p>
        <div className="grid grid-cols-4 gap-x-2 text-[8px] text-gray-500">
          <div>
            Mão de obra:<br />
            <span className="text-gray-900 font-semibold">{formatCurrency(wo.laborCost || 0)}</span>
          </div>
          <div>
            Peças:<br />
            <span className="text-gray-900 font-semibold">{formatCurrency(wo.partsCost || 0)}</span>
          </div>
          <div>
            Terceiros:<br />
            <span className="text-gray-900 font-semibold">{formatCurrency(wo.thirdPartyCost || 0)}</span>
          </div>
          <div>
            Ferramentas:<br />
            <span className="text-gray-900 font-semibold">{formatCurrency(wo.toolsCost || 0)}</span>
          </div>
        </div>
        <div className="mt-1 pt-1 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide">Total</span>
          <span className="text-[10px] font-bold text-gray-900">{formatCurrency(totalCost)}</span>
        </div>
      </div>
    </div>
  )
}

// Sub-componente: detalhes de SS para impressão (sem interatividade)
function PrintableRequestDetails({ req }: { req: RequestFullDetail }) {
  const requesterName = req.requester
    ? `${req.requester.firstName} ${req.requester.lastName}`
    : '-'

  return (
    <div className="mt-2 border border-gray-300 rounded-[2px] bg-gray-50 p-2">
      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        Detalhes da SS
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        {req.requestNumber && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Número da SS</p>
            <p className="text-[9px] font-mono font-semibold text-gray-900">{req.requestNumber}</p>
          </div>
        )}
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Status</p>
          <p className="text-[9px] text-gray-900">
            {req.status ? (requestStatusLabel[req.status] || req.status) : '-'}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase">Solicitante</p>
          <p className="text-[9px] text-gray-900">{requesterName}</p>
        </div>
        {req.maintenanceArea && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Área de Manutenção</p>
            <p className="text-[9px] text-gray-900">{req.maintenanceArea.name}</p>
          </div>
        )}
        {req.createdAt && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Criada em</p>
            <p className="text-[9px] text-gray-900">{formatDate(req.createdAt)}</p>
          </div>
        )}
        {req.failureAnalysisReport && (
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase">RAF Vinculada</p>
            <p className="text-[9px] font-mono text-gray-900">{req.failureAnalysisReport.rafNumber}</p>
          </div>
        )}
      </div>

      {req.failureDescription && (
        <div className="mt-1.5">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Descrição da Falha</p>
          <p className="text-[9px] text-gray-800 whitespace-pre-wrap">{req.failureDescription}</p>
        </div>
      )}

      {req.status === 'REJECTED' && req.rejectionReason && (
        <div className="mt-1.5">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-0.5">Motivo da Rejeição</p>
          <p className="text-[9px] text-gray-800 whitespace-pre-wrap">{req.rejectionReason}</p>
        </div>
      )}
    </div>
  )
}

export function AssetHistoryPrintView({ assetId, startDate, endDate, sourceFilter, onClose }: AssetHistoryPrintViewProps) {
  const { user } = useAuth()
  const [asset, setAsset] = useState<AssetData | null>(null)
  const [events, setEvents] = useState<AssetHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch asset + history (com detalhes de OS/SS) em paralelo
        const historyParams = new URLSearchParams({
          limit: '10000',
          offset: '0',
          startDate,
          endDate,
          include: 'details',
          ...(sourceFilter !== 'all' ? { source: sourceFilter } : {}),
        })

        const [assetRes, historyRes] = await Promise.all([
          fetch(`/api/assets/${assetId}`),
          fetch(`/api/assets/${assetId}/history?${historyParams}`)
        ])

        if (assetRes.ok) {
          const { data } = await assetRes.json()
          setAsset(data)
        }
        if (historyRes.ok) {
          const { data } = await historyRes.json()
          setEvents(data || [])
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [assetId, startDate, endDate, sourceFilter])

  const handlePrint = () => {
    window.print()
  }

  const formattedStart = format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')
  const formattedEnd = format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')

  // Build hierarchy chain
  const hierarchyChain: { name: string; code?: string }[] = []
  if (asset) {
    if (asset.parentAsset?.parentAsset) {
      hierarchyChain.push({
        name: asset.parentAsset.parentAsset.name,
        code: asset.parentAsset.parentAsset.protheusCode
      })
    }
    if (asset.parentAsset) {
      hierarchyChain.push({
        name: asset.parentAsset.name,
        code: asset.parentAsset.protheusCode
      })
    }
    hierarchyChain.push({
      name: asset.name,
      code: asset.protheusCode
    })
    if (asset.childAssets && asset.childAssets.length > 0) {
      for (const child of asset.childAssets) {
        hierarchyChain.push({
          name: child.name,
          code: child.protheusCode
        })
      }
    }
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

  if (!asset) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados do ativo.</p>
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
          Histórico do Bem - {asset.name} ({formattedStart} a {formattedEnd})
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

      {/* A4 Page */}
      <div className="flex justify-center py-8 print:py-0 print:block">
        <div
          ref={printRef}
          className="bg-white w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:w-full px-[15mm] py-[10mm] text-[11px] text-gray-900 leading-relaxed"
        >
          {/* === CABEÇALHO === */}
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

            {/* Title */}
            <div className="flex-1 text-center px-4">
              <p className="text-base font-black text-gray-900 uppercase tracking-wider">
                Histórico do Bem
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {getSourceLabel(sourceFilter)}
              </p>
            </div>

            {/* Period */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Período</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {formattedStart}
              </p>
              <p className="text-[9px] text-gray-500">a</p>
              <p className="text-sm font-bold text-gray-900">
                {formattedEnd}
              </p>
            </div>
          </div>

          {/* === IDENTIFICAÇÃO === */}
          <div className="mb-3">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Identificação do Equipamento</span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
              {asset.protheusCode && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Código</p>
                  <p className="font-medium font-mono">{asset.protheusCode}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-[9px] font-bold text-gray-500 uppercase">Nome</p>
                <p className="font-medium">{asset.name}</p>
              </div>
              {asset.tag && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">TAG</p>
                  <p className="font-medium font-mono">{asset.tag}</p>
                </div>
              )}
              {asset.assetCategoryType && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Categoria</p>
                  <p className="font-medium">{asset.assetCategoryType}</p>
                </div>
              )}
              {asset.assetPriority && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Prioridade</p>
                  <p className="font-medium">{asset.assetPriority}</p>
                </div>
              )}
              {asset.ownershipType && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Proprietário</p>
                  <p className="font-medium">{asset.ownershipType === 'PROPRIO' ? 'Próprio' : 'Terceiro'}</p>
                </div>
              )}
              {asset.maintenanceStatus && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Sit. Manutenção</p>
                  <p className="font-medium">{asset.maintenanceStatus === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}</p>
                </div>
              )}
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Status</p>
                <p className="font-medium">{asset.status === 'OPERATIONAL' ? 'Operacional' : asset.status === 'DOWN' ? 'Parado' : 'Em Manutenção'}</p>
              </div>
            </div>
          </div>

          {/* === LOCALIZAÇÃO E HIERARQUIA === */}
          <div className="mb-3">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Localização e Hierarquia</span>
            </div>
            <div className="px-1">
              {asset.location && (
                <div className="mb-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Localização Física</p>
                  <p className="font-medium">{asset.location.name}</p>
                </div>
              )}
              {asset.shiftCode && (
                <div className="mb-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Turno</p>
                  <p className="font-medium">{asset.shiftCode}</p>
                </div>
              )}
              {hierarchyChain.length > 1 && (
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Hierarquia de Ativos</p>
                  <div className="flex items-center gap-1 text-[10px]">
                    {hierarchyChain.map((item, idx) => {
                      const isCurrent = asset.parentAsset
                        ? idx === (asset.parentAsset.parentAsset ? 2 : 1)
                        : idx === 0
                      const isChild = idx > (asset.parentAsset ? (asset.parentAsset.parentAsset ? 2 : 1) : 0)
                      return (
                        <span key={idx} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-gray-400">→</span>}
                          <span className={`${isCurrent ? 'font-bold text-gray-900' : isChild ? 'text-gray-500 italic' : 'text-gray-600'}`}>
                            {item.code ? `${item.code} - ` : ''}{item.name}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* === DADOS TÉCNICOS === */}
          {(asset.manufacturer || asset.modelName || asset.serialNumber || asset.hasCounter) && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Dados Técnicos</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                {asset.manufacturer && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Fabricante</p>
                    <p className="font-medium">{asset.manufacturer}</p>
                  </div>
                )}
                {asset.modelName && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Modelo</p>
                    <p className="font-medium">{asset.modelName}</p>
                  </div>
                )}
                {asset.serialNumber && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">N. Série</p>
                    <p className="font-medium font-mono">{asset.serialNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Estrutura</p>
                  <p className="font-medium">{asset.hasStructure ? 'SIM' : 'NAO'}</p>
                </div>
                {asset.hasCounter && (
                  <>
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Contador</p>
                      <p className="font-medium">{asset.counterType || 'SIM'}</p>
                    </div>
                    {asset.counterPosition != null && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Posição Contador</p>
                        <p className="font-medium">{asset.counterPosition}</p>
                      </div>
                    )}
                  </>
                )}
                {asset.lifeValue != null && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Vida Útil</p>
                    <p className="font-medium">{asset.lifeValue} {asset.lifeUnit || ''}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === DADOS FINANCEIROS === */}
          {(asset.purchaseValue || asset.acquisitionCost || asset.hourlyCost || asset.purchaseDate) && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Dados Financeiros</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                {asset.purchaseValue != null && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Valor de Compra</p>
                    <p className="font-medium">{formatCurrency(asset.purchaseValue)}</p>
                  </div>
                )}
                {asset.acquisitionCost != null && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Custo Aquisição</p>
                    <p className="font-medium">{formatCurrency(asset.acquisitionCost)}</p>
                  </div>
                )}
                {asset.hourlyCost != null && asset.hourlyCost > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Custo/Hora</p>
                    <p className="font-medium">{formatCurrency(asset.hourlyCost)}</p>
                  </div>
                )}
                {asset.purchaseDate && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Data Compra</p>
                    <p className="font-medium">{formatDate(asset.purchaseDate)}</p>
                  </div>
                )}
                {asset.installationDate && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Data Instalação</p>
                    <p className="font-medium">{formatDate(asset.installationDate)}</p>
                  </div>
                )}
                {asset.supplierCode && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Fornecedor</p>
                    <p className="font-medium">{asset.supplierCode}{asset.supplierStore ? ` / ${asset.supplierStore}` : ''}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === GARANTIA === */}
          {(asset.warrantyPeriod || asset.warrantyDate) && (
            <div className="mb-3">
              <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
                <span className="font-bold text-[10px] uppercase tracking-wider">Garantia</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-1">
                {asset.warrantyPeriod != null && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Prazo</p>
                    <p className="font-medium">{asset.warrantyPeriod} {asset.warrantyUnit || ''}</p>
                  </div>
                )}
                {asset.warrantyDate && (
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Vencimento</p>
                    <p className="font-medium">{formatDate(asset.warrantyDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === HISTÓRICO === */}
          <div className="mb-3">
            <div className="bg-gray-100 border border-gray-300 px-2 py-1 mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Histórico ({events.length} evento{events.length !== 1 ? 's' : ''})
              </span>
            </div>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event) => {
                  const hasWorkOrder = !!(event.workOrderId && event.workOrder)
                  const hasRequest = !!(event.requestId && event.request)
                  const hasDetails = hasWorkOrder || hasRequest

                  return (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-[2px] p-2 print:break-inside-avoid"
                    >
                      {/* Cabeçalho do evento */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                            {format(new Date(event.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1 rounded">
                            {eventTypeLabels[event.eventType] || event.eventType}
                          </span>
                        </div>
                        {event.userName && (
                          <span className="text-[9px] text-gray-500 whitespace-nowrap">{event.userName}</span>
                        )}
                      </div>

                      {/* Título e descrição */}
                      <p className="mt-0.5 text-[10px] font-semibold text-gray-900">{event.title}</p>
                      {event.description && !hasDetails && (
                        <p className="mt-0.5 text-[9px] text-gray-600">{event.description}</p>
                      )}

                      {/* Detalhes de OS */}
                      {hasWorkOrder && (
                        <PrintableWorkOrderDetails wo={event.workOrder as WorkOrderFullDetail} />
                      )}

                      {/* Detalhes de SS */}
                      {hasRequest && (
                        <PrintableRequestDetails req={event.request as RequestFullDetail} />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">Nenhum evento encontrado no período selecionado.</p>
            )}
          </div>

          {/* === RODAPÉ === */}
          <div className="mt-6 pt-2 border-t border-gray-300 text-[8px] text-gray-400 flex justify-between">
            <span>Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span>{companyName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
