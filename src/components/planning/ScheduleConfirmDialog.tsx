'use client'

import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

// ==========================================
// Types
// ==========================================

interface ResourceWarning {
  workOrderId: string
  workOrderTitle: string
  type: string
  message: string
}

interface ScheduleConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  warnings?: ResourceWarning[]
  scheduledCount?: number
  loading?: boolean
  variant?: 'confirm' | 'reprogram' | 'delete'
}

// ==========================================
// Component
// ==========================================

const WARNING_TYPE_ICONS: Record<string, string> = {
  LABOR_CONFLICT: 'group',
  NO_RESOURCES: 'inventory_2',
}

const WARNING_TYPE_COLORS: Record<string, string> = {
  LABOR_CONFLICT: 'text-amber-600 bg-amber-50 border-amber-200',
  NO_RESOURCES: 'text-gray-600 bg-gray-50 border-gray-200',
}

export function ScheduleConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  warnings, scheduledCount, loading = false, variant = 'confirm',
}: ScheduleConfirmDialogProps) {
  const hasWarnings = warnings && warnings.length > 0

  const iconConfig = {
    confirm: { bg: 'bg-blue-50', color: 'text-blue-600', icon: 'check_circle' },
    reprogram: { bg: 'bg-amber-50', color: 'text-amber-600', icon: 'refresh' },
    delete: { bg: 'bg-danger-light', color: 'text-danger', icon: 'delete' },
  }[variant]

  const confirmButtonConfig = {
    confirm: { text: 'Sim, Confirmar', className: 'bg-success text-white hover:bg-success/90' },
    reprogram: { text: 'Sim, Reprogramar', className: 'bg-amber-500 text-white hover:bg-amber-600' },
    delete: { text: 'Sim, Excluir', className: 'bg-danger text-white hover:bg-danger/90' },
  }[variant]

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title={title} size="sm" hideHeader>
      <div className="p-6">
        {/* Header with icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-[4px] flex items-center justify-center ${iconConfig.bg}`}>
            <Icon name={iconConfig.icon} className={`text-2xl ${iconConfig.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-headline text-lg font-bold text-card-foreground mb-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        {/* Scheduled count */}
        {scheduledCount != null && scheduledCount > 0 && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-[4px]">
            <Icon name="assignment" className="text-base text-blue-600" />
            <span className="text-sm text-blue-800">
              {scheduledCount} OS(s) serão {variant === 'confirm' ? 'liberadas' : variant === 'reprogram' ? 'revertidas para pendente' : 'afetadas'}
            </span>
          </div>
        )}

        {/* Resource warnings */}
        {hasWarnings && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <Icon name="warning" className="text-base" />
              Avisos de Recursos ({warnings.length})
            </div>
            <div className="max-h-[200px] overflow-auto space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-[4px] border text-sm ${
                    WARNING_TYPE_COLORS[w.type] || 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}
                >
                  <Icon
                    name={WARNING_TYPE_ICONS[w.type] || 'info'}
                    className="text-base flex-shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{w.workOrderTitle || w.workOrderId}</p>
                    <p className="text-xs opacity-80">{w.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1 min-h-[44px]"
        >
          Não, Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 min-h-[44px] ${confirmButtonConfig.className}`}
        >
          {loading ? 'Processando...' : confirmButtonConfig.text}
        </Button>
      </div>
    </Modal>
  )
}
