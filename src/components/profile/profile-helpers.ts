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
    case 'PLANEJADOR':
      return 'bg-primary-dim/10 text-foreground border-border'
    case 'MANUTENTOR':
      return 'bg-success-light text-success-light-foreground border-border'
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
    case 'PLANEJADOR':
      return 'bg-on-surface-variant'
    case 'MANUTENTOR':
      return 'bg-success'
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
    case 'PLANEJADOR':
      return 'Planeja OSs, aprova solicitações e executa programação nas unidades autorizadas.'
    case 'MANUTENTOR':
      return 'Executa ordens de serviço, abre solicitações e registra análises de falha.'
    default:
      return 'Perfil de acesso configurado para sua conta.'
  }
}
