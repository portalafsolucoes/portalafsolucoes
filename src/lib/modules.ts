export type ModuleRecord = {
  id: string
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  order?: number | null
}

type ModuleUiMeta = {
  icon: string
  description?: string
}

const MODULE_UI_META: Record<string, ModuleUiMeta> = {
  dashboard: {
    icon: 'dashboard',
    description: 'Painel inicial com indicadores operacionais.',
  },
  tree: {
    icon: 'account_tree',
    description: 'Estrutura de ativos e hierarquia operacional.',
  },
  'people-teams': {
    icon: 'group',
    description: 'Cadastro de pessoas e equipes de manutenção.',
  },
  'basic-registrations': {
    icon: 'tune',
    description: 'Cadastros de apoio usados em todo o sistema.',
  },
  assets: {
    icon: 'inventory_2',
    description: 'Gestão de bens, equipamentos e dados técnicos.',
  },
  'maintenance-plan': {
    icon: 'event_upcoming',
    description: 'Planos preventivos padrão e por ativo.',
  },
  planning: {
    icon: 'date_range',
    description: 'Programação e sequenciamento de ordens de serviço.',
  },
  'work-orders': {
    icon: 'construction',
    description: 'Execução e acompanhamento das ordens de serviço.',
  },
  requests: {
    icon: 'assignment',
    description: 'Solicitações de serviço abertas pelos usuários.',
  },
  approvals: {
    icon: 'check_circle',
    description: 'Fila de aprovações pendentes da empresa.',
  },
  rafs: {
    icon: 'description',
    description: 'Relatórios de análise de falhas.',
  },
  locations: {
    icon: 'location_on',
    description: 'Localizações e estrutura física dos ativos.',
  },
  kpi: {
    icon: 'trending_up',
    description: 'Indicadores de desempenho da manutenção.',
  },
  audit: {
    icon: 'history',
    description: 'Relatório de alterações realizadas no sistema.',
  },
  gep: {
    icon: 'monitoring',
    description: 'Variáveis e monitoramento de processo.',
  },
  analytics: {
    icon: 'bar_chart',
    description: 'Análises e relatórios consolidados.',
  },
  settings: {
    icon: 'settings',
    description: 'Administração e configurações corporativas.',
  },
}

export function normalizeModuleForUi<T extends ModuleRecord>(module: T): T & {
  icon: string
  description: string | null
} {
  const meta = MODULE_UI_META[module.slug]

  return {
    ...module,
    icon: meta?.icon || module.icon || 'extension',
    description: module.description || meta?.description || null,
  }
}
