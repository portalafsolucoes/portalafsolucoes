'use client'

import Image from 'next/image'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { APP_DESCRIPTION, APP_LOGO_PATH, APP_NAME, PORTAL_NAME } from '@/lib/branding'
import { Icon } from '@/components/ui/Icon'


export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login')
        setLoading(false)
        return
      }

      // Redirecionar: returnUrl (módulo clicado) ou hub
      router.push(returnUrl || '/hub')
    } catch {
      setError('Erro ao conectar ao servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md w-full">
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
          <div className="relative mx-auto mb-4 h-14 w-[240px]">
            <Image
              src={APP_LOGO_PATH}
              alt={APP_NAME}
              fill
              priority
              className="object-contain"
            />
          </div>
          <p className="label-uppercase mb-2">Acesso ao Sistema</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">{APP_NAME}</h1>
          <p className="text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>

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
              />

              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
                  Registre-se
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
