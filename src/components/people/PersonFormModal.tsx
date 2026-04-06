'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Save } from 'lucide-react'
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
    enabled: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchLocations()
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
      enabled: true
    })
  }

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()
      
      if (data.data) {
        const user = data.data
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
          enabled: user.enabled
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
        enabled: formData.enabled
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
      <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'} size="xl">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userId ? 'Editar Pessoa' : 'Adicionar Pessoa'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
              Sobrenome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              {userId ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} {!userId && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!userId}
              minLength={6}
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
              Telefone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-foreground mb-1">
              Cargo
            </label>
            <input
              type="text"
              id="jobTitle"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
              Papel <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
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
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
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
            className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
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
            className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Nenhum</option>
            {calendars.map(cal => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
        </div>

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

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-input rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
