'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'
import { usePermissions } from '@/hooks/usePermissions'

import Link from 'next/link'

interface Location {
  id: string
  name: string
  address?: string
  _count?: {
    assets: number
    workOrders: number
  }
}

export default function LocationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canCreate } = usePermissions()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !hasPermission(user, 'locations', 'view')) return
    loadLocations()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'locations', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/locations?summary=true')
      const data = await res.json()
      setLocations(data.data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !hasPermission(user, 'locations', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Localizações"
          description="Gerencie os locais físicos"
          actions={
            canCreate('locations') ? (
              <Link href="/locations/new">
                <Button className="whitespace-nowrap">
                  <Icon name="add" className="mr-2 text-base" />
                  Nova Localização
                </Button>
              </Link>
            ) : null
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full overflow-auto p-4 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
              </div>
            ) : locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Icon name="location_off" className="text-4xl text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold text-foreground">Nenhuma localização</h3>
                <p className="text-sm text-muted-foreground mt-1">Nenhuma localização encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location) => (
                  <Card key={location.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <Icon name="location_on" className="text-2xl text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {location.name}
                          </h3>
                          {location.address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {location.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                        <span>{location._count?.assets ?? 0} Ativos</span>
                        <span>{location._count?.workOrders ?? 0} Ordens</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
