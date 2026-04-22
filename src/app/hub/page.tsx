'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { useCompanyProducts } from '@/hooks/useCompanyProducts'
import { getProductDefaultPath, getProductHref, PRODUCT_META } from '@/lib/products'
import type { ProductSlug } from '@/lib/products'
import { normalizeUserRole } from '@/lib/user-roles'

import { PORTAL_NAME } from '@/lib/branding'

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80',
  cmms: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
  gvp: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
  gpa: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80',
} as const

interface ModuleCard {
  id: string
  slug: ProductSlug
  name: string
  shortName: string
  description: string
  icon: React.ReactNode
  href: string
  enabled: boolean
  features: string[]
  isPrimary?: boolean
}

export default function HubPage() {
  const router = useRouter()
  const { user, isLoading: loading, isAuthenticated, role } = useAuth()
  const { products: dbProducts, isLoading: productsLoading } = useCompanyProducts()
  const userName = user ? `${user.firstName} ${user.lastName}` : ''
  const userInitials = user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'U'
  const userRole = normalizeUserRole(role || null)

  const ICON_MAP: Record<ProductSlug, React.ReactNode> = {
    CMMS: <Icon name="construction" className="text-5xl" />,
    GVP: <Icon name="bar_chart" className="text-3xl" />,
    GPA: <Icon name="photo_camera" className="text-3xl" />,
  }

  const modules: ModuleCard[] = dbProducts.map(p => ({
    id: p.slug.toLowerCase(),
    slug: p.slug,
    name: p.name,
    shortName: PRODUCT_META[p.slug]?.shortName ?? p.slug,
    description: p.description ?? '',
    icon: ICON_MAP[p.slug],
    href: getProductHref(p.slug),
    enabled: p.enabled ?? false,
    features: PRODUCT_META[p.slug]?.features ?? [],
    isPrimary: p.slug === 'CMMS',
  }))

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/hub'
  }

  const handleModuleClick = (module: ModuleCard) => {
    if (!module.enabled) return

    if (isAuthenticated) {
      router.push(getProductDefaultPath(module.slug, { role: userRole, companyId: user?.companyId ?? null }))
    } else {
      router.push(`/login?returnUrl=${encodeURIComponent(getProductHref(module.slug))}`)
    }
  }

  const handleLoginClick = () => {
    // Apenas vai para a tela de login; o retorno padrão já é tratado pelo app
    // Mas para garantir que o usuário veja o Hub novamente caso não haja destino:
    router.push('/login?returnUrl=/hub')
  }

  const cmmsModule = modules.find(m => m.slug === 'CMMS')
  const otherModules = modules.filter(m => m.slug !== 'CMMS')

  const isPageLoading = loading || (productsLoading && modules.length === 0)

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.7),_rgba(240,244,244,1)_80%)] flex flex-col relative overflow-hidden">

      {/* Hero Background Image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Image
          src={IMAGES.hero}
          alt=""
          fill
          className="object-cover opacity-[0.15]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80" />
      </div>

      {/* Elementos abstratos de contraste no fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
        {/* Grid pattern sutil */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(#1e2329 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[#e4e9ea] blur-[100px]" />
        <div className="absolute top-[30%] -right-[5%] w-[50%] h-[50%] rounded-full bg-accent-orange/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto bg-white/70 border border-white/50 rounded-[12px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-16 flex items-center justify-between px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-sidebar flex items-center justify-center flex-shrink-0 shadow-md">
              <Icon name="hub" className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold leading-tight text-sidebar tracking-tight">
                {PORTAL_NAME}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar/60 font-bold hidden sm:block">
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
                  <div className="h-10 w-10 rounded-full bg-surface border-[2px] border-white flex items-center justify-center text-sm font-bold text-sidebar shadow-md">
                    {userInitials}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sair"
                    className="flex items-center justify-center w-10 h-10 rounded-full text-sidebar/60 transition-all hover:bg-error/10 hover:text-error"
                  >
                    <Icon name="logout" className="text-xl" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/register')}
                  className="hidden sm:flex items-center gap-2 rounded-[8px] border border-sidebar/15 px-4 py-2.5 text-sm font-bold text-sidebar transition-all hover:bg-sidebar/5"
                >
                  <Icon name="add_business" className="text-base" />
                  <span>Cadastre sua empresa</span>
                </button>
                <button
                  onClick={handleLoginClick}
                  className="flex items-center gap-2 rounded-[8px] bg-sidebar px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sidebar/20 transition-all hover:bg-sidebar/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Icon name="login" className="text-base" />
                  <span>Acessar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="max-w-[1200px] w-full">

          {/* Hero Title */}
          <div className="text-center mb-20 max-w-3xl mx-auto mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-orange/10 text-accent-orange font-bold uppercase tracking-[0.2em] text-[10px] mb-6 border border-accent-orange/20">
              <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
              Ecossistema AF Soluções
            </div>
            <h2 className="font-headline text-5xl lg:text-[4.5rem] font-extrabold tracking-tight text-sidebar mb-6 leading-[1.1] drop-shadow-sm">
              Acelere sua operação <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-orange to-amber-500">
                com inteligência.
              </span>
            </h2>
            <p className="text-[1.1rem] text-sidebar/70 leading-relaxed font-medium max-w-2xl mx-auto">
              Sua planta conectada, preditiva e sob controle. Escolha o ambiente de trabalho e inicie sua jornada para a excelência industrial.
            </p>
          </div>

          {/* Bento Grid Layout */}
          {isPageLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-8 rounded-[24px] bg-white/40 animate-pulse h-[480px]" />
              <div className="lg:col-span-4 flex flex-col gap-8">
                <div className="rounded-[24px] bg-white/40 animate-pulse flex-1 min-h-[220px]" />
                <div className="rounded-[24px] bg-white/40 animate-pulse flex-1 min-h-[220px]" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* CMMS - Dark Mode Hero Card (Span 8) */}
              {cmmsModule && (
                <div
                  onClick={() => handleModuleClick(cmmsModule)}
                  className={`
                    lg:col-span-8 group relative overflow-hidden rounded-[24px] transition-all duration-500
                    bg-[#111418] text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_30px_60px_rgba(249,115,22,0.15)]
                    cursor-pointer flex flex-col h-full border border-white/5
                  `}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={IMAGES.cmms}
                      alt=""
                      fill
                      className="object-cover opacity-35 transition-transform duration-[1.5s] group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#111418]/80 via-[#1a1f24]/70 to-[#252b33]/80" />
                  </div>
                  <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-gradient-to-bl from-accent-orange/20 to-transparent rounded-full blur-[100px] transition-transform duration-[1.5s] group-hover:scale-[1.4] group-hover:-translate-x-12 opacity-60" />
                  <div className="absolute left-0 bottom-0 w-[300px] h-[300px] bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-[80px]" />

                  <div className="relative p-6 sm:p-10 lg:p-14 flex flex-col h-full justify-between z-10">
                    <div>
                      <div className="flex items-center justify-between mb-6 sm:mb-10">
                        <div className="p-3 sm:p-4 bg-white/5 rounded-[12px] sm:rounded-[16px] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transform transition-all duration-500 group-hover:scale-110 group-hover:bg-accent-orange/20 group-hover:border-accent-orange/30">
                          {cmmsModule.icon}
                        </div>
                        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs sm:text-sm font-bold text-white transition-all duration-300 group-hover:bg-accent-orange group-hover:border-accent-orange group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                          <span className="hidden sm:inline">{isAuthenticated ? 'Acessar Workspace' : 'Fazer login'}</span>
                          <span className="sm:hidden">Acessar</span>
                          <Icon name="arrow_forward" className="text-lg sm:text-xl transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-[6px] bg-white/10 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-white/80 mb-3 sm:mb-5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                        {cmmsModule.shortName} • Ativo
                      </span>

                      <h3 className="font-headline text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-6 leading-tight tracking-tight drop-shadow-md">
                        {cmmsModule.name}
                      </h3>

                      <p className="text-sm sm:text-[1.05rem] text-white/70 leading-[1.6] sm:leading-[1.7] font-medium">
                        {cmmsModule.description}
                      </p>
                    </div>

                    <div className="mt-8 sm:mt-14 pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex flex-wrap gap-2">
                        {cmmsModule.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="flex items-center gap-1 sm:gap-1.5 rounded-[6px] sm:rounded-[8px] bg-[#000000]/30 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold tracking-wide text-white/90 border border-white/5 transition-all group-hover:border-white/15 backdrop-blur-sm"
                          >
                            <Icon name="bolt" className="text-[12px] sm:text-[14px] text-accent-orange" />
                            <span className="hidden sm:inline">{feature}</span>
                            <span className="sm:hidden">{feature.split(' ')[0]}</span>
                          </span>
                        ))}
                        <span className="flex items-center justify-center rounded-[6px] sm:rounded-[8px] bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white/60 border border-white/5">
                          +{cmmsModule.features.length - 3}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coming Soon Modules - Stacked (Span 4) */}
              <div className="lg:col-span-4 flex flex-col gap-8 h-full">
                {otherModules.map((module, idx) => {
                  const moduleImage = module.slug === 'GVP' ? IMAGES.gvp : IMAGES.gpa
                  return (
                  <div
                    key={module.id}
                    className="group relative overflow-hidden rounded-[24px] bg-white border border-sidebar/5 p-8 flex flex-col justify-between h-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 cursor-not-allowed opacity-75"
                    title="Em breve"
                  >
                    {/* Module Background Image */}
                    <div className="absolute inset-0">
                      <Image
                        src={moduleImage}
                        alt=""
                        fill
                        className="object-cover opacity-[0.12] transition-transform duration-500 group-hover:scale-110"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/70" />
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sidebar/[0.02] rounded-bl-full transition-transform duration-500 group-hover:scale-150" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-8">
                        <div className={`p-3.5 rounded-[12px] shadow-sm text-white ${idx === 0 ? 'bg-gradient-to-br from-[#7b8283] to-[#5a6061]' : 'bg-gradient-to-br from-[#9ca3af] to-[#6b7280]'}`}>
                          {module.icon}
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600 border border-amber-500/20">
                          Em breve
                        </span>
                      </div>

                      <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-sidebar/40 mb-3 block">
                        {module.shortName}
                      </span>
                      <h3 className="font-headline text-2xl font-extrabold text-sidebar mb-3 leading-tight tracking-tight group-hover:text-accent-orange transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-sm text-sidebar/60 leading-relaxed font-medium mb-8">
                        {module.description}
                      </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-2 mt-auto">
                      {module.features.slice(0, 2).map((feature) => (
                        <span
                          key={feature}
                          className="rounded-[6px] bg-surface-low px-3 py-1.5 text-[10px] font-bold tracking-wide text-sidebar/60 border border-sidebar/5"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  )
                })}
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 mt-auto border-t border-sidebar/5 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sidebar/60">
            <Icon name="memory" className="text-xl" />
            <p className="text-xs font-bold tracking-wide">
              &copy; {new Date().getFullYear()} AF Soluções Industriais.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span className="px-3 py-1 rounded-full bg-sidebar/5 text-[9px] font-bold tracking-[0.2em] text-sidebar/50 uppercase border border-sidebar/5">
              System v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
