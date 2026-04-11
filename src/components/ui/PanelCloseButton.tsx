import { Icon } from '@/components/ui/Icon'

interface PanelCloseButtonProps {
  onClick: () => void
  className?: string
  'aria-label'?: string
}

export function PanelCloseButton({
  onClick,
  className,
  'aria-label': ariaLabel = 'Fechar',
}: PanelCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors${className ? ` ${className}` : ''}`}
    >
      <Icon name="close" className="text-xl" />
    </button>
  )
}
