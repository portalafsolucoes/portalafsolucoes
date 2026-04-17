'use client'

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { ALL_VARIABLES_LIST, SECTORS } from './variables';
import { VariableSelector } from '@/components/gep/VariableSelector';
import { getVariableInfo } from './variableDescriptions';

// Função para determinar o turno baseado na hora
const getShift = (time: string): 'A' | 'B' | 'C' | 'D' => {
  const hour = parseInt(time.split(':')[0]);
  
  if (hour >= 1 && hour < 7) return 'A';  // Turno A: 01h às 07h
  if (hour >= 7 && hour < 13) return 'B'; // Turno B: 07h às 13h
  if (hour >= 13 && hour < 19) return 'C'; // Turno C: 13h às 19h
  return 'D'; // Turno D: 19h às 01h
};

const SHIFT_NAMES = {
  A: 'Turno A (01h - 07h)',
  B: 'Turno B (07h - 13h)',
  C: 'Turno C (13h - 19h)',
  D: 'Turno D (19h - 01h)'
};

const SHIFT_COLORS = {
  A: 'bg-surface',
  B: 'bg-surface',
  C: 'bg-surface',
  D: 'bg-surface'
};

// Identificar variáveis que são TOTALIZADORES (devem usar diferença, não média)
const isTotalizerVariable = (varName: string): boolean => {
  const totalizerPatterns = [
    /TOTAL/i,           // Total Calcário, Total Gesso, Total Escória
    /TOT_/i,            // TOT_SEC, TOT_UMI
    /CONSUMO/i,         // Consumo Energia
    /CONS_ENE/i,        // CONS_ENE
    /ENE_CONS/i,        // ENE_CONS
    /ConsumoKWh/i,      // CCM ConsumoKWh
    /ACUMULADO/i,       // Total Acumulado
    /SOMA_TOT/i,        // Soma Total
  ];
  
  return totalizerPatterns.some(pattern => pattern.test(varName));
};

// LocalStorage keys
const STORAGE_KEYS = {
  SECTOR: 'gep_selected_sector',
  VARIABLES: 'gep_selected_variables',
  VIEW_MODE: 'gep_view_mode'
};

