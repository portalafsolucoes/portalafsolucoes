'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Location } from '@/types'

interface PersonFormModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null
  onSuccess: () => void
}

export function PersonFormModal({ isOpen, onClose, userId, onSuccess }: PersonFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [units, setUnits] = useState<{ id: string; name: string }[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    jobTitle: '',
    role: 'MECANICO',
    rate: '0',
    locationId: '',
    calendarId: '',
    enabled: true,
    unitIds: [] as string[],
  })

  useEffect(() => {
    if (isOpen) {
      fetchLocations()
      fetchUnits()
      fetchCalendars()
      if (userId) {
        fetchUser()
      } else {
        resetForm()
      }
    }
  }, [isOpen, userId])

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      jobTitle: '',
      role: 'MECANICO',
      rate: '0',
      locationId: '',
      calendarId: '',
      enabled: true,
      unitIds: [],
    })
  }

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()

      if (data.data) {
        const user = data.data
        // Buscar unidades do usuário
        let userUnitIds: string[] = []
        try {
          const unitsRes = await fetch(`/api/admin/users/${userId}/units`)
          if (unitsRes.ok) {
            const unitsData = await unitsRes.json()
            userUnitIds = (unitsData.data || []).map((u: any) => u.id)
          }
        } catch { /* ignore - non-admin won't have access */ }

        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: '',
          phone: user.phone || '',
          jobTitle: user.jobTitle || '',
          role: user.role,
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
  }

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
        setUnits((data.data || []).map((u: any) => ({ id: u.id, name: u.name })))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (!userId && !formData.password) {
      alert('A senha é obrigatória para novos usuários')
      return
    }

    try {
      setSaving(true)
      const body: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
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
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <ModalSection title="Identificação">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                  Sobrenome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  {userId ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} {!userId && <span className="text-danger">*</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!userId}
                  minLength={6}
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Função e Acesso">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
                  Papel <span className="text-danger">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="SUPER_ADMIN">Super Administrador</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="PLANEJADOR">Planejador</option>
                  <option value="MECANICO">Mecânico</option>
                  <option value="ELETRICISTA">Eletricista</option>
                  <option value="OPERADOR">Operador</option>
                  <option value="CONSTRUTOR_CIVIL">Construtor Civil</option>
                </select>
              </div>
              <div>
                <label htmlFor="rate" className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="locationId" className="block text-sm font-medium text-foreground mb-1">
                Localização
              </label>
              <select
                id="locationId"
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
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
              <label htmlFor="calendarId" className="block text-sm font-medium text-foreground mb-1">
                Calendário
              </label>
              <select
                id="calendarId"
                name="calendarId"
                value={formData.calendarId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
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
                <label className="block text-sm font-medium text-foreground mb-2">
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

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
