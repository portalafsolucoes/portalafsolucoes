/**
 * Script para criar 10 RAFs de exemplo
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const rafsExemplo = [
  {
    rafNumber: 'FQ13',
    area: 'MOAGEM 2',
    equipment: 'Sensor de Temperatura - Entrada Filtro',
    occurrenceDate: new Date('2025-01-09'),
    occurrenceTime: '08:45',
    panelOperator: 'Carlos Silva',
    stopExtension: true,
    failureBreakdown: true,
    productionLost: 2.5,
    failureDescription: 'Sensor de temperatura apresentou leitura inconsistente, oscilando entre 0°C e 150°C. Sistema de controle entrou em modo de segurança e parou a produção.',
    observation: 'Verificado que o cabo do sensor estava com mau contato. Conexão oxidada encontrada na caixa de junção.',
    immediateAction: 'Sensor substituído temporariamente. Limpeza e reaperto das conexões elétricas realizados.',
    fiveWhys: [
      'Por que o sensor falhou? Porque a leitura estava inconsistente',
      'Por que a leitura estava inconsistente? Porque havia mau contato',
      'Por que havia mau contato? Porque a conexão estava oxidada',
      'Por que a conexão oxidou? Falta de manutenção preventiva',
      'Por que falta manutenção preventiva? Não estava no plano de MP'
    ],
    failureType: 'REPETITIVE',
    hypothesisTests: [
      { item: 1, description: 'Sensor defeituoso', possible: 'Sim', evidence: 'Leitura errática' },
      { item: 2, description: 'Cabo danificado', possible: 'Sim', evidence: 'Mau contato encontrado' }
    ],
    actionPlan: [
      { what: 'Incluir sensor no plano de MP', who: 'Eng. Manutenção', when: '2025-01-15' },
      { what: 'Inspecionar todos os sensores', who: 'Equipe Elétrica', when: '2025-01-20' }
    ]
  },
  {
    rafNumber: 'FQ14',
    area: 'MOAGEM 1',
    equipment: 'Motor Principal - Transportador',
    occurrenceDate: new Date('2025-01-10'),
    occurrenceTime: '14:20',
    panelOperator: 'Maria Santos',
    stopExtension: false,
    failureBreakdown: true,
    productionLost: 1.8,
    failureDescription: 'Motor apresentou superaquecimento atingindo 95°C. Alarme de temperatura acionado.',
    observation: 'Ventilador de resfriamento com rotação reduzida. Correia apresentava desgaste visível.',
    immediateAction: 'Motor desligado imediatamente. Correia substituída e sistema testado.',
    fiveWhys: [
      'Por que o motor superaqueceu? Sistema de refrigeração deficiente',
      'Por que refrigeração deficiente? Ventilador com baixa rotação',
      'Por que baixa rotação? Correia desgastada',
      'Por que correia desgastada? Fim da vida útil',
      'Por que não foi trocada antes? Falta de inspeção periódica'
    ],
    failureType: 'RANDOM',
    hypothesisTests: [
      { item: 1, description: 'Rolamento defeituoso', possible: 'Não', evidence: 'Sem ruído' },
      { item: 2, description: 'Correia desgastada', possible: 'Sim', evidence: 'Desgaste visível' }
    ],
    actionPlan: [
      { what: 'Implementar inspeção quinzenal', who: 'Mecânico', when: '2025-01-12' }
    ]
  },
  {
    rafNumber: 'FQ15',
    area: 'ENSACAMENTO',
    equipment: 'Válvula Rotativa - Linha 3',
    occurrenceDate: new Date('2025-01-08'),
    occurrenceTime: '10:15',
    panelOperator: 'João Pedro',
    stopExtension: true,
    failureBreakdown: false,
    productionLost: 0.5,
    failureDescription: 'Válvula rotativa travou durante operação, causando acúmulo de material.',
    observation: 'Corpo estranho (pedra) encontrado no rotor. Sistema de proteção não detectou.',
    immediateAction: 'Material removido, válvula limpa e lubrificada. Produção retomada.',
    fiveWhys: [
      'Por que válvula travou? Corpo estranho no rotor',
      'Por que corpo estranho entrou? Falha no sistema de peneiramento',
      'Por que peneiramento falhou? Tela rompida',
      'Por que tela rompeu? Desgaste natural',
      'Por que não foi detectado? Falta de inspeção visual'
    ],
    failureType: 'REPETITIVE',
    hypothesisTests: [
      { item: 1, description: 'Falha no peneiramento', possible: 'Sim', evidence: 'Tela rompida' }
    ],
    actionPlan: [
      { what: 'Trocar tela da peneira', who: 'Equipe Mecânica', when: '2025-01-09' },
      { what: 'Inspeção diária das peneiras', who: 'Operador', when: 'Imediato' }
    ]
  },
  {
    rafNumber: 'FQ16',
    area: 'BRITAGEM',
    equipment: 'Britador de Mandíbulas',
    occurrenceDate: new Date('2025-01-07'),
    occurrenceTime: '16:45',
    panelOperator: 'Roberto Lima',
    stopExtension: true,
    failureBreakdown: true,
    productionLost: 5.2,
    failureDescription: 'Quebra da mandíbula fixa do britador. Trinca identificada na estrutura metálica.',
    observation: 'Desgaste excessivo com perda de espessura de 40%. Sobrecarga recorrente identificada.',
    immediateAction: 'Britador isolado. Peça reserva solicitada com urgência.',
    fiveWhys: [
      'Por que mandíbula quebrou? Desgaste excessivo',
      'Por que desgaste excessivo? Sobrecarga constante',
      'Por que sobrecarga? Material muito duro',
      'Por que material duro entra? Sem classificação prévia',
      'Por que sem classificação? Processo não implementado'
    ],
    failureType: 'RANDOM',
    hypothesisTests: [
      { item: 1, description: 'Fadiga do material', possible: 'Sim', evidence: 'Trinca encontrada' },
      { item: 2, description: 'Sobrecarga', possible: 'Sim', evidence: 'Desgaste 40%' }
    ],
    actionPlan: [
      { what: 'Implementar classificação', who: 'Eng. Processo', when: '2025-02-01' },
      { what: 'Trocar mandíbulas', who: 'Equipe Mecânica', when: '2025-01-10' }
    ]
  },
  {
    rafNumber: 'FQ17',
    area: 'EXPEDIÇÃO',
    equipment: 'Transportador de Correia TC-12',
    occurrenceDate: new Date('2025-01-06'),
    occurrenceTime: '07:30',
    panelOperator: 'Ana Paula',
    stopExtension: false,
    failureBreakdown: false,
    productionLost: 0.3,
    failureDescription: 'Desalinhamento da correia transportadora causando atrito nas laterais.',
    observation: 'Roletes de retorno com rotação irregular. 3 roletes travados identificados.',
    immediateAction: 'Correia realinhada manualmente. Roletes travados substituídos.',
    fiveWhys: [
      'Por que correia desalinha? Roletes irregulares',
      'Por que roletes irregulares? Alguns travados',
      'Por que travados? Falta de lubrificação',
      'Por que falta lubrificação? Não estava no plano',
      'Por que não estava no plano? Equipamento não cadastrado'
    ],
    failureType: 'REPETITIVE',
    hypothesisTests: [
      { item: 1, description: 'Roletes travados', possible: 'Sim', evidence: '3 unidades sem girar' }
    ],
    actionPlan: [
      { what: 'Cadastrar equipamento no MP', who: 'PCM', when: '2025-01-08' },
      { what: 'Lubrificar todos os roletes', who: 'Lubrificador', when: '2025-01-07' }
    ]
  },
  {
    rafNumber: 'FQ18',
    area: 'MOAGEM 3',
    equipment: 'Bomba Hidráulica BH-05',
    occurrenceDate: new Date('2025-01-05'),
    occurrenceTime: '11:00',
    panelOperator: 'Fernando Costa',
    stopExtension: false,
    failureBreakdown: true,
    productionLost: 1.2,
    failureDescription: 'Vazamento de óleo hidráulico no flange de saída da bomba.',
    observation: 'Gaxeta deteriorada por temperatura. Temperatura do óleo estava 15°C acima do normal.',
    immediateAction: 'Bomba substituída por reserva. Gaxeta trocada na bomba retirada.',
    fiveWhys: [
      'Por que vazou? Gaxeta deteriorada',
      'Por que gaxeta deteriorou? Temperatura alta',
      'Por que temperatura alta? Resfriador ineficiente',
      'Por que resfriador ineficiente? Aletas sujas',
      'Por que aletas sujas? Falta de limpeza preventiva'
    ],
    failureType: 'RANDOM',
    hypothesisTests: [
      { item: 1, description: 'Gaxeta defeituosa', possible: 'Sim', evidence: 'Deterioração térmica' },
      { item: 2, description: 'Superaquecimento', possible: 'Sim', evidence: 'Temp. +15°C' }
    ],
    actionPlan: [
      { what: 'Limpeza do resfriador', who: 'Equipe Hidráulica', when: '2025-01-06' },
      { what: 'Instalar termômetro', who: 'Instrumentista', when: '2025-01-12' }
    ]
  },
  {
    rafNumber: 'FQ19',
    area: 'BRITAGEM',
    equipment: 'Peneira Vibratória PV-02',
    occurrenceDate: new Date('2025-01-04'),
    occurrenceTime: '13:20',
    panelOperator: 'Juliana Alves',
    stopExtension: false,
    failureBreakdown: false,
    productionLost: 0.8,
    failureDescription: 'Vibração excessiva da peneira com ruído anormal durante operação.',
    observation: 'Parafusos de fixação da base afrouxados. Coxins anti-vibração desgastados.',
    immediateAction: 'Parafusos reapertos com torque especificado. Coxins programados para troca.',
    fiveWhys: [
      'Por que vibração excessiva? Fixação frouxa',
      'Por que fixação frouxa? Parafusos afrouxaram',
      'Por que afrouxaram? Vibração constante',
      'Por que vibração aumentou? Coxins desgastados',
      'Por que não foram trocados? Fim de vida útil não monitorado'
    ],
    failureType: 'REPETITIVE',
    hypothesisTests: [
      { item: 1, description: 'Coxins desgastados', possible: 'Sim', evidence: 'Deformação visível' }
    ],
    actionPlan: [
      { what: 'Trocar todos os coxins', who: 'Equipe Mecânica', when: '2025-01-08' },
      { what: 'Criar checklist de inspeção', who: 'Supervisor', when: '2025-01-06' }
    ]
  },
  {
    rafNumber: 'FQ20',
    area: 'ENSACAMENTO',
    equipment: 'Balança Eletrônica BE-01',
    occurrenceDate: new Date('2025-01-03'),
    occurrenceTime: '09:40',
    panelOperator: 'Paulo Henrique',
    stopExtension: false,
    failureBreakdown: false,
    productionLost: 0.2,
    failureDescription: 'Balança apresentando erro de peso, variação de ±500g na pesagem.',
    observation: 'Célula de carga descalibrada. Última calibração há 8 meses.',
    immediateAction: 'Balança recalibrada com pesos padrão. Ajuste fino realizado.',
    fiveWhys: [
      'Por que erro de peso? Descalibração',
      'Por que descalibrou? Tempo desde última calibração',
      'Por que passou do tempo? Não tinha alerta',
      'Por que não tinha alerta? Sistema não implementado',
      'Por que não implementado? Falta de procedimento'
    ],
    failureType: 'REPETITIVE',
    hypothesisTests: [
      { item: 1, description: 'Célula danificada', possible: 'Não', evidence: 'Funcionou após calibração' }
    ],
    actionPlan: [
      { what: 'Calibração trimestral', who: 'Instrumentista', when: '2025-04-03' },
      { what: 'Criar procedimento', who: 'Qualidade', when: '2025-01-10' }
    ]
  },
  {
    rafNumber: 'FQ21',
    area: 'MOAGEM 1',
    equipment: 'Compressor de Ar CA-03',
    occurrenceDate: new Date('2025-01-02'),
    occurrenceTime: '15:55',
    panelOperator: 'Ricardo Souza',
    stopExtension: true,
    failureBreakdown: true,
    productionLost: 3.5,
    failureDescription: 'Compressor desligou por acionamento de proteção térmica. Não reiniciou.',
    observation: 'Motor elétrico com temperatura 20°C acima do normal. Ventilação obstruída por sujeira.',
    immediateAction: 'Limpeza geral do motor e ventilação. Filtros de ar trocados.',
    fiveWhys: [
      'Por que desligou? Proteção térmica',
      'Por que acionou proteção? Motor superaquecido',
      'Por que superaqueceu? Ventilação ruim',
      'Por que ventilação ruim? Obstrução por sujeira',
      'Por que acumulou sujeira? Ambiente empoeirado sem limpeza'
    ],
    failureType: 'RANDOM',
    hypothesisTests: [
      { item: 1, description: 'Falha elétrica', possible: 'Não', evidence: 'Motor OK após limpeza' },
      { item: 2, description: 'Ventilação obstruída', possible: 'Sim', evidence: 'Sujeira encontrada' }
    ],
    actionPlan: [
      { what: 'Limpeza semanal programada', who: 'Equipe Limpeza', when: 'Imediato' },
      { what: 'Instalar proteção de filtro', who: 'Mecânico', when: '2025-01-05' }
    ]
  },
  {
    rafNumber: 'FQ22',
    area: 'EXPEDIÇÃO',
    equipment: 'Empilhadeira Elétrica EE-04',
    occurrenceDate: new Date('2025-01-01'),
    occurrenceTime: '08:10',
    panelOperator: 'Marcelo Dias',
    stopExtension: false,
    failureBreakdown: false,
    productionLost: 0.1,
    failureDescription: 'Empilhadeira com perda de potência e dificuldade de elevação de carga.',
    observation: 'Bateria com 60% da capacidade nominal. Células sulfatadas identificadas.',
    observation: 'Bateria com células sulfatadas. Última manutenção há 12 meses.',
    immediateAction: 'Bateria substituída. Empilhadeira retornou à operação normal.',
    fiveWhys: [
      'Por que perda de potência? Bateria fraca',
      'Por que bateria fraca? Células sulfatadas',
      'Por que sulfatação? Falta de manutenção',
      'Por que falta manutenção? Não estava programado',
      'Por que não programado? Equipamento móvel esquecido'
    ],
    failureType: 'RANDOM',
    hypothesisTests: [
      { item: 1, description: 'Bateria sulfatada', possible: 'Sim', evidence: 'Teste de capacidade: 60%' }
    ],
    actionPlan: [
      { what: 'Incluir empilhadeiras no MP', who: 'PCM', when: '2025-01-03' },
      { what: 'Manutenção preventiva baterias', who: 'Eletricista', when: '2025-01-15' }
    ]
  }
]

async function seedRAFs() {
  try {
    console.log('🚀 Iniciando seed de RAFs...\n')

    // Buscar o primeiro usuário admin
    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' }
        ]
      }
    })

    if (!admin) {
      console.error('❌ Nenhum usuário admin encontrado!')
      return
    }

    console.log(`✅ Usando usuário: ${admin.firstName} ${admin.lastName}\n`)

    let created = 0
    for (const rafData of rafsExemplo) {
      try {
        const raf = await prisma.failureAnalysisReport.create({
          data: {
            ...rafData,
            companyId: admin.companyId,
            createdById: admin.id
          }
        })
        console.log(`✅ RAF ${raf.rafNumber} criada com sucesso`)
        created++
      } catch (error) {
        console.error(`❌ Erro ao criar RAF ${rafData.rafNumber}:`, error.message)
      }
    }

    console.log(`\n✨ Seed concluído! ${created}/${rafsExemplo.length} RAFs criadas.`)
  } catch (error) {
    console.error('❌ Erro no seed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedRAFs()
