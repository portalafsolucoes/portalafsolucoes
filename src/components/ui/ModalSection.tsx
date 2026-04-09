'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

interface ModalSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function ModalSection({ title, defaultOpen = true, children }: ModalSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
      >
        <Icon name={open ? 'expand_more' : 'chevron_right'} className="text-base" />
        {title}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}
