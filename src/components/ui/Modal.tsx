'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useSidebar } from '@/contexts/SidebarContext'

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
  const { isCollapsed } = useSidebar()

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

  // Sidebar: 256px open, 64px collapsed
  const sidebarWidth = isCollapsed ? 64 : 256

  const sizeClasses = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-2xl',
    lg: 'w-full max-w-4xl',
    xl: 'w-full max-w-5xl',
    xxl: 'w-full max-w-6xl',
    full: 'w-full max-w-7xl',
    wide: '' // handled via inline style
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

  // For "wide" size: fill the content area (viewport minus sidebar) with 100px margin each side
  const isWide = size === 'wide'
  const wideStyle = isWide ? {
    width: `calc(100vw - ${sidebarWidth}px - 200px)`,
    maxWidth: '1400px'
  } : undefined

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto transition-[padding] duration-300 lg:pl-0"
      style={{ paddingLeft: `${sidebarWidth}px` }}
    >
      {/* Overlay - covers only the content area */}
      <div
        className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal - centered within the content area */}
      <div className="flex min-h-screen items-start justify-center pt-8 pb-8 px-3 sm:px-4 md:px-6">
        <div
          className={`relative bg-card rounded-[4px] ambient-ambient-shadow ${isWide ? '' : sizeClasses[size]} max-h-[88vh] flex flex-col`}
          style={wideStyle}
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
