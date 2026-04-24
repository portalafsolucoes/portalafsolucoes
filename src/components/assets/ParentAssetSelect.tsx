'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import type { AssetOption } from '@/types/catalog'

interface ParentAssetSelectProps {
  assets: AssetOption[]
  value: string
  onChange: (id: string) => void
  excludeIds?: Set<string>
  disabled?: boolean
  placeholder?: string
  className?: string
}

interface FlatOption {
  id: string
  name: string
  protheusCode: string
  depth: number
  label: string
  searchText: string
  subtreeSearchText: string
}

const MAX_VISIBLE = 30

function normalize(value: unknown): string {
  if (value == null) return ''
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function flattenAssets(assets: AssetOption[], excludeIds: Set<string>): FlatOption[] {
  const childrenByParent = new Map<string, AssetOption[]>()
  const roots: AssetOption[] = []
  for (const a of assets) {
    if (a.parentAssetId) {
      const bucket = childrenByParent.get(a.parentAssetId) || []
      bucket.push(a)
      childrenByParent.set(a.parentAssetId, bucket)
    } else {
      roots.push(a)
    }
  }
  const sortByName = (arr: AssetOption[]) =>
    [...arr].sort((x, y) => x.name.localeCompare(y.name))

  const out: FlatOption[] = []
  const walk = (node: AssetOption, depth: number, ancestorText: string) => {
    if (excludeIds.has(node.id)) return
    const code = (node.protheusCode ?? '').trim()
    const prefix = depth === 0 ? '' : `${'\u00A0\u00A0'.repeat(depth)}\u21B3 `
    const codePart = code ? `${code} - ` : ''
    const label = `${prefix}${codePart}${node.name}`
    const selfSearch = `${normalize(node.name)} ${normalize(code)}`.trim()
    const subtreeSearchText = ancestorText ? `${ancestorText} ${selfSearch}` : selfSearch
    out.push({
      id: node.id,
      name: node.name,
      protheusCode: code,
      depth,
      label,
      searchText: selfSearch,
      subtreeSearchText,
    })
    const kids = sortByName(childrenByParent.get(node.id) || [])
    for (const k of kids) walk(k, depth + 1, subtreeSearchText)
  }
  for (const r of sortByName(roots)) walk(r, 0, '')
  return out
}

export function ParentAssetSelect({
  assets,
  value,
  onChange,
  excludeIds,
  disabled = false,
  placeholder = 'Nenhum (Ativo Raiz)',
  className = '',
}: ParentAssetSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const updateRect = () => {
      const btn = buttonRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const options = useMemo(
    () => flattenAssets(assets, excludeIds ?? new Set<string>()),
    [assets, excludeIds],
  )

  const { visible, totalMatches } = useMemo(() => {
    const q = normalize(search.trim())
    const filtered = q ? options.filter((o) => o.subtreeSearchText.includes(q)) : options
    return { visible: filtered.slice(0, MAX_VISIBLE), totalMatches: filtered.length }
  }, [options, search])

  const selectedLabel = useMemo(() => {
    if (!value) return ''
    const found = options.find((o) => o.id === value)
    if (found) {
      const code = found.protheusCode
      return code ? `${code} - ${found.name}` : found.name
    }
    const raw = assets.find((a) => a.id === value)
    if (!raw) return ''
    const code = (raw.protheusCode ?? '').trim()
    return code ? `${code} - ${raw.name}` : raw.name
  }, [value, options, assets])

  const inputClass =
    'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring bg-white'

  const hiddenCount = Math.max(0, totalMatches - MAX_VISIBLE)

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
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
      {mounted && open && !disabled && menuRect && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuRect.top,
            left: menuRect.left,
            width: menuRect.width,
          }}
          className="z-[10000] bg-white border border-gray-200 rounded-[4px] shadow-lg min-w-[280px]"
        >
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou código do bem..."
              className={inputClass}
            />
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
                setSearch('')
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                !value ? 'bg-gray-50 font-semibold' : ''
              }`}
            >
              Nenhum (Ativo Raiz)
            </button>
            {visible.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {options.length === 0
                  ? 'Nenhum ativo disponível'
                  : 'Nenhum resultado para a busca'}
              </div>
            )}
            {visible.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                  setSearch('')
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  value === opt.id ? 'bg-gray-50 font-semibold' : ''
                }`}
              >
                <span className="block truncate">{opt.label}</span>
              </button>
            ))}
          </div>
          {hiddenCount > 0 && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-gray-200 bg-gray-50">
              +{hiddenCount} resultado{hiddenCount > 1 ? 's' : ''} — refine a busca
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
