'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDate, formatCurrency } from '@/lib/utils'

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

interface HistoryEvent {
  id: string
  eventType: string
  title: string
  description: string | null
  createdAt: string
  userName: string | null
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

function getSourceLabel(source: 'all' | 'os' | 'ss'): string {
  switch (source) {
    case 'os': return 'Somente OSs'
    case 'ss': return 'Somente SSs'
    default: return 'Todos'
  }
}

export function AssetHistoryPrintView({ assetId, startDate, endDate, sourceFilter, onClose }: AssetHistoryPrintViewProps) {
  const { user } = useAuth()
  const [asset, setAsset] = useState<AssetData | null>(null)
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch asset + history in parallel
        const [assetRes, historyRes] = await Promise.all([
          fetch(`/api/assets/${assetId}`),
          fetch(`/api/assets/${assetId}/history?${new URLSearchParams({
            limit: '10000',
            offset: '0',
            startDate,
            endDate,
            ...(sourceFilter !== 'all' ? { source: sourceFilter } : {}),
          })}`)
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
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1 px-1 font-bold text-gray-500 uppercase text-[8px] w-[25mm]">Data/Hora</th>
                    <th className="text-left py-1 px-1 font-bold text-gray-500 uppercase text-[8px] w-[25mm]">Tipo</th>
                    <th className="text-left py-1 px-1 font-bold text-gray-500 uppercase text-[8px]">Título</th>
                    <th className="text-left py-1 px-1 font-bold text-gray-500 uppercase text-[8px]">Descrição</th>
                    <th className="text-left py-1 px-1 font-bold text-gray-500 uppercase text-[8px] w-[25mm]">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100">
                      <td className="py-1 px-1 whitespace-nowrap">
                        {format(new Date(event.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-1 px-1">
                        {eventTypeLabels[event.eventType] || event.eventType}
                      </td>
                      <td className="py-1 px-1">{event.title}</td>
                      <td className="py-1 px-1 text-gray-600">{event.description || '-'}</td>
                      <td className="py-1 px-1">{event.userName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
