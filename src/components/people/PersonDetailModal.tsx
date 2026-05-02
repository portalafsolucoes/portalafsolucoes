'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import { getRoleLabel } from '@/lib/rbac'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { UserDangerActions } from '@/components/people/UserDangerActions'
import { displayUserEmail } from '@/lib/users/syntheticEmail'

interface PersonDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onEdit: () => void
  onDelete: () => void
  inPage?: boolean
}

type PersonStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

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
  status?: PersonStatus
  archivedAt?: string | null
  deactivatedAt?: string | null
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

const STATUS_BADGE: Record<PersonStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'ATIVO', cls: 'bg-success-light text-success-light-foreground' },
  INACTIVE: { label: 'INATIVO', cls: 'bg-gray-200 text-gray-700' },
  ARCHIVED: { label: 'ANONIMIZADO', cls: 'bg-amber-100 text-amber-800' },
}

function statusOf(user: PersonDetailUser): PersonStatus {
  return (user.status as PersonStatus) || (user.enabled ? 'ACTIVE' : 'INACTIVE')
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

  const handleAfterDangerAction = () => {
    onDelete()
    onClose()
  }

  if (loading || !user) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">Pessoa</h2>
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
      <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-black text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <PanelCloseButton onClick={onClose} className="ml-auto" />
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border bg-gray-800 text-white border-transparent shadow-sm">
                {getRoleLabel(user.role)}
              </span>
              {(() => {
                const s = statusOf(user)
                return (
                  <span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md border border-gray-200 shadow-sm ${STATUS_BADGE[s].cls}`}>
                    {STATUS_BADGE[s].label}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none px-4">
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
              <div className="p-4 border-b border-gray-200 space-y-2">
                {statusOf(user) !== 'ARCHIVED' && (
                  <button
                    onClick={onEdit}
                    className="bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
                  >
                    <Icon name="edit" className="text-base" />
                    Editar
                  </button>
                )}
                <UserDangerActions
                  userId={userId}
                  userName={`${user.firstName} ${user.lastName}`}
                  status={statusOf(user)}
                  onAfterAction={handleAfterDangerAction}
                />
              </div>

              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
                  <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Contato</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-[13px] font-medium text-gray-900">{displayUserEmail(user.email) || <span className="text-gray-400 italic">sem email</span>}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Taxa por Hora</p>
                    <p className="text-[13px] font-medium text-gray-900">R$ {user.rate.toFixed(2)}/hora</p>
                  </div>
                  {user.phone && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Telefone</p>
                      <p className="text-[13px] font-medium text-gray-900">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
                  <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Trabalho</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Cargo</p>
                    <p className="text-[13px] font-medium text-gray-900">{user.jobTitle || 'Sem cargo definido'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Papel</p>
                    <p className="text-[13px] font-medium text-gray-900">{getRoleLabel(user.role)}</p>
                  </div>
                  {user.location && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Localização</p>
                      <p className="text-[13px] font-medium text-gray-900">{user.location.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
                    <p className="text-[13px] font-medium text-gray-900">{STATUS_BADGE[statusOf(user)].label}</p>
                  </div>
                </div>
              </div>

              {user.teamMemberships && user.teamMemberships.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
                    <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Equipes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                    {user.teamMemberships.map((membership) => (
                      <div key={membership.team.id}>
                        <p className="text-[13px] font-medium text-gray-900">{membership.team.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-y-auto mt-0">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
                  <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Informações do Sistema</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado em</p>
                    <p className="text-[13px] font-medium text-gray-900">{new Date(user.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Atualizado em</p>
                    <p className="text-[13px] font-medium text-gray-900">{new Date(user.updatedAt).toLocaleString('pt-BR')}</p>
                  </div>
                  {user.lastLogin && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Último Login</p>
                      <p className="text-[13px] font-medium text-gray-900">{new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
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
              // eslint-disable-next-line @next/next/no-img-element
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

          <div className="flex flex-col gap-2 w-full max-w-[260px]">
            {statusOf(user) !== 'ARCHIVED' && (
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </button>
            )}
            <UserDangerActions
              userId={userId}
              userName={`${user.firstName} ${user.lastName}`}
              status={statusOf(user)}
              onAfterAction={handleAfterDangerAction}
            />
          </div>
        </div>

        <ModalSection title="Informações de Contato">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary rounded-[4px] p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Icon name="mail" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{displayUserEmail(user.email) || <span className="text-muted-foreground italic">sem email</span>}</p>
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
                    {(() => {
                      const s = statusOf(user)
                      return <span className={`font-medium ${s === 'ACTIVE' ? 'text-success' : s === 'ARCHIVED' ? 'text-amber-700' : 'text-gray-700'}`}>{STATUS_BADGE[s].label}</span>
                    })()}
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
