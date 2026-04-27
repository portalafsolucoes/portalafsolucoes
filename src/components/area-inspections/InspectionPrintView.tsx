'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { InspectionDetail } from './types'

interface Props {
  inspectionId?: string
  data?: InspectionDetail
  onClose?: () => void
  embedded?: boolean
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

const userName = (
  u: { firstName: string | null; lastName: string | null } | null | undefined
) => {
  if (!u) return '-'
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-'
}

export default function InspectionPrintView({ inspectionId, data, onClose, embedded = false }: Props) {
  const { user } = useAuth()
  const [inspection, setInspection] = useState<InspectionDetail | null>(data || null)
  const [loading, setLoading] = useState(!data && !!inspectionId)

  const companyName = user?.company?.name || 'Empresa'
  const unitLabel = user?.company?.name || ''

  useEffect(() => {
    if (data) {
      setInspection(data)
      setLoading(false)
      return
    }
    if (!inspectionId) return
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/inspections/${inspectionId}`)
        const json = await res.json()
        if (res.ok) setInspection(json.data as InspectionDetail)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [inspectionId, data])

  if (loading) {
    return (
      <div className={embedded ? '' : 'fixed inset-0 z-[9999] bg-white p-8 flex items-center justify-center'}>
        <p className="text-sm text-gray-700">Carregando...</p>
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className={embedded ? '' : 'fixed inset-0 z-[9999] bg-white p-8 flex items-center justify-center'}>
        <p className="text-sm text-gray-700">Inspeção não encontrada</p>
      </div>
    )
  }

  // Estimativa: ~12 etapas por bloco antes de quebrar; usado para paginação visual.
  // Cada bem se renderiza como tabela com break-inside-avoid quando possível.
  const totalAssets = inspection.assets.length
  const totalSteps = inspection.assets.reduce((acc, a) => acc + a.steps.length, 0)
  const pageEstimate = Math.max(1, Math.ceil(totalAssets / 3))

  const Header = (
    <div className="border-b-2 border-gray-900 pb-2 mb-3 print:mb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{companyName}</div>
          {unitLabel && <div className="text-[10px] text-gray-600">{unitLabel}</div>}
          <h1 className="text-base font-black text-gray-900 mt-1">
            FOLHA DE INSPECAO #{inspection.number}
          </h1>
        </div>
        <div className="text-right text-[10px] text-gray-700">
          <div>
            <span className="font-bold">Vencimento:</span> {fmtDate(inspection.dueDate)}
          </div>
          <div>
            <span className="font-bold">Manutentor:</span> {userName(inspection.assignedTo)}
          </div>
          <div>
            <span className="font-bold">Check List:</span> {inspection.checklistName}
          </div>
          <div className="page-counter mt-1 italic" />
        </div>
      </div>
      <div className="text-[11px] text-gray-700 mt-1">{inspection.description}</div>

      {/* Legenda compacta */}
      <div className="mt-2 flex items-center gap-4 text-[10px]">
        <span className="font-bold text-gray-900">LEGENDA:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 border-2 border-gray-900 bg-white" />
          <strong>OK</strong> — Conforme
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 border-2 border-gray-900 bg-gray-900" />
          <strong>NOK</strong> — Não conforme (gera SS)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 border-2 border-gray-500 bg-gray-300" />
          <strong>NA</strong> — Não se aplica
        </span>
      </div>
    </div>
  )

  return (
    <div className={embedded ? '' : 'fixed inset-0 z-[9999] bg-white overflow-auto'}>
      {!embedded && (
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2 print:hidden z-10">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-[4px] hover:bg-gray-800"
          >
            Imprimir
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-[4px] hover:bg-gray-100"
            >
              Fechar
            </button>
          )}
        </div>
      )}

      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm 10mm 14mm 10mm;
        }
        @media print {
          body { background: white !important; }
          .print-page-counter::after {
            content: "Pagina " counter(page) " de " counter(pages);
          }
          /* thead repetido por pagina */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .inspection-print-asset { break-inside: avoid; }
        }
        /* contador de paginas via CSS counters */
        .page-counter::after {
          content: "Pagina X/Y";
        }
        @media print {
          .page-counter::after {
            content: "Pagina " counter(page) "/" counter(pages);
          }
        }
      `}</style>

      <div className="mx-auto bg-white text-gray-900 print:m-0 print:p-0" style={{ width: '210mm', padding: '12mm 10mm' }}>
        {/* Header repetido via CSS @page approach: rendered uma vez no topo,
            depois cada bem usa thead inline para garantir cabeçalho de tabela em quebras */}
        {Header}

        <div className="space-y-3">
          {inspection.assets.map((asset, assetIdx) => (
            <div key={asset.id} className="inspection-print-asset border border-gray-300 rounded-[2px]">
              <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[11px] font-black uppercase text-gray-900">
                    {assetIdx + 1}. {asset.assetTag || asset.assetProtheusCode || '?'} — {asset.assetName}
                  </div>
                  <div className="text-[9px] text-gray-700">
                    {asset.familyName || '-'} / {asset.familyModelName || '-'}
                  </div>
                </div>
              </div>

              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300">
                    <th className="text-left px-2 py-1 font-bold uppercase tracking-wide w-[28px]">#</th>
                    <th className="text-left px-2 py-1 font-bold uppercase tracking-wide">Etapa</th>
                    <th className="text-center px-1 py-1 font-bold uppercase tracking-wide w-[36px]">OK</th>
                    <th className="text-center px-1 py-1 font-bold uppercase tracking-wide w-[36px]">NOK</th>
                    <th className="text-center px-1 py-1 font-bold uppercase tracking-wide w-[36px]">NA</th>
                    <th className="text-left px-2 py-1 font-bold uppercase tracking-wide">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.steps.map((step, idx) => (
                    <tr key={step.id} className="border-b border-gray-200 last:border-b-0">
                      <td className="px-2 py-1 align-top text-gray-700 font-mono">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {step.stepName}
                        {step.stepProtheusCode && (
                          <span className="ml-1 text-[8px] text-gray-500 font-mono">
                            ({step.stepProtheusCode})
                          </span>
                        )}
                      </td>
                      <td className="text-center px-1 py-1 align-top">
                        <span
                          className={`inline-block w-4 h-4 border-2 ${
                            step.answer === 'OK'
                              ? 'border-gray-900 bg-gray-900'
                              : 'border-gray-700 bg-white'
                          }`}
                          aria-label="OK"
                        />
                      </td>
                      <td className="text-center px-1 py-1 align-top">
                        <span
                          className={`inline-block w-4 h-4 border-2 ${
                            step.answer === 'NOK'
                              ? 'border-gray-900 bg-gray-900'
                              : 'border-gray-700 bg-white'
                          }`}
                          aria-label="NOK"
                        />
                      </td>
                      <td className="text-center px-1 py-1 align-top">
                        <span
                          className={`inline-block w-4 h-4 border-2 ${
                            step.answer === 'NA'
                              ? 'border-gray-700 bg-gray-300'
                              : 'border-gray-700 bg-white'
                          }`}
                          aria-label="NA"
                        />
                      </td>
                      <td className="px-2 py-1 align-top">
                        <div className="min-h-[14px] border-b border-dotted border-gray-400">
                          {step.notes || ''}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-300 text-[9px] text-gray-700 grid grid-cols-2 gap-4">
          <div>
            <div>
              <strong>Assinatura do manutentor:</strong>
            </div>
            <div className="mt-6 border-t border-gray-700 w-full" />
            <div className="mt-1 text-[9px]">{userName(inspection.assignedTo)}</div>
          </div>
          <div>
            <div>
              <strong>Assinatura do gestor:</strong>
            </div>
            <div className="mt-6 border-t border-gray-700 w-full" />
          </div>
        </div>

        <div className="mt-3 text-[9px] text-gray-500 flex items-center justify-between">
          <span>
            {totalAssets} bem(ns) · {totalSteps} etapa(s)
          </span>
          <span className="print-page-counter" />
          <span>Estimativa: {pageEstimate} pagina(s)</span>
        </div>
      </div>
    </div>
  )
}
