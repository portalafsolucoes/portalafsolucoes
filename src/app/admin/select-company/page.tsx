'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface CompanyOption {
  id: string
  name: string
  email: string | null
  userCount: number
  moduleCount: number
}

export default function SelectCompanyPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadMeThenCompanies() {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
        if (meRes.status === 401) {
          router.replace('/login')
          return
        }
        const me = await meRes.json()
        const role = me?.user?.canonicalRole ?? me?.user?.role
        if (role !== 'SUPER_ADMIN') {
          router.replace('/dashboard')
          return
        }

        const res = await fetch('/api/admin/companies', { cache: 'no-store' })
        if (!res.ok) {
          setError('Falha ao carregar empresas')
          return
        }
        const data = await res.json()
        setCompanies(Array.isArray(data) ? data : (data.data ?? []))
      } catch {
        setError('Erro de rede ao carregar empresas')
      } finally {
        setLoading(false)
      }
    }
    loadMeThenCompanies()
  }, [router])

  async function handleSelect(companyId: string) {
    setSwitchingId(companyId)
    setError(null)
    try {
      const res = await fetch('/api/admin/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || 'Falha ao selecionar empresa')
        setSwitchingId(null)
        return
      }
      // Invalida caches dependentes de empresa antes de redirecionar.
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      queryClient.removeQueries({ queryKey: ['company-modules'] })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de rede ao selecionar empresa')
      setSwitchingId(null)
    }
  }

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon name="apartment" className="text-2xl text-accent-orange" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Selecione uma empresa</h1>
              <p className="text-xs text-muted-foreground">
                Staff Portal AF — escolha a empresa cliente para operar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/portal">
              <Button variant="outline">
                <Icon name="settings" className="text-base mr-2" />
                Painel do Portal
              </Button>
            </Link>
            <Link href="/api/auth/logout">
              <Button variant="outline">
                <Icon name="logout" className="text-base mr-2" />
                Sair
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4">
          <div className="relative w-full sm:w-96">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full rounded-[4px] border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-[4px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-on-surface-variant" />
              <p className="mt-2 text-sm text-muted-foreground">Carregando empresas...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-border bg-card px-6 py-12 text-center">
            <Icon name="business" className="mb-3 text-4xl text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {companies.length === 0
                ? 'Nenhuma empresa cadastrada no portal.'
                : 'Nenhuma empresa encontrada para esta busca.'}
            </p>
            {companies.length === 0 && (
              <Link href="/admin/portal" className="mt-4 inline-block">
                <Button>
                  <Icon name="add_business" className="text-base mr-2" />
                  Cadastrar primeira empresa
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((c) => {
              const switching = switchingId === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={switchingId !== null}
                    onClick={() => handleSelect(c.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-[4px] border border-border bg-card px-4 py-4 text-left shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-foreground">{c.name}</div>
                      {c.email && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.email}</div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Icon name="group" className="text-sm" />
                          {c.userCount} usuários
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="apps" className="text-sm" />
                          {c.moduleCount} módulos
                        </span>
                      </div>
                    </div>
                    <Icon
                      name={switching ? 'hourglass_top' : 'arrow_forward'}
                      className="text-xl text-muted-foreground group-hover:text-accent-orange"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
