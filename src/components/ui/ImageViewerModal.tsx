'use client'

import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-7xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com controles */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-between">
          <h3 className="text-white font-semibold truncate flex-1">
            {imageName || 'Imagem'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-white hover:bg-card/20 rounded-lg transition-colors"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm font-medium min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-white hover:bg-card/20 rounded-lg transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-card/30 mx-2" />
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-card/20 rounded-lg transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-card/20 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Imagem */}
        <div className="mt-16 overflow-auto max-h-[calc(100vh-8rem)] flex items-center justify-center">
          <img 
            src={imageUrl} 
            alt={imageName || 'Imagem'}
            style={{ width: `${zoom}%` }}
            className="object-contain transition-all duration-200"
          />
        </div>

        {/* Footer com dica */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-3 text-center">
          <p className="text-white/70 text-sm">
            Clique fora da imagem para fechar
          </p>
        </div>
      </div>
    </div>
  )
}
