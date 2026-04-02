'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Edit, Trash2, Users as UsersIcon, Package, Wrench } from 'lucide-react'

interface TeamDetailModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  onEdit: () => void
  onDelete: () => void
}

export function TeamDetailModal({ isOpen, onClose, teamId, onEdit, onDelete }: TeamDetailModalProps) {
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeam()
    }
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
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Equipe" size="lg">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Equipe" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-primary" />
              {team.name}
            </h2>
            {team.description && (
              <p className="text-muted-foreground mt-2">{team.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Membros</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.members || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-success-light rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedWorkOrders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos Atribuídos</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedAssets || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-secondary rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Membros da Equipe</h3>
          {team.members && team.members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {team.members.map((membership: any) => (
                <div
                  key={membership.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                >
                  {membership.user.image ? (
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
        </div>
      </div>
    </Modal>
  )
}
