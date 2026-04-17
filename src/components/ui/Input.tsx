import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  preserveCase?: boolean
}

const PRESERVE_CASE_INPUT_TYPES = new Set(['email', 'password', 'url', 'tel', 'number'])

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, preserveCase, type, ...props }, ref) => {
    const generatedId = useId()
    const inputId = props.id ?? generatedId
    const shouldPreserveCase = preserveCase ?? (type ? PRESERVE_CASE_INPUT_TYPES.has(type) : false)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
            {label}
            {props.required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-[4px] border border-gray-300 shadow-sm bg-white px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-gray-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !shouldPreserveCase && 'uppercase',
            error && 'ring-1 ring-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
