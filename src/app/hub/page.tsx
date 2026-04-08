'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

import { APP_LOGO_PATH, PORTAL_NAME, PORTAL_DESCRIPTION } from '@/lib/branding'

interface ModuleCard {
  id: string
  name: string
  shortName: string
  description: string
  icon: React.ReactNode
  href: string
  enabled: boolean
  color: string
  features: string[]
}

const modules: ModuleCard[] = [
  {
    id: 'cmms',
    name: 'Gestão de Manutenção',
    shortName: 'CMMS',
    description: 'Planejamento, execução e controle de manutenção preventiva e corretiva de ativos industriais.',
    icon: <Icon name="construction" className="text-4xl" />,
    href: '/dashboard',
    enabled: true,
    color: 'from-primary-graphite to-on-surface',
    features: ['Ordens de Serviço', 'Planos Preventivos', 'Gestão de Ativos', 'KPIs'],
  },
  {
    id: 'gvp',
    name: 'Gestão de Variáveis de Processo',
    shortName: 'GVP',
    description: 'Monitoramento e análise de variáveis operacionais em tempo real para controle de qualidade.',
    icon: <Icon name="bar_chart" className="text-4xl" />,
    href: '/gvp',
    enabled: false,
    color: 'from-[#7b8283] to-[#5a6061]',
    features: ['Leituras em Tempo Real', 'Alertas Automáticos', 'Relatórios', 'Dashboards'],
  },
  {
    id: 'gpa',
    name: 'Gestão de Portaria e Acesso',
    shortName: 'GPA',
    description: 'Controle inteligente de acesso veicular com leitura automática de placas e gestão de notas fiscais.',
    icon: <Icon name="photo_camera" className="text-4xl" />,
    href: '/portaria',
    enabled: false,
    color: 'from-[#7b8283] to-[#5a6061]',
    features: ['Leitura de Placas (LPR)', 'Controle de Cancelas', 'Notas Fiscais', 'Histórico'],
  },
]

export default function HubPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        if (data.data?.name || data.user?.firstName) {
          setUserName(data.data?.name || `${data.user?.firstName} ${data.user?.lastName}`)
          setIsAuthenticated(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setIsAuthenticated(false)
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setUserName('')
  }

  const handleModuleClick = (module: ModuleCard) => {
    if (!module.enabled) return

    if (isAuthenticated) {
      // Já logado, vai direto pro módulo
      router.push(module.href)
    } else {
      // Não logado, manda pro login com returnUrl
      router.push(`/login?returnUrl=${encodeURIComponent(module.href)}`)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.35),_transparent_35%),linear-gradient(180deg,#fbfbfb_0%,#f3f5f5_100%)] flex flex-col">
      {/* Header */}
      <header className="glass border-b border-on-surface-variant/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-[164px]">
              <Image
                src={APP_LOGO_PATH}
                alt={PORTAL_NAME}
                fill
                priority
                className="object-contain object-left"
              />
            </div>
            <div>
              <h1 className="font-headline text-lg font-bold leading-tight text-on-surface">
                {PORTAL_NAME}
              </h1>
              <p className="label-uppercase hidden leading-tight sm:block">
                {PORTAL_DESCRIPTION}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded-[4px] bg-surface-container" />
            ) : isAuthenticated ? (
              <>
                {userName && (
                  <span className="hidden text-sm text-on-surface-variant sm:block">
                    {userName}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
                >
                  <Icon name="logout" className="text-base" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="ghost-border flex items-center gap-2 rounded-[4px] px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-low"
              >
                <Icon name="login" className="text-base" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl w-full">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl mb-3">
              Selecione um Módulo
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              Escolha o ambiente que deseja acessar. Novos módulos serão disponibilizados em breve.
            </p>
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module)}
                className={`
                  ambient-shadow relative group overflow-hidden rounded-[4px] transition-all duration-300
                  ${module.enabled
                    ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(45,52,53,0.12)]'
                    : 'cursor-not-allowed opacity-55'
                  }
                  bg-card
                `}
              >
                {/* Card Top - Colored Band */}
                <div className={`bg-gradient-to-r ${module.color} px-6 py-8 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/15 rounded-[4px] backdrop-blur-sm">
                      {module.icon}
                    </div>
                    {!module.enabled && (
                      <span className="rounded-[2px] bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] backdrop-blur-sm">
                        Em breve
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-medium tracking-[0.2em] uppercase opacity-70">
                      {module.shortName}
                    </span>
                    <h3 className="mt-1 font-headline text-xl font-bold leading-tight">
                      {module.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <p className="mb-4 text-sm leading-relaxed text-on-surface-variant">
                    {module.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {module.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-[4px] bg-surface-low px-2.5 py-1 text-xs text-on-surface-variant"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Action */}
                  {module.enabled ? (
                    <div className="flex items-center text-sm font-medium text-on-surface transition-colors group-hover:text-primary-graphite">
                      {isAuthenticated ? 'Acessar módulo' : 'Entrar no módulo'}
                      <Icon name="chevron_right" className="text-base ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  ) : (
                    <div className="text-sm text-on-surface-variant/70">
                      Módulo em desenvolvimento
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-on-surface-variant/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-on-surface-variant/70">
            &copy; {new Date().getFullYear()} AF Soluções. Todos os direitos reservados.
          </p>
          <p className="text-xs text-on-surface-variant/70">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}
