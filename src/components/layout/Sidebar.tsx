'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useState, useEffect } from 'react'
import { hasPermission, type UserRole } from '@/lib/permissions'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/hooks/useAuth'
import { usePendingCount } from '@/hooks/usePendingCount'
import { useCompanyModules } from '@/hooks/useCompanyModules'
import { APP_NAME } from '@/lib/branding'

type SidebarSubItem = {
  name: string
  href: string
}

type SidebarMenuItem = {
  name: string
  href: string
  icon: string // Material Symbols name
  module: string
  requireApprove?: boolean
  badge?: number
  adminOnly?: boolean
  subItems?: SidebarSubItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const { role: userRole, user, companyName } = useAuth()
  const companyLogo = user?.company?.logo || null
  const pendingCount = usePendingCount()
  const { isModuleEnabled } = useCompanyModules()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const allMenus: SidebarMenuItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard', module: 'dashboard' },
    { name: 'Árvore', href: '/tree', icon: 'account_tree', module: 'tree' },
    { name: 'Pessoas/Equipes', href: '/people-teams', icon: 'group', module: 'people-teams' },
    { name: 'Cadastros Básicos', href: '/basic-registrations', icon: 'tune', module: 'basic-registrations', subItems: [
      { name: 'Tipos de Manutenção', href: '/basic-registrations/maintenance-types' },
      { name: 'Áreas de Manutenção', href: '/basic-registrations/maintenance-areas' },
      { name: 'Tipos de Serviço', href: '/basic-registrations/service-types' },
      { name: 'Calendários', href: '/basic-registrations/calendars' },
      { name: 'Centros de Custos', href: '/basic-registrations/cost-centers' },
      { name: 'Áreas', href: '/basic-registrations/areas' },
      { name: 'Centros de Trabalho', href: '/basic-registrations/work-centers' },
      { name: 'Tipos Modelo', href: '/basic-registrations/asset-family-models' },
      { name: 'Famílias de Bens', href: '/basic-registrations/asset-families' },
      { name: 'Posições', href: '/basic-registrations/positions' },
      { name: 'Recursos', href: '/basic-registrations/resources' },
      { name: 'Tarefas Genéricas', href: '/basic-registrations/generic-tasks' },
      { name: 'Etapas Genéricas', href: '/basic-registrations/generic-steps' },
      { name: 'Características', href: '/basic-registrations/characteristics' },
      { name: 'Tipos de Contador', href: '/basic-registrations/counter-types' },
    ]},
    { name: 'Ativos', href: '/assets', icon: 'inventory_2', module: 'assets', subItems: [
      { name: 'Bens Padrão', href: '/assets/standard' },
      { name: 'Bens', href: '/assets' },
      { name: 'Criticidade de Ativos', href: '/criticality' },
    ]},
    { name: 'Plano de Manutenção', href: '/maintenance-plan', icon: 'event_upcoming', module: 'maintenance-plan', subItems: [
      { name: 'Manutenção Padrão', href: '/maintenance-plan/standard' },
      { name: 'Manutenção do Bem', href: '/maintenance-plan/asset' },
    ]},
    { name: 'Planejamento e Programação', href: '/planning', icon: 'date_range', module: 'planning', subItems: [
      { name: 'Plano de Manutenção', href: '/planning/plans' },
      { name: 'Programação de OSs', href: '/planning/schedules' },
    ]},
    { name: 'Ordens de Serviço (OS)', href: '/work-orders', icon: 'construction', module: 'work-orders' },
    { name: 'Solicitações (SS)', href: '/requests', icon: 'assignment', module: 'requests' },
    { name: 'Aprovações', href: '/requests/approvals', icon: 'check_circle', module: 'requests', requireApprove: true, badge: pendingCount },
    { name: 'RAF', href: '/rafs', icon: 'description', module: 'rafs', adminOnly: true },
    { name: 'Localizações', href: '/locations', icon: 'location_on', module: 'locations' },
    { name: 'KPI - Indicadores', href: '/kpi', icon: 'trending_up', module: 'kpi' },
    { name: 'Configurações', href: '/admin', icon: 'settings', module: 'settings', adminOnly: true, subItems: [
      { name: 'Unidades / Filiais', href: '/admin/units' },
      { name: 'Gestão de Usuários', href: '/admin/users' },
      ...(userRole === 'SUPER_ADMIN' ? [{ name: 'Administração do Portal', href: '/admin/portal' }] : []),
    ]},
  ]

  const navigation = allMenus.filter(menu => {
    if (!userRole) return false
    // Filtrar por módulos habilitados para a empresa
    if (!isModuleEnabled(menu.module)) return false
    if (menu.adminOnly) {
      return userRole === 'GESTOR' || userRole === 'SUPER_ADMIN'
    }
    if (menu.requireApprove) {
      return hasPermission(userRole as UserRole, menu.module, 'approve')
    }
    return hasPermission(userRole as UserRole, menu.module, 'view')
  })

  useEffect(() => {
    navigation.forEach(item => {
      if (item.subItems && pathname.startsWith(item.href)) {
        setExpandedMenus(prev => prev.includes(item.name) ? prev : [...prev, item.name])
      }
    })
  }, [pathname, userRole])

  const toggleExpanded = (name: string) => {
    setExpandedMenus(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const handleBackToPortal = () => {
    router.push('/hub')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-card text-foreground rounded-[4px] ambient-shadow"
      >
        <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-xl" />
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[60] bg-surface-low flex flex-col transition-all duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}>

        {/* Header — Logo + Hamburger only */}
        <div className="px-3 py-3">
          <div className="hidden lg:block">
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 hover:bg-surface-high rounded-[4px] transition-colors flex-shrink-0"
                  title="Recolher sidebar"
                >
                  <Icon name="menu" className="text-xl text-on-surface" />
                </button>

                <Link href="/dashboard" className="flex items-center flex-1 min-w-0" onClick={() => setMobileMenuOpen(false)}>
                  {companyLogo ? (
                    <div className="relative w-full h-10">
                      <Image
                        src={companyLogo}
                        alt={companyName || APP_NAME}
                        fill
                        className="object-contain object-left"
                        priority
                        sizes="(max-width: 1024px) 200px, 160px"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-on-surface truncate">
                      {companyName || APP_NAME}
                    </span>
                  )}
                </Link>
              </div>
            ) : (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-surface-high rounded-[4px] transition-colors w-full flex justify-center"
                title="Expandir sidebar"
              >
                <Icon name="menu" className="text-xl text-on-surface" />
              </button>
            )}
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="flex items-center">
              {companyLogo ? (
                <div className="relative w-full h-10">
                  <Image
                    src={companyLogo}
                    alt={companyName || APP_NAME}
                    fill
                    className="object-contain object-left"
                    priority
                    sizes="200px"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold text-on-surface truncate">
                  {companyName || APP_NAME}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-on-surface-variant/10" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navigation.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedMenus.includes(item.name)
            const isActive = hasSubItems
              ? pathname.startsWith(item.href)
              : pathname === item.href

            if (hasSubItems) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false)
                        setExpandedMenus(prev => prev.includes(item.name) ? prev : [...prev, item.name])
                      } else {
                        toggleExpanded(item.name)
                      }
                    }}
                    className={`w-full group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium rounded-[4px] transition-all duration-200 ${
                      isActive
                        ? 'bg-on-surface text-white'
                        : 'text-on-surface-variant hover:bg-surface-highest hover:text-on-surface'
                    }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <Icon name={item.icon} className={`text-xl ${isCollapsed ? '' : 'mr-3'} ${
                      isActive ? 'text-white' : 'text-on-surface-variant group-hover:text-on-surface'
                    }`} weight={isActive ? 300 : 200} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        <Icon name="expand_more" className={`text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>

                  {!isCollapsed && isExpanded && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-on-surface-variant/15 pl-3">
                      {item.subItems!.map(sub => {
                        const isSubActive = pathname === sub.href
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all duration-200 ${
                              isSubActive
                                ? 'bg-on-surface text-white'
                                : 'text-on-surface-variant hover:bg-surface-highest hover:text-on-surface'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium rounded-[4px] transition-all duration-200 relative ${
                  isActive
                    ? 'bg-on-surface text-white'
                    : 'text-on-surface-variant hover:bg-surface-highest hover:text-on-surface'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon name={item.icon} className={`text-xl ${isCollapsed ? '' : 'mr-3'} ${
                  isActive ? 'text-white' : 'text-on-surface-variant group-hover:text-on-surface'
                }`} weight={isActive ? 300 : 200} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {'badge' in item && item.badge && item.badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-danger rounded-[2px]">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && 'badge' in item && item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-danger rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Separator */}
        <div className="mx-4 h-px bg-on-surface-variant/10" />

        {/* Back to Portal Button */}
        <div className="p-3">
          <button
            onClick={handleBackToPortal}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-highest hover:text-on-surface rounded-[4px] transition-all duration-200`}
            title={isCollapsed ? 'Voltar ao Portal' : ''}
          >
            <Icon name="grid_view" className={`text-xl ${isCollapsed ? '' : 'mr-3'} text-on-surface-variant`} />
            {!isCollapsed && 'Voltar ao Portal'}
          </button>
        </div>
      </aside>
    </>
  )
}
