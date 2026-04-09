'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { TeamDetailModal } from '@/components/teams/TeamDetailModal'
import { TeamFormModal } from '@/components/teams/TeamFormModal'
import { Icon } from '@/components/ui/Icon'


interface Team {
  id: string
  name: string
  description?: string
  members: Array<{
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }>
  _count: {
    assignedWorkOrders: number
    assignedAssets: number
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      setTeams(data.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId)
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleCloseModal = () => {
    setSelectedTeamId(null)
    setShowNewModal(false)
    setShowEditModal(false)
    loadTeams()
  }

  const handleSuccess = () => {
    loadTeams()
  }

  const handleDelete = () => {
    loadTeams()
  }

  return (
    <PageContainer>
        <PageHeader
          title="Equipes"
          description="Gerencie equipes de trabalho"
          actions={
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-blue-700 transition-colors"
            >
              <Icon name="add" className="text-xl" />
              Nova Equipe
            </button>
          }
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma equipe encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card 
                key={team.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTeamClick(team.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <Icon name="group" className="text-2xl text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      Membros ({team.members.length}):
                    </div>
                    <div className="space-y-1">
                      {team.members.slice(0, 3).map((member, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {member.user.firstName} {member.user.lastName}
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{team.members.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span>{team._count.assignedWorkOrders} Ordens</span>
                    <span>{team._count.assignedAssets} Ativos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Modals */}
      {selectedTeamId && !showEditModal && (
        <TeamDetailModal
          isOpen={!!selectedTeamId}
          onClose={handleCloseModal}
          teamId={selectedTeamId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showNewModal && (
        <TeamFormModal
          isOpen={showNewModal}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && selectedTeamId && (
        <TeamFormModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          teamId={selectedTeamId}
          onSuccess={handleSuccess}
        />
      )}
    </PageContainer>
  )
}
