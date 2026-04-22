'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PORTAL_NAME } from '@/lib/branding'

export default function RegisterPendingPage() {
  const router = useRouter()

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
              <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="mark_email_read" className="text-4xl text-primary" />
              </div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface mb-3">
                Cadastro recebido!
              </h1>
              <p className="text-muted-foreground mb-6">
                Enviamos um e-mail de confirmação para o endereço informado. Verifique sua caixa de entrada
                (e a pasta de spam) e clique no link de confirmação.
              </p>

              <div className="rounded-[4px] border border-border bg-muted/40 p-4 text-left text-sm text-foreground/90 space-y-3">
                <div className="flex items-start gap-3">
                  <Icon name="looks_one" className="text-primary text-xl mt-0.5" />
                  <div>
                    <p className="font-semibold">Confirme seu e-mail</p>
                    <p className="text-muted-foreground text-xs">
                      O link expira em 24 horas. Essa etapa valida que o e-mail é seu.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="looks_two" className="text-primary text-xl mt-0.5" />
                  <div>
                    <p className="font-semibold">Aguarde aprovação do Portal</p>
                    <p className="text-muted-foreground text-xs">
                      Nosso time analisa seu cadastro (CNPJ, razão social e contato) em até 1 dia útil.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="looks_3" className="text-primary text-xl mt-0.5" />
                  <div>
                    <p className="font-semibold">Receba o aviso de liberação</p>
                    <p className="text-muted-foreground text-xs">
                      Assim que aprovado, você recebe um e-mail e já pode acessar o Portal normalmente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => router.push('/login')} className="w-full">
                  Ir para o login
                </Button>
                <Link href="/hub" className="text-sm text-primary hover:text-primary-hover">
                  Conhecer os produtos do Portal AF Soluções
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
