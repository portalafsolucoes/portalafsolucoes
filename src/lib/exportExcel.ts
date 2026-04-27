import * as XLSX from 'xlsx'

interface ExportColumn {
  key: string
  header: string
  transform?: (value: unknown, row: Record<string, unknown>) => string | number
}

/**
 * Exporta dados para Excel (.xlsx) no navegador
 * @param data - Array de objetos com os dados
 * @param columns - Configuração das colunas (key, header, transform opcional)
 * @param filename - Nome do arquivo (sem extensão)
 * @param sheetName - Nome da aba (padrão: "Dados")
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Dados'
) {
  // Montar linhas
  const rows = data.map(item => {
    const row: Record<string, unknown> = {}
    for (const col of columns) {
      const rawValue = getNestedValue(item, col.key)
      row[col.header] = col.transform ? col.transform(rawValue, item) : (rawValue ?? '')
    }
    return row
  })

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Ajustar largura das colunas
  const colWidths = columns.map(col => ({
    wch: Math.max(
      col.header.length + 2,
      ...rows.map(r => String(r[col.header] || '').length).slice(0, 100)
    )
  }))
  ws['!cols'] = colWidths

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }

    return undefined
  }, obj)
}

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR')
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  return ''
}

function formatShortIdValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).slice(0, 8)
  }

  return ''
}

// Configurações pré-definidas para entidades comuns
export const EXPORT_CONFIGS: Record<string, { columns: ExportColumn[]; filename: string }> = {
  'work-orders': {
    filename: 'Ordens_de_Servico',
    columns: [
      { key: 'internalId', header: 'ID' },
      { key: 'title', header: 'Título' },
      { key: 'status', header: 'Status' },
      { key: 'priority', header: 'Prioridade' },
      { key: 'type', header: 'Tipo' },
      { key: 'asset.name', header: 'ATIVO' },
      { key: 'createdAt', header: 'Criado em', transform: formatDateValue },
      { key: 'completedOn', header: 'Concluído em', transform: formatDateValue },
    ],
  },
  assets: {
    filename: 'Ativos',
    columns: [
      { key: 'tag', header: 'TAG' },
      { key: 'name', header: 'Nome' },
      { key: 'description', header: 'Descrição' },
      { key: 'status', header: 'Status' },
      { key: 'manufacturer', header: 'Fabricante' },
      { key: 'modelName', header: 'Modelo' },
      { key: 'serialNumber', header: 'Nº Série' },
      { key: 'protheusCode', header: 'Cód. Protheus' },
      { key: 'createdAt', header: 'Criado em', transform: formatDateValue },
    ],
  },
  'standard-assets': {
    filename: 'Bens_Padrao',
    columns: [
      { key: 'family.code', header: 'Cod. Familia' },
      { key: 'family.name', header: 'Familia' },
      { key: 'name', header: 'Nome' },
      { key: 'manufacturer', header: 'Fabricante' },
      { key: 'modelName', header: 'Modelo' },
      { key: 'priority', header: 'Prioridade' },
      { key: 'shiftCode', header: 'Turno' },
      { key: 'createdAt', header: 'Criado em', transform: formatDateValue },
    ],
  },
  'asset-criticality': {
    filename: 'Criticidade_Ativos',
    columns: [
      { key: 'name', header: 'ATIVO' },
      { key: 'customId', header: 'Codigo' },
      { key: 'location.name', header: 'Localizacao' },
      { key: 'classification', header: 'Classificacao' },
      { key: 'gutScore', header: 'GUT' },
      { key: 'openRequestsCount', header: 'SS Abertas' },
      { key: 'openWorkOrdersCount', header: 'OS Abertas' },
      { key: 'rafCount', header: 'RAFs' },
      { key: 'totalScore', header: 'Score Total' },
    ],
  },
  requests: {
    filename: 'Solicitacoes',
    columns: [
      { key: 'id', header: 'ID', transform: formatShortIdValue },
      { key: 'title', header: 'Título' },
      { key: 'status', header: 'Status' },
      { key: 'priority', header: 'Prioridade' },
      { key: 'createdAt', header: 'Criado em', transform: formatDateValue },
    ],
  },
  users: {
    filename: 'Usuarios',
    columns: [
      { key: 'firstName', header: 'Nome' },
      { key: 'lastName', header: 'Sobrenome' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Perfil' },
      { key: 'jobTitle', header: 'Cargo' },
      { key: 'phone', header: 'Telefone' },
      { key: 'enabled', header: 'ATIVO', transform: (v) => v ? 'SIM' : 'NAO' },
    ],
  },
  rafs: {
    filename: 'RAFs',
    columns: [
      { key: 'rafNumber', header: 'Número' },
      { key: 'area', header: 'Área' },
      { key: 'equipment', header: 'Equipamento' },
      { key: 'occurrenceDate', header: 'Data Ocorrência', transform: formatDateValue },
      { key: 'failureDescription', header: 'Descrição da Falha' },
    ],
  },
  audit: {
    filename: 'Auditoria',
    columns: [
      { key: 'createdAt', header: 'Data/Hora', transform: (v) => {
        if (!v) return ''
        try { return new Date(String(v)).toLocaleString('pt-BR') } catch { return String(v) }
      } },
      { key: 'userName', header: 'Usuário' },
      { key: 'userRole', header: 'Perfil' },
      { key: 'action', header: 'Ação', transform: (v) => {
        const s = String(v || '')
        if (s === 'CREATE') return 'Criação'
        if (s === 'UPDATE') return 'Edição'
        if (s === 'DELETE') return 'Exclusão'
        return s
      } },
      { key: 'entity', header: 'Entidade', transform: (v) => {
        const s = String(v || '')
        const map: Record<string, string> = {
          Asset: 'Ativo',
          AssetMaintenancePlan: 'Plano de Manutenção (Ativo)',
          StandardMaintenancePlan: 'Plano de Manutenção (Padrão)',
          StandardChecklist: 'Check List Padrão',
          AreaInspection: 'Inspeção de Área',
          WorkOrder: 'Ordem de Serviço',
          Request: 'Solicitação',
          FailureAnalysisReport: 'RAF',
          Location: 'Localização',
          User: 'Usuário',
          Company: 'Empresa',
          Calendar: 'Calendário',
          Area: 'Área',
          CostCenter: 'Centro de Custo',
          WorkCenter: 'Centro de Trabalho',
          AssetFamily: 'Família de Ativos',
          AssetFamilyModel: 'Modelo de Família',
          Position: 'Posição',
          JobTitle: 'Cargo',
          Characteristic: 'Característica',
          Resource: 'Recurso',
          MaintenanceType: 'Tipo de Manutenção',
          MaintenanceArea: 'Área de Manutenção',
          ServiceType: 'Tipo de Serviço',
          GenericTask: 'Tarefa Genérica',
          GenericStep: 'Etapa Genérica',
          CounterType: 'Tipo de Contador',
        }
        return map[s] ?? s
      } },
      { key: 'entityLabel', header: 'Identificador' },
      { key: 'summary', header: 'Resumo' },
      { key: 'source', header: 'Fonte', transform: (v) => {
        const s = String(v || '')
        if (s === 'audit_log') return 'Auditoria geral'
        if (s === 'asset_history') return 'Histórico de ativo'
        if (s === 'wo_reschedule') return 'Reprogramação de OS'
        if (s === 'company_rejection') return 'Rejeição de empresa'
        return s
      } },
    ],
  },
  'action-plan-items': {
    filename: 'PA_das_RAFs',
    columns: [
      { key: 'rafNumber', header: 'RAF' },
      { key: 'actionDescription', header: 'Ação' },
      { key: 'responsibleName', header: 'Responsável' },
      { key: 'rafCreatedAt', header: 'Data criação', transform: formatDateValue },
      { key: 'occurrenceDate', header: 'Data ocorrência', transform: formatDateValue },
      { key: 'deadline', header: 'Prazo', transform: formatDateValue },
      { key: 'linkedWorkOrderNumber', header: 'OS' },
      { key: 'linkedWorkOrderStatus', header: 'Status OS' },
      { key: 'linkedRequestNumber', header: 'SS' },
      { key: 'linkedRequestStatus', header: 'Status SS' },
      { key: 'actionStatusLabel', header: 'Status da ação' },
      { key: 'rafStatus', header: 'Status da RAF' },
    ],
  },
}
