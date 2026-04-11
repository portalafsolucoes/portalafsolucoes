'use client'

import { Icon } from '@/components/ui/Icon'

interface PanelActionButtonsProps {
  onEdit: () => void
  onDelete: () => void
}

export function PanelActionButtons({ onEdit, onDelete }: PanelActionButtonsProps) {
  return (
    <div className="p-4 border-b border-gray-200 space-y-2">
      <button
        type="button"
        onClick={onEdit}
        className="bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
      >
        <Icon name="edit" className="text-base" />
        Editar
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
      >
        <Icon name="delete" className="text-base" />
        Excluir
      </button>
    </div>
  )
}
