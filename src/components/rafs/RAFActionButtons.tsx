
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface RAFActionButtonsProps {
  rafId: string
  handleDelete: (id: string) => void
  isCardView?: boolean
}

export function RAFActionButtons({
  rafId,
  handleDelete,
  isCardView = false,
}: RAFActionButtonsProps) {
  const router = useRouter()

  return (
    <div className={isCardView ? "flex lg:flex-col gap-1.5" : "flex justify-end gap-1"}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/rafs/${rafId}`)}
        className={isCardView ? "flex-1 lg:flex-initial text-xs px-2 py-1" : "text-xs px-2 py-1"}
      >
        <Icon name="visibility" className={isCardView ? "text-sm mr-1" : "text-sm"} />
        {isCardView && "Ver"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/rafs/${rafId}/edit`)}
        className={isCardView ? "flex-1 lg:flex-initial text-xs px-2 py-1" : "text-xs px-2 py-1"}
      >
        <Icon name="edit" className={isCardView ? "text-sm mr-1" : "text-sm"} />
        {isCardView && "Editar"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDelete(rafId)}
        className={isCardView ? "flex-1 lg:flex-initial text-xs px-2 py-1 text-danger hover:bg-danger-light" : "text-xs px-2 py-1 text-danger hover:bg-danger-light"}
      >
        <Icon name="delete" className={isCardView ? "text-sm mr-1" : "text-sm"} />
        {isCardView && "Excluir"}
      </Button>
    </div>
  )
}
