'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

type TreeUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  jobTitle?: string | null
  image?: string | null
}

type TreeTeam = {
  id: string
  name: string
  description?: string | null
  leaderId?: string | null
  members: Array<{ user: TreeUser }>
}

interface TeamsTreeViewProps {
  teams: TreeTeam[]
  unassignedUsers: TreeUser[]
  selectedTeamId: string | null
  selectedUserId: string | null
  onTeamClick: (teamId: string) => void
  onUserClick: (userId: string) => void
}

interface UserNodeProps {
  user: TreeUser
  level: number
  leader?: boolean
  selected: boolean
  onSelect: () => void
}

function UserNode({ user, level, leader, selected, onSelect }: UserNodeProps) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors ${selected ? 'bg-primary/10 border-l-2 border-on-surface-variant' : ''}`}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={onSelect}
    >
      <div className="w-5" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon name="person" className="text-base text-muted-foreground" />
        <span className={`text-sm truncate ${selected ? 'font-semibold text-blue-900' : 'text-foreground'}`}>
          {user.firstName} {user.lastName}
        </span>
        {user.jobTitle && (
          <span className="text-[12px] text-muted-foreground truncate">— {user.jobTitle}</span>
        )}
        {leader && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Lider</span>
        )}
      </div>
    </div>
  )
}

interface TeamNodeProps {
  team: TreeTeam
  level: number
  selectedTeamId: string | null
  selectedUserId: string | null
  onTeamClick: (id: string) => void
  onUserClick: (id: string) => void
}

function TeamNode({ team, level, selectedTeamId, selectedUserId, onTeamClick, onUserClick }: TeamNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = team.members.length > 0
  const isSelected = selectedTeamId === team.id

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors ${isSelected ? 'bg-primary/10 border-l-2 border-on-surface-variant' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onTeamClick(team.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
            className="p-0.5 hover:bg-muted rounded"
          >
            <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} className="text-base text-muted-foreground" />
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon name="groups" className="text-base text-orange-500" />
          <span className={`text-sm ${isSelected ? 'font-semibold text-blue-900' : 'font-semibold text-foreground'}`}>
            {team.name}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">{team.members.length}</span>
          {team.description && (
            <span className="text-[12px] text-muted-foreground truncate">— {team.description}</span>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {team.members.map((m) => (
            <UserNode
              key={m.user.id}
              user={m.user}
              level={level + 1}
              leader={m.user.id === team.leaderId}
              selected={selectedUserId === m.user.id}
              onSelect={() => onUserClick(m.user.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UnassignedGroupProps {
  users: TreeUser[]
  level: number
  selectedUserId: string | null
  onUserClick: (id: string) => void
}

function UnassignedGroup({ users, level, selectedUserId, onUserClick }: UnassignedGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = users.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          <button className="p-0.5 hover:bg-muted rounded">
            <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} className="text-base text-muted-foreground" />
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon name="folder_off" className="text-base text-gray-500" />
          <span className="text-sm font-semibold text-foreground">Sem equipe</span>
          <span className="text-[11px] font-semibold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">{users.length}</span>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {users.map((u) => (
            <UserNode
              key={u.id}
              user={u}
              level={level + 1}
              selected={selectedUserId === u.id}
              onSelect={() => onUserClick(u.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamsTreeView({
  teams,
  unassignedUsers,
  selectedTeamId,
  selectedUserId,
  onTeamClick,
  onUserClick,
}: TeamsTreeViewProps) {
  if (teams.length === 0 && unassignedUsers.length === 0) {
    return (
      <div className="h-full overflow-auto bg-card">
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="groups" className="text-3xl mx-auto mb-2 text-muted-foreground" />
          <p>Nenhuma equipe cadastrada</p>
          <p className="text-sm mt-1">Clique em &quot;Nova Equipe&quot; para comecar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-card">
      <div className="p-2">
        {teams.map((team) => (
          <TeamNode
            key={team.id}
            team={team}
            level={0}
            selectedTeamId={selectedTeamId}
            selectedUserId={selectedUserId}
            onTeamClick={onTeamClick}
            onUserClick={onUserClick}
          />
        ))}

        {unassignedUsers.length > 0 && (
          <UnassignedGroup
            users={unassignedUsers}
            level={0}
            selectedUserId={selectedUserId}
            onUserClick={onUserClick}
          />
        )}
      </div>
    </div>
  )
}
