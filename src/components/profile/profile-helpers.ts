export function getRoleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrador'
    case 'GESTOR':
      return 'Gestor'
    case 'PLANEJADOR':
      return 'Planejador'
    case 'MECANICO':
      return 'Mecânico'
    case 'ELETRICISTA':
      return 'Eletricista'
    case 'OPERADOR':
      return 'Operador'
    case 'CONSTRUTOR_CIVIL':
      return 'Construtor Civil'
    default:
      return role
  }
}

export function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-surface-low text-foreground border-border'
    case 'GESTOR':
      return 'bg-primary/10 text-foreground border-border'
    case 'PLANEJADOR':
      return 'bg-primary/10 text-foreground border-border'
    case 'OPERADOR':
      return 'bg-success-light text-success-light-foreground border-border'
    case 'CONSTRUTOR_CIVIL':
      return 'bg-muted text-foreground border-border'
    default:
      return 'bg-surface-low text-foreground border-border'
  }
}

export function getAvatarClass(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-primary-graphite'
    case 'GESTOR':
      return 'bg-primary'
    case 'PLANEJADOR':
      return 'bg-primary'
    case 'OPERADOR':
      return 'bg-success'
    default:
      return 'bg-primary-graphite'
  }
}

export function getRoleDescription(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Controle total do sistema, empresas, unidades, usuários e módulos.'
    case 'GESTOR':
      return 'Gerencia a operação da empresa, aprova solicitações e acompanha indicadores.'
    case 'PLANEJADOR':
      return 'Planeja manutenções, agendas e planos preventivos da unidade.'
    case 'MECANICO':
      return 'Executa ordens de serviço atribuídas e registra atividades de campo.'
    case 'ELETRICISTA':
      return 'Executa ordens de serviço elétricas e acompanha a operação atribuída.'
    case 'OPERADOR':
      return 'Abre solicitações e acompanha o fluxo operacional do dia a dia.'
    case 'CONSTRUTOR_CIVIL':
      return 'Atua em ordens de serviço civis e acompanha as atividades atribuídas.'
    default:
      return 'Perfil de acesso configurado para sua conta.'
  }
}
