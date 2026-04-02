'use client';

import { useState, useMemo } from 'react';
import { X, Search, CheckSquare, Square, Zap, Activity, Thermometer, Gauge, Settings, BarChart3, Droplet, Plug, Power, Circle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getVariableInfo } from '@/app/gep/variableDescriptions';
import { getVariableType } from '@/app/gep/variables';

interface Variable {
  key: string;
  name: string;
  unit: string;
  sector: string;
}

interface VariableSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  variables: Variable[];
  selectedVariables: string[];
  onToggleVariable: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

type CategoryType = 'ALL' | 'VAZAO' | 'TEMPERATURA' | 'PRESSAO' | 'TENSAO' | 'POTENCIA' | 'STATUS' | 'CORRENTE' | 'VELOCIDADE';

interface Category {
  id: CategoryType;
  name: string;
  icon: any;
}

const CATEGORIES: Category[] = [
  { id: 'ALL', name: 'Todas', icon: BarChart3 },
  { id: 'VAZAO', name: 'Vazão', icon: Droplet },
  { id: 'TEMPERATURA', name: 'Temperatura', icon: Thermometer },
  { id: 'PRESSAO', name: 'Pressão', icon: Gauge },
  { id: 'TENSAO', name: 'Tensão Elétrica', icon: Plug },
  { id: 'POTENCIA', name: 'Potência', icon: Power },
  { id: 'STATUS', name: 'Status', icon: Circle },
  { id: 'CORRENTE', name: 'Corrente Elétrica', icon: Zap },
  { id: 'VELOCIDADE', name: 'Velocidade', icon: Settings }
];

// Identificar tipo de variável
const isTotalizerVariable = (varName: string): boolean => {
  const totalizerPatterns = [
    /TOTAL/i, /TOT_/i, /CONSUMO/i, /CONS_ENE/i, /ENE_CONS/i,
    /ConsumoKWh/i, /ACUMULADO/i, /SOMA_TOT/i
  ];
  return totalizerPatterns.some(pattern => pattern.test(varName));
};

export function VariableSelector({
  isOpen,
  onClose,
  variables,
  selectedVariables,
  onToggleVariable,
  onSelectAll,
  onClearAll
}: VariableSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');

  // Função para verificar se variável pertence a uma categoria
  const matchesCategory = (variable: Variable, categoryId: CategoryType): boolean => {
    if (categoryId === 'ALL') return true;
    
    const info = getVariableInfo(variable.key, variable.sector);
    const varType = getVariableType(info.name, info.unit);
    
    return varType === categoryId;
  };

  // Filtrar variáveis
  const filteredVariables = useMemo(() => {
    return variables.filter(v => {
      const info = getVariableInfo(v.key, v.sector);
      const searchLower = searchTerm.toLowerCase();
      
      // Filtro de busca
      const matchesSearch = !searchTerm || (
        v.key.toLowerCase().includes(searchLower) ||
        info.name.toLowerCase().includes(searchLower) ||
        info.description.toLowerCase().includes(searchLower)
      );
      
      // Filtro de categoria
      const matchesCat = matchesCategory(v, activeCategory);
      
      return matchesSearch && matchesCat;
    });
  }, [variables, searchTerm, activeCategory]);

  // Contar variáveis por categoria
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
    };
    
    variables.forEach(v => {
      const info = getVariableInfo(v.key, v.sector);
      const varType = getVariableType(info.name, info.unit);
      if (varType !== 'ALL' && varType in counts) {
        counts[varType as CategoryType]++;
      }
    });
    
    return counts;
  }, [variables]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Selecionar Variáveis</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedVariables.length} de {variables.length} variáveis selecionadas
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Categories Filter */}
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              const count = categoryCounts[category.id];
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredVariables.length} variáveis encontradas
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onSelectAll}>
                Selecionar Todas ({filteredVariables.length})
              </Button>
              <Button variant="outline" size="sm" onClick={onClearAll}>
                Limpar Seleção
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-12 p-3 text-left"></th>
                <th className="p-3 text-left font-semibold">Código</th>
                <th className="p-3 text-left font-semibold">Nome</th>
                <th className="p-3 text-left font-semibold">Tipo</th>
                <th className="p-3 text-left font-semibold">Unidade</th>
                <th className="p-3 text-left font-semibold">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariables.map((variable) => {
                const info = getVariableInfo(variable.key, variable.sector);
                const isSelected = selectedVariables.includes(variable.key);
                const isTotal = isTotalizerVariable(variable.key) || isTotalizerVariable(info.name);
                
                return (
                  <tr
                    key={variable.key}
                    onClick={() => onToggleVariable(variable.key)}
                    className={`cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-600">{variable.key}</td>
                    <td className="p-3 font-medium">{info.name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        isTotal 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isTotal ? '📊 Total' : '📈 Média'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600 font-medium">{info.unit}</td>
                    <td className="p-3 text-sm text-gray-600">{info.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredVariables.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-medium">Nenhuma variável encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou o termo de busca</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onClose}>
            Confirmar Seleção ({selectedVariables.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
