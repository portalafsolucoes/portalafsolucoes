'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { getDefaultCmmsPath } from '@/lib/user-roles'
import { useAuth } from '@/hooks/useAuth'

import { PORTAL_NAME } from '@/lib/branding'

interface ModuleCard {
  id: string
  name: string
  shortName: string
  description: string
  icon: React.ReactNode
  href: string
  enabled: boolean
  features: string[]
  isPrimary?: boolean
}

const modules: ModuleCard[] = [
  {
    id: 'cmms',
    name: 'Gestão de Manutenção',
    shortName: 'CMMS',
    description: 'Planejamento, execução e controle de manutenção preventiva e corretiva de ativos industriais. Maximize a disponibilidade e confiabilidade da sua planta de forma inteligente.',
    icon: <Icon name="construction" className="text-5xl" />,
    href: '/dashboard',
    enabled: true,
    isPrimary: true,
    features: ['Ordens de Serviço', 'Planos Preventivos', 'Gestão de Ativos', 'KPIs & Dashboards', 'Mobilidade'],
  },
  {
    id: 'gvp',
    name: 'Gestão de Variáveis de Processo',
    shortName: 'GVP',
    description: 'Monitoramento e análise de variáveis operacionais em tempo real para um controle de qualidade e eficiência absolutos.',
    icon: <Icon name="bar_chart" className="text-3xl" />,
    href: '/gvp',
    enabled: false,
    features: ['Leituras em Tempo Real', 'Alertas Automáticos', 'Dashboards Analíticos'],
  },
  {
    id: 'gpa',
    name: 'Gestão de Portaria e Acesso',
    shortName: 'GPA',
    description: 'Controle inteligente e automatizado de acesso com leitura de placas e gestão integrada de notas fiscais.',
    icon: <Icon name="photo_camera" className="text-3xl" />,
    href: '/portaria',
    enabled: false,
    features: ['Leitura de Placas (LPR)', 'Controle de Cancelas', 'Histórico e Auditoria'],
  },
]

