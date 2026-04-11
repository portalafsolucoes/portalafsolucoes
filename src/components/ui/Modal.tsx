'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useSidebar } from '@/contexts/SidebarContext'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'

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
  const { isPhone, isWide } = useResponsiveLayout()

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

  // Sidebar: 256px expandida, 64px colapsada — só aplicar offset em desktop amplo (xl+)
  const sidebarWidth = isWide ? (isCollapsed ? 64 : 256) : 0

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
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        {!hideHeader && (
          <div className="flex-shrink-0 flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }

  const isWideSizeModal = size === 'wide'

  // Desktop amplo: centralizar descontando a sidebar
  // Tablet / desktop compacto: sheet lateral 90% da largura, slide-in da direita
  // Phone: fullscreen

  if (isPhone && size !== 'sm') {
    // Fullscreen no celular (exceto modais de confirmação sm)
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-card animate-fadeIn">
        {!hideHeader && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-headline text-base font-black text-gray-900 truncate pr-4">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors flex-shrink-0"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        )}
        <div className={`flex-1 min-h-0 overflow-y-auto safe-bottom ${noPadding ? '' : hideHeader ? 'p-4' : ''}`}>
          {children}
        </div>
      </div>
    )
  }

  if (!isWide && size !== 'sm') {
    // Sheet lateral no tablet / desktop compacto (768px - 1279px)
    return (
      <div className="fixed inset-0 z-50">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Painel deslizante pela direita */}
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-card flex flex-col animate-slideInRight shadow-2xl">
          {!hideHeader && (
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-headline text-lg font-black text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
          )}
          <div className={`flex-1 min-h-0 overflow-y-auto safe-bottom ${noPadding ? '' : hideHeader ? 'p-6' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Desktop amplo ou modal sm (confirmação): comportamento original centralizado
  const wideStyle = isWideSizeModal ? {
    width: `calc(100vw - ${sidebarWidth}px - 200px)`,
    maxWidth: '1400px'
  } : undefined

  return (
    <div
      className="fixed inset-0 z-50 transition-[padding] duration-300"
      style={{ paddingLeft: `${sidebarWidth}px` }}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centering wrapper */}
      <div className="relative flex min-h-full items-start justify-center pt-8 pb-8 px-4 md:px-6 overflow-y-auto">
        <div
          className={`relative bg-card rounded-[4px] ambient-ambient-shadow ${isWideSizeModal ? '' : sizeClasses[size]} max-h-[88vh] flex flex-col`}
          style={wideStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {!hideHeader && (
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-headline text-lg font-black text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? '' : hideHeader ? 'p-6 sm:p-8' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
