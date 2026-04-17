'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
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
const TeamsTreeView = dynamic(() => import('@/components/teams/TeamsTreeView').then(m => ({ default: m.TeamsTreeView })), { ssr: false })

type ViewMode = 'table' | 'tree'

type Team = {
  id: string
  name: string
  description?: string
  leaderId?: string | null
  members: Array<{
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      jobTitle?: string | null
      image?: string | null
    }
  }>
  _count: {
    assignedWorkOrders: number
    assignedAssets: number
  }
}

type SortField = 'name' | 'email' | 'jobTitle' | 'role' | 'enabled'
type SortDirection = 'asc' | 'desc'
type StatusFilter = '' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

function getUserStatus(u: User): 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' {
  const s = (u as unknown as { status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' }).status
  if (s) return s
  return u.enabled ? 'ACTIVE' : 'INACTIVE'
}

export default function PeopleTeamsPage() {
  const router = useRouter()
  const { isPhone } = useResponsiveLayout()
  const { user } = useAuth()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // People states
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
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
    void fetchUsers()
    if (viewMode === 'tree') {
      void fetchTeams()
    }
  }, [fetchTeams, fetchUsers, user, viewMode])

  useEffect(() => {
    if (!user) return
    if (!hasPermission(user, 'people-teams', 'view')) {
      router.replace(getDefaultCmmsPath(user))
    }
  }, [router, user])

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    const matchesRole = !roleFilter || normalizeUserRole(user.role) === roleFilter
    const userStatus = getUserStatus(user)
    const matchesStatus = statusFilter
      ? userStatus === statusFilter
      : userStatus !== 'ARCHIVED'

    return (
      matchesRole && matchesStatus && (
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
    setSelectedTeamId(null)
    setShowNewTeamModal(false)
    setShowEditTeamModal(false)
    setShowNewUserModal(false)
    setShowEditUserModal(false)
    setSelectedUserId(userId)
  }

  const handleTeamClick = (teamId: string) => {
    setSelectedUserId(null)
    setShowNewUserModal(false)
    setShowEditUserModal(false)
    setShowNewTeamModal(false)
    setShowEditTeamModal(false)
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
    fetchUsers()
    if (viewMode === 'tree') fetchTeams()
  }

  const handleSuccess = () => {
    fetchUsers()
    if (viewMode === 'tree') fetchTeams()
  }

  const handleDelete = () => {
    fetchUsers()
    if (viewMode === 'tree') fetchTeams()
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
        className="text-sm text-accent-orange"
      />
    )
  }

  const closeSidePanel = () => {
    handleCloseModals()
  }

  const pageTitle = 'Pessoas e Equipes'
  const pageDescription = viewMode === 'tree'
    ? 'Gestao de equipes e seus colaboradores'
    : 'Gestao de pessoas da organizacao'

  const showPeopleSidePanel = !!(selectedUserId || showNewUserModal || selectedTeamId || showNewTeamModal || showEditTeamModal)

  // Calcular usuarios sem equipe (somente quando em modo arvore)
  const assignedUserIds = new Set<string>()
  teams.forEach((t) => t.members.forEach((m) => assignedUserIds.add(m.user.id)))
  const unassignedUsers = users
    .filter((u) => getUserStatus(u) === 'ACTIVE' && !assignedUserIds.has(u.id))
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      jobTitle: u.jobTitle ?? null,
      image: u.image ?? null,
    }))

  // Active panel for AdaptiveSplitPanel
  const activePanel = showNewTeamModal ? (
    <TeamFormModal
      isOpen={showNewTeamModal}
      onClose={handleCloseModals}
      onSuccess={handleSuccess}
      inPage
    />
  ) : showEditTeamModal && selectedTeamId ? (
    <TeamFormModal
      isOpen={showEditTeamModal}
      onClose={handleCloseModals}
      teamId={selectedTeamId}
      onSuccess={handleSuccess}
      inPage
    />
  ) : selectedTeamId ? (
    <TeamDetailModal
      isOpen={!!selectedTeamId}
      onClose={handleCloseModals}
      teamId={selectedTeamId}
      onEdit={canEdit('people-teams') ? handleEditTeam : () => {}}
      onDelete={canDelete('people-teams') ? handleDelete : () => {}}
      inPage
    />
  ) : showNewUserModal ? (
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
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-48 xl:w-64">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={viewMode === 'tree' ? 'Buscar...' : 'Buscar pessoas...'}
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
                    onClick={() => setViewMode('tree')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                      viewMode === 'tree'
                        ? 'bg-background text-foreground ambient-shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Visualização em Equipes"
                  >
                    <Icon name="account_tree" className="text-base" />
                    <span className="hidden md:inline">Equipes</span>
                  </button>
                </div>

                {viewMode === 'table' && (
                  <>
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

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
                    >
                      <option value="">Ativos e Inativos</option>
                      <option value="ACTIVE">Apenas Ativos</option>
                      <option value="INACTIVE">Apenas Inativos</option>
                      <option value="ARCHIVED">Anonimizados</option>
                    </select>

                    <ExportButton data={filteredUsers} entity="users" />
                  </>
                )}

                {canCreate('people-teams') && (
                  <Button
                    onClick={() => {
                      setSelectedUserId(null)
                      setSelectedTeamId(null)
                      setShowEditUserModal(false)
                      setShowEditTeamModal(false)
                      setShowNewUserModal(false)
                      setShowNewTeamModal(false)
                      if (viewMode === 'tree') {
                        setShowNewTeamModal(true)
                      } else {
                        setShowNewUserModal(true)
                      }
                    }}
                    className="whitespace-nowrap bg-accent-orange hover:bg-accent-orange/90 text-white shadow-md font-bold"
                  >
                    <Icon name="add" className="mr-2 text-base" />
                    <span className="hidden sm:inline ml-1">{viewMode === 'tree' ? 'Nova Equipe' : 'Adicionar'}</span>
                  </Button>
                )}
              </div>
            }
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
            <AdaptiveSplitPanel
              showPanel={showPeopleSidePanel}
              panelTitle="Pessoa"
              onClosePanel={closeSidePanel}
              panel={activePanel}
              list={
                viewMode === 'tree' ? (
                  loadingTeams || loadingUsers ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                        <p className="mt-2 text-muted-foreground">Carregando equipes...</p>
                      </div>
                    </div>
                  ) : (
                    <TeamsTreeView
                      teams={(searchTerm
                        ? teams
                            .map((t) => ({
                              ...t,
                              members: t.members.filter((m) => {
                                const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase()
                                const q = searchTerm.toLowerCase()
                                return fullName.includes(q) || (m.user.email || '').toLowerCase().includes(q) || (m.user.jobTitle || '').toLowerCase().includes(q)
                              }),
                            }))
                            .filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.members.length > 0)
                        : teams).map((t) => ({
                          id: t.id,
                          name: t.name,
                          description: t.description,
                          leaderId: t.leaderId ?? null,
                          members: t.members,
                        }))}
                      unassignedUsers={searchTerm
                        ? unassignedUsers.filter((u) => {
                            const q = searchTerm.toLowerCase()
                            return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.jobTitle || '').toLowerCase().includes(q)
                          })
                        : unassignedUsers}
                      selectedTeamId={selectedTeamId}
                      selectedUserId={selectedUserId}
                      onTeamClick={handleTeamClick}
                      onUserClick={handleUserClick}
                    />
                  )
                ) : loadingUsers ? (
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
                    {/* Table View */}
                    {!isPhone && (
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
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-secondary cursor-pointer transition-colors group`}
                                    data-user-id={user.id}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {user.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
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
                                      {(() => {
                                        const s = getUserStatus(user)
                                        if (s === 'ACTIVE') return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success-light-foreground">Ativo</span>
                                        if (s === 'INACTIVE') return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-700">Inativo</span>
                                        return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">Anonimizado</span>
                                      })()}
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

    </PageContainer>
  )
}
