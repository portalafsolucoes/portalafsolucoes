'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MaintenancePlanPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/maintenance-plan/standard')
  }, [router])

  return null
}
