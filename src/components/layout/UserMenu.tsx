'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { getRoleDisplayName, getRoleIcon, normalizeUserRole } from '@/lib/user-roles'

export function UserMenu() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [switchingAway, setSwitchingAway] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isSuperAdmin = normalizeUserRole(user) === 'SUPER_ADMIN'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    queryClient.removeQueries({ queryKey: ['company-modules'] })
    router.replace('/login')
    router.refresh()
  }

  const handleSwitchCompany = async () => {
    try {
      setSwitchingAway(true)
      await fetch('/api/admin/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: null }),
      })
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      queryClient.removeQueries({ queryKey: ['company-modules'] })
      setIsOpen(false)
      router.push('/admin/select-company')
      router.refresh()
    } finally {
      setSwitchingAway(false)
    }
  }

  if (!user) return null

  const getInitials = () => {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-[4px] bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-sm transition-all hover:bg-gray-200"
      >
        <div className="w-6 h-6 rounded-[4px] bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
          {getInitials()}
        </div>

        <span className="hidden md:block font-medium text-on-surface text-sm">
          {user.firstName}
        </span>

        <Icon name="expand_more" className={`text-lg text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-[4px] border border-gray-200 shadow-lg py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[4px] bg-gray-900 flex items-center justify-center text-white font-semibold">
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-on-surface">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-on-surface-variant">{user.email}</div>
                {user.jobTitle && (
                  <div className="text-xs text-on-surface-variant mt-1">{user.jobTitle}</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-[4px] text-xs text-gray-700">
              <Icon name={getRoleIcon(user)} className="text-base" />
              <span>{getRoleDisplayName(user)}</span>
            </div>
          </div>

          <div className="mx-4 h-px bg-gray-200" />

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="person" className="text-lg text-on-surface-variant" />
              Meu Perfil
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="settings" className="text-lg text-on-surface-variant" />
              Configurações
            </Link>

            {isSuperAdmin && (
              <>
                <button
                  onClick={handleSwitchCompany}
                  disabled={switchingAway}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-gray-50 transition-colors w-full disabled:opacity-60"
                >
                  <Icon name="swap_horiz" className="text-lg text-on-surface-variant" />
                  {switchingAway ? 'Trocando…' : 'Trocar empresa'}
                </button>
                <Link
                  href="/admin/portal"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon name="admin_panel_settings" className="text-lg text-on-surface-variant" />
                  Administração do Portal
                </Link>
              </>
            )}
          </div>

          <div className="mx-4 h-px bg-gray-200" />

          {/* Portal & Logout */}
          <div className="pt-2">
            <button
              onClick={() => { setIsOpen(false); router.push('/hub') }}
              className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-gray-50 transition-colors w-full"
            >
              <Icon name="grid_view" className="text-lg text-on-surface-variant" />
              Voltar ao Portal
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-gray-50 transition-colors w-full"
            >
              <Icon name="logout" className="text-lg text-on-surface-variant" />
              Sair do Sistema
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
