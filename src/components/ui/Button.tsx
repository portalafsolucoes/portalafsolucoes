import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'info' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-[4px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      primary: 'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-ring',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover focus-visible:ring-ring',
      accent: 'bg-accent-orange text-white hover:bg-accent-orange/90 focus-visible:ring-ring',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus-visible:ring-ring',
      ghost: 'hover:bg-surface-low focus-visible:ring-ring text-foreground',
      danger: 'bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-ring',
      warning: 'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-ring',
      info: 'bg-info text-info-foreground hover:bg-info/90 focus-visible:ring-ring'
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-lg'
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
