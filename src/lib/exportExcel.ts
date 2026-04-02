import * as XLSX from 'xlsx'

interface ExportColumn {
  key: string
  header: string
  transform?: (value: any, row: any) => string | number
}

/**
 * Exporta dados para Excel (.xlsx) no navegador
 * @param data - Array de objetos com os dados
 * @param columns - Configuração das colunas (key, header, transform opcional)
 * @param filename - Nome do arquivo (sem extensão)
 * @param sheetName - Nome da aba (padrão: "Dados")
 */
export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Dados'
) {
  // Montar linhas
  const rows = data.map(item => {
    const row: Record<string, any> = {}
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

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
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
      { key: 'asset.name', header: 'Ativo' },
      { key: 'createdAt', header: 'Criado em', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
      { key: 'completedOn', header: 'Concluído em', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
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
      { key: 'createdAt', header: 'Criado em', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
    ],
  },
  requests: {
    filename: 'Solicitacoes',
    columns: [
      { key: 'id', header: 'ID', transform: (v) => v?.slice(0, 8) || '' },
      { key: 'title', header: 'Título' },
      { key: 'status', header: 'Status' },
      { key: 'priority', header: 'Prioridade' },
      { key: 'createdAt', header: 'Criado em', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
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
      { key: 'enabled', header: 'Ativo', transform: (v) => v ? 'Sim' : 'Não' },
    ],
  },
  rafs: {
    filename: 'RAFs',
    columns: [
      { key: 'rafNumber', header: 'Número' },
      { key: 'area', header: 'Área' },
      { key: 'equipment', header: 'Equipamento' },
      { key: 'occurrenceDate', header: 'Data Ocorrência', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
      { key: 'failureDescription', header: 'Descrição da Falha' },
    ],
  },
}
