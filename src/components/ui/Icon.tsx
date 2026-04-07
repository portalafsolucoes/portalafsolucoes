import { cn } from '@/lib/utils'

interface IconProps {
  name: string
  className?: string
  fill?: boolean
  weight?: number
}

export function Icon({ name, className, fill = false, weight = 200 }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined leading-none', className)}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}` }}
    >
      {name}
    </span>
  )
}
