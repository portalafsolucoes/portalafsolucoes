'use client'

import { Icon } from '@/components/ui/Icon'

interface Location {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  parentId?: string | null
  parent?: { id: string; name: string } | null
  _count?: {
    assets: number
    workOrders: number
  }
}

interface Props {
  location: Location
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit?: boolean
  canDelete?: boolean
}

export function LocationDetailPanel({
  location,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Props) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">{location.name}</h2>
          {location.parent && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <Icon name="subdirectory_arrow_right" className="text-base mr-1 align-middle" />
              {location.parent.name}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {(canEdit || canDelete) && (
          <div className="p-4 border-b border-border space-y-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] border border-border hover:bg-muted transition-colors text-sm"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] border border-destructive text-destructive hover:bg-destructive/10 transition-colors text-sm"
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </button>
            )}
          </div>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm text-foreground">{location.name}</p>
            </div>
            {location.address && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm text-foreground">{location.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="text-sm text-foreground">
                {location.latitude != null ? location.latitude : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="text-sm text-foreground">
                {location.longitude != null ? location.longitude : '—'}
              </p>
            </div>
            {location.parent && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Local pai</p>
                <p className="text-sm text-foreground">{location.parent.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Counts section */}
        {location._count && (
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Vínculos</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-sm text-foreground">{location._count.assets}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordens de Serviço</p>
                <p className="text-sm text-foreground">{location._count.workOrders}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
