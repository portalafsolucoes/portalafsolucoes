'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface LinkableAsset {
  id: string
  name: string
  tag: string | null
  protheusCode: string | null
  status: string
  familyId: string | null
  familyModelId: string | null
  location?: { id: string; name: string } | null
  assetArea?: { id: string; name: string } | null
  family?: { id: string; code: string | null; name: string } | null
  familyModel?: { id: string; name: string } | null
  activeMaintenancePlansCount: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedIds: string[]) => Promise<void> | void
  assets: LinkableAsset[]
  planLabel?: string
  submitting?: boolean
}

function formatAssetIdentifier(asset: LinkableAsset): string {
  const code = asset.tag || asset.protheusCode
  return code ? `${code} — ${asset.name}` : asset.name
}

function formatFamilyModel(asset: LinkableAsset): string {
  const family = asset.family
    ? asset.family.code
      ? `${asset.family.code} - ${asset.family.name}`
      : asset.family.name
    : '-'
  const model = asset.familyModel?.name || 'Genérico'
  return `${family} / ${model}`
}

export function AssetLinkingDialog({
  isOpen,
  onClose,
  onConfirm,
  assets,
  planLabel,
  submitting = false,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return assets
    return assets.filter((a) => {
      const haystack = [
        a.name,
        a.tag,
        a.protheusCode,
        a.location?.name,
        a.assetArea?.name,
        a.family?.name,
        a.familyModel?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [assets, search])

  const filteredIds = useMemo(() => filtered.map((a) => a.id), [filtered])
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))
  const someFilteredSelected =
    filteredIds.some((id) => selectedIds.has(id)) && !allFilteredSelected

  const toggleAsset = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return
    await onConfirm(Array.from(selectedIds))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bens compatíveis encontrados"
      size="lg"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-[4px]">
          <Icon name="link" className="text-2xl text-gray-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">
              {planLabel
                ? `Há bens compatíveis com o plano padrão "${planLabel}".`
                : 'Há bens compatíveis com este plano padrão.'}
            </p>
            <p>
              Selecione abaixo quais bens você deseja vincular a este plano. O conteúdo
              será copiado para cada bem e permanecerá vinculado ao padrão para permitir
              propagações futuras.
            </p>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum bem compatível disponível.
          </div>
        ) : (
          <>
            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, TAG, código, área..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected
                  }}
                  onChange={toggleAllFiltered}
                  disabled={filteredIds.length === 0}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-sm font-medium text-foreground">
                  Selecionar todos {filtered.length !== assets.length ? `(${filtered.length} de ${assets.length})` : `(${assets.length})`}
                </span>
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selecionado(s)
              </span>
            </div>

            <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-200 overflow-hidden max-h-[50vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum bem encontrado para a busca.
                </div>
              ) : (
                filtered.map((asset) => {
                  const isSelected = selectedIds.has(asset.id)
                  return (
                    <label
                      key={asset.id}
                      className={`flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAsset(asset.id)}
                        className="mt-1 rounded border-input h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {formatAssetIdentifier(asset)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                          <span>
                            <span className="font-medium">Família / Modelo:</span>{' '}
                            {formatFamilyModel(asset)}
                          </span>
                          {asset.location?.name && (
                            <span>
                              <span className="font-medium">Localização:</span>{' '}
                              {asset.location.name}
                            </span>
                          )}
                          {asset.assetArea?.name && (
                            <span>
                              <span className="font-medium">Área:</span>{' '}
                              {asset.assetArea.name}
                            </span>
                          )}
                          <span>
                            <span className="font-medium">Planos ativos:</span>{' '}
                            {asset.activeMaintenancePlansCount}
                          </span>
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 px-4 py-4 bg-gray-50 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={submitting}
        >
          Pular
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || selectedIds.size === 0}
          className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="link" className="text-base mr-2" />
          {submitting
            ? 'Vinculando...'
            : `Vincular ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
        </Button>
      </div>
    </Modal>
  )
}
