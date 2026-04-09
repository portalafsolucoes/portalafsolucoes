'use client'

import { Icon } from './Icon'
import { Modal } from './Modal'
import { Button } from './Button'

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
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title={title} size="sm" hideHeader>
      <div className="p-6">
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
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant={variant}
          className="flex-1"
        >
          {loading ? 'Processando...' : confirmText}
        </Button>
      </div>
    </Modal>
  )
}
