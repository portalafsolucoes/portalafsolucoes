'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { getRoleDisplayName } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'

interface UserUnit {
  id: string
  name: string
}

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  jobTitle: string | null
  role: string
  enabled: boolean
  image: string | null
  units: UserUnit[]
  createdAt: string
}

interface UnitOption {
  id: string
  name: string
}

const ALL_ROLES: { value: string; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'GESTOR', label: 'Gestor' },
  { value: 'PLANEJADOR', label: 'Planejador' },
  { value: 'MECANICO', label: 'Mecânico' },
  { value: 'ELETRICISTA', label: 'Eletricista' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'CONSTRUTOR_CIVIL', label: 'Construtor Civil' },
]

export default function AdminUsersPage() {
  const { role: currentRole, isLoading: authLoading, user: currentUser } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', jobTitle: '', role: 'MECANICO', rate: '0',
    enabled: true, unitIds: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Unit assignment modal
  const [assignUser, setAssignUser] = useState<AdminUser | null>(null)
  const [assignUnitIds, setAssignUnitIds] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)

  // Delete modal
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    if (!authLoading && currentRole !== 'SUPER_ADMIN' && currentRole !== 'GESTOR') {
      router.push('/dashboard')
    }
  }, [authLoading, currentRole, router])

  useEffect(() => {
    fetchUsers()
    fetchUnits()
  }, [roleFilter, unitFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      if (unitFilter) params.append('unitId', unitFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setUsers(data.data || [])
    } catch {
      console.error('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/admin/units')
      const data = await res.json()
      setUnits((data.data || []).map((u: any) => ({ id: u.id, name: u.name })))
    } catch {
      console.error('Error loading units')
    }
  }

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase()
    return (
      user.firstName.toLowerCase().includes(search) ||
      user.lastName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.jobTitle || '').toLowerCase().includes(search)
    )
  })

  // --- Form handlers ---

  const openCreate = () => {
    setEditingUser(null)
    setFormData({
      firstName: '', lastName: '', email: '', password: '',
      phone: '', jobTitle: '', role: 'MECANICO', rate: '0',
      enabled: true, unitIds: [],
    })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = async (user: AdminUser) => {
    // Fetch full user with unitIds
    try {
      const res = await fetch(`/api/admin/users/${user.id}`)
      const data = await res.json()
      const u = data.data

      setEditingUser(user)
      setFormData({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: '',
        phone: u.phone || '',
        jobTitle: u.jobTitle || '',
        role: u.role,
        rate: String(u.rate || 0),
        enabled: u.enabled,
        unitIds: u.unitIds || [],
      })
      setFormError('')
      setShowForm(true)
    } catch {
      alert('Erro ao carregar dados do usuário')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError('Nome, sobrenome e email são obrigatórios')
      return
    }
    if (!editingUser && !formData.password) {
      setFormError('Senha é obrigatória para novos usuários')
      return
    }

    try {
      setSaving(true)
      setFormError('')

      const body: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        role: formData.role,
        rate: parseFloat(formData.rate),
        enabled: formData.enabled,
        unitIds: formData.unitIds,
      }

      if (formData.password) {
        body.password = formData.password
      }

      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar')
        return
      }

      setShowForm(false)
      fetchUsers()
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  // --- Unit assignment ---

  const openAssign = (user: AdminUser) => {
    setAssignUser(user)
    setAssignUnitIds(user.units.map(u => u.id))
  }

  const handleSaveAssign = async () => {
    if (!assignUser) return

    try {
      setSavingAssign(true)
      const res = await fetch(`/api/admin/users/${assignUser.id}/units`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: assignUnitIds }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erro ao salvar')
        return
      }

      setAssignUser(null)
      fetchUsers()
    } catch {
      alert('Erro de conexão')
    } finally {
      setSavingAssign(false)
    }
  }

  const toggleAssignUnit = (unitId: string) => {
    setAssignUnitIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    )
  }

  // --- Delete ---

  const handleDelete = async () => {
    if (!deleteUser) return

    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Erro ao excluir')
        return
      }

      setDeleteUser(null)
      fetchUsers()
    } catch {
      alert('Erro de conexão')
    }
  }

  // --- Form unit toggle ---

  const toggleFormUnit = (unitId: string) => {
    setFormData(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId],
    }))
  }

  if (authLoading) return null

  return (
    <PageContainer>
        <PageHeader
          title="Gestão de Usuários"
          description="Crie usuários, defina papéis e atribua unidades"
          actions={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors"
            >
              <Icon name="person_add" className="text-xl" />
              Novo Usuário
            </button>
          }
        />

        {/* Filters */}
        <div className="bg-card rounded-[4px] ambient-shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou cargo..."
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
              {ALL_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">Todas as Unidades</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
            <Icon name="group" className="text-6xl text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">Crie o primeiro usuário para começar.</p>
          </div>
        ) : (
          <div className="bg-card rounded-[4px] ambient-shadow overflow-hidden">
            <table className="min-w-full divide-y divide-on-surface-variant/10">
              <thead className="bg-surface-low">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Papel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidades</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface-variant/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.jobTitle && (
                            <div className="text-xs text-muted-foreground">{user.jobTitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-foreground">
                        {getRoleDisplayName(user.role as UserRole)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.units.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">Sem unidade</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.units.map(unit => (
                            <span
                              key={unit.id}
                              className="px-2 py-0.5 text-xs rounded-full bg-surface-highest text-foreground"
                            >
                              {unit.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.enabled ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-success/10 text-success">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-danger/10 text-danger">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAssign(user)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[4px] transition-colors"
                          title="Gerenciar unidades"
                        >
                          <Icon name="apartment" className="text-lg" />
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-[4px] transition-colors"
                          title="Editar"
                        >
                          <Icon name="edit" className="text-lg" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteUser(user)}
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-[4px] transition-colors"
                            title="Excluir"
                          >
                            <Icon name="delete" className="text-lg" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-6 py-3 text-sm text-muted-foreground border-t border-on-surface-variant/10">
              {filteredUsers.length} de {users.length} usuário(s)
            </div>
          </div>
        )}

      {/* User Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {formError && (
            <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nome <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sobrenome <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {editingUser ? 'Nova Senha (em branco para manter)' : 'Senha'} {!editingUser && <span className="text-danger">*</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required={!editingUser}
                minLength={6}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cargo</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Papel <span className="text-danger">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {ALL_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Taxa por Hora (R$)</label>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Unidades - checkbox list */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Unidades de Acesso
            </label>
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma unidade cadastrada</p>
            ) : (
              <div className="border border-input rounded-[4px] p-3 max-h-40 overflow-y-auto space-y-2">
                {units.map(unit => (
                  <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-low px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.unitIds.includes(unit.id)}
                      onChange={() => toggleFormUnit(unit.id)}
                      className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                    />
                    <span className="text-sm text-foreground">{unit.name}</span>
                  </label>
                ))}
              </div>
            )}
            {formData.unitIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formData.unitIds.length} unidade(s) selecionada(s)
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="form-enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
            />
            <label htmlFor="form-enabled" className="text-sm font-medium text-foreground">
              Usuário ativo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-on-surface-variant/10">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
            >
              <Icon name="save" className="text-base" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Unit Assignment Modal */}
      <Modal
        isOpen={!!assignUser}
        onClose={() => setAssignUser(null)}
        title={`Unidades - ${assignUser?.firstName} ${assignUser?.lastName}`}
        size="md"
      >
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Selecione as unidades que este usuário terá acesso:
          </p>

          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhuma unidade cadastrada</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {units.map(unit => (
                <label
                  key={unit.id}
                  className="flex items-center gap-3 p-3 border border-input rounded-[4px] cursor-pointer hover:bg-surface-low transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={assignUnitIds.includes(unit.id)}
                    onChange={() => toggleAssignUnit(unit.id)}
                    className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                  />
                  <Icon name="apartment" className="text-lg text-muted-foreground" />
                  <span className="text-foreground">{unit.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-on-surface-variant/10">
            <button
              onClick={() => setAssignUser(null)}
              className="px-6 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAssign}
              disabled={savingAssign}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
            >
              <Icon name="save" className="text-base" />
              {savingAssign ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-6">
          <p className="text-foreground mb-2">
            Tem certeza que deseja excluir o usuário:
          </p>
          <p className="font-semibold text-foreground mb-4">
            {deleteUser?.firstName} {deleteUser?.lastName} ({deleteUser?.email})
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteUser(null)}
              className="px-4 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
