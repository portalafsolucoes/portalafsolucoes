'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useActiveUnit } from '@/hooks/useActiveUnit'
import { useAuth } from '@/hooks/useAuth'
import { canSwitchUnits } from '@/lib/user-roles'

export function UnitSelector() {
  const { user, role } = useAuth()
  const { activeUnitId, availableUnits, isLoading, switchUnit, isSwitching } = useActiveUnit()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Apenas SUPER_ADMIN e GESTOR com múltiplas unidades veem o seletor
  const canSwitch = canSwitchUnits(user ?? role)
  const hasMultipleUnits = availableUnits.length > 1

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading || availableUnits.length === 0) return null

  const activeUnit = availableUnits.find(u => u.id === activeUnitId)
  const displayName = activeUnit?.name || 'Selecionar unidade'

  // Se só tem 1 unidade ou não pode trocar, mostra label estático
  if (!canSwitch || !hasMultipleUnits) {
    return (
      <div className="flex items-center gap-2 rounded-[4px] bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-sm">
        <Icon name="location_on" className="text-base text-orange-500" />
        <span className="text-on-surface-variant text-xs font-medium truncate max-w-[140px]">
          {displayName}
        </span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 rounded-[4px] bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-sm transition-all hover:bg-gray-200"
      >
        <Icon name="location_on" className="text-base text-orange-500" />
        <span className="text-on-surface text-xs font-medium truncate max-w-[140px]">
          {isSwitching ? 'Trocando...' : displayName}
        </span>
        <Icon name="expand_more" className={`text-lg text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1 z-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Unidades
          </div>
          <div className="mx-2 h-px bg-gray-200" />
          {availableUnits.map(unit => (
            <button
              key={unit.id}
              onClick={() => {
                if (unit.id !== activeUnitId) {
                  switchUnit(unit.id)
                }
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                unit.id === activeUnitId
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                name={unit.id === activeUnitId ? 'radio_button_checked' : 'radio_button_unchecked'}
                className="text-base"
              />
              <span className="truncate">{unit.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
