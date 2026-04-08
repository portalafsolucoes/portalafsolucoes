import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageContainerProps = {
  variant?: 'default' | 'narrow' | 'form' | 'full'
  children: ReactNode
  className?: string
}

const variantClasses: Record<NonNullable<PageContainerProps['variant']>, string> = {
  default: 'w-full px-4 sm:px-6 lg:px-8 py-6',
  narrow:  'mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6',
  form:    'mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-6',
  full:    'flex h-full flex-col px-4 sm:px-6 lg:px-8 py-6',
}

export function PageContainer({ variant = 'default', children, className }: PageContainerProps) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  )
}
