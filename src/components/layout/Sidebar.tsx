'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useState, useEffect, useRef } from 'react'
import { hasPermission } from '@/lib/permissions'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/hooks/useAuth'
import { usePendingCount } from '@/hooks/usePendingCount'
import { useCompanyModules } from '@/hooks/useCompanyModules'
import { APP_NAME } from '@/lib/branding'
import { getDefaultCmmsPath } from '@/lib/user-roles'

type SidebarSubItem = {
  name: string
  href: string
  module?: string
  badge?: number
}

type SidebarMenuItem = {
  name: string
  href: string
  icon: string // Material Symbols name
  module: string
  badge?: number
  subItems?: SidebarSubItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, setIsCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebar()
  const { role: userRole, user, companyName, isLoading: authLoading } = useAuth()
  const companyLogo = user?.company?.logo || null
  const defaultCmmsPath = getDefaultCmmsPath(user ?? userRole)
  const pendingCount = usePendingCount()
  const { isModuleEnabled } = useCompanyModules()
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
      { name: 'Cargos', href: '/basic-registrations/job-titles' },
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
    { name: 'Cadastro de Manutenção', href: '/maintenance-plan', icon: 'event_upcoming', module: 'maintenance-plan', subItems: [
      { name: 'Manutenção Padrão', href: '/maintenance-plan/standard' },
      { name: 'Manutenção do Bem', href: '/maintenance-plan/asset' },
      { name: 'Check List Padrão', href: '/maintenance-plan/standard-checklists', module: 'standard-checklists' },
    ]},
    { name: 'Planejamento e Programação', href: '/planning', icon: 'date_range', module: 'planning', subItems: [
      { name: 'Plano de Manutenção', href: '/planning/plans' },
      { name: 'Programação de OSs', href: '/planning/schedules' },
    ]},
    { name: 'Ordens de Serviço (OS)', href: '/work-orders', icon: 'construction', module: 'work-orders' },
    { name: 'Check List', href: '/inspections/checklists', icon: 'fact_check', module: 'area-inspections' },
    { name: 'Solicitações de Serviço', href: '/requests', icon: 'assignment', module: 'requests', subItems: [
      { name: 'Solicitações', href: '/requests', module: 'requests' },
      { name: 'Aprovações', href: '/requests/approvals', module: 'approvals', badge: pendingCount },
    ]},
    { name: 'Análise de Falhas', href: '/rafs', icon: 'troubleshoot', module: 'rafs', subItems: [
      { name: 'RAFs', href: '/rafs', module: 'rafs' },
      { name: 'PA das RAFs', href: '/rafs/action-plan', module: 'rafs' },
    ]},
    { name: 'Localizações', href: '/locations', icon: 'location_on', module: 'locations' },
    { name: 'KPI - Indicadores', href: '/kpi', icon: 'trending_up', module: 'kpi' },
    { name: 'Auditoria', href: '/audit', icon: 'history', module: 'audit' },
    { name: 'Configurações', href: '/admin/portal', icon: 'settings', module: 'settings' },
  ]

  const navigation = allMenus
    .map(menu => {
      if (!userRole) return null
      const permissionSubject = user ?? userRole

      if (menu.subItems && menu.subItems.length > 0) {
        // Item-pai: filtra cada subItem pelo seu próprio módulo (fallback no módulo do pai)
        const visibleSubs = menu.subItems.filter(sub => {
          const moduleSlug = sub.module ?? menu.module
          if (!isModuleEnabled(moduleSlug)) return false
          return hasPermission(permissionSubject, moduleSlug, 'view')
        })
        if (visibleSubs.length === 0) return null
        // Soma os badges dos subItems visíveis para exibir no item-pai
        const totalBadge = visibleSubs.reduce((acc, s) => acc + (s.badge ?? 0), 0)
        return {
          ...menu,
          subItems: visibleSubs,
          badge: totalBadge > 0 ? totalBadge : menu.badge,
        }
      }

      // Item simples: gating tradicional pelo módulo do item
      if (!isModuleEnabled(menu.module)) return null
      if (!hasPermission(permissionSubject, menu.module, 'view')) return null
      return menu
    })
    .filter((m): m is SidebarMenuItem => m !== null)

  const manuallyCollapsed = useRef<Set<string>>(new Set())

  useEffect(() => {
    navigation.forEach(item => {
      if (item.subItems) {
        if (pathname.startsWith(item.href)) {
          if (!manuallyCollapsed.current.has(item.name)) {
            setExpandedMenus(prev => prev.includes(item.name) ? prev : [...prev, item.name])
          }
        } else {
          manuallyCollapsed.current.delete(item.name)
        }
      }
    })
  }, [navigation, pathname, userRole])

  const toggleExpanded = (name: string) => {
    setExpandedMenus(prev => {
      const isOpen = prev.includes(name)
      if (isOpen) {
        manuallyCollapsed.current.add(name)
      } else {
        manuallyCollapsed.current.delete(name)
      }
      return isOpen ? prev.filter(n => n !== name) : [...prev, name]
    })
  }

  const handleBackToPortal = () => {
    router.push('/hub')
  }

  return (
    <>
      {/* Overlay para mobile/tablet — clique fora fecha a sidebar */}
      {mobileMenuOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[60] bg-sidebar flex flex-col transition-all duration-300 shadow-xl ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
      } ${isCollapsed ? 'xl:w-16' : 'xl:w-64'} w-72`}>

        {/* Header — Logo + Hamburguer (desktop) */}
        <div className="px-3 py-3 bg-[var(--color-sidebar-header)] border-b border-sidebar-border">
          <div className="hidden xl:block">
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 hover:bg-sidebar-accent rounded-[4px] transition-colors flex-shrink-0"
                  title="Recolher sidebar"
                >
                  <Icon name="menu" className="text-xl text-sidebar-foreground" />
                </button>
                <Link
                  href={defaultCmmsPath}
                  className="flex h-14 min-w-0 flex-1 items-center rounded-[4px] px-2 hover:bg-sidebar-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {companyLogo ? (
                    <div className="relative h-10 w-full min-w-0">
                      <Image
                        src={companyLogo}
                        alt={companyName || APP_NAME}
                        fill
                        className="object-contain object-left"
                        priority
                        unoptimized
                        sizes="220px"
                      />
                    </div>
                  ) : authLoading ? (
                    <div className="h-10 w-full animate-pulse rounded-[4px] bg-sidebar-accent" />
                  ) : (
                    <span className="text-sm font-bold text-white truncate">
                      {companyName || APP_NAME}
                    </span>
                  )}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 hover:bg-sidebar-accent rounded-[4px] transition-colors w-full flex justify-center"
                  title="Expandir sidebar"
                >
                  <Icon name="menu" className="text-xl text-sidebar-foreground" />
                </button>

                <Link
                  href={defaultCmmsPath}
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[4px] bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  title={companyName || APP_NAME}
                >
                  {companyLogo ? (
                    <div className="relative h-9 w-9">
                      <Image
                        src={companyLogo}
                        alt={companyName || APP_NAME}
                        fill
                        className="object-contain"
                        priority
                        unoptimized
                        sizes="28px"
                      />
                    </div>
                  ) : authLoading ? (
                    <div className="h-8 w-8 animate-pulse rounded-[4px] bg-sidebar-accent" />
                  ) : (
                    <span className="text-[10px] font-semibold text-white">
                      {(companyName || APP_NAME).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile/Tablet Layout — botão fechar + logo */}
          <div className="xl:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-sidebar-accent rounded-[4px] transition-colors flex-shrink-0"
                title="Fechar menu"
              >
                <Icon name="close" className="text-xl text-sidebar-foreground" />
              </button>
              {companyLogo ? (
                <Link
                  href={defaultCmmsPath}
                  className="flex h-14 w-full items-center rounded-[4px] px-2 hover:bg-sidebar-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="relative h-10 w-full min-w-0">
                    <Image
                      src={companyLogo}
                      alt={companyName || APP_NAME}
                      fill
                      className="object-contain object-left"
                      priority
                      unoptimized
                      sizes="220px"
                    />
                  </div>
                </Link>
              ) : authLoading ? (
                <div className="h-10 w-full animate-pulse rounded-[4px] bg-sidebar-accent" />
              ) : (
                <Link
                  href={defaultCmmsPath}
                  className="text-sm font-bold text-white truncate rounded-[4px] px-2 py-2 hover:bg-sidebar-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {companyName || APP_NAME}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll-dark">
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
                    className={`w-full group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-medium rounded-[4px] rounded-l-none transition-all duration-200 relative border-l-4 ${
                      isActive
                        ? 'bg-sidebar-accent text-white border-accent-orange shadow-sm'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white border-transparent'
                    }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <Icon name={item.icon} className={`text-xl ${isCollapsed ? '' : 'mr-3'} ${
                      isActive ? 'text-accent-orange' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                    }`} weight={isActive ? 300 : 200} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="mr-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-accent-orange rounded shadow-sm">
                            {item.badge}
                          </span>
                        )}
                        <Icon name="expand_more" className={`text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                    {isCollapsed && item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-black text-white bg-accent-orange rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {!isCollapsed && isExpanded && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                      {item.subItems!.map(sub => {
                        const isSubActive = pathname === sub.href
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium rounded-[4px] transition-all duration-200 ${
                              isSubActive
                                ? 'text-white font-bold'
                                : 'text-sidebar-foreground hover:text-white'
                            }`}
                          >
                            <span className="truncate">{sub.name}</span>
                            {sub.badge !== undefined && sub.badge > 0 && (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-accent-orange rounded shadow-sm flex-shrink-0">
                                {sub.badge}
                              </span>
                            )}
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
                className={`group flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-medium rounded-[4px] rounded-l-none transition-all duration-200 relative border-l-4 ${
                  isActive
                    ? 'bg-sidebar-accent text-white border-accent-orange shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white border-transparent'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <Icon name={item.icon} className={`text-xl ${isCollapsed ? '' : 'mr-3'} ${
                  isActive ? 'text-accent-orange' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                }`} weight={isActive ? 300 : 200} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {'badge' in item && item.badge && item.badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-accent-orange rounded shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && 'badge' in item && item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-black text-white bg-accent-orange rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Separator */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* Back to Portal Button */}
        <div className="p-3 bg-[var(--color-sidebar-header)] border-t border-sidebar-border space-y-1">
          {userRole === 'SUPER_ADMIN' && (
            <Link
              href="/admin/select-company"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-white rounded-[4px] transition-all duration-200`}
              title={isCollapsed ? 'Trocar empresa' : ''}
            >
              <Icon name="swap_horiz" className={`text-xl ${isCollapsed ? '' : 'mr-3'} text-sidebar-muted`} />
              {!isCollapsed && 'Trocar empresa'}
            </Link>
          )}
          <button
            onClick={handleBackToPortal}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-3'} py-2.5 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-white rounded-[4px] transition-all duration-200`}
            title={isCollapsed ? 'Voltar ao Portal' : ''}
          >
            <Icon name="grid_view" className={`text-xl ${isCollapsed ? '' : 'mr-3'} text-sidebar-muted`} />
            {!isCollapsed && 'Voltar ao Portal'}
          </button>
        </div>
      </aside>
    </>
  )
}
