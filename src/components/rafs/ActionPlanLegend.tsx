'use client'

import { ActionPlanStatusBadge } from './ActionPlanStatusBadge'

// Legenda fixa da tela PA das RAFs. Monocromatica, apenas simbolos + texto.
export function ActionPlanLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="font-bold uppercase tracking-wider text-gray-600">Legenda:</span>
      <ActionPlanStatusBadge status="PENDING" />
      <ActionPlanStatusBadge status="IN_PROGRESS" />
      <ActionPlanStatusBadge status="COMPLETED" />
      <ActionPlanStatusBadge status="PENDING" dueSoon />
      <ActionPlanStatusBadge status="PENDING" overdue />
    </div>
  )
}
