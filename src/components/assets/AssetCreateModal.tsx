'use client'

import { Modal } from '../ui/Modal'
import { AssetCreatePanel } from './AssetCreatePanel'

interface AssetCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentAsset?: { id: string; name: string }
  inPage?: boolean
}

export function AssetCreateModal({ isOpen, onClose, onSuccess, parentAsset, inPage = false }: AssetCreateModalProps) {
  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xxl" hideHeader noPadding>
      <AssetCreatePanel
        onClose={onClose}
        onSuccess={handleSuccess}
        parentAsset={parentAsset}
      />
    </Modal>
  )
}
