'use client'

import { Modal } from './Modal'
import { Icon } from './Icon'
import { useState } from 'react'

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName?: string
}

export function ImageViewerModal({ isOpen, onClose, imageUrl, imageName }: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(100)

  const handleDownload = () => {
    window.open(imageUrl, '_blank')
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" hideHeader noPadding>
      <div
        className="flex flex-col h-full bg-on-surface/95"
        onClick={onClose}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 bg-on-surface/50 backdrop-blur-sm flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-headline font-bold truncate flex-1">
            {imageName || 'Imagem'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-white hover:bg-white/10 rounded-[4px] transition-colors"
              title="Diminuir zoom"
            >
              <Icon name="zoom_out" className="text-xl" />
            </button>
            <span className="text-white text-sm font-medium min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-white hover:bg-white/10 rounded-[4px] transition-colors"
              title="Aumentar zoom"
            >
              <Icon name="zoom_in" className="text-xl" />
            </button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white/10 rounded-[4px] transition-colors"
              title="Baixar imagem"
            >
              <Icon name="download" className="text-xl" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/10 rounded-[4px] transition-colors"
              title="Fechar"
            >
              <Icon name="close" className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div
          className="flex-1 overflow-auto flex items-center justify-center min-h-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageName || 'Imagem'}
            style={{ width: `${zoom}%` }}
            className="object-contain transition-all duration-200"
          />
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-4 py-4 border-t border-border bg-on-surface/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white/70 text-sm flex-1 text-center">
            Clique fora da imagem para fechar
          </p>
        </div>
      </div>
    </Modal>
  )
}
