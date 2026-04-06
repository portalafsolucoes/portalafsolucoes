'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Settings, LogOut, ChevronDown, Shield, Wrench, UserCog, HardHat, Zap, Cog, Building2, LayoutGrid } from 'lucide-react'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  jobTitle?: string
}

export function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

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
    router.push('/login')
  }

  if (!user) return null

  const getInitials = () => {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }

  const getRoleName = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'Super Administrador'
      case 'GESTOR':
        return 'Gestor de Manutenção'
      case 'PLANEJADOR':
        return 'Planejador de Manutenção'
      case 'MECANICO':
        return 'Mecânico'
      case 'ELETRICISTA':
        return 'Eletricista / Instrumentista'
      case 'OPERADOR':
        return 'Operador de Máquinas'
      case 'CONSTRUTOR_CIVIL':
        return 'Construtor Civil'
      default:
        return user.role
    }
  }

  const getRoleIcon = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return <Shield className="w-4 h-4" />
      case 'GESTOR':
        return <UserCog className="w-4 h-4" />
      case 'PLANEJADOR':
        return <Cog className="w-4 h-4" />
      case 'MECANICO':
        return <Wrench className="w-4 h-4" />
      case 'ELETRICISTA':
        return <Zap className="w-4 h-4" />
      case 'OPERADOR':
        return <HardHat className="w-4 h-4" />
      case 'CONSTRUTOR_CIVIL':
        return <Building2 className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'bg-[hsl(0,0%,10%)]'
      case 'GESTOR':
        return 'bg-primary'
      case 'PLANEJADOR':
        return 'bg-[hsl(0,0%,30%)]'
      case 'MECANICO':
        return 'bg-[hsl(0,0%,40%)]'
      case 'ELETRICISTA':
        return 'bg-[hsl(0,0%,45%)]'
      case 'OPERADOR':
        return 'bg-[hsl(0,0%,50%)]'
      case 'CONSTRUTOR_CIVIL':
        return 'bg-[hsl(0,0%,55%)]'
      default:
        return 'bg-muted'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-sm transition-all hover:bg-accent/10 hover:border-border"
      >
        {/* Avatar */}
        <div className={`w-6 h-6 rounded-md ${getRoleColor()} flex items-center justify-center text-white text-xs font-semibold`}>
          {getInitials()}
        </div>

        <span className="hidden md:block font-medium text-foreground text-sm">
          {user.firstName}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-popover rounded-lg shadow-xl border border-border py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${getRoleColor()} flex items-center justify-center text-white font-semibold`}>
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-popover-foreground">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                {user.jobTitle && (
                  <div className="text-xs text-muted-foreground mt-1">{user.jobTitle}</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-accent/20 rounded text-xs text-popover-foreground">
              {getRoleIcon()}
              <span>{getRoleName()}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              Meu Perfil
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
          </div>

          {/* Portal & Logout */}
          <div className="border-t border-border pt-2">
            <button
              onClick={() => { setIsOpen(false); router.push('/hub') }}
              className="flex items-center gap-3 px-4 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors w-full"
            >
              <LayoutGrid className="w-4 h-4" />
              Voltar ao Portal
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-accent/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair do Sistema
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
