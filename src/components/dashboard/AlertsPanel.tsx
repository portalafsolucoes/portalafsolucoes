'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { ChartCard } from './ChartCard'

interface AlertsData {
  overdueWos: number
  rescheduledWos: number
  pendingRequests: number
  overdueRafActions: number
  downAssets: number
  openRafs: number
  finalizedRafs: number
}

interface AlertItem {
  key: string
  label: string
  value: number
  icon: string
  tone: 'danger' | 'warning' | 'muted'
  href?: string
}

export function AlertsPanel({ data }: { data: AlertsData }) {
  const items: AlertItem[] = [
    { key: 'overdueWos', label: 'OS atrasadas', value: data.overdueWos, icon: 'schedule', tone: 'danger', href: '/work-orders' },
    { key: 'rescheduledWos', label: 'OS reprogramadas 2x+', value: data.rescheduledWos, icon: 'history', tone: 'warning', href: '/work-orders' },
    { key: 'pendingRequests', label: 'SS aguardando aprovação', value: data.pendingRequests, icon: 'assignment', tone: 'warning', href: '/requests/approvals' },
    { key: 'overdueRafActions', label: 'Ações de RAF vencidas', value: data.overdueRafActions, icon: 'flag', tone: 'danger', href: '/rafs/action-plan' },
    { key: 'downAssets', label: 'Ativos parados', value: data.downAssets, icon: 'power_off', tone: 'danger', href: '/assets' },
    { key: 'openRafs', label: 'RAFs em aberto', value: data.openRafs, icon: 'troubleshoot', tone: 'muted', href: '/rafs' },
  ]

  return (
    <ChartCard title="Alertas e pendências" icon="notifications" description="Itens que exigem atenção operacional">
      <ul className="divide-y divide-border">
        {items.map(item => {
          const iconColor =
            item.tone === 'danger' ? 'text-danger' :
            item.tone === 'warning' ? 'text-warning' :
            'text-muted-foreground'
          const content = (
            <div className="flex items-center gap-3 py-2.5">
              <Icon name={item.icon} className={`text-lg ${iconColor}`} />
              <span className="flex-1 text-sm text-foreground">{item.label}</span>
              <span className={`text-lg font-black ${item.value > 0 ? 'text-on-surface' : 'text-muted-foreground'}`}>
                {item.value}
              </span>
              {item.href && <Icon name="chevron_right" className="text-base text-muted-foreground" />}
            </div>
          )
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} className="block px-1 hover:bg-muted rounded-[4px] transition-colors">{content}</Link>
              ) : (
                <div className="px-1">{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </ChartCard>
  )
}
