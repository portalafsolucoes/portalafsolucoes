import { getRoleDisplayName, normalizeUserRole } from '@/lib/user-roles'

export function getRoleLabel(role: string) {
  return getRoleDisplayName(role)
}

export function getRoleBadgeClass(role: string) {
  switch (normalizeUserRole(role)) {
    case 'SUPER_ADMIN':
      return 'bg-surface-low text-foreground border-border'
    case 'ADMIN':
      return 'bg-primary/10 text-foreground border-border'
    case 'TECHNICIAN':
      return 'bg-success-light text-success-light-foreground border-border'
    case 'LIMITED_TECHNICIAN':
      return 'bg-muted text-foreground border-border'
    case 'REQUESTER':
      return 'bg-primary-dim/10 text-foreground border-border'
    case 'VIEW_ONLY':
      return 'bg-surface-low text-muted-foreground border-border'
    default:
      return 'bg-surface-low text-foreground border-border'
  }
}

export function getAvatarClass(role: string) {
  switch (normalizeUserRole(role)) {
    case 'SUPER_ADMIN':
      return 'bg-primary-graphite'
    case 'ADMIN':
      return 'bg-primary'
    case 'TECHNICIAN':
      return 'bg-success'
    case 'LIMITED_TECHNICIAN':
      return 'bg-on-surface-variant'
    case 'REQUESTER':
      return 'bg-primary-dim'
    case 'VIEW_ONLY':
      return 'bg-surface-high'
    default:
      return 'bg-primary-graphite'
  }
}

export function getRoleDescription(role: string) {
  switch (normalizeUserRole(role)) {
    case 'SUPER_ADMIN':
      return 'Controle total do sistema, empresas, unidades, usuários e módulos.'
    case 'ADMIN':
      return 'Gerencia a operação da empresa, aprova solicitações e acompanha indicadores.'
    case 'TECHNICIAN':
      return 'Executa ordens de serviço atribuídas e registra atividades de campo.'
    case 'LIMITED_TECHNICIAN':
      return 'Executa ordens de serviço com escopo restrito e acompanha atividades atribuídas.'
    case 'REQUESTER':
      return 'Abre solicitações e acompanha o fluxo operacional do dia a dia.'
    case 'VIEW_ONLY':
      return 'Acesso somente leitura aos módulos permitidos, sem criar, editar ou aprovar.'
    default:
      return 'Perfil de acesso configurado para sua conta.'
  }
}
