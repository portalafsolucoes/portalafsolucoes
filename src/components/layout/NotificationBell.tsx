'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  href: string | null
  createdAt: string
}

interface NotificationsResponse {
  data: Notification[]
  unreadCount: number
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `há ${diffD} d`
  return date.toLocaleDateString('pt-BR')
}

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) throw new Error('Falha ao carregar notificações')
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const notifications = data?.data ?? []
  const unreadCount = data?.unreadCount ?? 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleClickNotification = async (n: Notification) => {
    if (!n.read) await markOneRead(n.id)
    setIsOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-[4px] bg-gray-100 border border-gray-200 text-on-surface-variant hover:bg-gray-200 transition-colors"
        aria-label="Notificações"
      >
        <Icon name="notifications" className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-[4px] border border-gray-200 shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-semibold text-on-surface">Notificações</div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Icon name="notifications_off" className="text-3xl text-gray-300 mb-2" />
                <p>Você não tem notificações</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                    n.read ? 'bg-white hover:bg-gray-50' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-on-surface truncate">{n.title}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                        {n.message}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
