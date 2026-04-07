'use client'

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

  if (!isOpen) return null

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-on-surface/50 backdrop-blur-sm p-4 flex items-center justify-between rounded-t-[4px]">
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
        <div className="mt-16 overflow-auto max-h-[calc(100vh-8rem)] flex items-center justify-center">
          <img
            src={imageUrl}
            alt={imageName || 'Imagem'}
            style={{ width: `${zoom}%` }}
            className="object-contain transition-all duration-200"
          />
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-on-surface/50 backdrop-blur-sm p-3 text-center rounded-b-[4px]">
          <p className="text-white/70 text-sm">
            Clique fora da imagem para fechar
          </p>
        </div>
      </div>
    </div>
  )
}
