'use client'

import { Icon } from '@/components/ui/Icon'

interface PanelActionButtonsProps {
  onEdit?: () => void
  onPrint?: () => void
  onGenerateWorkOrder?: () => void
  onFinalize?: () => void
  onDelete?: () => void
}

export function PanelActionButtons({ onEdit, onPrint, onGenerateWorkOrder, onFinalize, onDelete }: PanelActionButtonsProps) {
  if (!onEdit && !onPrint && !onGenerateWorkOrder && !onFinalize && !onDelete) {
    return null
  }

  return (
    <div className="p-4 border-b border-gray-200 space-y-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="edit" className="text-base" />
          Editar
        </button>
      )}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="bg-gray-700 text-white hover:bg-gray-600 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="print" className="text-base" />
          Imprimir
        </button>
      )}
      {onGenerateWorkOrder && (
        <button
          type="button"
          onClick={onGenerateWorkOrder}
          className="bg-blue-700 text-white hover:bg-blue-600 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="assignment" className="text-base" />
          Emitir OS
        </button>
      )}
      {onFinalize && (
        <button
          type="button"
          onClick={onFinalize}
          className="bg-emerald-700 text-white hover:bg-emerald-600 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="check_circle" className="text-base" />
          Finalizar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="delete" className="text-base" />
          Excluir
        </button>
      )}
    </div>
  )
}
