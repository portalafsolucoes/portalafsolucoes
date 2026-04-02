'use client'

import { Download } from 'lucide-react'
import { exportToExcel, EXPORT_CONFIGS } from '@/lib/exportExcel'

interface ExportButtonProps {
  data: any[]
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
    exportToExcel(data, config.columns, `${config.filename}_${date}`)
  }

  return (
    <button
      onClick={handleExport}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-card hover:bg-muted transition-colors ${className || ''}`}
      title="Exportar para Excel"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Excel</span>
    </button>
  )
}
