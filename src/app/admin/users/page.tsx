'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
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
    <PageContainer variant="full" className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          className="mb-0"
          title="Gestão de Usuários"
          description="Crie usuários, defina papéis e atribua unidades"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todos os Papéis</option>
                {ALL_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="h-9 px-3 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas as Unidades</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Button onClick={openCreate} size="sm">
                <Icon name="person_add" className="mr-1 text-base" />
                Novo Usuário
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <div className="w-full transition-all overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                  <p className="mt-2 text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col bg-card overflow-hidden">
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 bg-secondary z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Papel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Icon name="group" className="text-4xl text-muted-foreground" />
                              <h3 className="text-sm font-medium text-foreground">Nenhum usuário encontrado</h3>
                              <p className="text-sm text-muted-foreground">
                                {users.length === 0
                                  ? 'Crie o primeiro usuário para começar.'
                                  : 'Ajuste os filtros para encontrar outro usuário.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-secondary cursor-pointer transition-colors">
                            <td className="px-6 py-4 text-sm text-foreground">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-foreground">
                                {getRoleDisplayName(user.role as UserRole)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              {user.units.length === 0 ? (
                                <span className="text-muted-foreground italic">Sem unidade</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {user.units.map(unit => (
                                    <span
                                      key={unit.id}
                                      className="px-2 py-0.5 text-xs rounded-full bg-secondary text-foreground"
                                    >
                                      {unit.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
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
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAssign(user)}
                                  title="Gerenciar unidades"
                                >
                                  <Icon name="apartment" className="mr-1 text-base" />
                                  Unidades
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(user)}
                                  title="Editar"
                                >
                                  <Icon name="edit" className="mr-1 text-base" />
                                  Editar
                                </Button>
                                {user.id !== currentUser?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteUser(user)}
                                    title="Excluir"
                                    className="text-danger hover:bg-danger/10 hover:text-danger"
                                  >
                                    <Icon name="delete" className="mr-1 text-base" />
                                    Excluir
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">
            {formError && (
              <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
                {formError}
              </div>
            )}

            <ModalSection title="Identificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Nome <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Sobrenome <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {editingUser ? 'Nova Senha' : 'Senha'} {!editingUser && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                    minLength={6}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cargo</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </ModalSection>

            <ModalSection title="Acesso">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Papel <span className="text-danger">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Taxa por Hora (R$)</label>
                  <input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Unidades de Acesso
                  </label>
                  {units.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma unidade cadastrada</p>
                  ) : (
                    <div className="border border-input rounded-[4px] p-3 max-h-40 overflow-y-auto space-y-2">
                      {units.map(unit => (
                        <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary px-2 py-1 rounded-[4px]">
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
                <div className="md:col-span-2 flex items-center gap-2">
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
              </div>
            </ModalSection>
          </div>

          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Salvar'}
            </Button>
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
        <div className="p-4 space-y-3">
          <ModalSection title="Unidades Disponíveis">
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
                    className="flex items-center gap-3 p-3 border border-input rounded-[4px] cursor-pointer hover:bg-secondary transition-colors"
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
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setAssignUser(null)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSaveAssign} disabled={savingAssign} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {savingAssign ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-4">
          <p className="text-foreground mb-2">
            Tem certeza que deseja excluir o usuário:
          </p>
          <p className="font-semibold text-foreground mb-4">
            {deleteUser?.firstName} {deleteUser?.lastName} ({deleteUser?.email})
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setDeleteUser(null)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Excluir
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
