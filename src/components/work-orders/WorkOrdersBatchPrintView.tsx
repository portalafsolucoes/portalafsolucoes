'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import { WorkOrderPrintSheet, type PrintWorkOrder } from './WorkOrderPrintView'
import { PrintPortal } from '@/components/print/PrintPortal'

interface Props {
  workOrderIds: string[]
  scheduledDate?: string | null
  onClose: () => void
}

// Impressao em lote: usa a mesma WorkOrderPrintSheet (folha A4 unica) por OS,
// separadas por `print-portal-page + print-portal-page { break-before: page }`.
// Cada OS pode ocupar 1 ou mais paginas A4 — a paginacao multi-pagina e
// ditada pela folha individual via @page.
export function WorkOrdersBatchPrintView({ workOrderIds, scheduledDate, onClose }: Props) {
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<PrintWorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const companyLogo = user?.company?.logo || null
  const companyName = user?.company?.name || 'Empresa'

  useEffect(() => {
    const load = async () => {
      try {
        const idsCsv = workOrderIds.join(',')
        const res = await fetch(`/api/work-orders?ids=${encodeURIComponent(idsCsv)}`)
        if (res.ok) {
          const { data } = await res.json()
          setWorkOrders((data || []) as PrintWorkOrder[])
        }
      } catch {
        // silent fail
      }
      setLoading(false)
    }
    void load()
  }, [workOrderIds])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Carregando OSs...</p>
          </div>
        </div>
      </PrintPortal>
    )
  }

  if (workOrders.length === 0) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-gray-600">Nenhuma OS disponivel para impressao.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
          </div>
        </div>
      </PrintPortal>
    )
  }

  return (
    <PrintPortal>
      {/* Toolbar (escondida na impressao) */}
      <div className="print-portal-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          Impressao em Lote - {workOrders.length} OS{workOrders.length > 1 ? 's' : ''}
          {scheduledDate && (
            <span className="ml-2 text-gray-500 font-normal">
              (Data programada: {formatDate(scheduledDate)})
            </span>
          )}
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

      {/* Folhas A4 — uma por OS */}
      <div className="print-portal-pages flex flex-col items-center py-6 gap-6">
        {workOrders.map((wo) => (
          <div key={wo.id} className="print-portal-page bg-white w-[210mm] shadow-lg p-[6mm]">
            <WorkOrderPrintSheet
              workOrder={wo}
              companyLogo={companyLogo}
              companyName={companyName}
            />
          </div>
        ))}
      </div>
    </PrintPortal>
  )
}
