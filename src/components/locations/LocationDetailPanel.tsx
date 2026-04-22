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
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-black text-gray-900">{location.name}</h2>
          {location.parent && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <Icon name="subdirectory_arrow_right" className="text-base mr-1 align-middle" />
              {location.parent.name}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        {(canEdit || canDelete) && (
          <div className="p-4 border-b border-gray-200 space-y-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </button>
            )}
          </div>
        )}

        {/* Data section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Dados</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Nome</p>
              <p className="text-sm text-foreground">{location.name}</p>
            </div>
            {location.address && (
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Endereço</p>
                <p className="text-sm text-foreground">{location.address}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Latitude</p>
              <p className="text-sm text-foreground">
                {location.latitude != null ? location.latitude : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Longitude</p>
              <p className="text-sm text-foreground">
                {location.longitude != null ? location.longitude : '—'}
              </p>
            </div>
            {location.parent && (
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Local pai</p>
                <p className="text-sm text-foreground">{location.parent.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Counts section */}
        {location._count && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Vínculos</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Ativos</p>
                <p className="text-sm text-foreground">{location._count.assets}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Ordens de Serviço</p>
                <p className="text-sm text-foreground">{location._count.workOrders}</p>
              </div>
            </div>
          </div>
        )}

        {/* Map section */}
        {location.latitude != null && location.longitude != null && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Mapa</h3>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no Google Maps"
              className="relative block w-full h-56 rounded-[4px] overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity group"
            >
              <iframe
                src={`https://www.google.com/maps?q=${location.latitude},${location.longitude}&hl=pt-BR&z=15&output=embed`}
                className="w-full h-full pointer-events-none"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute inset-0 cursor-pointer" />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-[4px] shadow-sm text-[11px] font-medium text-gray-700 group-hover:bg-gray-50">
                <Icon name="open_in_new" className="text-sm" />
                Abrir no Google Maps
              </div>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
