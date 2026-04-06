'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { User, Mail, Briefcase, Shield, Calendar, Building } from 'lucide-react'

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
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'GESTOR':
        return 'bg-primary/10 text-gray-800 border-gray-200'
      case 'PLANEJADOR':
        return 'bg-primary/10 text-gray-800 border-gray-200'
      case 'MECANICO':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'ELETRICISTA':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'OPERADOR':
        return 'bg-success-light text-success-light-foreground border-gray-200'
      case 'CONSTRUTOR_CIVIL':
        return 'bg-muted text-foreground border-gray-200'
      default:
        return 'bg-muted text-foreground border-gray-200'
    }
  }

  const getInitials = () => {
    if (!user) return ''
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-gray-600'
      case 'GESTOR':
        return 'bg-primary'
      case 'PLANEJADOR':
        return 'bg-primary'
      case 'MECANICO':
        return 'bg-gray-600'
      case 'ELETRICISTA':
        return 'bg-gray-600'
      case 'OPERADOR':
        return 'bg-success'
      case 'CONSTRUTOR_CIVIL':
        return 'bg-gray-600'
      default:
        return 'bg-gray-600'
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="p-8">
          <p>Erro ao carregar perfil</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-2">Visualize e gerencie suas informações pessoais</p>
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-full ${getAvatarColor(user.role)} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                {getInitials()}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600 mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                  {user.jobTitle && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
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
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                <p className="text-gray-900 mt-1">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Nome de Usuário</label>
                <p className="text-gray-900 mt-1">{user.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Cargo</label>
                <p className="text-gray-900 mt-1">{user.jobTitle || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Nível de Acesso</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  {getRoleName(user.role)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Empresa</label>
                <p className="text-gray-900 mt-1 flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  {user.company.name}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status da Conta</label>
                  <p className="text-gray-900 mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.enabled ? 'bg-success-light text-gray-800' : 'bg-danger-light text-gray-800'}`}>
                      {user.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Membro desde</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ID do Usuário</label>
                  <p className="text-gray-900 mt-1 font-mono text-xs">{user.id.substring(0, 12)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissões e Acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.role === 'SUPER_ADMIN' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Acesso total ao sistema</p>
                  <p className="text-xs text-gray-700 mt-1">Você tem permissão para gerenciar todos os módulos, usuários e configurações do sistema.</p>
                </div>
              )}
              {user.role === 'GESTOR' && (
                <div className="p-4 bg-primary/5 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Gestor</p>
                  <p className="text-xs text-primary mt-1">Você pode gerenciar ordens de serviço, aprovar solicitações, gerenciar ativos e visualizar relatórios.</p>
                </div>
              )}
              {user.role === 'PLANEJADOR' && (
                <div className="p-4 bg-primary/5 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Planejador</p>
                  <p className="text-xs text-primary mt-1">Você pode planejar e gerenciar ordens de serviço, visualizar ativos, peças e relatórios.</p>
                </div>
              )}
              {user.role === 'MECANICO' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Mecânico</p>
                  <p className="text-xs text-gray-700 mt-1">Você pode visualizar e executar ordens de serviço atribuídas a você, criar solicitações e visualizar ativos e peças.</p>
                </div>
              )}
              {user.role === 'ELETRICISTA' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Eletricista</p>
                  <p className="text-xs text-gray-700 mt-1">Você pode visualizar e executar ordens de serviço atribuídas e visualizar ativos.</p>
                </div>
              )}
              {user.role === 'OPERADOR' && (
                <div className="p-4 bg-success-light border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">✓ Operador</p>
                  <p className="text-xs text-success mt-1">Você pode criar e visualizar solicitações de serviço e visualizar ativos.</p>
                </div>
              )}
              {user.role === 'CONSTRUTOR_CIVIL' && (
                <div className="p-4 bg-secondary border border-border rounded-lg">
                  <p className="text-sm text-foreground font-medium">✓ Construtor Civil</p>
                  <p className="text-xs text-foreground mt-1">Você tem acesso para visualização de ordens de serviço, ativos e peças.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
