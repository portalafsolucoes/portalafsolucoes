'use client'

import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} className="flex-1">
          Excluir
        </Button>
      </div>
    </Modal>
  )
}
