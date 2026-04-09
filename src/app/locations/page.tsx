'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

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
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLocations()
  }, [])

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

  return (
    <PageContainer>
        <PageHeader
          icon="location_on"
          title="Localizações"
          description="Gerencie os locais físicos"
          actions={
            <Link href="/locations/new">
              <Button>
                <Icon name="add" className="mr-2 text-base" />
                Nova Localização
              </Button>
            </Link>
          }
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma localização encontrada.</p>
            </CardContent>
          </Card>
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
    </PageContainer>
  )
}
