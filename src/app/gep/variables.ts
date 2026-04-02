// TODAS AS 443 VARIÁVEIS DO SISTEMA GEP (Moagem 2 tem 105, não 106)

export const GEP_VARIABLES = {
  // ENERGIA - 12 variáveis (ENE)
  ENE: [
    'ENE_VAR_009', 'ENE_VAR_010', 'ENE_VAR_011', 'ENE_VAR_012', 'ENE_VAR_013', 'ENE_VAR_014',
    'ENE_VAR_015', 'ENE_VAR_016', 'ENE_VAR_017', 'ENE_VAR_018', 'ENE_VAR_019', 'ENE_VAR_020'
  ],
  
  // ENSACADEIRA 2 - 20 variáveis (EN2)
  EN2: [
    'EN2_VAR_010', 'EN2_VAR_011', 'EN2_VAR_012', 'EN2_VAR_013', 'EN2_VAR_014',
    'EN2_VAR_015', 'EN2_VAR_016', 'EN2_VAR_017', 'EN2_VAR_018', 'EN2_VAR_019',
    'EN2_VAR_020', 'EN2_VAR_021', 'EN2_VAR_022', 'EN2_VAR_023', 'EN2_VAR_024',
    'EN2_VAR_025', 'EN2_VAR_026', 'EN2_VAR_027', 'EN2_VAR_028', 'EN2_VAR_029'
  ],
  
  // EXPEDIÇÃO 1 - 17 variáveis (EX1)
  EX1: [
    'EX1_VAR_010', 'EX1_VAR_011', 'EX1_VAR_012', 'EX1_VAR_013', 'EX1_VAR_014',
    'EX1_VAR_015', 'EX1_VAR_016', 'EX1_VAR_017', 'EX1_VAR_018', 'EX1_VAR_019',
    'EX1_VAR_020', 'EX1_VAR_021', 'EX1_VAR_022', 'EX1_VAR_023', 'EX1_VAR_024',
    'EX1_VAR_025', 'EX1_VAR_026'
  ],
  
  // EXPEDIÇÃO 2 - 9 variáveis (EX2)
  EX2: [
    'EX2_VAR_010', 'EX2_VAR_011', 'EX2_VAR_012', 'EX2_VAR_013', 'EX2_VAR_014',
    'EX2_VAR_015', 'EX2_VAR_016', 'EX2_VAR_017', 'EX2_VAR_018'
  ],
  
  // SECADOR - 77 variáveis (S01)
  S01: Array.from({ length: 77 }, (_, i) => `S01_VAR_${String(i + 1).padStart(2, '0')}`),
  
  // MOAGEM 1 - 106 variáveis (Z01)
  Z01: Array.from({ length: 106 }, (_, i) => `Z01_VAR_${String(i + 1).padStart(3, '0')}`),
  
  // MOAGEM 2 - 114 variáveis (Z02) - val(78) está comentado no script VB (não existe no arquivo)
  // Script VB: val(1-77) + val(79-115) = 114 variáveis gravadas no arquivo
  Z02: Array.from({ length: 114 }, (_, i) => {
    const num = i + 1;
    // Pula o número 78 na numeração (val 78 comentada no VB)
    return `Z02_VAR_${String(num >= 78 ? num + 1 : num).padStart(3, '0')}`;
  }),
  
  // MOAGEM 3 - 97 variáveis (Z03)
  Z03: Array.from({ length: 97 }, (_, i) => `Z03_VAR_${String(i + 1).padStart(3, '0')}`)
};

export const ALL_VARIABLES_LIST = [
  ...GEP_VARIABLES.ENE.map((key, idx) => ({ key, name: `Energia Var ${idx + 1}`, unit: '', sector: 'ENERGIA' })),
  ...GEP_VARIABLES.Z01.map((key, idx) => ({ key, name: `Moagem 1 Var ${idx + 1}`, unit: '', sector: 'MOAGEM_1' })),
  ...GEP_VARIABLES.Z02.map((key, idx) => ({ key, name: `Moagem 2 Var ${idx + 1}`, unit: '', sector: 'MOAGEM_2' })),
  ...GEP_VARIABLES.Z03.map((key, idx) => ({ key, name: `Moagem 3 Var ${idx + 1}`, unit: '', sector: 'MOAGEM_3' })),
  ...GEP_VARIABLES.S01.map((key, idx) => ({ key, name: `Secador Var ${idx + 1}`, unit: '', sector: 'SECADOR' })),
  ...GEP_VARIABLES.EX1.map((key, idx) => ({ key, name: `Expedição 1 Var ${idx + 1}`, unit: '', sector: 'EXPEDICAO_1' })),
  ...GEP_VARIABLES.EX2.map((key, idx) => ({ key, name: `Expedição 2 Var ${idx + 1}`, unit: '', sector: 'EXPEDICAO_2' })),
  ...GEP_VARIABLES.EN2.map((key, idx) => ({ key, name: `Ensacadeira 2 Var ${idx + 1}`, unit: '', sector: 'ENSACADEIRA_2' }))
];

