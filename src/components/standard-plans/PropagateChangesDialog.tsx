'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface LinkedAssetPlanItem {
  assetMaintenancePlanId: string
  assetId: string
  assetName: string
  assetTag: string | null
  assetProtheusCode: string | null
  hasLocalOverrides: boolean
  detachedAt: string | null
  detachedBy: { id: string; firstName: string; lastName: string } | null
  isActive: boolean
  updatedAt: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedIds: string[]) => Promise<void> | void
  items: LinkedAssetPlanItem[]
  planLabel?: string
  submitting?: boolean
}

function formatAssetIdentifier(item: LinkedAssetPlanItem): string {
  const code = item.assetTag || item.assetProtheusCode
  return code ? `${code} — ${item.assetName}` : item.assetName
}

function formatDetachedBy(item: LinkedAssetPlanItem): string {
  if (!item.detachedBy) return ''
  return `${item.detachedBy.firstName} ${item.detachedBy.lastName}`.trim()
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}

export function PropagateChangesDialog({
  isOpen,
  onClose,
  onConfirm,
  items,
  planLabel,
  submitting = false,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')

  const eligible = useMemo(() => items.filter((i) => !i.hasLocalOverrides), [items])
  const detached = useMemo(() => items.filter((i) => i.hasLocalOverrides), [items])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((i) => {
      const haystack = [
        i.assetName,
        i.assetTag,
        i.assetProtheusCode,
        formatDetachedBy(i),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [items, search])

  const filteredEligibleIds = useMemo(
    () => filtered.filter((i) => !i.hasLocalOverrides).map((i) => i.assetMaintenancePlanId),
    [filtered]
  )
  const allFilteredSelected =
    filteredEligibleIds.length > 0 && filteredEligibleIds.every((id) => selectedIds.has(id))
  const someFilteredSelected =
    filteredEligibleIds.some((id) => selectedIds.has(id)) && !allFilteredSelected

  const toggleItem = (item: LinkedAssetPlanItem) => {
    if (item.hasLocalOverrides) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.assetMaintenancePlanId)) next.delete(item.assetMaintenancePlanId)
      else next.add(item.assetMaintenancePlanId)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredEligibleIds.forEach((id) => next.delete(id))
      } else {
        filteredEligibleIds.forEach((id) => next.add(id))
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
      title="Propagar alterações aos bens vinculados"
      size="lg"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-[4px]">
          <Icon name="sync" className="text-2xl text-gray-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">
              {planLabel
                ? `O plano padrão "${planLabel}" foi alterado.`
                : 'O plano padrão foi alterado.'}
            </p>
            <p>
              Selecione abaixo os planos de ativo que devem receber as alterações. Apenas
              planos não customizados podem receber propagação — planos com customizações
              locais aparecem listados como referência, mas precisam ser revertidos
              individualmente se o usuário quiser voltar ao padrão.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum bem vinculado a este plano padrão.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{eligible.length}</span>{' '}
                elegível(is)
              </span>
              <span>·</span>
              <span>
                <span className="font-medium text-foreground">{detached.length}</span>{' '}
                customizado(s)
              </span>
            </div>

            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, TAG, código..."
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
                  disabled={filteredEligibleIds.length === 0}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-sm font-medium text-foreground">
                  Selecionar elegíveis{' '}
                  {filteredEligibleIds.length > 0 && `(${filteredEligibleIds.length})`}
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
                filtered.map((item) => {
                  const isSelected = selectedIds.has(item.assetMaintenancePlanId)
                  const isCustom = item.hasLocalOverrides
                  return (
                    <label
                      key={item.assetMaintenancePlanId}
                      className={`flex items-start gap-3 px-3 py-3 ${
                        isCustom
                          ? 'bg-gray-50/70 cursor-not-allowed opacity-70'
                          : isSelected
                            ? 'bg-gray-50 cursor-pointer'
                            : 'bg-white cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isCustom}
                        onChange={() => toggleItem(item)}
                        className="mt-1 rounded border-input h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {formatAssetIdentifier(item)}
                          </span>
                          {isCustom && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-warning-light text-warning border border-warning/30">
                              <Icon name="edit_note" className="text-sm" />
                              Customizado
                            </span>
                          )}
                          {!item.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                              Inativo
                            </span>
                          )}
                        </div>
                        {isCustom && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Customizado
                            {item.detachedAt ? ` em ${formatDate(item.detachedAt)}` : ''}
                            {item.detachedBy ? ` por ${formatDetachedBy(item)}` : ''} —
                            não receberá propagação
                          </div>
                        )}
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
          <Icon name="sync" className="text-base mr-2" />
          {submitting
            ? 'Propagando...'
            : `Propagar ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
        </Button>
      </div>
    </Modal>
  )
}
