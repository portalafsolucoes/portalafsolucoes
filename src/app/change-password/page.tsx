'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'

export default function ChangePasswordPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const forced = Boolean(user?.mustChangePassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.')
      return
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || 'Não foi possível alterar a senha.')
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      router.replace(forced ? '/hub' : '/settings')
      router.refresh()
    } catch {
      setError('Erro ao conectar ao servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md w-full">
        <Card className="bg-card/95">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="lock_reset" className="text-4xl text-primary" />
              </div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface mb-2">
                {forced ? 'Defina uma nova senha' : 'Alterar senha'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {forced
                  ? 'Sua senha foi redefinida por um administrador. Crie uma nova senha para continuar.'
                  : 'Informe sua senha atual e escolha uma nova senha.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {forced ? 'Senha temporária' : 'Senha atual'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <div className="rounded-[4px] bg-danger-light border border-danger/20 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Salvando…' : 'Salvar nova senha'}
              </Button>

              {!forced && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
