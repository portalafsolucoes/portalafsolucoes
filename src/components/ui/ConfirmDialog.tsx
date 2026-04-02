'use client'

import { AlertTriangle } from 'lucide-react'
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
      {/* Dark overlay like Trello */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={!loading ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-2xl border border-border w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconBgStyles[variant]}`}>
            <AlertTriangle className={`w-6 h-6 ${iconColorStyles[variant]}`} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
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
