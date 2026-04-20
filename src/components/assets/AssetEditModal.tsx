'use client'

import { Modal } from '../ui/Modal'
import { AssetEditPanel } from './AssetEditPanel'

interface AssetEditModalProps {
  isOpen: boolean
  onClose: () => void
  asset: Record<string, unknown>
  onSuccess: () => void
  inPage?: boolean
}

export function AssetEditModal({ isOpen, onClose, asset, onSuccess, inPage = false }: AssetEditModalProps) {
  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" hideHeader inPage={inPage}>
      <div className="flex flex-col h-full max-h-[90vh]">
        <AssetEditPanel
          asset={asset}
          onClose={onClose}
          onSuccess={handleSuccess}
        />
      </div>
    </Modal>
  )
}
