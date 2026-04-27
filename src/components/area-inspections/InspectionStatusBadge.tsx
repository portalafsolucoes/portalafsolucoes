'use client'

import { Icon } from '@/components/ui/Icon'

export type InspectionStatus = 'RASCUNHO' | 'EM_REVISAO' | 'FINALIZADO'

interface Props {
  status: InspectionStatus
  isOverdue?: boolean
  className?: string
}

const baseClasses =
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap'

export default function InspectionStatusBadge({ status, isOverdue, className = '' }: Props) {
  if (isOverdue && (status === 'RASCUNHO' || status === 'EM_REVISAO')) {
    return (
      <span className={`${baseClasses} bg-white text-gray-900 border-2 border-gray-900 ${className}`}>
        <Icon name="warning" className="text-sm" />
        Atrasado
      </span>
    )
  }

  if (status === 'RASCUNHO') {
    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-700 border border-gray-300 ${className}`}>
        Em preenchimento
      </span>
    )
  }

  if (status === 'EM_REVISAO') {
    return (
      <span className={`${baseClasses} bg-gray-200 text-gray-900 border border-gray-400 ${className}`}>
        Em revisão
      </span>
    )
  }

  return (
    <span className={`${baseClasses} bg-gray-900 text-white border border-gray-900 ${className}`}>
      Finalizado
    </span>
  )
}