export default function GEPPage() {
  const [selectedSector, setSelectedSector] = useState<string>('MOAGEM_2');
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [gepData, setGepData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'selector' | 'chart' | 'table'>('selector');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('2025-11-02');
  const [displayMode, setDisplayMode] = useState<'shifts' | 'general'>('shifts'); // Modo de visualização: turnos ou geral
  const [chartScaleMode, setChartScaleMode] = useState<'real' | 'normalized'>('normalized'); // Modo de escala do gráfico
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'time', direcao: 'asc' });
  const [ordenacaoTurno, setOrdenacaoTurno] = useState<Record<string, { campo: string; direcao: 'asc' | 'desc' }>>({})

  // Carregar seleções do localStorage ao montar (apenas uma vez)
  useEffect(() => {
    const savedSector = localStorage.getItem(STORAGE_KEYS.SECTOR);
    const savedVariables = localStorage.getItem(STORAGE_KEYS.VARIABLES);
    const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);

    if (savedSector) setSelectedSector(savedSector);
    if (savedVariables) {
      try {
        const parsed = JSON.parse(savedVariables);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedVariables(parsed);
        }
      } catch (e) {
        console.error('Erro ao carregar variáveis salvas:', e);
      }
    }
    if (savedViewMode) setViewMode(savedViewMode as any);
    
    setIsInitialLoad(false);
  }, []);

  // Salvar setor no localStorage
  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem(STORAGE_KEYS.SECTOR, selectedSector);
    }
  }, [selectedSector, isInitialLoad]);

  // Salvar variáveis no localStorage
  useEffect(() => {
    if (!isInitialLoad && selectedVariables.length > 0) {
      localStorage.setItem(STORAGE_KEYS.VARIABLES, JSON.stringify(selectedVariables));
    }
  }, [selectedVariables, isInitialLoad]);

  // Salvar modo de visualização no localStorage
  useEffect(() => {
    if (!isInitialLoad) {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
    }
  }, [viewMode, isInitialLoad]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const filteredVariables = selectedSector === 'ALL' ? ALL_VARIABLES_LIST : ALL_VARIABLES_LIST.filter(v => v.sector === selectedSector);

  // Função de alternância de ordenação para tabela geral
  const alternarOrdenacao = (campo: string) => {
    if (ordenacao.campo === campo) {
      setOrdenacao({
        campo,
        direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setOrdenacao({
        campo,
        direcao: 'asc',
      });
    }
  };

  // Função de alternância de ordenação para tabelas por turno
  const alternarOrdenacaoTurno = (turno: string, campo: string) => {
    const ordenacaoAtual = ordenacaoTurno[turno] || { campo: 'time', direcao: 'asc' };
    
    if (ordenacaoAtual.campo === campo) {
      setOrdenacaoTurno({
        ...ordenacaoTurno,
        [turno]: {
          campo,
          direcao: ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc',
        },
      });
    } else {
      setOrdenacaoTurno({
        ...ordenacaoTurno,
        [turno]: {
          campo,
          direcao: 'asc',
        },
      });
    }
  };

  // Função para ordenar dados
  const ordenarDados = (dados: any[], campo: string, direcao: 'asc' | 'desc') => {
    return [...dados].sort((a, b) => {
      let valorA = a[campo];
      let valorB = b[campo];

      // Tratamento especial para hora (time)
      if (campo === 'time') {
        const hourA = parseInt(valorA.split(':')[0]);
        const hourB = parseInt(valorB.split(':')[0]);
        const adjustedA = hourA === 0 ? 24 : hourA;
        const adjustedB = hourB === 0 ? 24 : hourB;
        return direcao === 'asc' ? adjustedA - adjustedB : adjustedB - adjustedA;
      }

      // Para valores numéricos
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return direcao === 'asc' ? valorA - valorB : valorB - valorA;
      }

      // Para strings
      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return direcao === 'asc' 
          ? valorA.localeCompare(valorB) 
          : valorB.localeCompare(valorA);
      }

      return 0;
    });
  };

  useEffect(() => {
    // Ao mudar setor MANUALMENTE (não no carregamento inicial)
    // Limpar variáveis selecionadas e pegar as 5 primeiras do novo setor
    if (!isInitialLoad) {
      const sectorVars = filteredVariables.slice(0, 5).map(v => v.key);
      setSelectedVariables(sectorVars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, isInitialLoad]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!selectedDate) {
        console.log('Aguardando seleção de data');
        setLoading(false);
        return;
      }
      
      // Carregar dados do dia inteiro: 01h até 01h do dia seguinte
      // O Turno D vai de 19h-23h do dia selecionado + 00h do dia seguinte
      const startDateTime = `${selectedDate}T01:00`;
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      const endDateTime = `${nextDayStr}T01:00`; // Incluir 00h do dia seguinte (até 01h não-inclusive)
      
      console.log('Carregando dados do dia:', { selectedDate, startDateTime, endDateTime });
      
      const response = await fetch(`/api/gep/data?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}`);
      const result = await response.json();
      
      if (result.error) {
        console.error('Erro da API:', result.error);
        setLoading(false);
        return;
      }
      
      const data = result.data || [];
      
      // Validar que temos dados para todos os turnos (4 turnos x 6 horas = 24 leituras mínimas)
      if (data.length < 24) {
        console.warn(`Dados incompletos: recebido ${data.length} leituras, esperado 24`);
      }
      
      setGepData(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVariable = (key: string) => {
    setSelectedVariables(prev => prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key]);
  };

  // Verificar máquinas rodando usando variável indicadora
  const moagem1Running = gepData.some(d => (d.Z01_VAR_001 || 0) >= 1);
  const moagem2Running = gepData.some(d => (d.Z02_VAR_001 || 0) >= 1);
  const moagem3Running = gepData.some(d => (d.Z03_VAR_001 || 0) >= 1);
  const secadorRunning = gepData.some(d => (d.S01_VAR_01 || 0) >= 1);

  // Adicionar hora 00:00 se não existir (para completar Turno D)
  let completeGepData = [...gepData];
  const hasZeroHour = gepData.some(d => d.time === '00:00');
  if (!hasZeroHour && gepData.length === 23) {
    // Adicionar 00:00 com valores nulos
    const zeroHourRow: any = {
      time: '00:00',
      date: new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0]
    };
    // Copiar todas as variáveis com valor 0
    Object.keys(gepData[0] || {}).forEach(key => {
      if (key !== 'time' && key !== 'date' && key !== 'dateTime') {
        zeroHourRow[key] = 0;
      }
    });
    completeGepData.push(zeroHourRow);
    // Ordenar por hora
    completeGepData.sort((a, b) => {
      const hourA = parseInt(a.time.split(':')[0]);
      const hourB = parseInt(b.time.split(':')[0]);
      // 00:00 deve vir por último
      if (hourA === 0) return 1;
      if (hourB === 0) return -1;
      return hourA - hourB;
    });
  }

  // Calcular min/max para cada variável (para normalização)
  const variableStats: Record<string, { min: number; max: number; range: number }> = {};
  
  selectedVariables.forEach(varKey => {
    const values = completeGepData.map(row => row[varKey] || 0).filter(v => v !== null && !isNaN(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    variableStats[varKey] = { min, max, range };
  });

  // Preparar dados para o gráfico com normalização Min-Max (0-100%)
  const chartData = completeGepData.map(row => {
    const dataPoint: any = { time: row.time };
    
    selectedVariables.forEach(varKey => {
      const realValue = row[varKey] || 0;
      
      if (chartScaleMode === 'normalized') {
        // Normalização Min-Max: (valor - min) / (max - min) * 100
        const stats = variableStats[varKey];
        const normalizedValue = stats.range > 0 
          ? ((realValue - stats.min) / stats.range) * 100 
          : 0;
        
        dataPoint[varKey] = normalizedValue;
        dataPoint[`${varKey}_real`] = realValue; // Manter valor real para tooltip
      } else {
        // Modo valores reais
        dataPoint[varKey] = realValue;
      }
    });
    
    return dataPoint;
  });

  // Agrupar dados por turno - SEMPRE 4 turnos com 6 leituras cada
  // Regras dos turnos (para um dia específico):
  // - Turno A: 01h, 02h, 03h, 04h, 05h, 06h
  // - Turno B: 07h, 08h, 09h, 10h, 11h, 12h
  // - Turno C: 13h, 14h, 15h, 16h, 17h, 18h
  // - Turno D: 19h, 20h, 21h, 22h, 23h, 00h (do dia seguinte)
  
  const groupedByDateAndShift: Array<{ date: string; shift: 'A' | 'B' | 'C' | 'D'; data: any[]; error?: string }> = [];

  // Organizar por turno
  const shiftA: any[] = [];
  const shiftB: any[] = [];
  const shiftC: any[] = [];
  const shiftD: any[] = [];
  
  completeGepData.forEach(row => {
    const hour = parseInt(row.time.split(':')[0]);
    
    if (hour >= 1 && hour <= 6) {
      shiftA.push(row);
    } else if (hour >= 7 && hour <= 12) {
      shiftB.push(row);
    } else if (hour >= 13 && hour <= 18) {
      shiftC.push(row);
    } else if (hour >= 19 && hour <= 23) {
      shiftD.push(row);
    } else if (hour === 0) {
      // Hora 00h pertence ao Turno D
      shiftD.push(row);
    }
  });

  // Ordenar cada turno
  const sortShift = (data: any[]) => {
    return data.sort((a, b) => {
      const hourA = parseInt(a.time.split(':')[0]);
      const hourB = parseInt(b.time.split(':')[0]);
      // Para turno D, 00h vem depois de 19-23
      const adjustedA = hourA === 0 ? 24 : hourA;
      const adjustedB = hourB === 0 ? 24 : hourB;
      return adjustedA - adjustedB;
    });
  };

  // Criar turnos SEMPRE na ordem A, B, C, D com validação
  const shifts: Array<{ shift: 'A' | 'B' | 'C' | 'D'; data: any[]; expectedHours: number[] }> = [
    { shift: 'A', data: sortShift(shiftA), expectedHours: [1, 2, 3, 4, 5, 6] },
    { shift: 'B', data: sortShift(shiftB), expectedHours: [7, 8, 9, 10, 11, 12] },
    { shift: 'C', data: sortShift(shiftC), expectedHours: [13, 14, 15, 16, 17, 18] },
    { shift: 'D', data: sortShift(shiftD), expectedHours: [19, 20, 21, 22, 23, 0] }
  ];

  shifts.forEach(({ shift, data, expectedHours }) => {
    let error: string | undefined;
    let finalData = [...data];
    
    // VALIDAÇÃO CRÍTICA: Cada turno DEVE ter exatamente 6 leituras
    if (data.length !== 6) {
      error = `ERRO: Turno ${shift} tem ${data.length} leituras, esperado 6!`;
      console.warn(`Turno ${shift}: ${data.length} leituras (esperado 6). Horas: ${data.map(r => r.time).join(', ')}`);
      
      // WORKAROUND: Se faltar o horário 00h no Turno D, adicionar um registro vazio
      const hours = data.map(r => parseInt(r.time.split(':')[0]));
      const missingHours = expectedHours.filter(h => !hours.includes(h));
      
      if (shift === 'D' && missingHours.includes(0) && data.length === 5) {
        console.warn(`WORKAROUND: Adicionando hora 00h vazia no Turno D`);
        // Criar registro vazio para 00h com as mesmas variáveis
        const emptyRow: any = { time: '00:00', date: new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0] };
        selectedVariables.forEach(varKey => {
          emptyRow[varKey] = null;
        });
        finalData.push(emptyRow);
        finalData = sortShift(finalData);
        error = undefined; // Remover erro pois foi corrigido
      }
    }
    
    // Validar que as horas estão corretas
    const hours = finalData.map(r => parseInt(r.time.split(':')[0]));
    const missingHours = expectedHours.filter(h => !hours.includes(h));
    if (missingHours.length > 0 && !error) {
      error = `ERRO: Turno ${shift} faltam horas ${missingHours.join(', ')}!`;
      console.warn(`Turno ${shift}: faltam horas ${missingHours.join(', ')}`);
    }
    
    groupedByDateAndShift.push({
      date: selectedDate,
      shift,
      data: finalData,
      error
    });
  });

  // Tooltip customizado que mostra valores reais e normalizados
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded ambient-shadow">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const varKey = entry.dataKey;
            const varInfo = getVariableInfo(varKey, selectedSector);
            const stats = variableStats[varKey];
            
            if (chartScaleMode === 'normalized') {
              // Mostrar valor real e normalizado
              const normalizedValue = entry.value || 0;
              const realValue = entry.payload[`${varKey}_real`] || 0;
              
              return (
                <div key={index} style={{ color: entry.color }} className="text-sm mb-1">
                  <p className="font-medium">{varInfo.name}</p>
                  <p className="ml-2">
                    Valor: <strong>{realValue.toFixed(2)}</strong> {varInfo.unit}
                  </p>
                  <p className="ml-2 text-xs opacity-75">
                    Normalizado: {normalizedValue.toFixed(1)}% 
                    <span className="text-xs ml-1">(min: {stats?.min.toFixed(1)}, max: {stats?.max.toFixed(1)})</span>
                  </p>
                </div>
              );
            } else {
              // Mostrar apenas valor real
              const value = entry.value || 0;
              return (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                  {varInfo.name}: <strong>{value.toFixed(2)}</strong> {varInfo.unit}
                </p>
              );
            }
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Gerenciamento de Variáveis de Processo (GVP)"
          description={`443 Variáveis Totais | ${gepData.length} horas de dados`}
          actions={
            <Button variant="outline" size="sm"><Icon name="download" className="text-base mr-2" />Exportar</Button>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full overflow-auto p-4 md:p-6">
            <div className="space-y-6">

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    {moagem1Running ? <Icon name="play_circle" className="text-3xl text-muted-foreground" /> : <Icon name="stop_circle" className="text-3xl text-muted-foreground" />}
                    <div><p className="font-medium">Moagem 1</p><p className="text-sm text-muted-foreground">{moagem1Running ? 'Rodando' : 'Parada'} - 106 vars</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    {moagem2Running ? <Icon name="play_circle" className="text-3xl text-muted-foreground" /> : <Icon name="stop_circle" className="text-3xl text-muted-foreground" />}
                    <div><p className="font-medium">Moagem 2</p><p className="text-sm text-muted-foreground">{moagem2Running ? 'Rodando' : 'Parada'} - 105 vars</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    {moagem3Running ? <Icon name="play_circle" className="text-3xl text-muted-foreground" /> : <Icon name="stop_circle" className="text-3xl text-muted-foreground" />}
                    <div><p className="font-medium">Moagem 3</p><p className="text-sm text-muted-foreground">{moagem3Running ? 'Rodando' : 'Parada'} - 97 vars</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    {secadorRunning ? <Icon name="play_circle" className="text-3xl text-muted-foreground" /> : <Icon name="stop_circle" className="text-3xl text-muted-foreground" />}
                    <div><p className="font-medium">Secador</p><p className="text-sm text-muted-foreground">{secadorRunning ? 'Rodando' : 'Parado'} - 77 vars</p></div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Filtros e Visualização</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Icon name="calendar_today" className="text-base" />
                      Data do Relatório:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 shadow-sm rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Serão exibidos os 4 turnos completos (A, B, C, D) com 6 leituras cada
                    </p>
                  </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Setor:</label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(sector => (
                  <Button 
                    key={sector.id} 
                    variant={selectedSector === sector.id ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => setSelectedSector(sector.id)}
                  >
                    {sector.name} {sector.varCount ? `(${sector.varCount})` : ''}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                Variáveis Selecionadas: {selectedVariables.length} de {filteredVariables.length}
              </label>
              <Button 
                variant="outline" 
                onClick={() => setModalOpen(true)} 
                className="w-full justify-between"
              >
                <span>Selecionar Variáveis ({selectedVariables.length})</span>
                <span className="text-xs text-muted-foreground">Clique para abrir seletor</span>
              </Button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Visualização:</label>
              <div className="flex gap-2">
                <Button variant={viewMode === 'chart' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('chart')}>
                  <Icon name="show_chart" className="text-base mr-2" />Gráficos
                </Button>
                <Button variant={viewMode === 'table' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
                  <Icon name="table" className="text-base mr-2" />Tabela
                </Button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Modo de Exibição:</label>
              <div className="flex gap-2">
                <Button variant={displayMode === 'shifts' ? 'primary' : 'outline'} size="sm" onClick={() => setDisplayMode('shifts')}>
                  Por Turnos
                </Button>
                <Button variant={displayMode === 'general' ? 'primary' : 'outline'} size="sm" onClick={() => setDisplayMode('general')}>
                  Geral do Dia
                </Button>
              </div>
            </div>

            {viewMode === 'chart' && selectedVariables.length > 0 && selectedVariables.length <= 6 && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Escala do Gráfico:</label>
                <div className="flex gap-2">
                  <Button 
                    variant={chartScaleMode === 'normalized' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartScaleMode('normalized')}
                  >
                    📊 Normalizado (0-100%)
                  </Button>
                  <Button 
                    variant={chartScaleMode === 'real' ? 'primary' : 'outline'} 
                    size="sm" 
                    onClick={() => setChartScaleMode('real')}
                  >
                    📈 Valores Reais
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {chartScaleMode === 'normalized' 
                    ? '✓ Modo recomendado para comparar tendências de variáveis com escalas diferentes' 
                    : 'Mostra valores absolutos (pode dificultar visualização de variáveis com escalas diferentes)'}
                </p>
              </div>
            )}
                </CardContent>
              </Card>

              {loading ? (
                <div className="flex-1 flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : viewMode === 'chart' ? (
          selectedVariables.length > 6 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Muitas variáveis selecionadas</h3>
                    <p className="text-muted-foreground">
                      Você selecionou {selectedVariables.length} variáveis. O gráfico suporta no máximo 6 variáveis.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Por favor, reduza para 6 ou menos variáveis, ou use a visualização em <strong>Tabela</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Tendências</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {chartScaleMode === 'normalized' 
                    ? `Normalizado (0-100%) - ${selectedVariables.length} variáveis selecionadas` 
                    : `Valores reais - ${selectedVariables.length} variáveis selecionadas`}
                </p>
                {chartScaleMode === 'normalized' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Cada variável é normalizada individualmente. Passe o mouse sobre as linhas para ver os valores reais.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ 
                      value: chartScaleMode === 'normalized' ? 'Escala Normalizada (%)' : 'Valores', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Áreas sombreadas para separar os turnos visualmente */}
                    <ReferenceArea x1="01:00" x2="06:00" fill="#e3f2fd" fillOpacity={0.3} label={{ value: 'Turno A', position: 'top' }} />
                    <ReferenceArea x1="07:00" x2="12:00" fill="#f3e5f5" fillOpacity={0.3} label={{ value: 'Turno B', position: 'top' }} />
                    <ReferenceArea x1="13:00" x2="18:00" fill="#fff3e0" fillOpacity={0.3} label={{ value: 'Turno C', position: 'top' }} />
                    <ReferenceArea x1="19:00" x2="23:00" fill="#e8f5e9" fillOpacity={0.3} label={{ value: 'Turno D', position: 'top' }} />
                    
                    {/* Linhas verticais para marcar início de cada turno */}
                    <ReferenceLine x="01:00" stroke="#1976d2" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'A', position: 'top' }} />
                    <ReferenceLine x="07:00" stroke="#7b1fa2" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'B', position: 'top' }} />
                    <ReferenceLine x="13:00" stroke="#f57c00" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'C', position: 'top' }} />
                    <ReferenceLine x="19:00" stroke="#388e3c" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'D', position: 'top' }} />
                    
                    {selectedVariables.map((varKey, idx) => {
                      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d1', '#a4de6c', '#d0ed57', '#ffc0cb', '#87ceeb'];
                      const varInfo = getVariableInfo(varKey, selectedSector);
                      return <Line key={varKey} type="monotone" dataKey={varKey} name={varInfo.name} stroke={colors[idx % colors.length]} strokeWidth={2} />;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )
        ) : displayMode === 'general' ? (
          // Visualização Geral do Dia - todos os dados em uma única tabela
          <Card>
            <CardHeader>
              <CardTitle>Dados Geral do Dia</CardTitle>
              <p className="text-sm text-muted-foreground">
                {completeGepData.length} leituras - {new Date(selectedDate).toLocaleDateString('pt-BR')}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-[4px] border overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead 
                            className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted sticky left-0 bg-muted/50 z-10"
                            onClick={() => alternarOrdenacao('time')}
                          >
                            <div className="flex items-center">
                              <Icon name="schedule" className="text-base mr-2" />
                              Hora
                              {ordenacao.campo === 'time' && (
                                ordenacao.direcao === 'asc' ? (
                                  <Icon name="expand_less" className="ml-1 text-base" />
                                ) : (
                                  <Icon name="expand_more" className="ml-1 text-base" />
                                )
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Turno
                          </TableHead>
                          {selectedVariables.map(varKey => {
                            const varInfo = getVariableInfo(varKey, selectedSector);
                            const _isTotalizer = isTotalizerVariable(varKey) || isTotalizerVariable(varInfo.name);
                            return (
                              <TableHead
                                key={varKey}
                                className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                                onClick={() => alternarOrdenacao(varKey)}
                              >
                                <div className="flex items-center justify-end">
                                  <div className="whitespace-nowrap">
                                    {varInfo.name}
                                    {ordenacao.campo === varKey && (
                                      ordenacao.direcao === 'asc' ? (
                                        <Icon name="expand_less" className="ml-1 text-base inline" />
                                      ) : (
                                        <Icon name="expand_more" className="ml-1 text-base inline" />
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs font-normal text-muted-foreground mt-0.5">
                                  {varInfo.unit}
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordenarDados(completeGepData, ordenacao.campo, ordenacao.direcao).map((row: any, idx: number) => {
                          const shift = getShift(row.time);
                          return (
                            <TableRow key={idx} className={`${SHIFT_COLORS[shift]}`}>
                              <TableCell className={`px-4 py-0.5 font-medium text-sm sticky left-0 ${SHIFT_COLORS[shift]} z-10 border-r align-middle`}>
                                {row.time}
                              </TableCell>
                              <TableCell className="px-4 py-0.5 text-sm font-medium align-middle">
                                <span className={`px-2 py-1 rounded text-xs ${SHIFT_COLORS[shift]}`}>
                                  {SHIFT_NAMES[shift]}
                                </span>
                              </TableCell>
                              {selectedVariables.map(varKey => (
                                <TableCell key={varKey} className="px-4 py-0.5 text-right text-sm font-mono tabular-nums align-middle">
                                  {(row[varKey] || 0).toFixed(2)}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                        {/* Linha de Totalizador/Média Geral */}
                        <TableRow className="border-t-2 border-on-surface font-bold bg-muted">
                          <TableCell className="px-4 py-3 font-bold text-sm sticky left-0 bg-muted z-10 border-r" colSpan={2}>
                            MÉDIA/TOTAL GERAL DO DIA
                          </TableCell>
                          {selectedVariables.map(varKey => {
                            const varInfo = getVariableInfo(varKey, selectedSector);
                            const isTotalizer = isTotalizerVariable(varKey) || isTotalizerVariable(varInfo.name);
                            const values = completeGepData.map((row: any) => row[varKey] || 0).filter((v: number) => v !== null && !isNaN(v));
                            const result = values.length > 0 
                              ? isTotalizer 
                                ? values.reduce((sum: number, v: number) => sum + v, 0)
                                : values.reduce((sum: number, v: number) => sum + v, 0) / values.length
                              : 0;
                            return (
                              <TableCell key={varKey} className={`px-4 py-3 text-right text-sm font-mono font-bold tabular-nums ${isTotalizer ? 'text-foreground' : 'text-foreground'}`}>
                                {result.toFixed(2)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Visualização por Turnos - dados separados por turno
          <div className="space-y-4">
            {groupedByDateAndShift.map((group, _groupIdx) => {
              const { date, shift, data: shiftData, error } = group;
              const dateFormatted = new Date(date).toLocaleDateString('pt-BR');
              const ordenacaoAtual = ordenacaoTurno[shift] || { campo: 'time', direcao: 'asc' };
              
              return (
                <Card key={`${date}-${shift}`} className={error ? 'border-on-surface-variant border-2' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SHIFT_COLORS[shift].replace('bg-', 'bg-')}`}></div>
                      {SHIFT_NAMES[shift]}
                      <span className="text-sm font-normal text-muted-foreground ml-2">({dateFormatted})</span>
                    </CardTitle>
                    <p className={`text-sm ${error ? 'text-muted-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {shiftData.length} leituras {error && `- ${error}`}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="rounded-[4px] border overflow-hidden">
                      <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                          <Table>
                            <TableHeader>
                              <TableRow className={`${SHIFT_COLORS[shift]}`}>
                                <TableHead 
                                  className={`px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted sticky left-0 ${SHIFT_COLORS[shift]} z-10 border-r`}
                                  onClick={() => alternarOrdenacaoTurno(shift, 'time')}
                                >
                                  <div className="flex items-center">
                                    <Icon name="schedule" className="text-base mr-2" />
                                    Hora
                                    {ordenacaoAtual.campo === 'time' && (
                                      ordenacaoAtual.direcao === 'asc' ? (
                                        <Icon name="expand_less" className="ml-1 text-base" />
                                      ) : (
                                        <Icon name="expand_more" className="ml-1 text-base" />
                                      )
                                    )}
                                  </div>
                                </TableHead>
                                {selectedVariables.map(varKey => {
                                  const varInfo = getVariableInfo(varKey, selectedSector);
                                  const isTotalizer = isTotalizerVariable(varKey) || isTotalizerVariable(varInfo.name);
                                  return (
                                    <TableHead 
                                      key={varKey} 
                                      className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                                      onClick={() => alternarOrdenacaoTurno(shift, varKey)}
                                    >
                                      <div className="flex items-center justify-end">
                                        <div className="whitespace-nowrap">
                                          {varInfo.name}
                                          {ordenacaoAtual.campo === varKey && (
                                            ordenacaoAtual.direcao === 'asc' ? (
                                              <Icon name="expand_less" className="ml-1 text-base inline" />
                                            ) : (
                                              <Icon name="expand_more" className="ml-1 text-base inline" />
                                            )
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs font-normal text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
                                        <span>{varInfo.unit}</span>
                                        {varInfo.unit && <span className="text-muted-foreground">•</span>}
                                        <span className={`font-semibold ${isTotalizer ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                          {isTotalizer ? 'Total' : 'Média'}
                                        </span>
                                      </div>
                                    </TableHead>
                                  );
                                })}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ordenarDados(shiftData, ordenacaoAtual.campo, ordenacaoAtual.direcao).map((row: any, idx: number) => (
                                <TableRow key={idx} className={`${SHIFT_COLORS[shift]}`}>
                                  <TableCell className={`px-4 py-0.5 font-medium text-sm sticky left-0 ${SHIFT_COLORS[shift]} z-10 border-r align-middle`}>
                                    {row.time}
                                  </TableCell>
                                  {selectedVariables.map(varKey => (
                                    <TableCell key={varKey} className="px-4 py-0.5 text-right text-sm font-mono text-foreground tabular-nums align-middle">
                                      {(row[varKey] || 0).toFixed(2)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              {/* Linha de Totalizador/Média */}
                              <TableRow className={`border-t-2 border-on-surface font-bold ${SHIFT_COLORS[shift]}`}>
                                <TableCell className={`px-4 py-3 font-bold text-sm sticky left-0 ${SHIFT_COLORS[shift]} z-10 border-r`}>
                                  MÉDIA/TOTAL
                                </TableCell>
                                {selectedVariables.map(varKey => {
                                  const varInfo = getVariableInfo(varKey, selectedSector);
                                  const isTotalizer = isTotalizerVariable(varKey) || isTotalizerVariable(varInfo.name);
                                  
                                  // Calcular média ou total baseado no tipo
                                  const values = shiftData.map((row: any) => row[varKey] || 0).filter((v: number) => v !== null && !isNaN(v));
                                  const result = values.length > 0 
                                    ? isTotalizer 
                                      ? values.reduce((sum: number, v: number) => sum + v, 0) // TOTAL
                                      : values.reduce((sum: number, v: number) => sum + v, 0) / values.length // MÉDIA
                                    : 0;
                                  
                                  return (
                                    <TableCell key={varKey} className={`px-4 py-3 text-right text-sm font-mono font-bold tabular-nums ${isTotalizer ? 'text-foreground' : 'text-foreground'}`}>
                                      {result.toFixed(2)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VariableSelector
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        variables={filteredVariables}
        selectedVariables={selectedVariables}
        onToggleVariable={toggleVariable}
        onSelectAll={() => setSelectedVariables(filteredVariables.map(v => v.key))}
        onClearAll={() => setSelectedVariables([])}
      />
    </PageContainer>
  );
}
