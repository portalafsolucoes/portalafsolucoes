'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { User } from '@/types'
import { ExportButton } from '@/components/ui/ExportButton'
import { useResponsiveLayout } from '@/hooks/useMediaQuery'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { hasPermission } from '@/lib/permissions'
import { CANONICAL_ROLE_OPTIONS, getDefaultCmmsPath, getRoleDisplayName, normalizeUserRole } from '@/lib/user-roles'

// Lazy load: modais so carregam quando necessario
const PersonDetailModal = dynamic(() => import('@/components/people/PersonDetailModal').then(m => ({ default: m.PersonDetailModal })), { ssr: false })
const PersonFormModal = dynamic(() => import('@/components/people/PersonFormModal').then(m => ({ default: m.PersonFormModal })), { ssr: false })
const TeamDetailModal = dynamic(() => import('@/components/teams/TeamDetailModal').then(m => ({ default: m.TeamDetailModal })), { ssr: false })
const TeamFormModal = dynamic(() => import('@/components/teams/TeamFormModal').then(m => ({ default: m.TeamFormModal })), { ssr: false })

type ViewMode = 'grid' | 'table'

type Team = {
  id: string
  name: string
  description?: string
  members: Array<{
    user: {
      firstName: string
      lastName: string
    }
  }>
  _count: {
    assignedWorkOrders: number
    assignedAssets: number
  }
}

type SortField = 'name' | 'email' | 'jobTitle' | 'role' | 'enabled'
type SortDirection = 'asc' | 'desc'

