'use client'

import { Icon } from '@/components/ui/Icon'

interface PanelActionButtonsProps {
  onEdit?: () => void
  onCopy?: () => void
  onPrint?: () => void
  onGenerateWorkOrder?: () => void
  onGenerateRaf?: () => void
  onFinalize?: () => void
  onDelete?: () => void
}

export function PanelActionButtons({ onEdit, onCopy, onPrint, onGenerateWorkOrder, onGenerateRaf, onFinalize, onDelete }: PanelActionButtonsProps) {
  if (!onEdit && !onCopy && !onPrint && !onGenerateWorkOrder && !onGenerateRaf && !onFinalize && !onDelete) {
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
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="bg-gray-700 text-white hover:bg-gray-600 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="content_copy" className="text-base" />
          Copiar
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
          className="bg-gray-500 text-white hover:bg-gray-400 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="assignment" className="text-base" />
          Emitir OS
        </button>
      )}
      {onGenerateRaf && (
        <button
          type="button"
          onClick={onGenerateRaf}
          className="bg-gray-300 text-gray-900 hover:bg-gray-400 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="science" className="text-base" />
          Abrir RAF
        </button>
      )}
      {onFinalize && (
        <button
          type="button"
          onClick={onFinalize}
          className="bg-gray-200 text-gray-900 hover:bg-gray-300 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="check_circle" className="text-base" />
          Finalizar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] min-h-[44px] transition-colors"
        >
          <Icon name="delete" className="text-base" />
          Excluir
        </button>
      )}
    </div>
  )
}
