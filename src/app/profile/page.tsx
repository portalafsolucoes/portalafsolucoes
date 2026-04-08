'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'


interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  role: string
  jobTitle?: string
  enabled: boolean
  createdAt: string
  company: {
    name: string
  }
}

export default function ProfilePage() {
  const { user: authUser, isLoading: loading } = useAuth()
  // Cast to UserData since the API returns all fields but the hook type is narrower
  const user = authUser as unknown as UserData | null

  const getRoleName = (role: string) => {
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-surface-low text-foreground border-border'
      case 'GESTOR':
        return 'bg-primary/10 text-foreground border-border'
      case 'PLANEJADOR':
        return 'bg-primary/10 text-foreground border-border'
      case 'MECANICO':
        return 'bg-surface-low text-foreground border-border'
      case 'ELETRICISTA':
        return 'bg-surface-low text-foreground border-border'
      case 'OPERADOR':
        return 'bg-success-light text-success-light-foreground border-border'
      case 'CONSTRUTOR_CIVIL':
        return 'bg-muted text-foreground border-border'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  const getInitials = () => {
    if (!user) return ''
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-primary-graphite'
      case 'GESTOR':
        return 'bg-primary'
      case 'PLANEJADOR':
        return 'bg-primary'
      case 'MECANICO':
        return 'bg-primary-graphite'
      case 'ELETRICISTA':
        return 'bg-primary-graphite'
      case 'OPERADOR':
        return 'bg-success'
      case 'CONSTRUTOR_CIVIL':
        return 'bg-primary-graphite'
      default:
        return 'bg-primary-graphite'
    }
  }

  if (loading) {
    return (
      <PageContainer variant="narrow">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-high rounded w-1/4"></div>
          <div className="h-64 bg-surface-high rounded"></div>
        </div>
      </PageContainer>
    )
  }

  if (!user) {
    return (
      <PageContainer variant="narrow">
          <p>Erro ao carregar perfil</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
        <PageHeader
          title="Meu Perfil"
          description="Visualize e gerencie suas informações pessoais"
        />

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-full ${getAvatarColor(user.role)} flex items-center justify-center text-white text-3xl font-bold ambient-shadow`}>
                {getInitials()}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-muted-foreground mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                  {user.jobTitle && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-low text-foreground">
                      {user.jobTitle}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="person" className="text-xl" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground mt-1">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome de Usuário</label>
                <p className="text-foreground mt-1">{user.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground mt-1 flex items-center gap-2">
                  <Icon name="mail" className="text-base text-muted-foreground" />
                  {user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="work" className="text-xl" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cargo</label>
                <p className="text-foreground mt-1">{user.jobTitle || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nível de Acesso</label>
                <p className="text-foreground mt-1 flex items-center gap-2">
                  <Icon name="shield" className="text-base text-muted-foreground" />
                  {getRoleName(user.role)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                <p className="text-foreground mt-1 flex items-center gap-2">
                  <Icon name="business" className="text-base text-muted-foreground" />
                  {user.company.name}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="calendar_today" className="text-xl" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status da Conta</label>
                  <p className="text-foreground mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.enabled ? 'bg-success-light text-foreground' : 'bg-danger-light text-foreground'}`}>
                      {user.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Membro desde</label>
                  <p className="text-foreground mt-1">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID do Usuário</label>
                  <p className="text-foreground mt-1 font-mono text-xs">{user.id.substring(0, 12)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="shield" className="text-xl" />
              Permissões e Acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.role === 'SUPER_ADMIN' && (
                <div className="p-4 bg-surface rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Acesso total ao sistema</p>
                  <p className="text-xs text-foreground mt-1">Você tem permissão para gerenciar todos os módulos, usuários e configurações do sistema.</p>
                </div>
              )}
              {user.role === 'GESTOR' && (
                <div className="p-4 bg-primary/5 rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Gestor</p>
                  <p className="text-xs text-primary mt-1">Você pode gerenciar ordens de serviço, aprovar solicitações, gerenciar ativos e visualizar relatórios.</p>
                </div>
              )}
              {user.role === 'PLANEJADOR' && (
                <div className="p-4 bg-primary/5 rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Planejador</p>
                  <p className="text-xs text-primary mt-1">Você pode planejar e gerenciar ordens de serviço, visualizar ativos, peças e relatórios.</p>
                </div>
              )}
              {user.role === 'MECANICO' && (
                <div className="p-4 bg-surface rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Mecânico</p>
                  <p className="text-xs text-foreground mt-1">Você pode visualizar e executar ordens de serviço atribuídas a você, criar solicitações e visualizar ativos e peças.</p>
                </div>
              )}
              {user.role === 'ELETRICISTA' && (
                <div className="p-4 bg-surface rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Eletricista</p>
                  <p className="text-xs text-foreground mt-1">Você pode visualizar e executar ordens de serviço atribuídas e visualizar ativos.</p>
                </div>
              )}
              {user.role === 'OPERADOR' && (
                <div className="p-4 bg-success-light rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Operador</p>
                  <p className="text-xs text-success mt-1">Você pode criar e visualizar solicitações de serviço e visualizar ativos.</p>
                </div>
              )}
              {user.role === 'CONSTRUTOR_CIVIL' && (
                <div className="p-4 bg-secondary rounded-[4px]">
                  <p className="text-sm text-foreground font-medium">✓ Construtor Civil</p>
                  <p className="text-xs text-foreground mt-1">Você tem acesso para visualização de ordens de serviço, ativos e peças.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </PageContainer>
  )
}
