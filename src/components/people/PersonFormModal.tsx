'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { Button } from '@/components/ui/Button'
import { Location } from '@/types'
import { CANONICAL_ROLE_OPTIONS, normalizeUserRole } from '@/lib/user-roles'
import { useAuth } from '@/hooks/useAuth'
import { isSyntheticEmail } from '@/lib/users/syntheticEmail'

interface PersonFormModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null
  onSuccess: () => void
  inPage?: boolean
}

interface CalendarOption {
  id: string
  name: string
}

interface JobTitleOption {
  id: string
  name: string
}

interface UnitOption {
  id: string
  name: string
}

interface UserUnitResponse {
  data?: UnitOption[]
}

interface EditableUser {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  jobTitle?: string | null
  jobTitleId?: string | null
  role: string
  rate: number
  locationId?: string | null
  calendarId?: string | null
  enabled: boolean
}

interface UserPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitleId: string | null
  role: string
  rate: number
  locationId: string | null
  calendarId: string | null
  enabled: boolean
  unitIds: string[]
  password?: string
}

function isValidUserEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function PanelSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 text-[12px] font-bold text-gray-900 uppercase tracking-wider hover:bg-gray-200 transition-colors"
      >
        <Icon name={open ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
        {title}
      </button>
      {open && <div className="px-1 py-5 space-y-5">{children}</div>}
    </div>
  )
}

