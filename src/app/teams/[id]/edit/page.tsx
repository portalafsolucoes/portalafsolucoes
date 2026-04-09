'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'

import { User } from '@/types'

export default function EditTeamPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[]
  })

  useEffect(() => {
    if (params.id) {
      fetchTeam()
      fetchUsers()
    }
  }, [params.id])

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`)
      const data = await response.json()
      
      if (data.data) {
        const team = data.data
        setFormData({
          name: team.name,
          description: team.description || '',
          memberIds: team.members.map((m: any) => m.userId)
        })
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.data) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      alert('Por favor, preencha o nome da equipe')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/teams/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/teams/${params.id}`)
      } else {
        alert(data.error || 'Erro ao atualizar equipe')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Erro ao atualizar equipe')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
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
          href={`/teams/${params.id}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <Icon name="arrow_back" className="text-base" />
          Voltar
        </Link>

        <div className="bg-card rounded-[4px] ambient-shadow p-6">
          <PageHeader title="Editar Equipe" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Nome da Equipe <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Membros da Equipe ({formData.memberIds.length} selecionados)
              </label>
              <div className="border border-input rounded-[4px] p-4 max-h-96 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum usuário disponível</p>
                ) : (
                  <div className="space-y-2">
                    {users.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-secondary rounded-[4px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.memberIds.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                        />
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Link
                href={`/teams/${params.id}`}
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
