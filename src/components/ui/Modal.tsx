'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full'
  hideHeader?: boolean
  inPage?: boolean // Novo: renderizar dentro da página ao invés de fullscreen
}

export function Modal({ isOpen, onClose, title, children, size = 'lg', hideHeader = false, inPage = false }: ModalProps) {
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
    full: 'w-full max-w-7xl'
  }

  // Se inPage, renderizar sem overlay fixo
  if (inPage) {
    return (
      <div className="w-full bg-card rounded-lg shadow-xl border border-border max-h-[85vh] flex flex-col">
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
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
      {/* Light overlay - suave e consistente */}
      <div 
        className="fixed inset-0 bg-black/20 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 md:p-6">
        <div 
          className={`relative bg-card rounded-lg shadow-2xl border border-border ${sizeClasses[size]} max-h-[92vh] sm:max-h-[90vh] md:max-h-[88vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {!hideHeader && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className={`flex-1 overflow-y-auto ${hideHeader ? 'p-6 sm:p-8' : 'px-0 py-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
