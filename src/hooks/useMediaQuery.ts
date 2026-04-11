import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Create listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    // Add listener
    media.addEventListener('change', listener)

    // Cleanup
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Hook unificado (padrão atual)
export function useResponsiveLayout() {
  const isPhone = useMediaQuery('(max-width: 767px)')      // < 768px: celular
  const isCompact = useMediaQuery('(max-width: 1279px)')   // < 1280px: sem split-panel
  const isWide = useMediaQuery('(min-width: 1280px)')      // >= 1280px: split-panel habilitado
  return { isPhone, isCompact, isWide }
}

// Aliases legados — usar useResponsiveLayout() em código novo
/** @deprecated Use useResponsiveLayout().isCompact */
export const useIsMobile = () => useMediaQuery('(max-width: 1279px)')
/** @deprecated Use useResponsiveLayout() */
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1279px)')
/** @deprecated Use useResponsiveLayout().isWide */
export const useIsDesktop = () => useMediaQuery('(min-width: 1280px)')
