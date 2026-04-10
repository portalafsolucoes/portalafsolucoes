'use client'

import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface Schedule {
  id: string
  scheduleNumber?: number
  description?: string
  scheduleDate?: string
  startDate?: string
  endDate?: string
  status?: string
  createdBy?: { firstName?: string; lastName?: string }
  createdAt?: string
  updatedAt?: string
}

interface ScheduleDetailPanelProps {
  schedule: Schedule
  onClose: () => void
  onConfirm: (id: string) => void
  canEdit: boolean
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmada',
}

export function ScheduleDetailPanel({ schedule, onClose, onConfirm, canEdit }: ScheduleDetailPanelProps) {
  const isDraft = schedule.status === 'DRAFT'

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">
          {schedule.scheduleNumber ? `#${schedule.scheduleNumber}` : 'Programação'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {canEdit && isDraft && (
          <div className="p-4 border-b border-border space-y-2">
            <Button
              onClick={() => onConfirm(schedule.id)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Icon name="check_circle" className="text-base" />
              Confirmar Programação
            </Button>
          </div>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados da Programação</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="text-sm text-foreground">{schedule.description || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="text-sm text-foreground">{schedule.scheduleDate ? formatDate(schedule.scheduleDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm text-foreground">
                <span className={`px-2 py-0.5 rounded text-xs ${schedule.status === 'CONFIRMED' ? 'bg-success-light text-success-light-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABELS[schedule.status || ''] || schedule.status || '—'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Início</p>
              <p className="text-sm text-foreground">{schedule.startDate ? formatDate(schedule.startDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data Fim</p>
              <p className="text-sm text-foreground">{schedule.endDate ? formatDate(schedule.endDate) : '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Criado por</p>
              <p className="text-sm text-foreground">
                {schedule.createdBy
                  ? `${schedule.createdBy.firstName || ''} ${schedule.createdBy.lastName || ''}`.trim() || '—'
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
