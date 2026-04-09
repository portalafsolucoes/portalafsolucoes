'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PersonDetailModal } from '@/components/people/PersonDetailModal'
import { PersonFormModal } from '@/components/people/PersonFormModal'
import { TeamDetailModal } from '@/components/teams/TeamDetailModal'
import { TeamFormModal } from '@/components/teams/TeamFormModal'
import { Card, CardContent } from '@/components/ui/Card'
import { User } from '@/types'
import { getRoleLabel } from '@/lib/rbac'
import { ExportButton } from '@/components/ui/ExportButton'

type ViewMode = 'grid' | 'table' | 'hierarchy'

export default function PeopleTeamsPage() {
  const [activeTab, setActiveTab] = useState<'people' | 'teams'>('people')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // People states
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  
  // Teams states
  const [teams, setTeams] = useState<any[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)

  useEffect(() => {
    if (activeTab === 'people') {
      fetchUsers()
    } else {
      fetchTeams()
    }
  }, [activeTab, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      
      const response = await fetch(`/api/users?${params}`)
      const data = await response.json()
      
      if (data.data) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)
      const res = await fetch('/api/teams')
      const data = await res.json()
      setTeams(data.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  // Handlers
  const handleUserClick = (userId: string) => {
    console.log('Clicked user ID:', userId)
    setSelectedUserId(userId)
  }

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId)
  }

  const handleEditUser = () => {
    setShowEditUserModal(true)
  }

  const handleEditTeam = () => {
    setShowEditTeamModal(true)
  }

  const handleCloseModals = () => {
    setSelectedUserId(null)
    setSelectedTeamId(null)
    setShowNewUserModal(false)
    setShowEditUserModal(false)
    setShowNewTeamModal(false)
    setShowEditTeamModal(false)
    if (activeTab === 'people') {
      fetchUsers()
    } else {
      fetchTeams()
    }
  }

  const handleSuccess = () => {
    if (activeTab === 'people') {
      fetchUsers()
    } else {
      fetchTeams()
    }
  }

  const handleDelete = () => {
    if (activeTab === 'people') {
      fetchUsers()
    } else {
      fetchTeams()
    }
  }

  // Build hierarchy for people: Teams > Job Titles > People (3 layers)
  const buildHierarchy = () => {
    const hierarchy: any = {}
    
    filteredUsers.forEach(user => {
      // Get user's teams
      const userTeams = (user as any).teamMemberships?.map((tm: any) => tm.team) || []
      
      if (userTeams.length === 0) {
        // Users without team go to "Sem Equipe"
        const teamName = 'Sem Equipe'
        if (!hierarchy[teamName]) {
          hierarchy[teamName] = {}
        }
        
        const jobTitle = user.jobTitle || 'Sem Cargo'
        if (!hierarchy[teamName][jobTitle]) {
          hierarchy[teamName][jobTitle] = []
        }
        hierarchy[teamName][jobTitle].push(user)
      } else {
        // Add user to each of their teams
        userTeams.forEach((team: any) => {
          const teamName = team.name
          if (!hierarchy[teamName]) {
            hierarchy[teamName] = {}
          }
          
          const jobTitle = user.jobTitle || 'Sem Cargo'
          if (!hierarchy[teamName][jobTitle]) {
            hierarchy[teamName][jobTitle] = []
          }
          hierarchy[teamName][jobTitle].push(user)
        })
      }
    })
    
    return hierarchy
  }

  return (
    <PageContainer>
        {/* Header with Tabs */}
        <div className="mb-6">
          <PageHeader title="Pessoas e Equipes" description="Gerencie pessoas, equipes e permissões" />
          
          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="-mb-px flex gap-8">
              <button
                onClick={() => setActiveTab('people')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'people'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Pessoas
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teams'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Equipes
              </button>
            </nav>
          </div>
        </div>

        {/* People Tab Content */}
        {activeTab === 'people' && (
          <>
            {/* Actions Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-[4px] transition-colors ${
                    viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:bg-accent/10'
                  }`}
                  title="Visualização em Grade"
                >
                  <Icon name="grid_view" className="text-xl" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-[4px] transition-colors ${
                    viewMode === 'table' ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:bg-accent/10'
                  }`}
                  title="Visualização em Tabela"
                >
                  <Icon name="list" className="text-xl" />
                </button>
                <button
                  onClick={() => setViewMode('hierarchy')}
                  className={`p-2 rounded-[4px] transition-colors ${
                    viewMode === 'hierarchy' ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground hover:bg-accent/10'
                  }`}
                  title="Visualização Hierárquica"
                >
                  <Icon name="hub" className="text-xl" />
                </button>
              </div>
              
              <ExportButton data={filteredUsers} entity="users" />
              <button
                onClick={() => setShowNewUserModal(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors"
              >
                <Icon name="add" className="text-xl" />
                Adicionar Pessoa
              </button>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-[4px] ambient-shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Todos os Papéis</option>
                  <option value="SUPER_ADMIN">Super Administrador</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="PLANEJADOR">Planejador</option>
                  <option value="MECANICO">Mecânico</option>
                  <option value="ELETRICISTA">Eletricista</option>
                  <option value="OPERADOR">Operador</option>
                  <option value="CONSTRUTOR_CIVIL">Construtor Civil</option>
                </select>
              </div>
            </div>

            {/* Content */}
            {loadingUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                <p className="mt-2 text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
                <Icon name="group" className="text-6xl text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma pessoa encontrada</h3>
                <p className="text-muted-foreground">Adicione pessoas à sua organização para começar.</p>
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
                        data-user-id={user.id}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-semibold text-lg">
                                  {user.firstName[0]}{user.lastName[0]}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {user.firstName} {user.lastName}
                              </h3>
                              <p className="text-sm text-muted-foreground">{user.jobTitle || 'Sem cargo'}</p>
                            </div>
                          </div>
                          {user.enabled ? (
                            <Icon name="how_to_reg" className="text-xl text-success" />
                          ) : (
                            <Icon name="person_off" className="text-xl text-danger" />
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="font-medium">Email:</span>
                            <span className="truncate">{user.email}</span>
                          </p>
                          {user.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="font-medium">Telefone:</span>
                              <span>{user.phone}</span>
                            </p>
                          )}
                          <div className="pt-2 border-t border-border">
                            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="bg-card rounded-[4px] ambient-shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cargo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Papel</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                            className="hover:bg-secondary cursor-pointer transition-colors"
                            data-user-id={user.id}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {user.image ? (
                                  <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary font-semibold">
                                      {user.firstName[0]}{user.lastName[0]}
                                    </span>
                                  </div>
                                )}
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-foreground">
                                    {user.firstName} {user.lastName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-foreground">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-foreground">{user.jobTitle || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-foreground">
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.enabled ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success-light-foreground">
                                  Ativo
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-light text-danger-light-foreground">
                                  Inativo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Hierarchy View - 3 Layers: Teams > Job Titles > People */}
                {viewMode === 'hierarchy' && (
                  <div className="space-y-6">
                    {Object.entries(buildHierarchy()).map(([teamName, jobTitles]: [string, any]) => (
                      <div key={teamName} className="bg-card rounded-[4px] ambient-shadow overflow-hidden">
                        {/* Layer 1: Team */}
                        <div className="bg-primary/5 px-6 py-4 border-b border-border">
                          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Icon name="group" className="text-xl" />
                            {teamName}
                            <span className="text-sm font-normal text-primary">
                              ({Object.values(jobTitles).reduce((acc: number, users: any) => acc + users.length, 0)} pessoas)
                            </span>
                          </h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                          {Object.entries(jobTitles).map(([jobTitle, users]: [string, any]) => (
                            <div key={jobTitle} className="border-l-4 border-on-surface-variant pl-4">
                              {/* Layer 2: Job Title */}
                              <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Icon name="hub" className="text-base text-success" />
                                {jobTitle}
                                <span className="text-sm font-normal text-muted-foreground">({users.length})</span>
                              </h4>
                              
                              {/* Layer 3: People */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                                {users.map((user: User) => (
                                  <div
                                    key={user.id}
                                    onClick={() => handleUserClick(user.id)}
                                    className="flex items-center gap-3 p-3 rounded-[4px] hover:bg-secondary cursor-pointer transition-colors"
                                    data-user-id={user.id}
                                  >
                                    {user.image ? (
                                      <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-primary font-semibold text-sm">
                                          {user.firstName[0]}{user.lastName[0]}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-foreground truncate">
                                        {user.firstName} {user.lastName}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className="mt-6 text-center text-muted-foreground">
                  Mostrando {filteredUsers.length} de {users.length} pessoa(s)
                </div>
              </>
            )}
          </>
        )}

        {/* Teams Tab Content */}
        {activeTab === 'teams' && (
          <>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowNewTeamModal(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors"
              >
                <Icon name="add" className="text-xl" />
                Nova Equipe
              </button>
            </div>

            {loadingTeams ? (
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
                          {team.members.slice(0, 3).map((member: any, idx: number) => (
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
          </>
        )}

      {/* Modals */}
      {selectedUserId && !showEditUserModal && (
        <PersonDetailModal
          isOpen={!!selectedUserId}
          onClose={handleCloseModals}
          userId={selectedUserId}
          onEdit={handleEditUser}
          onDelete={handleDelete}
        />
      )}

      {showNewUserModal && (
        <PersonFormModal
          isOpen={showNewUserModal}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}

      {showEditUserModal && selectedUserId && (
        <PersonFormModal
          isOpen={showEditUserModal}
          onClose={handleCloseModals}
          userId={selectedUserId}
          onSuccess={handleSuccess}
        />
      )}

      {selectedTeamId && !showEditTeamModal && (
        <TeamDetailModal
          isOpen={!!selectedTeamId}
          onClose={handleCloseModals}
          teamId={selectedTeamId}
          onEdit={handleEditTeam}
          onDelete={handleDelete}
        />
      )}

      {showNewTeamModal && (
        <TeamFormModal
          isOpen={showNewTeamModal}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}

      {showEditTeamModal && selectedTeamId && (
        <TeamFormModal
          isOpen={showEditTeamModal}
          onClose={handleCloseModals}
          teamId={selectedTeamId}
          onSuccess={handleSuccess}
        />
      )}
    </PageContainer>
  )
}
