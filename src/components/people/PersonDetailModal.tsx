'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { getRoleLabel } from '@/lib/rbac'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

interface PersonDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onEdit: () => void
  onDelete: () => void
  inPage?: boolean
}

interface PersonDetailUser {
  firstName: string
  lastName: string
  image?: string | null
  jobTitle?: string | null
  role: string
  email: string
  phone?: string | null
  rate: number
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastLogin?: string | null
  location?: { name: string } | null
  teamMemberships?: Array<{
    team: {
      id: string
      name: string
    }
  }>
}

export function PersonDetailModal({ isOpen, onClose, userId, onEdit, onDelete, inPage = false }: PersonDetailModalProps) {
  const [user, setUser] = useState<PersonDetailUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()

      if (data.data) {
        setUser(data.data)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen && userId) {
      void fetchUser()
    }
  }, [fetchUser, isOpen, userId])

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir pessoa')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erro ao excluir pessoa')
    }
  }

  if (loading || !user) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Pessoa</h2>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
              <Icon name="close" className="text-xl text-muted-foreground" />
            </button>
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
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Pessoa">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <button
                onClick={onClose}
                className="ml-auto p-1 hover:bg-muted rounded transition-colors"
              >
                <Icon name="close" className="text-xl text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium rounded border bg-primary/10 text-foreground border-border">
                {getRoleLabel(user.role)}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${user.enabled ? 'bg-success-light text-success-light-foreground border-border' : 'bg-danger-light text-danger-light-foreground border-border'}`}>
                {user.enabled ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none px-4">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Icon name="person" className="text-base" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Icon name="history" className="text-base" />
                Sistema
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto mt-0">
              <div className="p-4 border-b border-border space-y-2">
                <button
                  onClick={onEdit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
                >
                  <Icon name="edit" className="text-base" />
                  Editar Pessoa
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-primary-graphite transition-colors"
                >
                  <Icon name="delete" className="text-base" />
                  Excluir Pessoa
                </button>
              </div>

              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Contato</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa por Hora</p>
                    <p className="text-sm text-foreground">R$ {user.rate.toFixed(2)}/hora</p>
                  </div>
                  {user.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm text-foreground">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Trabalho</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="text-sm text-foreground">{user.jobTitle || 'Sem cargo definido'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Papel</p>
                    <p className="text-sm text-foreground">{getRoleLabel(user.role)}</p>
                  </div>
                  {user.location && (
                    <div>
                      <p className="text-xs text-muted-foreground">Localização</p>
                      <p className="text-sm text-foreground">{user.location.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm text-foreground">{user.enabled ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>
              </div>

              {user.teamMemberships && user.teamMemberships.length > 0 && (
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Equipes</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {user.teamMemberships.map((membership) => (
                      <div key={membership.team.id}>
                        <p className="text-sm text-foreground">{membership.team.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-y-auto mt-0">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Informações do Sistema</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm text-foreground">{new Date(user.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atualizado em</p>
                    <p className="text-sm text-foreground">{new Date(user.updatedAt).toLocaleString('pt-BR')}</p>
                  </div>
                  {user.lastLogin && (
                    <div>
                      <p className="text-xs text-muted-foreground">Último Login</p>
                      <p className="text-sm text-foreground">{new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Pessoa">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-2xl">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground">{user.jobTitle || 'Sem cargo definido'}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 transition-colors"
            >
              <Icon name="edit" className="text-base" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-red-700 transition-colors"
            >
              <Icon name="delete" className="text-base" />
              Excluir
            </button>
          </div>
        </div>

        <ModalSection title="Informações de Contato">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary rounded-[4px] p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Icon name="mail" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Icon name="phone" className="text-xl text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="text-foreground">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Icon name="work" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa por Hora</p>
                  <p className="text-foreground">R$ {user.rate.toFixed(2)}/hora</p>
                </div>
              </div>
            </div>
          </div>
        </ModalSection>

        <ModalSection title="Informações de Trabalho">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary rounded-[4px] p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Icon name="group" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Papel</p>
                  <p className="text-foreground">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              {user.location && (
                <div className="flex items-center gap-3">
                  <Icon name="location_on" className="text-xl text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="text-foreground">{user.location.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Icon name="calendar_today" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground">
                    {user.enabled ? (
                      <span className="text-success font-medium">Ativo</span>
                    ) : (
                      <span className="text-danger font-medium">Inativo</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ModalSection>

        {user.teamMemberships && user.teamMemberships.length > 0 && (
          <ModalSection title="Equipes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {user.teamMemberships.map((membership) => (
                <div
                  key={membership.team.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-[4px]"
                >
                  <Icon name="group" className="text-xl text-primary" />
                  <span className="font-medium text-foreground">{membership.team.name}</span>
                </div>
              ))}
            </div>
          </ModalSection>
        )}

        <ModalSection title="Informações do Sistema" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="text-foreground">{new Date(user.createdAt).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Atualizado em</p>
              <p className="text-foreground">{new Date(user.updatedAt).toLocaleString('pt-BR')}</p>
            </div>
            {user.lastLogin && (
              <div>
                <p className="text-muted-foreground">Último Login</p>
                <p className="text-foreground">{new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>
        </ModalSection>
      </div>
    </Modal>
  )
}
