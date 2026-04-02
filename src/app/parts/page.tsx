'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartsPage() {
  const router = useRouter()

  useEffect(() => {
    // Módulo de peças foi removido do sistema
    router.push('/work-orders')
  }, [router])

  return null
}
