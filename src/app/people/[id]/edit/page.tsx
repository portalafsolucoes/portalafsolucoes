'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { PageContainer } from '@/components/layout/PageContainer'

import { Location } from '@/types'
import { CANONICAL_ROLE_OPTIONS } from '@/lib/user-roles'

interface JobTitleOption {
  id: string
  name: string
}

export default function EditPersonPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    jobTitleId: '',
    role: 'TECHNICIAN',
    rate: '0',
    locationId: '',
    enabled: true
  })

  useEffect(() => {
    if (params.id) {
      fetchUser()
      fetchLocations()
      fetchJobTitles()
    }
  }, [params.id])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()
      
      if (data.data) {
        const user = data.data
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: '',
          phone: user.phone || '',
          jobTitleId: user.jobTitleId || '',
          role: user.role,
          rate: user.rate.toString(),
          locationId: user.locationId || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitleId: formData.jobTitleId || null,
        role: formData.role,
        rate: parseFloat(formData.rate),
        locationId: formData.locationId || null,
        enabled: formData.enabled
      }

      if (formData.password) {
        body.password = formData.password
      }

      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/people/${params.id}`)
      } else {
        alert(data.error || 'Erro ao atualizar pessoa')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Erro ao atualizar pessoa')
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
      <PageContainer variant="form">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="form">
        <Link
          href={`/people/${params.id}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <Icon name="arrow_back" className="text-base" />
          Voltar
        </Link>

        <div className="bg-card rounded-[4px] ambient-shadow p-6">
          <h1 className="text-2xl font-bold text-foreground mb-6">Editar Pessoa</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  Nova Senha (deixe em branco para manter)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="jobTitleId" className="block text-sm font-medium text-foreground mb-1">
                  Cargo
                </label>
                <select
                  id="jobTitleId"
                  name="jobTitleId"
                  value={formData.jobTitleId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Selecione um cargo</option>
                  {jobTitles.map(jobTitle => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      {jobTitle.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                  {CANONICAL_ROLE_OPTIONS.map(roleOption => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
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
              <Link
                href={`/people/${params.id}`}
                className="px-6 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Icon name="save" className="text-base" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
    </PageContainer>
  )
}
