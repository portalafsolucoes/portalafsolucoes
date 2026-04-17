'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { User } from '@/types'

interface TeamFormModalProps {
  isOpen: boolean
  onClose: () => void
  teamId?: string | null
  onSuccess: () => void
  inPage?: boolean
}

export function TeamFormModal({ isOpen, onClose, teamId, onSuccess, inPage = false }: TeamFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  // Map<userId, teamName> de usuarios ja alocados em outra equipe
  const [userTeamMap, setUserTeamMap] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[]
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchAllTeams()
      if (teamId) {
        fetchTeam()
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, teamId])

  const fetchAllTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      const map: Record<string, string> = {}
      ;(data.data || []).forEach((t: { id: string; name: string; members?: Array<{ userId: string }> }) => {
        if (t.id === teamId) return
        ;(t.members || []).forEach((m) => { map[m.userId] = t.name })
      })
      setUserTeamMap(map)
    } catch (error) {
      console.error('Error fetching teams map:', error)
    }
  }

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

  const title = teamId ? 'Editar Equipe' : 'Nova Equipe'

  if (loading) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">{title}</h2>
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
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
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
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <PanelCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </ModalSection>

            <ModalSection title="Membros da Equipe">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Membros ({formData.memberIds.length} selecionados)
                </label>
                <div className="border border-gray-200 rounded-[4px] p-2 max-h-96 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">Nenhum usuário disponível</p>
                  ) : (
                    <div className="space-y-1">
                      {users.map(user => {
                        const inOther = userTeamMap[user.id]
                        const disabled = !!inOther
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded-[4px] ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:bg-secondary cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.memberIds.includes(user.id)}
                              onChange={() => !disabled && toggleMember(user.id)}
                              disabled={disabled}
                              className="w-4 h-4 text-primary border-input rounded focus:ring-ring disabled:cursor-not-allowed"
                            />
                            {user.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-semibold text-xs">{user.firstName[0]}{user.lastName[0]}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {disabled ? <span className="text-amber-700">Ja em &quot;{inOther}&quot;</span> : (user.jobTitle || user.email)}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ModalSection>
          </div>
          <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-gray-900 text-white hover:bg-gray-800">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : teamId ? 'Salvar Alterações' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
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
