'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserSettingsPanel } from '@/components/profile/UserSettingsPanel'
import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
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
        <p>Erro ao carregar configurações.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Edite seus dados, preferências pessoais e opções de segurança da conta."
      />

      <UserSettingsPanel user={user} companyName={companyName} />
    </PageContainer>
  )
}
