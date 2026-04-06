'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Wrench, BarChart3, Camera, LogOut, LogIn, ChevronRight, Shield } from 'lucide-react'
import { PORTAL_NAME, PORTAL_DESCRIPTION } from '@/lib/branding'

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
    icon: <Wrench className="w-10 h-10" />,
    href: '/dashboard',
    enabled: true,
    color: 'from-zinc-800 to-zinc-900',
    features: ['Ordens de Serviço', 'Planos Preventivos', 'Gestão de Ativos', 'KPIs'],
  },
  {
    id: 'gvp',
    name: 'Gestão de Variáveis de Processo',
    shortName: 'GVP',
    description: 'Monitoramento e análise de variáveis operacionais em tempo real para controle de qualidade.',
    icon: <BarChart3 className="w-10 h-10" />,
    href: '/gvp',
    enabled: false,
    color: 'from-slate-700 to-slate-800',
    features: ['Leituras em Tempo Real', 'Alertas Automáticos', 'Relatórios', 'Dashboards'],
  },
  {
    id: 'gpa',
    name: 'Gestão de Portaria e Acesso',
    shortName: 'GPA',
    description: 'Controle inteligente de acesso veicular com leitura automática de placas e gestão de notas fiscais.',
    icon: <Camera className="w-10 h-10" />,
    href: '/portaria',
    enabled: false,
    color: 'from-gray-700 to-gray-800',
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
              <Shield className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                {PORTAL_NAME}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight hidden sm:block">
                {PORTAL_DESCRIPTION}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-16 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ) : isAuthenticated ? (
              <>
                {userName && (
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:block">
                    {userName}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <LogIn className="w-4 h-4" />
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
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              Selecione um Módulo
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
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
                  relative group rounded-2xl border overflow-hidden transition-all duration-300
                  ${module.enabled
                    ? 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                    : 'border-zinc-200/60 dark:border-zinc-800 opacity-55 cursor-not-allowed'
                  }
                  bg-white dark:bg-zinc-900
                `}
              >
                {/* Card Top - Colored Band */}
                <div className={`bg-gradient-to-r ${module.color} px-6 py-8 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                      {module.icon}
                    </div>
                    {!module.enabled && (
                      <span className="text-xs font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        Em breve
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-medium tracking-wider uppercase opacity-70">
                      {module.shortName}
                    </span>
                    <h3 className="text-xl font-bold mt-1 leading-tight">
                      {module.name}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {module.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {module.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Action */}
                  {module.enabled ? (
                    <div className="flex items-center text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                      {isAuthenticated ? 'Acessar módulo' : 'Entrar no módulo'}
                      <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400 dark:text-zinc-600">
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
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            &copy; {new Date().getFullYear()} AF Soluções. Todos os direitos reservados.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            v1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
}
