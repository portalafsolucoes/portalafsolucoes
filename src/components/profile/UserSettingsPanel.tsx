'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { CompanyLogoCard } from '@/components/profile/CompanyLogoCard'
import { getRoleDescription, getRoleLabel } from '@/components/profile/profile-helpers'
import type { AuthUser } from '@/hooks/useAuth'

type SettingsTab = 'perfil' | 'seguranca' | 'preferencias' | 'empresa'

type LocationOption = {
  id: string
  name: string
}

const SETTINGS_STORAGE_KEY = 'cmm:user-settings'

interface UserSettingsPanelProps {
  user: AuthUser
  companyName: string
  defaultTab?: SettingsTab
}

export function UserSettingsPanel({
  user,
  companyName,
  defaultTab = 'perfil',
}: UserSettingsPanelProps) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const requestedTab = searchParams.get('tab') as SettingsTab | null
  const canEditCompany = user.role === 'SUPER_ADMIN' || user.role === 'GESTOR'
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    requestedTab === 'empresa' && !canEditCompany ? defaultTab : requestedTab || defaultTab
  )

  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: '',
    jobTitle: user.jobTitle || '',
    locationId: user.location?.id || '',
  })
  const [profileState, setProfileState] = useState({ saving: false, error: '', success: '' })

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [securityState, setSecurityState] = useState({ saving: false, error: '', success: '' })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pendingApprovalsAlerts: true,
    compactCards: false,
    showWelcomePanel: true,
  })
  const [preferencesState, setPreferencesState] = useState({ saved: false })

  useEffect(() => {
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: '',
      jobTitle: user.jobTitle || '',
      locationId: user.location?.id || '',
    })
  }, [user])

  useEffect(() => {
    async function fetchCurrentProfile() {
      try {
        const response = await fetch('/api/profile')
        const data = await response.json()
        if (response.ok && data.data) {
          setProfileForm({
            firstName: data.data.firstName || '',
            lastName: data.data.lastName || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            jobTitle: data.data.jobTitle || '',
            locationId: data.data.locationId || '',
          })
        }
      } catch {
        // Mantém dados iniciais do hook de autenticação
      }
    }

    async function fetchLocations() {
      try {
        const response = await fetch('/api/locations')
        const data = await response.json()
        if (response.ok && data.data) {
          setLocations(data.data.map((location: LocationOption) => ({
            id: location.id,
            name: location.name,
          })))
        }
      } finally {
        setLoadingLocations(false)
      }
    }

    fetchCurrentProfile()
    fetchLocations()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      setPreferences((prev) => ({ ...prev, ...parsed }))
    } catch {
      // Ignore invalid local storage state
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences))
    setPreferencesState({ saved: true })

    const timeout = window.setTimeout(() => {
      setPreferencesState({ saved: false })
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [preferences])

  useEffect(() => {
    if (!requestedTab) return
    if (requestedTab === 'empresa' && !canEditCompany) return
    setActiveTab(requestedTab)
  }, [requestedTab, canEditCompany])

  const roleLabel = useMemo(() => getRoleLabel(user.role), [user.role])
  const roleDescription = useMemo(() => getRoleDescription(user.role), [user.role])

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileState({ saving: true, error: '', success: '' })

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
          jobTitle: profileForm.jobTitle,
          locationId: profileForm.locationId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setProfileState({
          saving: false,
          error: data.error || 'Não foi possível salvar seu perfil.',
          success: '',
        })
        return
      }

      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setProfileState({
        saving: false,
        error: '',
        success: 'Dados do perfil atualizados com sucesso.',
      })
    } catch {
      setProfileState({
        saving: false,
        error: 'Erro de conexão ao salvar seu perfil.',
        success: '',
      })
    }
  }

  const handleSecuritySubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!securityForm.currentPassword || !securityForm.newPassword) {
      setSecurityState({
        saving: false,
        error: 'Informe a senha atual e a nova senha.',
        success: '',
      })
      return
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityState({
        saving: false,
        error: 'A confirmação da nova senha não confere.',
        success: '',
      })
      return
    }

    setSecurityState({ saving: true, error: '', success: '' })

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSecurityState({
          saving: false,
          error: data.error || 'Não foi possível atualizar sua senha.',
          success: '',
        })
        return
      }

      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setSecurityState({
        saving: false,
        error: '',
        success: 'Senha atualizada com sucesso.',
      })
    } catch {
      setSecurityState({
        saving: false,
        error: 'Erro de conexão ao atualizar a senha.',
        success: '',
      })
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
      <TabsList className="mb-6 flex h-auto flex-wrap gap-2 rounded-[4px] bg-card p-2 ambient-shadow">
        <TabsTrigger value="perfil" className="rounded-[4px] border-b-0 px-4 py-2">
          Perfil
        </TabsTrigger>
        <TabsTrigger value="seguranca" className="rounded-[4px] border-b-0 px-4 py-2">
          Segurança
        </TabsTrigger>
        <TabsTrigger value="preferencias" className="rounded-[4px] border-b-0 px-4 py-2">
          Preferências
        </TabsTrigger>
        {canEditCompany && (
          <TabsTrigger value="empresa" className="rounded-[4px] border-b-0 px-4 py-2">
            Empresa
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="perfil" className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="edit" className="text-xl" />
                Dados pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {profileState.error && (
                  <div className="rounded-[4px] bg-danger/10 p-3 text-sm text-danger">
                    {profileState.error}
                  </div>
                )}

                {profileState.success && (
                  <div className="rounded-[4px] bg-success-light p-3 text-sm text-success">
                    {profileState.success}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nome"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                  <Input
                    label="Sobrenome"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <Input
                    label="Telefone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Cargo"
                    value={profileForm.jobTitle}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="Ex.: Planejador PCM"
                  />

                  <div className="w-full">
                    <label htmlFor="locationId" className="label-uppercase mb-1.5 block">
                      Localização principal
                    </label>
                    <select
                      id="locationId"
                      value={profileForm.locationId}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, locationId: e.target.value }))}
                      className="flex h-10 w-full rounded-[4px] bg-surface-low px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loadingLocations}
                    >
                      <option value="">{loadingLocations ? 'Carregando...' : 'Não definida'}</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileState.saving} className="gap-2">
                    <Icon name="save" className="text-base" />
                    {profileState.saving ? 'Salvando...' : 'Salvar perfil'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="badge" className="text-xl" />
                Resumo da conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[4px] bg-surface-low p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Perfil de acesso</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{roleLabel}</p>
                <p className="mt-2 text-sm text-muted-foreground">{roleDescription}</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Empresa</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{companyName}</p>
                </div>
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unidade ativa</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {user.location?.name || 'Definida pelo seletor do cabeçalho'}
                  </p>
                </div>
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Acesso</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {user.unitIds?.length || 0} unidade(s) vinculada(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="seguranca" className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="lock" className="text-xl" />
                Alterar senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSecuritySubmit} className="space-y-5">
                {securityState.error && (
                  <div className="rounded-[4px] bg-danger/10 p-3 text-sm text-danger">
                    {securityState.error}
                  </div>
                )}

                {securityState.success && (
                  <div className="rounded-[4px] bg-success-light p-3 text-sm text-success">
                    {securityState.success}
                  </div>
                )}

                <Input
                  label="Senha atual"
                  type="password"
                  value={securityForm.currentPassword}
                  onChange={(e) => setSecurityForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
                <Input
                  label="Nova senha"
                  type="password"
                  value={securityForm.newPassword}
                  onChange={(e) => setSecurityForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={securityForm.confirmPassword}
                  onChange={(e) => setSecurityForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={securityState.saving} className="gap-2">
                    <Icon name="lock_reset" className="text-base" />
                    {securityState.saving ? 'Atualizando...' : 'Atualizar senha'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="verified_user" className="text-xl" />
                Boas práticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Use ao menos 8 caracteres e combine letras, números e símbolos para aumentar a segurança.</p>
              <p>Evite repetir a senha usada em outros sistemas corporativos ou pessoais.</p>
              <p>Ao alterar o email, a sessão é atualizada automaticamente para manter seu acesso consistente.</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="preferencias" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="tune" className="text-xl" />
              Preferências da experiência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PreferenceRow
              title="Notificações por email"
              description="Mantém avisos importantes de atividade e alterações da conta."
              checked={preferences.emailNotifications}
              onChange={(checked) => setPreferences((prev) => ({ ...prev, emailNotifications: checked }))}
            />
            <PreferenceRow
              title="Alertas de solicitações pendentes"
              description="Prioriza o acompanhamento de aprovações para perfis de gestão."
              checked={preferences.pendingApprovalsAlerts}
              onChange={(checked) => setPreferences((prev) => ({ ...prev, pendingApprovalsAlerts: checked }))}
            />
            <PreferenceRow
              title="Cartões compactos"
              description="Reduz espaçamento visual em páginas com muita informação."
              checked={preferences.compactCards}
              onChange={(checked) => setPreferences((prev) => ({ ...prev, compactCards: checked }))}
            />
            <PreferenceRow
              title="Mostrar painel de boas-vindas"
              description="Exibe orientações iniciais nas áreas de perfil e configurações."
              checked={preferences.showWelcomePanel}
              onChange={(checked) => setPreferences((prev) => ({ ...prev, showWelcomePanel: checked }))}
            />

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Essas preferências ficam salvas neste navegador para sua próxima sessão.
              </p>
              {preferencesState.saved && (
                <span className="text-sm font-medium text-success">Preferências salvas</span>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {canEditCompany && (
        <TabsContent value="empresa" className="space-y-6">
          <CompanyLogoCard
            companyId={user.companyId}
            companyName={companyName}
            currentLogo={user.company?.logo || null}
            canEdit={canEditCompany}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-border p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-surface-high'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
