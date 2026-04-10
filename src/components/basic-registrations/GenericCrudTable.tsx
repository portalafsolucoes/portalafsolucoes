'use client'

import { useState, useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'

export interface ColumnConfig {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface GenericCrudTableProps {
  items: any[]
  columns: ColumnConfig[]
  loading: boolean
  selectedItemId?: string | null
  onSelectItem: (item: any) => void
  emptyMessage?: string
}

type SortDirection = 'asc' | 'desc'

export function GenericCrudTable({
  items,
  columns,
  loading,
  selectedItemId,
  onSelectItem,
  emptyMessage = 'Nenhum registro encontrado',
}: GenericCrudTableProps) {
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        // desc -> none (clear sort)
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedItems = useMemo(() => {
    if (!sortField) return items

    return [...items].sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]

      // Handle nullish values
      if (valA == null && valB == null) return 0
      if (valA == null) return 1
      if (valB == null) return -1

      let comparison = 0

      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB
      } else {
        comparison = String(valA).localeCompare(String(valB))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [items, sortField, sortDirection])

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    }

    return (
      <Icon
        name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        className="text-sm text-foreground"
      />
    )
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-card overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort(col.key)}
                >
                  <button type="button" className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-gray-200">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Icon name="inventory_2" className="text-5xl opacity-20" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const isActive = selectedItemId === item.id

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-secondary cursor-pointer transition-colors ${isActive ? 'bg-primary/5' : ''}`}
                    onClick={() => onSelectItem(item)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {col.render ? col.render(item[col.key], item) : (item[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
