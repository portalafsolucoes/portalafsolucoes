'use client'

import { useEffect, useState } from 'react'
import { RAFPrintView, type PrintRAF } from './RAFPrintView'
import { PrintPortal } from '@/components/print/PrintPortal'

interface Props {
  rafIds: string[]
  onClose: () => void
}

export function RAFsBatchPrintView({ rafIds, onClose }: Props) {
  const [rafs, setRafs] = useState<PrintRAF[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (rafIds.length === 0) {
          setRafs([])
          setLoading(false)
          return
        }
        const res = await fetch(`/api/rafs?ids=${rafIds.join(',')}`)
        if (res.ok) {
          const json = await res.json()
          setRafs((json.data || []) as PrintRAF[])
        }
      } catch {
        // silently fail
      }
      setLoading(false)
    }
    void load()
  }, [rafIds])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Carregando RAFs...</p>
          </div>
        </div>
      </PrintPortal>
    )
  }

  if (rafs.length === 0) {
    return (
      <PrintPortal>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-gray-600">Nenhuma RAF disponivel para impressao.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded">Fechar</button>
          </div>
        </div>
      </PrintPortal>
    )
  }

  return (
    <PrintPortal>
      <div className="print-portal-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">
          Impressao em Lote - {rafs.length} RAF{rafs.length > 1 ? 's' : ''}
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

      <div className="print-portal-pages flex flex-col items-center py-8 gap-8">
        {rafs.map((raf) => (
          <div key={raf.id} className="print-portal-page">
            <RAFPrintView data={raf} embedded />
          </div>
        ))}
      </div>
    </PrintPortal>
  )
}
