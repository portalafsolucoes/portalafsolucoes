'use client'

import React from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'combobox'
  required?: boolean
  options?: { value: string; label: string }[]
  visibleWhen?: { field: string; value: string | string[] }
}

interface ColumnConfig {
  key: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode
}

interface GenericDetailPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any
  entity: string
  title: string
  columns: ColumnConfig[]
  fields: FieldConfig[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemTitle(item: any, columns: ColumnConfig[]): string {
  if (item.name) return item.name
  if (item.code) return item.code
  if (columns.length > 0) {
    const firstKey = columns[0].key
    const val = item[firstKey]
    if (val !== undefined && val !== null) return String(val)
  }
  return '—'
}

function resolveValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  key: string,
  field?: FieldConfig,
  column?: ColumnConfig
): React.ReactNode {
  const raw = item[key]

  if (column?.render) {
    return column.render(raw, item)
  }

  if (field?.type === 'checkbox') {
    return raw ? 'Sim' : 'Nao'
  }

  if (field?.type === 'select' || field?.type === 'combobox') {
    if (field.options && raw !== undefined && raw !== null) {
      const match = field.options.find((o) => o.value === String(raw))
      if (match) return match.label
    }
  }

  if (raw === undefined || raw === null || raw === '') {
    return '—'
  }

  return String(raw)
}

function mergeKeys(columns: ColumnConfig[], fields: FieldConfig[]) {
  const seen = new Set<string>()
  const entries: { key: string; label: string; field?: FieldConfig; column?: ColumnConfig }[] = []

  for (const col of columns) {
    seen.add(col.key)
    const matchingField = fields.find((f) => f.key === col.key)
    entries.push({ key: col.key, label: col.label, column: col, field: matchingField })
  }

  for (const field of fields) {
    if (!seen.has(field.key)) {
      seen.add(field.key)
      entries.push({ key: field.key, label: field.label, field })
    }
  }

  return entries
}

export function GenericDetailPanel({
  item,
  entity: _entity,
  title,
  columns,
  fields,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: GenericDetailPanelProps) {
  const entries = mergeKeys(columns, fields)
  const displayTitle = getItemTitle(item, columns) || title

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900">
          {displayTitle}
        </h2>
        <PanelCloseButton onClick={onClose} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {(canEdit || canDelete) && (
          <div className="p-4 border-b border-gray-200 space-y-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </button>
            )}
          </div>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {entries.map((entry) => (
              <div key={entry.key}>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{entry.label}</p>
                <p className="text-sm text-foreground">
                  {resolveValue(item, entry.key, entry.field, entry.column)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
