'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'

interface TeamDetailModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  onEdit: () => void
  onDelete: () => void
  inPage?: boolean
}

interface TeamMembership {
  id: string
  user: {
    firstName: string
    lastName: string
    image?: string | null
    jobTitle?: string | null
    email: string
  }
}

interface TeamDetail {
  id: string
  name: string
  description?: string | null
  members?: TeamMembership[]
  _count?: {
    members?: number
    assignedWorkOrders?: number
    assignedAssets?: number
  }
}

export function TeamDetailModal({ isOpen, onClose, teamId, onEdit, onDelete, inPage = false }: TeamDetailModalProps) {
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeam()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, teamId])

  const fetchTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${teamId}`)
      const data = await response.json()
      
      if (data.data) {
        setTeam(data.data)
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir equipe')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Erro ao excluir equipe')
    }
  }

  if (loading || !team) {
    if (inPage) {
      return (
        <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900">Equipe</h2>
            <PanelCloseButton onClick={onClose} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Equipe">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="groups" className="text-2xl text-orange-500" />
              <h2 className="text-lg font-black text-gray-900 truncate">{team.name}</h2>
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}
          </div>
          <PanelCloseButton onClick={onClose} className="ml-2" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 space-y-2">
            <button
              onClick={onEdit}
              className="bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
            >
              <Icon name="edit" className="text-base" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
            >
              <Icon name="delete" className="text-base" />
              Excluir
            </button>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
              <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Estatisticas</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/5 rounded p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Membros</p>
                <p className="text-xl font-bold text-foreground">{team._count?.members || 0}</p>
              </div>
              <div className="bg-success-light rounded p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">OS</p>
                <p className="text-xl font-bold text-foreground">{team._count?.assignedWorkOrders || 0}</p>
              </div>
              <div className="bg-purple-50 rounded p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Ativos</p>
                <p className="text-xl font-bold text-foreground">{team._count?.assignedAssets || 0}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
              <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Membros ({team.members?.length || 0})</span>
            </div>
            {team.members && team.members.length > 0 ? (
              <div className="space-y-2 px-1">
                {team.members.map((membership) => (
                  <div key={membership.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    {membership.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={membership.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-xs">{membership.user.firstName[0]}{membership.user.lastName[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{membership.user.firstName} {membership.user.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{membership.user.jobTitle || membership.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">Nenhum membro nesta equipe.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Equipe">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Icon name="group" className="text-3xl text-primary" />
              {team.name}
            </h2>
            {team.description && (
              <p className="text-muted-foreground mt-2">{team.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
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

        {/* Stats */}
        <ModalSection title="Estatísticas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/5 rounded-[4px] p-4">
              <div className="flex items-center gap-3">
                <Icon name="group" className="text-3xl text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Membros</p>
                  <p className="text-2xl font-bold text-foreground">{team._count?.members || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-success-light rounded-[4px] p-4">
              <div className="flex items-center gap-3">
                <Icon name="construction" className="text-3xl text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                  <p className="text-2xl font-bold text-foreground">{team._count?.assignedWorkOrders || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-[4px] p-4">
              <div className="flex items-center gap-3">
                <Icon name="inventory_2" className="text-3xl text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Ativos Atribuídos</p>
                  <p className="text-2xl font-bold text-foreground">{team._count?.assignedAssets || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </ModalSection>

        {/* Members */}
        <ModalSection title="Membros">
          {team.members && team.members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(team.members as { id: string; user: { firstName: string; lastName: string; image?: string; jobTitle?: string; email: string } }[]).map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-[4px]"
                >
                  {membership.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={membership.user.image}
                      alt={`${membership.user.firstName} ${membership.user.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {membership.user.firstName[0]}{membership.user.lastName[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {membership.user.firstName} {membership.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                    {membership.user.jobTitle && (
                      <p className="text-sm text-muted-foreground">{membership.user.jobTitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum membro nesta equipe ainda.</p>
          )}
        </ModalSection>
      </div>
    </Modal>
  )
}