// Categorias por TIPO de variável
export const VARIABLE_TYPES = [
  { id: 'ALL', name: 'Todas', icon: '📊' },
  { id: 'VAZAO', name: 'Vazão', icon: '💧' },
  { id: 'TEMPERATURA', name: 'Temperatura', icon: '🌡️' },
  { id: 'PRESSAO', name: 'Pressão', icon: '⚡' },
  { id: 'TENSAO', name: 'Tensão Elétrica', icon: '🔌' },
  { id: 'POTENCIA', name: 'Potência', icon: '⚙️' },
  { id: 'STATUS', name: 'Status', icon: '🔘' },
  { id: 'CORRENTE', name: 'Corrente Elétrica', icon: '⚡' },
  { id: 'VELOCIDADE', name: 'Velocidade', icon: '🔄' },
];

export const SECTORS = [
  { id: 'ALL', name: 'Todos' },
  { id: 'ENERGIA', name: 'Energia', varCount: 12 },
  { id: 'MOAGEM_1', name: 'Moagem 1', varCount: 106 },
  { id: 'MOAGEM_2', name: 'Moagem 2', varCount: 114 },  // val(78) comentado - 114 vars (1-77, 79-115)
  { id: 'MOAGEM_3', name: 'Moagem 3', varCount: 97 },
  { id: 'SECADOR', name: 'Secador', varCount: 77 },
  { id: 'EXPEDICAO_1', name: 'Expedição 1', varCount: 17 },
  { id: 'EXPEDICAO_2', name: 'Expedição 2', varCount: 9 },
  { id: 'ENSACADEIRA_2', name: 'Ensacadeira 2', varCount: 20 },
];

// Função para classificar variável por tipo baseado no nome e unidade
export function getVariableType(name: string, unit: string): string {
  const nameLower = name.toLowerCase();
  const unitLower = unit.toLowerCase();
  
  // Status
  if (nameLower.includes('status') || nameLower.includes('selecionado') || nameLower.includes('silo')) {
    return 'STATUS';
  }
  
  // Vazão (t/h, %, etc)
  if (nameLower.includes('vazão') || nameLower.includes('vazao')) {
    return 'VAZAO';
  }
  
  // Temperatura (°C)
  if (nameLower.includes('temperatura') || nameLower.includes('temp') || unitLower.includes('°c') || unitLower.includes('c')) {
    return 'TEMPERATURA';
  }
  
  // Pressão (mbar, bar, Pa, etc)
  if (nameLower.includes('pressão') || nameLower.includes('pressao') || unitLower.includes('mbar') || unitLower.includes('bar') || unitLower.includes('pa')) {
    return 'PRESSAO';
  }
  
  // Tensão Elétrica (V, kV)
  if (nameLower.includes('tensão') || nameLower.includes('tensao') || unitLower === 'v' || unitLower.includes('kv')) {
    return 'TENSAO';
  }
  
  // Potência (kW, kVAr, W, etc)
  if (nameLower.includes('potência') || nameLower.includes('potencia') || nameLower.includes('demanda') || 
      unitLower.includes('kw') || unitLower.includes('kvar') || unitLower.includes('w')) {
    return 'POTENCIA';
  }
  
  // Corrente Elétrica (A, %)
  if (nameLower.includes('corrente')) {
    return 'CORRENTE';
  }
  
  // Velocidade (RPM, Hz)
  if (nameLower.includes('velocidade') || nameLower.includes('frequência') || nameLower.includes('frequencia') || 
      nameLower.includes('rpm') || unitLower === 'rpm' || unitLower === 'hz') {
    return 'VELOCIDADE';
  }
  
  return 'ALL';
}

console.log(`Total de variáveis: ${ALL_VARIABLES_LIST.length}`); // Deve ser 452 (val 78 comentada)
