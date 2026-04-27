'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { ChartCard } from './ChartCard'

interface RafActionData {
  openRafs: number
  finalizedRafs: number
  overdueRafActions: number
}

export function RafActionPanel({ data }: { data: RafActionData }) {
  const total = data.openRafs + data.finalizedRafs
  const pctFinalized = total > 0 ? Math.round((data.finalizedRafs / total) * 1000) / 10 : 0

  return (
    <ChartCard title="RAFs e plano de ação" icon="troubleshoot" description="Estado das análises de falha">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-[4px] bg-surface-container">
          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">Em aberto</p>
          <p className="text-2xl font-black text-on-surface">{data.openRafs}</p>
        </div>
        <div className="text-center p-3 rounded-[4px] bg-surface-container">
          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">Finalizadas</p>
          <p className="text-2xl font-black text-on-surface">{data.finalizedRafs}</p>
        </div>
        <div className="text-center p-3 rounded-[4px] bg-surface-container">
          <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">% finalizadas</p>
          <p className="text-2xl font-black text-on-surface">{pctFinalized.toFixed(1)}%</p>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-[4px] border border-dashed border-gray-400 bg-gray-100">
        <div className="flex items-center gap-2">
          <Icon name="flag" className="text-base text-foreground" />
          <span className="text-sm font-semibold text-on-surface">Ações com prazo vencido</span>
        </div>
        <span className="text-xl font-black text-foreground">{data.overdueRafActions}</span>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Link href="/rafs/action-plan" className="text-xs font-semibold text-primary-graphite hover:underline inline-flex items-center gap-1">
          Abrir PA das RAFs <Icon name="arrow_forward" className="text-sm" />
        </Link>
      </div>
    </ChartCard>
  )
}
