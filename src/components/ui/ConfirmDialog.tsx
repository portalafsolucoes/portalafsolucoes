'use client'

import { Icon } from './Icon'
import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const iconBgStyles = {
    danger: 'bg-danger-light',
    warning: 'bg-warning-light',
    info: 'bg-info-light'
  }

  const iconColorStyles = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-info'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      <div className="relative bg-card rounded-[4px] ambient-ambient-shadow w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-[4px] flex items-center justify-center ${iconBgStyles[variant]}`}>
            <Icon name="warning" className={`text-2xl ${iconColorStyles[variant]}`} />
          </div>

          <div className="flex-1">
            <h3 className="font-headline text-lg font-bold text-card-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={variant}
          >
            {loading ? 'Processando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
