'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

type ResponsibleUser = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  jobTitle?: string | null
  enabled?: boolean | null
  status?: string | null
  role?: string | null
}

interface ResponsibleSelectProps {
  value?: string
  valueName?: string
  onChange: (userId: string | undefined, userName: string | undefined) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const MAX_VISIBLE = 30

// Dropdown com busca para selecionar um User como responsavel por acao da RAF.
// Consome /api/users (mesma fonte de /people-teams) sem filtrar por role:
// qualquer pessoa cadastrada na empresa pode ser atribuida como responsavel
// por uma acao do plano. Mostra cargo como complemento e marca "(inativo)"
// para usuarios desabilitados.
export function ResponsibleSelect({
  value,
  valueName,
  onChange,
  disabled = false,
  placeholder = 'Selecionar responsavel',
  className = '',
}: ResponsibleSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<ResponsibleUser[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/users')
        const data = await res.json()
        if (!cancelled) {
          const list: ResponsibleUser[] = Array.isArray(data.data) ? data.data : []
          setUsers(list)
        }
      } catch (e) {
        console.error('ResponsibleSelect load:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const isInactive = (u: ResponsibleUser) => {
    if (u.enabled === false) return true
    if (u.status && u.status !== 'ACTIVE') return true
    return false
  }

  const { visible, totalMatches } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = users.filter((u) => {
      if (!q) return true
      const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase()
      const email = (u.email ?? '').toLowerCase()
      const job = (u.jobTitle ?? '').toLowerCase()
      return full.includes(q) || email.includes(q) || job.includes(q)
    })
    // Ativos primeiro, depois inativos (ambos ordenados por nome)
    const sorted = [...all].sort((a, b) => {
      const ai = isInactive(a) ? 1 : 0
      const bi = isInactive(b) ? 1 : 0
      if (ai !== bi) return ai - bi
      const an = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase()
      const bn = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase()
      return an.localeCompare(bn)
    })
    return { visible: sorted.slice(0, MAX_VISIBLE), totalMatches: sorted.length }
  }, [users, search])

  const selectedLabel = (() => {
    if (value) {
      const found = users.find((u) => u.id === value)
      if (found) {
        const base = `${found.firstName ?? ''} ${found.lastName ?? ''}`.trim()
        const suffix = isInactive(found) ? ' (inativo)' : ''
        return base ? base + suffix : valueName || ''
      }
      return valueName || ''
    }
    return ''
  })()

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
                onChange(undefined, undefined)
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
        <div className="absolute z-30 mt-1 w-72 max-w-[calc(100vw-32px)] bg-white border border-gray-200 rounded-[4px] shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou cargo..."
              className={inputClass}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Carregando pessoas...</div>
            )}
            {!loading && visible.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {users.length === 0
                  ? 'Nenhuma pessoa cadastrada nesta empresa'
                  : 'Nenhum resultado para a busca'}
              </div>
            )}
            {!loading &&
              visible.map((u) => {
                const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                const inactive = isInactive(u)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id, fullName)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex flex-col gap-0.5 ${
                      value === u.id ? 'bg-gray-50 font-semibold' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="truncate">{fullName || u.email || u.id}</span>
                      {inactive && (
                        <span className="text-[11px] text-muted-foreground shrink-0">(inativo)</span>
                      )}
                    </span>
                    {u.jobTitle && (
                      <span className="text-[11px] text-muted-foreground truncate">{u.jobTitle}</span>
                    )}
                  </button>
                )
              })}
          </div>
          {hiddenCount > 0 && !loading && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-gray-200 bg-gray-50">
              +{hiddenCount} resultado{hiddenCount > 1 ? 's' : ''} — refine a busca
            </div>
          )}
        </div>
      )}
    </div>
  )
}
