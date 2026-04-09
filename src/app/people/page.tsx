'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PersonDetailModal } from '@/components/people/PersonDetailModal'
import { PersonFormModal } from '@/components/people/PersonFormModal'
import { User } from '@/types'
import { getRoleLabel } from '@/lib/rbac'

export default function PeoplePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
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

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
  }

  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleCloseModal = () => {
    setSelectedUserId(null)
    setShowNewModal(false)
    setShowEditModal(false)
    fetchUsers()
  }

  const handleSuccess = () => {
    fetchUsers()
  }

  const handleDelete = () => {
    fetchUsers()
  }

  return (
    <PageContainer>
        <PageHeader
          title="Pessoas"
          description="Gerencie as pessoas da organização"
          actions={
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-blue-700 transition-colors"
            >
              <Icon name="add" className="text-xl" />
              Adicionar Pessoa
            </button>
          }
        />

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

        {/* Users Grid */}
        {loading ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user.id)}
                className="bg-card rounded-[4px] ambient-shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
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

        {/* Summary */}
        {!loading && filteredUsers.length > 0 && (
          <div className="mt-6 text-center text-muted-foreground">
            Mostrando {filteredUsers.length} de {users.length} pessoa(s)
          </div>
        )}
      {/* Modals */}
      {selectedUserId && !showEditModal && (
        <PersonDetailModal
          isOpen={!!selectedUserId}
          onClose={handleCloseModal}
          userId={selectedUserId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showNewModal && (
        <PersonFormModal
          isOpen={showNewModal}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && selectedUserId && (
        <PersonFormModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          userId={selectedUserId}
          onSuccess={handleSuccess}
        />
      )}
    </PageContainer>
  )
}
