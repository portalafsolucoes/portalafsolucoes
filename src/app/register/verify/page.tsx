'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PORTAL_NAME } from '@/lib/branding'

type Status = 'loading' | 'verified' | 'already' | 'expired' | 'invalid' | 'missing' | 'error'

export default function RegisterVerifyPage() {
  return (
    <Suspense fallback={<RegisterVerifyShell status="loading" message="" />}>
      <RegisterVerifyContent />
    </Suspense>
  )
}

function RegisterVerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('missing')
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.ok) {
          if (data?.data?.alreadyVerified) {
            setStatus('already')
          } else {
            setStatus('verified')
          }
          return
        }

        if (res.status === 404) {
          setStatus('invalid')
          setMessage(data?.error || 'Token inválido')
          return
        }

        if (res.status === 410) {
          setStatus('expired')
          setMessage(data?.error || 'Token expirado')
          return
        }

        setStatus('error')
        setMessage(data?.error || 'Não foi possível confirmar o e-mail.')
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Erro ao conectar ao servidor.')
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [token])

  return <RegisterVerifyShell status={status} message={message} />
}

function RegisterVerifyShell({ status, message }: { status: Status; message: string }) {
  const router = useRouter()
  const view = renderView(status, message)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="arrow_back" className="text-base" />
            Voltar ao {PORTAL_NAME}
          </button>
        </div>

        <Card className="bg-card/95">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className={`mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center ${view.iconBg}`}>
                <Icon name={view.icon} className={`text-4xl ${view.iconColor}`} />
              </div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface mb-3">
                {view.title}
              </h1>
              <p className="text-muted-foreground mb-6">{view.description}</p>

              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/login')} className="w-full">
                  Ir para o login
                </Button>
                {(status === 'expired' || status === 'invalid') && (
                  <Button variant="outline" onClick={() => router.push('/register')} className="w-full">
                    Fazer novo cadastro
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function renderView(status: Status, message: string) {
  switch (status) {
    case 'loading':
      return {
        icon: 'hourglass_empty',
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground animate-spin',
        title: 'Confirmando seu e-mail…',
        description: 'Aguarde um instante enquanto validamos o link.',
      }
    case 'verified':
      return {
        icon: 'mark_email_read',
        iconBg: 'bg-success-light',
        iconColor: 'text-success',
        title: 'E-mail confirmado!',
        description:
          'Obrigado por confirmar. Agora basta aguardar a aprovação do Portal — você receberá um aviso assim que seu cadastro for liberado.',
      }
    case 'already':
      return {
        icon: 'verified',
        iconBg: 'bg-success-light',
        iconColor: 'text-success',
        title: 'E-mail já confirmado',
        description: 'Esse e-mail já foi confirmado anteriormente. Aguarde a aprovação do Portal para liberar o acesso.',
      }
    case 'expired':
      return {
        icon: 'schedule',
        iconBg: 'bg-danger-light',
        iconColor: 'text-danger',
        title: 'Link expirado',
        description: message || 'Seu link de confirmação expirou. Faça um novo cadastro para receber um link válido.',
      }
    case 'invalid':
      return {
        icon: 'error_outline',
        iconBg: 'bg-danger-light',
        iconColor: 'text-danger',
        title: 'Link inválido',
        description: message || 'Não conseguimos validar esse link. Verifique se você abriu o link mais recente do e-mail.',
      }
    case 'missing':
      return {
        icon: 'link_off',
        iconBg: 'bg-danger-light',
        iconColor: 'text-danger',
        title: 'Token ausente',
        description: 'O link de confirmação está incompleto. Abra o link diretamente do e-mail recebido.',
      }
    case 'error':
    default:
      return {
        icon: 'error',
        iconBg: 'bg-danger-light',
        iconColor: 'text-danger',
        title: 'Erro ao confirmar e-mail',
        description: message || 'Ocorreu um erro inesperado. Tente novamente em instantes.',
      }
  }
}
