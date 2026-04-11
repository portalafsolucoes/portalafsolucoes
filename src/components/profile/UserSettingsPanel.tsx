'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { getRoleDescription, getRoleLabel } from '@/components/profile/profile-helpers'
import type { AuthUser } from '@/hooks/useAuth'

type SettingsTab = 'perfil' | 'seguranca'

type LocationOption = {
  id: string
  name: string
}

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
  const [activeTab, setActiveTab] = useState<SettingsTab>(requestedTab || defaultTab)

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
    if (!requestedTab) return
    setActiveTab(requestedTab)
  }, [requestedTab])

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
                    <label htmlFor="locationId" className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Localização principal
                    </label>
                    <select
                      id="locationId"
                      value={profileForm.locationId}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, locationId: e.target.value }))}
                      className="flex h-10 w-full rounded-[4px] border border-gray-300 shadow-sm bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Button type="submit" disabled={profileState.saving} className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
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
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Perfil de acesso</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{roleLabel}</p>
                <p className="mt-2 text-sm text-muted-foreground">{roleDescription}</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Empresa</p>
                  <p className="mt-2 text-[13px] font-medium text-gray-900">{companyName}</p>
                </div>
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Unidade ativa</p>
                  <p className="mt-2 text-[13px] font-medium text-gray-900">
                    {user.location?.name || 'Definida pelo seletor do cabeçalho'}
                  </p>
                </div>
                <div className="rounded-[4px] border border-border p-4">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Acesso</p>
                  <p className="mt-2 text-[13px] font-medium text-gray-900">
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
                  <Button type="submit" disabled={securityState.saving} className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
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
    </Tabs>
  )
}
