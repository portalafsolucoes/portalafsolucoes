'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full' | 'wide'
  hideHeader?: boolean
  noPadding?: boolean
  inPage?: boolean
}

export function Modal({ isOpen, onClose, title, children, size = 'wide', hideHeader = false, noPadding = false, inPage = false }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-2xl',
    lg: 'w-full max-w-4xl',
    xl: 'w-full max-w-5xl',
    xxl: 'w-full max-w-6xl',
    full: 'w-full max-w-7xl',
    wide: 'w-[calc(100vw-200px)] max-w-[1400px]'
  }

  if (inPage) {
    return (
      <div className="w-full bg-card rounded-[4px] ambient-ambient-shadow max-h-[85vh] flex flex-col">
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-headline text-xl font-bold text-card-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        )}
        <div className={`${hideHeader ? 'p-6 sm:p-8' : 'px-0 py-0'}`}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-start justify-center pt-8 pb-8 px-3 sm:px-4 md:px-6">
        <div
          className={`relative bg-card rounded-[4px] ambient-ambient-shadow ${sizeClasses[size]} max-h-[88vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {!hideHeader && (
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="font-headline text-xl font-bold text-card-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className={`flex-1 overflow-y-auto ${noPadding ? '' : hideHeader ? 'p-6 sm:p-8' : 'px-0 py-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