export default function HubPage() {
  const router = useRouter()
  const { user, isLoading: loading, isAuthenticated, role } = useAuth()
  const userName = user ? `${user.firstName} ${user.lastName}` : ''
  const userInitials = user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'U'
  const userRole = role

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/hub'
  }

  const handleModuleClick = (module: ModuleCard) => {
    if (!module.enabled) return

    if (isAuthenticated) {
      router.push(module.id === 'cmms' ? getDefaultCmmsPath(userRole) : module.href)
    } else {
      const target = module.id === 'cmms' ? '/cmms' : module.href
      router.push(`/login?returnUrl=${encodeURIComponent(target)}`)
    }
  }

  const handleLoginClick = () => {
    // Apenas vai para a tela de login; o retorno padrão já é tratado pelo app
    // Mas para garantir que o usuário veja o Hub novamente caso não haja destino:
    router.push('/login?returnUrl=/hub')
  }

  const cmmsModule = modules.find(m => m.id === 'cmms')!
  const otherModules = modules.filter(m => m.id !== 'cmms')

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,220,198,0.30),_transparent_30%),linear-gradient(180deg,#fbfbfb_0%,#f1f4f4_100%)] flex flex-col relative overflow-hidden">
      
      {/* Elementos abstratos de contraste no fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-sidebar/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-accent-orange/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto bg-card/90 border border-border/50 rounded-[4px] shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-sidebar flex items-center justify-center flex-shrink-0 shadow-inner">
              <Icon name="hub" className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold leading-tight text-sidebar tracking-tight">
                {PORTAL_NAME}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold hidden sm:block">
                Plataforma Integrada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-24 animate-pulse rounded-md bg-surface-low hidden sm:block" />
                <div className="h-10 w-10 animate-pulse rounded-full bg-surface-low" />
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-sidebar leading-none">{userName}</span>
                  <span className="text-xs text-on-surface-variant mt-1 capitalize font-medium">{userRole}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-surface-low border border-border/50 flex items-center justify-center text-sm font-bold text-sidebar shadow-sm">
                    {userInitials}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sair"
                    className="flex items-center justify-center w-10 h-10 rounded-[4px] text-on-surface-variant transition-colors hover:bg-surface-low hover:text-danger"
                  >
                    <Icon name="logout" className="text-xl" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 rounded-[4px] bg-sidebar px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-sidebar/90 hover:shadow-md active:scale-95"
              >
                <Icon name="login" className="text-base" />
                <span>Fazer Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="max-w-7xl w-full">
          
          {/* Hero Title */}
          <div className="text-center mb-16 max-w-3xl mx-auto mt-8">
            <p className="text-accent-orange font-bold uppercase tracking-widest text-xs mb-3">
              Ecossistema AF Soluções
            </p>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-sidebar sm:text-6xl mb-6 leading-tight">
              Acelere sua operação <br/>
              <span className="text-primary-graphite">
                com inteligência.
              </span>
            </h2>
            <p className="text-lg text-on-surface-variant leading-relaxed font-medium">
              Selecione o módulo abaixo para acessar a área correspondente da sua planta industrial.
            </p>
          </div>

          {/* Bento Grid Layout - Alto Contraste */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* CMMS - Dark Mode Hero Card (Span 2) */}
            <div
              onClick={() => handleModuleClick(cmmsModule)}
              className={`
                lg:col-span-2 group relative overflow-hidden rounded-[8px] transition-all duration-300
                bg-sidebar text-white border-2 border-transparent hover:border-accent-orange shadow-lg hover:shadow-2xl
                cursor-pointer flex flex-col h-full
              `}
            >
              {/* Abstract Background inside dark card */}
              <div className="absolute inset-0 bg-gradient-to-br from-sidebar to-[#1a1f24] opacity-90" />
              <div className="absolute -right-[10%] -top-[10%] w-96 h-96 bg-accent-orange/10 rounded-full blur-[80px] transition-transform duration-700 group-hover:scale-125 group-hover:-translate-x-10" />
              
              <div className="relative p-8 sm:p-10 flex flex-col h-full justify-between z-10">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-4 bg-white/10 rounded-[8px] backdrop-blur-md border border-white/10 transform transition-transform duration-500 group-hover:scale-110">
                      {cmmsModule.icon}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-accent-orange opacity-80 transform transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-2">
                      {isAuthenticated ? 'Acessar módulo' : 'Fazer login'}
                      <Icon name="arrow_forward" className="text-xl" />
                    </div>
                  </div>
                  
                  <span className="inline-block px-3 py-1 rounded-[4px] bg-accent-orange/20 text-[10px] font-bold tracking-[0.2em] uppercase text-accent-orange mb-4 border border-accent-orange/30">
                    Módulo Principal • {cmmsModule.shortName}
                  </span>
                  
                  <h3 className="font-headline text-3xl font-extrabold mb-4 leading-tight">
                    {cmmsModule.name}
                  </h3>
                  
                  <p className="text-base text-gray-300 leading-relaxed max-w-xl font-medium">
                    {cmmsModule.description}
                  </p>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                  <div className="flex flex-wrap gap-2.5">
                    {cmmsModule.features.map((feature) => (
                      <span
                        key={feature}
                        className="flex items-center gap-1.5 rounded-[4px] bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-200 border border-white/10 transition-colors group-hover:bg-white/10 group-hover:border-white/20"
                      >
                        <Icon name="check" className="text-[16px] text-accent-orange" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Modules - Stacked (Span 1) */}
            <div className="lg:col-span-1 flex flex-col gap-6 h-full">
              {otherModules.map((module) => (
                <div
                  key={module.id}
                  className="relative overflow-hidden rounded-[8px] bg-card border border-border p-6 flex flex-col justify-between h-full shadow-sm transition-all hover:shadow-md opacity-80 hover:opacity-100"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className="p-3 bg-surface-low rounded-[4px] border border-border/50 text-sidebar">
                        {module.icon}
                      </div>
                      <span className="rounded-[4px] bg-surface-low px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant border border-border/50">
                        Em breve
                      </span>
                    </div>

                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-2 block">
                      {module.shortName}
                    </span>
                    <h3 className="font-headline text-xl font-extrabold text-sidebar mb-3 leading-tight">
                      {module.name}
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-6 font-medium">
                      {module.description}
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-wrap gap-2 mt-auto">
                    {module.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-[4px] bg-surface-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant border border-border/40"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-on-surface-variant">
            &copy; {new Date().getFullYear()} AF Soluções.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
              Versão 1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
