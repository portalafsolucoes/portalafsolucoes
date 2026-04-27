// Labels em PT-BR para a tela /audit. Centraliza a traducao de nomes
// canonicos de entidade (vindo do banco como 'Asset', 'WorkOrder', etc.),
// tipos de evento legado (AssetHistory.eventType) e nomes de campo.

const ENTITY_LABELS: Record<string, string> = {
  // Operacionais CMMS
  Asset: 'Ativo',
  AssetMaintenancePlan: 'Plano de Manutenção (Ativo)',
  StandardMaintenancePlan: 'Plano de Manutenção (Padrão)',
  StandardChecklist: 'Check List Padrão',
  AreaInspection: 'Inspeção de Área',
  WorkOrder: 'Ordem de Serviço',
  Request: 'Solicitação',
  FailureAnalysisReport: 'RAF',
  Location: 'Localização',
  // Cadastros e organizacionais
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

export function entityLabel(entity: string | null | undefined): string {
  if (!entity) return '—'
  return ENTITY_LABELS[entity] ?? entity
}

const ASSET_EVENT_LABELS: Record<string, string> = {
  ASSET_CREATED: 'Ativo criado',
  ASSET_UPDATED: 'Ativo atualizado',
  ASSET_DELETED: 'Ativo removido',
  FILE_UPLOADED: 'Arquivo enviado',
  ATTACHMENT_ADDED: 'Anexo adicionado',
  ATTACHMENT_REMOVED: 'Anexo removido',
  WORK_ORDER_COMPLETED: 'Ordem de serviço concluída',
  WORK_ORDER_CREATED: 'Ordem de serviço criada',
  REQUEST_CREATED: 'Solicitação criada',
}

export function assetEventLabel(eventType: string | null | undefined): string {
  if (!eventType) return '—'
  const direct = ASSET_EVENT_LABELS[eventType]
  if (direct) return direct
  // Fallback amigavel: SNAKE_CASE -> Frase capitalizada
  return eventType
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part, idx) => (idx === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

// Labels comuns de campos (usados em diff/snapshot/metadata).
// Nao precisa cobrir 100% — campos nao mapeados caem no fallback (humanizacao).
const FIELD_LABELS: Record<string, string> = {
  // Identificacao geral
  id: 'ID',
  name: 'Nome',
  code: 'Código',
  description: 'Descrição',
  notes: 'Observações',
  status: 'Status',
  active: 'Ativo',
  isActive: 'Ativo',
  enabled: 'Habilitado',
  archived: 'Arquivado',
  type: 'Tipo',
  priority: 'Prioridade',
  title: 'Título',
  number: 'Número',
  email: 'E-mail',
  phone: 'Telefone',
  username: 'Nome de usuário',
  firstName: 'Nome',
  lastName: 'Sobrenome',
  role: 'Papel',
  jobTitle: 'Cargo',
  jobTitleId: 'Cargo',
  hourlyRate: 'Valor/hora',
  protheusCode: 'Código Protheus',
  // Tempos e datas
  createdAt: 'Criado em',
  updatedAt: 'Atualizado em',
  dueDate: 'Vencimento',
  scheduledDate: 'Data programada',
  startedAt: 'Iniciado em',
  completedOn: 'Concluído em',
  finalizedAt: 'Finalizado em',
  rescheduledDate: 'Data reprogramada',
  occurrenceDate: 'Data da ocorrência',
  deadline: 'Prazo',
  lastMaintenanceDate: 'Última manutenção',
  // Relacoes
  companyId: 'Empresa',
  unitId: 'Unidade',
  locationId: 'Localização',
  parentAssetId: 'Ativo pai',
  parentId: 'Pai',
  assetId: 'Ativo',
  workOrderId: 'Ordem de serviço',
  requestId: 'Solicitação',
  inspectionId: 'Inspeção',
  workCenterId: 'Centro de trabalho',
  serviceTypeId: 'Tipo de serviço',
  maintenanceAreaId: 'Área de manutenção',
  maintenanceTypeId: 'Tipo de manutenção',
  costCenterId: 'Centro de custo',
  familyId: 'Família',
  familyModelId: 'Modelo de família',
  assignedToId: 'Atribuído a',
  responsibleUserId: 'Responsável',
  createdById: 'Criado por',
  finalizedById: 'Finalizado por',
  reopenedById: 'Reaberto por',
  submittedForReviewById: 'Enviado para revisão por',
  detachedById: 'Customizado por',
  // Ativos / planos
  tag: 'TAG',
  serial: 'Série',
  manufacturer: 'Fabricante',
  model: 'Modelo',
  modelName: 'Nome do modelo',
  serialNumber: 'Número de série',
  barCode: 'Código de barras',
  nfcId: 'NFC',
  image: 'Imagem',
  hasImage: 'Possui imagem',
  imageUrl: 'Imagem',
  attachmentUrl: 'Anexo',
  area: 'Área',
  areaId: 'Área',
  customId: 'ID customizado',
  toleranceDays: 'Tolerância (dias)',
  trackingType: 'Tipo de rastreio',
  maintenanceTime: 'Tempo de manutenção',
  timeUnit: 'Unidade de tempo',
  sequence: 'Sequência',
  hasLocalOverrides: 'Customizado',
  detachedAt: 'Customizado em',
  // Ativos — TOTVS / Protheus
  hasStructure: 'Possui estrutura',
  hasCounter: 'Possui contador',
  maintenanceStatus: 'Status de manutenção',
  assetCategoryType: 'Categoria do ativo',
  assetPriority: 'Prioridade do ativo',
  hourlyCost: 'Custo por hora',
  acquisitionCost: 'Custo de aquisição',
  purchaseValue: 'Valor de compra',
  purchaseDate: 'Data de compra',
  installationDate: 'Data de instalação',
  deactivationDate: 'Data de baixa',
  deactivationReason: 'Motivo da baixa',
  fixedAssetCode: 'Imobilizado',
  assetPlate: 'Chapa do imobilizado',
  ownershipType: 'Tipo de propriedade',
  supplierCode: 'Código do fornecedor',
  supplierStore: 'Loja do fornecedor',
  warrantyPeriod: 'Prazo de garantia',
  warrantyUnit: 'Unidade da garantia',
  warrantyDate: 'Fim da garantia',
  counterType: 'Tipo do contador',
  counterPosition: 'Posição do contador',
  counterLimit: 'Limite do contador',
  dailyVariation: 'Variação diária',
  accumulatedCounter: 'Contador acumulado',
  lifeValue: 'Vida útil',
  lifeUnit: 'Unidade da vida útil',
  warehouse: 'Almoxarifado',
  shiftCode: 'Turno de trabalho',
  positionId: 'Posição',
  // GUT
  gutGravity: 'Gravidade (GUT)',
  gutUrgency: 'Urgência (GUT)',
  gutTendency: 'Tendência (GUT)',
  // Categorias
  categoryId: 'Categoria',
  primaryUserId: 'Usuário primário',
  // OS e SS
  internalId: 'Número interno',
  externalId: 'Número externo',
  sequenceNumber: 'Sequência',
  requestNumber: 'Número da SS',
  rafNumber: 'Número da RAF',
  laborCost: 'Custo de mão de obra',
  partsCost: 'Custo de peças',
  thirdPartyCost: 'Custo de terceiros',
  toolsCost: 'Custo de ferramentas',
  executionNotes: 'Notas de execução',
  failureDescription: 'Descrição da falha',
  immediateAction: 'Ação imediata',
  rejectionReason: 'Motivo da rejeição',
  rescheduleCount: 'Reprogramações',
  duration: 'Duração',
  totalDuration: 'Duração total',
  calendarWarnings: 'Alertas do calendário',
  calendarDetails: 'Detalhes do calendário',
  // RAF
  failureType: 'Tipo de falha',
  stopExtension: 'Extensão da parada',
  failureBreakdown: 'Detalhamento da falha',
  productionLost: 'Produção perdida',
  panelOperator: 'Operador de painel',
  observation: 'Observação',
  fiveWhys: '5 Porquês',
  hypothesisTests: 'Testes de hipótese',
  actionPlan: 'Plano de ação',
  // Metadados de auditoria
  updatedFields: 'Campos atualizados',
  reason: 'Motivo',
  ip: 'IP',
  userAgent: 'Navegador',
}

function humanizeKey(key: string): string {
  // Converte camelCase / snake_case em frase capitalizada como fallback
  const spaced = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export function fieldLabel(field: string): string {
  if (!field) return '—'
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  return humanizeKey(field)
}

const SOURCE_LABELS_FULL: Record<string, string> = {
  audit_log: 'Auditoria geral',
  asset_history: 'Histórico de ativo',
  wo_reschedule: 'Reprogramação de OS',
  company_rejection: 'Rejeição de empresa',
}

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return '—'
  return SOURCE_LABELS_FULL[source] ?? source
}

const ACTION_LABELS_PT: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
}

export function actionLabel(action: string | null | undefined): string {
  if (!action) return '—'
  return ACTION_LABELS_PT[action] ?? action
}
