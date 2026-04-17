'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { User } from '@/types'

interface TeamFormModalProps {
  isOpen: boolean
  onClose: () => void
  teamId?: string | null
  onSuccess: () => void
}

export function TeamFormModal({ isOpen, onClose, teamId, onSuccess }: TeamFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[]
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      if (teamId) {
        fetchTeam()
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, teamId])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      memberIds: []
    })
  }

  const fetchTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${teamId}`)
      const data = await response.json()

      if (data.data) {
        const team = data.data
        setFormData({
          name: team.name,
          description: team.description || '',
          memberIds: team.members.map((m: { userId: string }) => m.userId)
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
      const url = teamId ? `/api/teams/${teamId}` : '/api/teams'
      const method = teamId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Erro ao salvar equipe')
      }
    } catch (error) {
      console.error('Error saving team:', error)
      alert('Erro ao salvar equipe')
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
      <Modal isOpen={isOpen} onClose={onClose} title={teamId ? 'Editar Equipe' : 'Nova Equipe'}>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={teamId ? 'Editar Equipe' : 'Nova Equipe'}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          <ModalSection title="Identificação">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
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
              <label htmlFor="description" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
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
          </ModalSection>

          <ModalSection title="Membros da Equipe">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
                          // eslint-disable-next-line @next/next/no-img-element
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
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {saving ? 'Salvando...' : teamId ? 'Salvar Alterações' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