export function PersonFormModal({ isOpen, onClose, userId, onSuccess, inPage = false }: PersonFormModalProps) {
  const { user: currentUser } = useAuth()
  const currentRole = normalizeUserRole(currentUser)
  const roleOptions = currentRole === 'PLANEJADOR'
    ? CANONICAL_ROLE_OPTIONS.filter((r) => r.value === 'PLANEJADOR' || r.value === 'MANUTENTOR')
    : CANONICAL_ROLE_OPTIONS
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [originalEmailIsSynthetic, setOriginalEmailIsSynthetic] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    jobTitleId: '',
    role: 'MANUTENTOR',
    rate: '0',
    locationId: '',
    calendarId: '',
    enabled: true,
    unitIds: [] as string[],
  })

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      jobTitleId: '',
      role: 'MANUTENTOR',
      rate: '0',
      locationId: '',
      calendarId: '',
      enabled: true,
      unitIds: [],
    })
    setOriginalEmailIsSynthetic(false)
  }

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()

      if (data.data) {
        const user = data.data as EditableUser
        // Buscar unidades do usuário
        let userUnitIds: string[] = []
        try {
          const unitsRes = await fetch(`/api/admin/users/${userId}/units`)
          if (unitsRes.ok) {
            const unitsData = (await unitsRes.json()) as UserUnitResponse
            userUnitIds = (unitsData.data || []).map((u) => u.id)
          }
        } catch { /* ignore - non-admin won't have access */ }

        const isSynth = isSyntheticEmail(user.email)
        setOriginalEmailIsSynthetic(isSynth)
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: isSynth ? '' : user.email,
          password: '',
          phone: user.phone || '',
          jobTitleId: user.jobTitleId || '',
          role: normalizeUserRole(user.role),
          rate: user.rate.toString(),
          locationId: user.locationId || '',
          calendarId: user.calendarId || '',
          enabled: user.enabled,
          unitIds: userUnitIds,
        })
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      const data = await response.json()
      if (data.data) {
        setLocations(data.data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchUnits = async () => {
    try {
        const response = await fetch('/api/admin/units')
        if (response.ok) {
          const data = await response.json()
          setUnits((data.data || []).map((u: UnitOption) => ({ id: u.id, name: u.name })))
        }
      } catch { /* ignore - non-admin won't have access */ }
  }

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/basic-registrations/calendars')
      const data = await response.json()
      if (data.data) {
        setCalendars(data.data)
      }
    } catch (error) {
      console.error('Error fetching calendars:', error)
    }
  }

  const fetchJobTitles = async () => {
    try {
      const response = await fetch('/api/basic-registrations/job-titles')
      const data = await response.json()
      if (data.data) {
        setJobTitles(data.data)
      }
    } catch (error) {
      console.error('Error fetching job titles:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void fetchLocations()
      void fetchUnits()
      void fetchCalendars()
      void fetchJobTitles()
      if (userId) {
        void fetchUser()
      } else {
        resetForm()
      }
    }
  }, [fetchUser, isOpen, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName) {
      alert('Por favor, preencha nome e sobrenome')
      return
    }

    const isManutentorRole = formData.role === 'MANUTENTOR'
    const isPromotingFromSynthetic = originalEmailIsSynthetic && !isManutentorRole

    // MANUTENTOR e cadastro operacional: pode ser criado sem email/senha (servidor gera valores sinteticos).
    // Promocao de MANUTENTOR sintetico para outro papel exige email/senha reais.
    if (!isManutentorRole) {
      if (!formData.email) {
        alert(isPromotingFromSynthetic
          ? 'Defina um email real para promover este usuário'
          : 'Por favor, preencha o email')
        return
      }

      if (!isValidUserEmail(formData.email)) {
        alert('Informe um email válido com domínio completo, por exemplo nome@empresa.com')
        return
      }

      const requiresNewPassword = !userId || isPromotingFromSynthetic
      if (requiresNewPassword && !formData.password) {
        alert(isPromotingFromSynthetic
          ? 'Defina uma senha para promover este usuário'
          : 'A senha é obrigatória para novos usuários')
        return
      }

      if (formData.password && formData.email.trim().toLowerCase() === formData.password.trim().toLowerCase()) {
        alert('Email e senha não podem ser iguais')
        return
      }
    }

    try {
      setSaving(true)
      const body: UserPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitleId: formData.jobTitleId || null,
        role: formData.role,
        rate: parseFloat(formData.rate),
        locationId: formData.locationId || null,
        calendarId: formData.calendarId || null,
        enabled: formData.enabled,
        unitIds: formData.unitIds,
      }

      if (formData.password) {
        body.password = formData.password
      }

      const url = userId ? `/api/users/${userId}` : '/api/users'
      const method = userId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Erro ao salvar pessoa')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Erro ao salvar pessoa')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (loading) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">{userId ? 'Editar Pessoa' : 'Adicionar Pessoa'}</h2>
            <PanelCloseButton onClick={onClose} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'} inPage={inPage}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-black text-gray-900">{userId ? 'Editar Pessoa' : 'Adicionar Pessoa'}</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {userId ? 'Atualize as informações do cadastro' : 'Preencha os dados para criar um novo cadastro'}
            </p>
          </div>
          <PanelCloseButton onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <PanelSection title="Identificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nome <span className="text-accent-orange">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName-in-page"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="lastName-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Sobrenome <span className="text-accent-orange">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName-in-page"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
              </div>

              {formData.role === 'MANUTENTOR' ? (
                <p className="text-[12px] text-gray-500 italic">
                  Manutentor pode ser cadastrado sem email/senha. Se precisar dar acesso de login depois, altere o papel ou use Resetar senha no painel.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Email <span className="text-accent-orange">*</span>
                    </label>
                    <input
                      type="email"
                      id="email-in-page"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder={originalEmailIsSynthetic ? 'Defina um email real' : ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                    />
                  </div>
                  <div>
                    <label htmlFor="password-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      {originalEmailIsSynthetic
                        ? 'Senha'
                        : userId ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                      {(!userId || originalEmailIsSynthetic) && <span className="text-accent-orange"> *</span>}
                    </label>
                    <input
                      type="password"
                      id="password-in-page"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!userId || originalEmailIsSynthetic}
                      minLength={6}
                      placeholder={originalEmailIsSynthetic ? 'Defina uma senha' : ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                    />
                  </div>
                </div>
              )}
            </PanelSection>

            <PanelSection title="Função e Acesso">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="phone-in-page"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="jobTitleId-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Cargo
                  </label>
                  <select
                    id="jobTitleId-in-page"
                    name="jobTitleId"
                    value={formData.jobTitleId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  >
                    <option value="">Selecione um cargo</option>
                    {jobTitles.map((jobTitle) => (
                      <option key={jobTitle.id} value={jobTitle.id}>
                        {jobTitle.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Papel <span className="text-accent-orange">*</span>
                  </label>
                  <select
                    id="role-in-page"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  >
                    {roleOptions.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="rate-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Taxa por Hora (R$)
                  </label>
                  <input
                    type="number"
                    id="rate-in-page"
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="locationId-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Localização
                </label>
                <select
                  id="locationId-in-page"
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                >
                  <option value="">Selecione uma localização</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="calendarId-in-page" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Calendário
                </label>
                <select
                  id="calendarId-in-page"
                  name="calendarId"
                  value={formData.calendarId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                >
                  <option value="">Nenhum</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </select>
              </div>
            </PanelSection>

            <PanelSection title="Unidades de Acesso">
              {units.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Unidades de Acesso
                  </label>
                  <div className="border border-input rounded-[4px] p-3 max-h-40 overflow-y-auto space-y-2">
                    {units.map(unit => (
                      <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-low px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.unitIds.includes(unit.id)}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              unitIds: prev.unitIds.includes(unit.id)
                                ? prev.unitIds.filter(id => id !== unit.id)
                                : [...prev.unitIds, unit.id],
                            }))
                          }}
                          className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                        />
                        <span className="text-sm text-foreground">{unit.name}</span>
                      </label>
                    ))}
                  </div>
                  {formData.unitIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.unitIds.length} unidade(s) selecionada(s)
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled-in-page"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                />
                <label htmlFor="enabled-in-page" className="text-sm font-medium text-foreground">
                  Usuário ativo
                </label>
              </div>
            </PanelSection>
          </div>

          <div className="flex gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-300 text-gray-700 font-bold shadow-sm bg-white hover:bg-gray-50">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-gray-900 hover:bg-black text-white font-bold shadow-md">
              <Icon name="check_circle" className="text-base mr-2" />
              {saving ? 'Salvando...' : userId ? 'Salvar Alterações' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'} inPage={inPage}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          <ModalSection title="Identificação">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Nome <span className="text-accent-orange">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Sobrenome <span className="text-accent-orange">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                />
              </div>
            </div>

            {formData.role === 'MANUTENTOR' ? (
              <p className="text-[12px] text-gray-500 italic">
                Manutentor pode ser cadastrado sem email/senha. Se precisar dar acesso de login depois, altere o papel ou use Resetar senha no painel.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Email <span className="text-accent-orange">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder={originalEmailIsSynthetic ? 'Defina um email real' : ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    {originalEmailIsSynthetic
                      ? 'Senha'
                      : userId ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                    {(!userId || originalEmailIsSynthetic) && <span className="text-accent-orange"> *</span>}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!userId || originalEmailIsSynthetic}
                    minLength={6}
                    placeholder={originalEmailIsSynthetic ? 'Defina uma senha' : ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                  />
                </div>
              </div>
            )}
          </ModalSection>

          <ModalSection title="Função e Acesso">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="jobTitleId" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Cargo
                </label>
                <select
                  id="jobTitleId"
                  name="jobTitleId"
                  value={formData.jobTitleId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                >
                  <option value="">Selecione um cargo</option>
                  {jobTitles.map((jobTitle) => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      {jobTitle.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Papel <span className="text-accent-orange">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                >
                  {roleOptions.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rate" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Taxa por Hora (R$)
                </label>
                <input
                  type="number"
                  id="rate"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
                />
              </div>
            </div>

            <div>
              <label htmlFor="locationId" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Localização
              </label>
              <select
                id="locationId"
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
              >
                <option value="">Selecione uma localização</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="calendarId" className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Calendário
              </label>
              <select
                id="calendarId"
                name="calendarId"
                value={formData.calendarId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-sm transition-shadow"
              >
                <option value="">Nenhum</option>
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
          </ModalSection>

          <ModalSection title="Unidades de Acesso">
            {units.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Unidades de Acesso
                </label>
                <div className="border border-input rounded-[4px] p-3 max-h-40 overflow-y-auto space-y-2">
                  {units.map(unit => (
                    <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-low px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={formData.unitIds.includes(unit.id)}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            unitIds: prev.unitIds.includes(unit.id)
                              ? prev.unitIds.filter(id => id !== unit.id)
                              : [...prev.unitIds, unit.id],
                          }))
                        }}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                      />
                      <span className="text-sm text-foreground">{unit.name}</span>
                    </label>
                  ))}
                </div>
                {formData.unitIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.unitIds.length} unidade(s) selecionada(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={formData.enabled}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-foreground">
                Usuário ativo
              </label>
            </div>
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : userId ? 'Salvar Alterações' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
