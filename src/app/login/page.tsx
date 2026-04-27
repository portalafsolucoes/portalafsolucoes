'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { APP_DESCRIPTION, PORTAL_NAME } from '@/lib/branding'
import { Icon } from '@/components/ui/Icon'

// TODO SEGURANCA (V11): Remover este bloco antes do deploy final para o cliente.
// O array DEV_QUICK_ACCESS e incluido no bundle JS mesmo em producao.
// A UI so renderiza em isDevelopment, mas os dados ficam no bundle compilado.
// Ver docs/SEGURANCA.md item V11.
const DEV_QUICK_ACCESS = [
  {
    company: 'Portal AF Solucoes (Staff)',
    users: [
      { label: 'SUPER_ADMIN', email: 'platform@portalafsolucoes.com', password: 'Teste@123', name: 'Equipe Portal AF' }
    ]
  },
  {
    company: 'Cimento Vale do Norte SA',
    users: [
      { label: 'ADMIN', email: 'admin@valenorte.local', password: 'Teste@123', name: 'Marcos Lima' },
      { label: 'MANUTENTOR', email: 'tecnico@valenorte.local', password: 'Teste@123', name: 'Joao Ferreira' },
      { label: 'MANUTENTOR', email: 'tecnico.limitado@valenorte.local', password: 'Teste@123', name: 'Paula Santos' },
      { label: 'MANUTENTOR', email: 'solicitante@valenorte.local', password: 'Teste@123', name: 'Ana Souza' },
      { label: 'MANUTENTOR', email: 'consulta@valenorte.local', password: 'Teste@123', name: 'Bruno Almeida' }
    ]
  },
  {
    company: 'Polimix Concreto Ltda',
    users: [
      { label: 'ADMIN', email: 'admin@polimix.local', password: 'Teste@123', name: 'Marcos Lima' },
      { label: 'MANUTENTOR', email: 'tecnico@polimix.local', password: 'Teste@123', name: 'Joao Ferreira' },
      { label: 'MANUTENTOR', email: 'tecnico.limitado@polimix.local', password: 'Teste@123', name: 'Paula Santos' },
      { label: 'MANUTENTOR', email: 'solicitante@polimix.local', password: 'Teste@123', name: 'Ana Souza' },
      { label: 'MANUTENTOR', email: 'consulta@polimix.local', password: 'Teste@123', name: 'Bruno Almeida' }
    ]
  }
] as const

const isDevelopment = process.env.NODE_ENV === 'development'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loginWithCredentials = async (loginEmail: string, loginPassword: string) => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login')
        setLoading(false)
        return
      }

      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      queryClient.removeQueries({ queryKey: ['company-modules'] })

      // Redirecionar: returnUrl (módulo clicado) ou entrada padrão do CMMS
      const safeUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.includes('://') ? returnUrl : null
      router.replace(safeUrl || '/cmms')
      router.refresh()
    } catch {
      setError('Erro ao conectar ao servidor')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithCredentials(email, password)
  }

  const handleQuickLogin = async (loginEmail: string, loginPassword: string) => {
    setEmail(loginEmail)
    setPassword(loginPassword)
    await loginWithCredentials(loginEmail, loginPassword)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl w-full">
        {/* Voltar ao Portal */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/hub')}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="arrow_back" className="text-base" />
            Voltar ao {PORTAL_NAME}
          </button>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-[4px] bg-primary-graphite flex items-center justify-center">
            <Icon name="hub" className="text-3xl text-white" />
          </div>
          <p className="label-uppercase mb-2">Acesso ao Sistema</p>
          <p className="text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>

        <div className={`grid gap-6 ${isDevelopment ? 'lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]' : ''}`}>
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-[4px] bg-danger-light px-4 py-3 text-danger-light-foreground text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="border border-gray-300 shadow-sm focus:ring-gray-900 bg-white"
                />

                <Input
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border border-gray-300 shadow-sm focus:ring-gray-900 bg-white"
                />

                <Button
                  type="submit"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Sua empresa ainda não faz parte do Portal?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/register')}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    Cadastre-se
                  </button>
                </div>
                <div className="text-center text-xs text-muted-foreground/60">
                  Acesso restrito. Contate o administrador da sua empresa.
                </div>
              </form>
            </CardContent>
          </Card>

          {isDevelopment && (
            <Card className="bg-card/95">
              <CardHeader>
                <CardTitle>Acesso Rápido de Desenvolvimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[4px] bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
                  Esses atalhos aparecem apenas em ambiente de desenvolvimento.
                </div>

                {DEV_QUICK_ACCESS.map((company) => (
                  <div key={company.company} className="space-y-3 rounded-[4px] border border-border bg-surface-low/40 p-4">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{company.company}</h2>
                      <p className="text-xs text-muted-foreground">Login direto com os usuários de teste desta empresa.</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {company.users.map((user) => (
                        <Button
                          key={user.email}
                          type="button"
                          variant="outline"
                          className="h-auto items-start justify-start px-3 py-3 text-left"
                          disabled={loading}
                          onClick={() => handleQuickLogin(user.email, user.password)}
                        >
                          <div>
                            <div className="text-xs font-semibold text-primary">{user.label}</div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
