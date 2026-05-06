'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// PrintPortal — wrapper canonico para print views (OS, RAF, SS).
//
// Resolve dois problemas:
//   1. AppShell vazando no print: o AppShell envolve toda pagina autenticada
//      em <div className="h-screen overflow-hidden"> + <main overflow-hidden>.
//      Em modo print esse overflow:hidden recortava o conteudo na altura da
//      viewport, impedindo paginacao multi-pagina A4.
//   2. Sidebar/Header/conteudo da pagina aparecendo na impressao: o overlay
//      antigo virava `position: static` em print mas convivia com o resto
//      do DOM.
//
// Solucao:
//   - Render via React Portal direto no document.body (fora da hierarquia
//     do AppShell).
//   - Marca o no com data-print-portal=""; o estilo global esconde tudo
//     em body que NAO seja esse no durante @media print.
//   - Tambem neutraliza overflow:hidden em html/body para permitir o
//     fluxo natural de paginacao via @page.

interface PrintPortalProps {
  children: ReactNode
}

export function PrintPortal({ children }: PrintPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div data-print-portal="" className="print-portal-root fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Esconde tudo no body exceto o portal de impressao */
          body > *:not([data-print-portal]) {
            display: none !important;
          }
          .print-portal-root {
            position: static !important;
            background: white !important;
            overflow: visible !important;
            inset: auto !important;
            z-index: auto !important;
          }
          .print-portal-toolbar { display: none !important; }
          .print-portal-pages {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            gap: 0 !important;
          }
          .print-portal-page {
            box-shadow: none !important;
            padding: 0 !important;
            width: 100% !important;
            margin: 0 !important;
          }
          .print-portal-page + .print-portal-page {
            break-before: page;
            page-break-before: always;
          }
          /* Regras de quebra de pagina internas — usadas pelas folhas */
          .print-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-block-keep {
            break-inside: avoid-page;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
      {children}
    </div>,
    document.body,
  )
}
