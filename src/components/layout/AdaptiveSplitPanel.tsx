'use client'

/**
 * AdaptiveSplitPanel
 *
 * Encapsula o padrão split-panel responsivo usado em todas as telas de listagem.
 * - Desktop amplo (>= 1280px): lista e painel lado a lado em w-1/2 cada
 * - Tablet / desktop compacto (< 1280px): lista ocupa 100%, painel abre como sheet lateral
 * - Celular (< 768px): lista ocupa 100%, painel abre como overlay fullscreen
 *
 * Substitui os checks manuais `!isMobile && showSidePanel` repetidos em 17+ páginas.
 */

import { type ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'

interface AdaptiveSplitPanelProps {
  /** Conteúdo da lista (tabela, grid de cards, etc.) */
  list: ReactNode
  /** Conteúdo do painel de detalhe/edição (renderizado como inPage no desktop) */
  panel: ReactNode | null
  /** Controla se o painel está visível */
  showPanel: boolean
  /** Título exibido no header do sheet/modal no compact mode */
  panelTitle?: string
  /** Callback para fechar o painel */
  onClosePanel: () => void
}

export function AdaptiveSplitPanel({
  list,
  panel,
  showPanel,
  panelTitle = '',
  onClosePanel,
}: AdaptiveSplitPanelProps) {
  const { isWide } = useResponsiveLayout()

  // Desktop amplo (>= 1280px): split 50/50 lado a lado
  if (isWide) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className={`${showPanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden`}>
          {list}
        </div>
        {showPanel && panel && (
          <div className="w-1/2 min-w-0">
            {panel}
          </div>
        )}
      </div>
    )
  }

  // Compact (< 1280px): lista sempre em tela cheia, painel como sheet/fullscreen via Modal
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-full overflow-hidden">
        {list}
      </div>
      {showPanel && panel && (
        <Modal
          isOpen={showPanel}
          onClose={onClosePanel}
          title={panelTitle}
          size="wide"
          noPadding
          hideHeader
        >
          {panel}
        </Modal>
      )}
    </div>
  )
}
