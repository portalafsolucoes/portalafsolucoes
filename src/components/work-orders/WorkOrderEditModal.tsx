'use client'

import { WorkOrderFormModal } from './WorkOrderFormModal'

interface WorkOrderEditModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  onSuccess: () => void
  inPage?: boolean
}

// Wrapper thin que delega para WorkOrderFormModal em modo edicao.
// A UI (campos, ordem, validacao, submit) e identica a tela de criacao,
// com hidratacao da OS existente e bloqueios condicionais para OS de plano.
export function WorkOrderEditModal({
  isOpen,
  onClose,
  workOrderId,
  onSuccess,
  inPage = false,
}: WorkOrderEditModalProps) {
  return (
    <WorkOrderFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      inPage={inPage}
      mode="edit"
      workOrderId={workOrderId}
    />
  )
}
