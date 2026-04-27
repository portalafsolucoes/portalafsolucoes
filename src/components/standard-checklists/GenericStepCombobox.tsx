'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

export type GenericStepOption = {
  id: string
  name: string
  protheusCode?: string | null
}

interface GenericStepComboboxProps {
  value?: string
  options: GenericStepOption[]
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const MAX_VISIBLE = 10

export function GenericStepCombobox({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Selecione uma etapa...',
  className = '',
}: GenericStepComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const { visible, totalMatches } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = options.filter((o) => {
      if (!q) return true
      const name = (o.name ?? '').toLowerCase()
      const code = (o.protheusCode ?? '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
    const sorted = [...filtered].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'),
    )
    return { visible: sorted.slice(0, MAX_VISIBLE), totalMatches: sorted.length }
  }, [options, search])

  const selected = value ? options.find((o) => o.id === value) : undefined
  const selectedLabel = selected
    ? selected.protheusCode
      ? `${selected.protheusCode} - ${selected.name}`
      : selected.name
    : ''

  const inputClass =
    'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring bg-white'

  const hiddenCount = Math.max(0, totalMatches - MAX_VISIBLE)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between text-left ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      >
        <span className={`truncate ${selectedLabel ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedLabel || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearch('')
              }}
              className="p-0.5 rounded hover:bg-gray-100"
            >
              <Icon name="close" className="text-sm text-muted-foreground" />
            </span>
          )}
          <Icon name="expand_more" className="text-base text-muted-foreground" />
        </div>
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full min-w-[18rem] max-w-[calc(100vw-32px)] bg-white border border-gray-200 rounded-[4px] shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etapa por nome ou codigo..."
              className={inputClass}
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {visible.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {options.length === 0
                  ? 'Nenhuma etapa generica cadastrada'
                  : 'Nenhum resultado para a busca'}
              </div>
            )}
            {visible.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                  setSearch('')
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex flex-col gap-0.5 ${
                  value === o.id ? 'bg-gray-50 font-semibold' : ''
                }`}
              >
                <span className="truncate">{o.name}</span>
                {o.protheusCode && (
                  <span className="text-[11px] text-muted-foreground truncate">{o.protheusCode}</span>
                )}
              </button>
            ))}
          </div>
          {hiddenCount > 0 && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-gray-200 bg-gray-50">
              +{hiddenCount} resultado{hiddenCount > 1 ? 's' : ''} — refine a busca
            </div>
          )}
        </div>
      )}
    </div>
  )
}