export default function PeopleTeamsPage() {
  const router = useRouter()
  const activeTab = 'people' as 'people' | 'teams'
  const { isPhone } = useResponsiveLayout()
  const { user } = useAuth()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // People states
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)

  // Teams states
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.data) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchTeams = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (!user || !hasPermission(user, 'people-teams', 'view')) return
    if (activeTab === 'people') {
      void fetchUsers()
    } else {
      void fetchTeams()
    }
  }, [activeTab, fetchTeams, fetchUsers, user])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'people-teams', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    const matchesRole = !roleFilter || normalizeUserRole(user.role) === roleFilter

    return (
      matchesRole && (
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.jobTitle || '').toLowerCase().includes(searchLower) ||
        getRoleDisplayName(user.role).toLowerCase().includes(searchLower)
      )
    )
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1

    switch (sortField) {
      case 'name': {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase()
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase()
        return aName.localeCompare(bName) * modifier
      }
      case 'email':
        return a.email.toLowerCase().localeCompare(b.email.toLowerCase()) * modifier
      case 'jobTitle':
        return (a.jobTitle || '').toLowerCase().localeCompare((b.jobTitle || '').toLowerCase()) * modifier
      case 'role':
        return getRoleDisplayName(a.role).localeCompare(getRoleDisplayName(b.role)) * modifier
      case 'enabled':
        return ((a.enabled ? 1 : 0) - (b.enabled ? 1 : 0)) * modifier
      default:
        return 0
    }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Icon name="unfold_more" className="text-sm text-muted-foreground" />
    }

    return (
      <Icon
        name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        className="text-sm text-foreground"
      />
    )
  }

  const closeSidePanel = () => {
    handleCloseModals()
  }

  const pageTitle = activeTab === 'people' ? 'Pessoas' : 'Equipes'
  const pageDescription =
    activeTab === 'people'
      ? 'Gestao de pessoas e equipamentos'
      : 'Gestao de equipes e alocacoes operacionais'

  const showPeopleSidePanel = !!(selectedUserId || showNewUserModal)

  // Active panel for AdaptiveSplitPanel
  const activePanel = showNewUserModal ? (
    <PersonFormModal
      isOpen={showNewUserModal}
      onClose={handleCloseModals}
      onSuccess={handleSuccess}
      inPage
    />
  ) : showEditUserModal ? (
    <PersonFormModal
      isOpen={showEditUserModal}
      onClose={handleCloseModals}
      userId={selectedUserId}
      onSuccess={handleSuccess}
      inPage
    />
  ) : selectedUserId ? (
    <PersonDetailModal
      isOpen={!!selectedUserId}
      onClose={handleCloseModals}
      userId={selectedUserId!}
      onEdit={canEdit('people-teams') ? handleEditUser : () => {}}
      onDelete={canDelete('people-teams') ? handleDelete : () => {}}
      inPage
    />
  ) : null

  if (!user || !hasPermission(user, 'people-teams', 'view')) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
          <PageHeader
            title={pageTitle}
            description={pageDescription}
            className="mb-0"
            actions={
              activeTab === 'people' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full sm:w-48 xl:w-64">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar pessoas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="hidden md:flex items-center bg-muted rounded-[4px] p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                        viewMode === 'table'
                          ? 'bg-background text-foreground ambient-shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Visualização em Tabela"
                    >
                      <Icon name="table" className="text-base" />
                      <span className="hidden md:inline">Tabela</span>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                        viewMode === 'grid'
                          ? 'bg-background text-foreground ambient-shadow'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Visualização em Grade"
                    >
                      <Icon name="grid_view" className="text-base" />
                      <span className="hidden md:inline">Grade</span>
                    </button>
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
                  >
                    <option value="">Todos os Papéis</option>
                    {CANONICAL_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>

                  <ExportButton data={filteredUsers} entity="users" />

                  {canCreate('people-teams') && (
                    <Button
                      onClick={() => { setSelectedUserId(null); setShowEditUserModal(false); setShowNewUserModal(true) }}
                      className="whitespace-nowrap bg-accent-orange hover:bg-accent-orange/90 text-white shadow-md font-bold"
                    >
                      <Icon name="add" className="mr-2 text-base" />
                      <span className="hidden sm:inline ml-1">Adicionar</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {canCreate('people-teams') && (
                    <button
                      onClick={() => setShowNewTeamModal(true)}
                      className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors whitespace-nowrap"
                    >
                      <Icon name="add" className="text-xl" />
                      Nova Equipe
                    </button>
                  )}
                </div>
              )
            }
          />
        </div>

        {/* People Tab Content */}
        {activeTab === 'people' && (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
              <AdaptiveSplitPanel
                showPanel={showPeopleSidePanel}
                panelTitle="Pessoa"
                onClosePanel={closeSidePanel}
                panel={activePanel}
                list={
                  loadingUsers ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                        <p className="mt-2 text-muted-foreground">Carregando...</p>
                      </div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-12 text-center">
                      <div>
                        <Icon name="group" className="text-6xl text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma pessoa encontrada</h3>
                        <p className="text-muted-foreground">Adicione pessoas à sua organização para começar.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                      {/* Grid View */}
                      {(viewMode === 'grid' || isPhone) && (
                        <div className="overflow-auto flex-1 p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sortedUsers.map((user) => (
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
                                    {getRoleDisplayName(user.role)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                      )}

                      {/* Table View */}
                      {viewMode === 'table' && !isPhone && (
                        <div className="h-full flex flex-col bg-card overflow-hidden">
                          <div className="flex-1 overflow-auto min-h-0">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="sticky top-0 bg-secondary z-10">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                                      <span>Nome</span>
                                      {renderSortIcon('name')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <button type="button" onClick={() => handleSort('email')} className="flex items-center gap-1">
                                      <span>Email</span>
                                      {renderSortIcon('email')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <button type="button" onClick={() => handleSort('jobTitle')} className="flex items-center gap-1">
                                      <span>Cargo</span>
                                      {renderSortIcon('jobTitle')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <button type="button" onClick={() => handleSort('role')} className="flex items-center gap-1">
                                      <span>Papel</span>
                                      {renderSortIcon('role')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <button type="button" onClick={() => handleSort('enabled')} className="flex items-center gap-1">
                                      <span>Status</span>
                                      {renderSortIcon('enabled')}
                                    </button>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-gray-100">
                                {sortedUsers.map((user, index) => (
                                  <tr
                                    key={user.id}
                                    onClick={() => handleUserClick(user.id)}
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-accent-orange-light cursor-pointer transition-colors group`}
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
                                        {getRoleDisplayName(user.role)}
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
                        </div>
                      )}
                    </div>
                  )
                }
              />
            </div>
          </div>
        )}

        {/* Teams Tab Content */}
        {activeTab === 'teams' && (
          <div className="p-4 md:p-6">
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
                          {team.members.slice(0, 3).map((member, idx: number) => (
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
          </div>
        )}

      {/* Team Modals (always overlay — no inPage variant) */}
      {selectedTeamId && !showEditTeamModal && (
        <TeamDetailModal
          isOpen={!!selectedTeamId}
          onClose={handleCloseModals}
          teamId={selectedTeamId}
          onEdit={canEdit('people-teams') ? handleEditTeam : () => {}}
          onDelete={canDelete('people-teams') ? handleDelete : () => {}}
        />
      )}

      {showNewTeamModal && canCreate('people-teams') && (
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
