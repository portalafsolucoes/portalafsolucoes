'use client'

import { useState, useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getVariableInfo } from '@/app/gep/variableDescriptions'
import { getVariableType } from '@/app/gep/variables'

interface Variable {
  key: string
  name: string
  unit: string
  sector: string
}

interface VariableSelectorProps {
  isOpen: boolean
  onClose: () => void
  variables: Variable[]
  selectedVariables: string[]
  onToggleVariable: (key: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

type CategoryType = 'ALL' | 'VAZAO' | 'TEMPERATURA' | 'PRESSAO' | 'TENSAO' | 'POTENCIA' | 'STATUS' | 'CORRENTE' | 'VELOCIDADE'

interface Category {
  id: CategoryType
  name: string
  icon: string
}

const CATEGORIES: Category[] = [
  { id: 'ALL', name: 'Todas', icon: 'bar_chart' },
  { id: 'VAZAO', name: 'Vazao', icon: 'water_drop' },
  { id: 'TEMPERATURA', name: 'Temperatura', icon: 'thermostat' },
  { id: 'PRESSAO', name: 'Pressao', icon: 'speed' },
  { id: 'TENSAO', name: 'Tensao Eletrica', icon: 'power' },
  { id: 'POTENCIA', name: 'Potencia', icon: 'power_settings_new' },
  { id: 'STATUS', name: 'Status', icon: 'circle' },
  { id: 'CORRENTE', name: 'Corrente Eletrica', icon: 'bolt' },
  { id: 'VELOCIDADE', name: 'Velocidade', icon: 'settings' }
]

// Identificar tipo de variavel
const isTotalizerVariable = (varName: string): boolean => {
  const totalizerPatterns = [
    /TOTAL/i, /TOT_/i, /CONSUMO/i, /CONS_ENE/i, /ENE_CONS/i,
    /ConsumoKWh/i, /ACUMULADO/i, /SOMA_TOT/i
  ]
  return totalizerPatterns.some(pattern => pattern.test(varName))
}

export function VariableSelector({
  isOpen,
  onClose,
  variables,
  selectedVariables,
  onToggleVariable,
  onSelectAll,
  onClearAll
}: VariableSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL')

  // Funcao para verificar se variavel pertence a uma categoria
  const matchesCategory = (variable: Variable, categoryId: CategoryType): boolean => {
    if (categoryId === 'ALL') return true

    const info = getVariableInfo(variable.key, variable.sector)
    const varType = getVariableType(info.name, info.unit)

    return varType === categoryId
  }

  // Filtrar variaveis
  const filteredVariables = useMemo(() => {
    return variables.filter(v => {
      const info = getVariableInfo(v.key, v.sector)
      const searchLower = searchTerm.toLowerCase()

      // Filtro de busca
      const matchesSearch = !searchTerm || (
        v.key.toLowerCase().includes(searchLower) ||
        info.name.toLowerCase().includes(searchLower) ||
        info.description.toLowerCase().includes(searchLower)
      )

      // Filtro de categoria
      const matchesCat = matchesCategory(v, activeCategory)

      return matchesSearch && matchesCat
    })
  }, [variables, searchTerm, activeCategory])

  // Contar variaveis por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      ALL: variables.length,
      VAZAO: 0,
      TEMPERATURA: 0,
      PRESSAO: 0,
      TENSAO: 0,
      POTENCIA: 0,
      STATUS: 0,
      CORRENTE: 0,
      VELOCIDADE: 0
    }

    variables.forEach(v => {
      const info = getVariableInfo(v.key, v.sector)
      const varType = getVariableType(info.name, info.unit)
      if (varType !== 'ALL' && varType in counts) {
        counts[varType as CategoryType]++
      }
    })

    return counts
  }, [variables])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Variaveis"
      size="wide"
      noPadding
    >
      {/* Subtitle */}
      <div className="px-6 py-2 text-sm text-muted-foreground border-b border-border">
        {selectedVariables.length} de {variables.length} variaveis selecionadas
      </div>

      {/* Categories Filter */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((category) => {
            const iconName = category.icon
            const isActive = activeCategory === category.id
            const count = categoryCounts[category.id]

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[4px] font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white ambient-shadow'
                    : 'bg-surface-low text-foreground hover:bg-surface-high'
                }`}
              >
                <Icon name={iconName} className="text-base" />
                <span>{category.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-surface-high'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por codigo, nome ou descricao..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {filteredVariables.length} variaveis encontradas
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Selecionar Todas ({filteredVariables.length})
            </Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Limpar Selecao
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-surface sticky top-0 z-10">
            <tr>
              <th className="w-12 p-3 text-left"></th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Codigo</th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unidade</th>
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descricao</th>
            </tr>
          </thead>
          <tbody>
            {filteredVariables.map((variable) => {
              const info = getVariableInfo(variable.key, variable.sector)
              const isSelected = selectedVariables.includes(variable.key)
              const isTotal = isTotalizerVariable(variable.key) || isTotalizerVariable(info.name)

              return (
                <tr
                  key={variable.key}
                  onClick={() => onToggleVariable(variable.key)}
                  className={`cursor-pointer hover:bg-surface border-b transition-colors ${
                    isSelected ? 'bg-surface' : ''
                  }`}
                >
                  <td className="p-3">
                    {isSelected ? (
                      <Icon name="check_box" className="text-xl text-primary" />
                    ) : (
                      <Icon name="check_box_outline_blank" className="text-xl text-muted-foreground" />
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{variable.key}</td>
                  <td className="p-3 font-medium">{info.name}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-surface-low text-foreground">
                      {isTotal ? 'Total' : 'Media'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground font-medium">{info.unit}</td>
                  <td className="p-3 text-sm text-muted-foreground">{info.description}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredVariables.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="search" className="text-4xl mb-2" />
            <p className="font-medium">Nenhuma variavel encontrada</p>
            <p className="text-sm mt-1">Tente ajustar os filtros ou o termo de busca</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={onClose} className="flex-1">
          <Icon name="check" className="text-base mr-2" />
          Confirmar Selecao ({selectedVariables.length})
        </Button>
      </div>
    </Modal>
  )
}
