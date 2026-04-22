'use client'

import { Icon } from './Icon'
import { exportToExcel, EXPORT_CONFIGS } from '@/lib/exportExcel'

interface ExportButtonProps {
  data: readonly object[]
  entity: keyof typeof EXPORT_CONFIGS
  className?: string
}

export function ExportButton({ data, entity, className }: ExportButtonProps) {
  const config = EXPORT_CONFIGS[entity]
  if (!config) return null

  const handleExport = () => {
    if (data.length === 0) {
      alert('Nenhum dado para exportar')
      return
    }
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    exportToExcel(data as Record<string, unknown>[], config.columns, `${config.filename}_${date}`)
  }

  return (
    <button
      onClick={handleExport}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-[4px] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors ${className || ''}`}
      title="Exportar para Excel"
    >
      <Icon name="download" className="text-lg" />
      <span className="hidden sm:inline">Excel</span>
    </button>
  )
}
