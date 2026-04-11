'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  getAvatarClass,
  getRoleBadgeClass,
  getRoleDescription,
  getRoleLabel,
} from '@/components/profile/profile-helpers'
import { isAdminRole } from '@/lib/user-roles'

export default function ProfilePage() {
  const { user, isLoading, companyName } = useAuth()

  if (isLoading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-surface-high" />
          <div className="h-64 rounded bg-surface-high" />
        </div>
      </PageContainer>
    )
  }

  if (!user) {
    return (
      <PageContainer>
        <p>Erro ao carregar perfil.</p>
      </PageContainer>
    )
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
  const roleLabel = getRoleLabel(user.role)
  const canManageBrand = isAdminRole(user.role)

  return (
    <PageContainer>
      <PageHeader
        title="Meu Perfil"
        description="Acompanhe seus dados de acesso, papel no sistema e atalhos da sua conta."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/settings?tab=perfil">
              <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
                <Icon name="edit" className="text-base" />
                Editar perfil
              </Button>
            </Link>
            <Link href="/settings?tab=seguranca">
              <Button variant="outline" className="gap-2">
                <Icon name="lock" className="text-base" />
                Segurança
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white ${getAvatarClass(user.role)}`}
              >
                {initials}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
                <p className="mt-1 text-muted-foreground">{user.email}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getRoleBadgeClass(user.role)}`}>
                    {roleLabel}
                  </span>
                  {user.jobTitle && (
                    <span className="rounded-full bg-surface-low px-3 py-1 text-sm font-medium text-foreground">
                      {user.jobTitle}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="verified_user" className="text-xl" />
              Seu acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[4px] bg-surface-low p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Resumo</p>
              <p className="mt-2 text-[13px] font-medium text-gray-900">{getRoleDescription(user.role)}</p>
            </div>
            <div className="rounded-[4px] border border-border p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Empresa</p>
              <p className="mt-2 text-[13px] font-medium text-gray-900">{companyName}</p>
            </div>
            <div className="rounded-[4px] border border-border p-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Unidades vinculadas</p>
              <p className="mt-2 text-[13px] font-medium text-gray-900">{user.unitIds?.length || 0} unidade(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <InfoCard
          icon="person"
          title="Informações pessoais"
          items={[
            ['Nome completo', fullName],
            ['Email', user.email],
            ['Cargo', user.jobTitle || 'Não informado'],
          ]}
        />

        <InfoCard
          icon="business"
          title="Contexto organizacional"
          items={[
            ['Empresa', companyName],
            ['Perfil', roleLabel],
            ['Localização principal', user.location?.name || 'Não definida'],
          ]}
        />

        <InfoCard
          icon="settings"
          title="Próximos passos"
          items={[
            ['Editar cadastro', 'Atualize seus dados em Configurações > Perfil'],
            ['Alterar senha', 'Use Configurações > Segurança'],
            [
              'Marca da empresa',
              canManageBrand ? 'Gestores podem ajustar a identidade visual da empresa.' : 'Disponível apenas para gestão.',
            ],
          ]}
        />
      </div>
    </PageContainer>
  )
}

function InfoCard({
  icon,
  title,
  items,
}: {
  icon: string
  title: string
  items: Array<[string, string]>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name={icon} className="text-xl" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-[13px] font-medium text-gray-900">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
