'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BasicRegistrationsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/basic-registrations/maintenance-types')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent" />
    </div>
  )
}
