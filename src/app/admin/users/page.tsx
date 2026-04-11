'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useRouter } from 'next/navigation'
import { getRoleDisplayName } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'
import { isAdminRole } from '@/lib/user-roles'

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

interface JobTitleOption {
  id: string
  name: string
}

const ALL_ROLES: { value: string; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'LIMITED_TECHNICIAN', label: 'Técnico Limitado' },
  { value: 'REQUESTER', label: 'Solicitante' },
  { value: 'VIEW_ONLY', label: 'Somente Consulta' },
]

// Mapeia role canônico para valores legados armazenados no banco
const CANONICAL_TO_LEGACY_ROLES: Record<string, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN,GESTOR,PLANEJADOR',
  TECHNICIAN: 'TECHNICIAN,MECANICO',
  LIMITED_TECHNICIAN: 'LIMITED_TECHNICIAN,ELETRICISTA,CONSTRUTOR_CIVIL',
  REQUESTER: 'REQUESTER,OPERADOR',
  VIEW_ONLY: 'VIEW_ONLY',
}

// ─── User Detail Panel ────────────────────────────────────────────────────────

interface UserDetailPanelProps {
  user: AdminUser
  currentUserId?: string
  onClose: () => void
  onEdit: () => void
  onDelete: (user: AdminUser) => void
  onManageUnits: (user: AdminUser) => void
}

function UserDetailPanel({
  user,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onManageUnits,
}: UserDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">
          {user.firstName} {user.lastName}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        <div className="p-4 border-b border-border space-y-2">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
          >
            <Icon name="edit" className="text-base" />
            Editar
          </button>
          <button
            onClick={() => onManageUnits(user)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-[4px] hover:bg-muted transition-colors text-sm text-foreground"
          >
            <Icon name="apartment" className="text-base" />
            Gerenciar Unidades
          </button>
          {user.id !== currentUserId && (
            <button
              onClick={() => onDelete(user)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-[4px] hover:bg-destructive/10 transition-colors text-sm"
            >
              <Icon name="delete" className="text-base" />
              Excluir
            </button>
          )}
        </div>

        {/* Avatar + basic info */}
        <div className="p-4 border-b border-border flex items-center gap-4">
          {user.image ? (
            <img src={user.image} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold text-lg">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.jobTitle && <p className="text-xs text-muted-foreground">{user.jobTitle}</p>}
          </div>
        </div>

        {/* Data */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Papel</p>
              <p className="text-sm text-foreground">
                {getRoleDisplayName(user.role as UserRole)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm text-foreground">
                {user.enabled ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success">
                    Ativo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-danger/10 text-danger">
                    Inativo
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm text-foreground">{user.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-sm text-foreground">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Unidades</h3>
          {user.units.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sem unidade vinculada</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
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
        </div>
      </div>
    </div>
  )
}

// ─── User Form Panel ──────────────────────────────────────────────────────────

interface UserFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  jobTitleId: string
  role: string
  rate: string
  enabled: boolean
  unitIds: string[]
}

interface UserFormPanelProps {
  inPage?: boolean
  isEdit: boolean
  formData: UserFormData
  units: UnitOption[]
  jobTitles: JobTitleOption[]
  saving: boolean
  error: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onChange: <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => void
  onToggleUnit: (unitId: string) => void
}

function UserFormPanel({
  inPage,
  isEdit,
  formData,
  units,
  jobTitles,
  saving,
  error,
  onClose,
  onSubmit,
  onChange,
  onToggleUnit,
}: UserFormPanelProps) {
  const formContent = (
    <form onSubmit={onSubmit} className={inPage ? 'flex flex-1 min-h-0 flex-col' : undefined}>
      <div className={inPage ? 'flex-1 overflow-y-auto p-4 space-y-3' : 'p-4 space-y-3'}>
        {error && (
          <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
            {error}
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
                onChange={(e) => onChange('firstName', e.target.value)}
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
                onChange={(e) => onChange('lastName', e.target.value)}
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
                onChange={(e) => onChange('email', e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {isEdit ? 'Nova Senha' : 'Senha'} {!isEdit && <span className="text-danger">*</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => onChange('password', e.target.value)}
                required={!isEdit}
                minLength={6}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cargo</label>
              <select
                value={formData.jobTitleId}
                onChange={(e) => onChange('jobTitleId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um cargo</option>
                {jobTitles.map(jobTitle => (
                  <option key={jobTitle.id} value={jobTitle.id}>{jobTitle.name}</option>
                ))}
              </select>
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
                onChange={(e) => onChange('role', e.target.value)}
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
                onChange={(e) => onChange('rate', e.target.value)}
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
                        onChange={() => onToggleUnit(unit.id)}
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
                onChange={(e) => onChange('enabled', e.target.checked)}
                className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
              />
              <label htmlFor="form-enabled" className="text-sm font-medium text-foreground">
                Usuário ativo
              </label>
            </div>
          </div>
        </ModalSection>
      </div>

      <div className={`flex gap-3 px-4 py-4 border-t border-border${inPage ? ' flex-shrink-0' : ''}`}>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          <Icon name="save" className="text-base mr-2" />
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar'}
        </Button>
      </div>
    </form>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        {formContent}
      </div>
    )
  }

  return formContent
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { role: currentRole, isLoading: authLoading, user: currentUser } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')

  // Split-panel state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const hasSidePanel = !isMobile && (selectedUser !== null || isCreating)

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', jobTitleId: '', role: 'TECHNICIAN', rate: '0',
    enabled: true, unitIds: [],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Unit assignment modal (always overlay)
  const [assignUser, setAssignUser] = useState<AdminUser | null>(null)
  const [assignUnitIds, setAssignUnitIds] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)

  // Delete modal
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdminRole(currentRole)) {
      router.push('/dashboard')
    }
  }, [authLoading, currentRole, router])

  useEffect(() => {
    fetchUsers()
    fetchUnits()
    fetchJobTitles()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, unitFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', CANONICAL_TO_LEGACY_ROLES[roleFilter] ?? roleFilter)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUnits((data.data || []).map((u: any) => ({ id: u.id, name: u.name })))
    } catch {
      console.error('Error loading units')
    }
  }

  const fetchJobTitles = async () => {
    try {
      const res = await fetch('/api/basic-registrations/job-titles')
      const data = await res.json()
      setJobTitles((data.data || []).map((jobTitle: JobTitleOption) => ({ id: jobTitle.id, name: jobTitle.name })))
    } catch {
      console.error('Error loading job titles')
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

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedUser(null)
    setIsEditing(false)
    setFormData({
      firstName: '', lastName: '', email: '', password: '',
      phone: '', jobTitleId: '', role: 'TECHNICIAN', rate: '0',
      enabled: true, unitIds: [],
    })
    setFormError('')
    setIsCreating(true)
  }

  const handleSelectUser = (user: AdminUser) => {
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
    setSelectedUser(user)
  }

  const handleEditOpen = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`)
      const data = await res.json()
      const u = data.data

      setFormData({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: '',
        phone: u.phone || '',
        jobTitleId: u.jobTitleId || '',
        role: u.role,
        rate: String(u.rate || 0),
        enabled: u.enabled,
        unitIds: u.unitIds || [],
      })
      setFormError('')
      setIsEditing(true)
      setIsCreating(false)
    } catch {
      alert('Erro ao carregar dados do usuário')
    }
  }

  const handleCloseSidePanel = () => {
    setSelectedUser(null)
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
  }

  const handleFormChange = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleFormUnit = (unitId: string) => {
    setFormData(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError('Nome, sobrenome e email são obrigatórios')
      return
    }
    if (!isEditing && !formData.password) {
      setFormError('Senha é obrigatória para novos usuários')
      return
    }

    try {
      setSaving(true)
      setFormError('')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitleId: formData.jobTitleId || null,
        role: formData.role,
        rate: parseFloat(formData.rate),
        enabled: formData.enabled,
        unitIds: formData.unitIds,
      }

      if (formData.password) {
        body.password = formData.password
      }

      const url = isEditing && selectedUser
        ? `/api/admin/users/${selectedUser.id}`
        : '/api/admin/users'

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar')
        return
      }

      await fetchUsers()
      if (isEditing && selectedUser) {
        const selectedJobTitle = jobTitles.find(jobTitle => jobTitle.id === formData.jobTitleId)
        // Refresh selected user data
        const refreshed = {
          ...selectedUser,
          ...body,
          jobTitle: selectedJobTitle?.name || null,
          units: selectedUser.units,
        }
        setSelectedUser(refreshed)
        setIsEditing(false)
      } else {
        setIsCreating(false)
      }
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  // Unit assignment
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

  // Delete
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
      if (selectedUser?.id === deleteUser.id) setSelectedUser(null)
      fetchUsers()
    } catch {
      alert('Erro de conexão')
    }
  }

  if (authLoading) return null

  const showEditForm = !isMobile && (isCreating || (selectedUser !== null && isEditing))
  const showDetailPanel = !isMobile && selectedUser !== null && !isEditing && !isCreating

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
              <Button onClick={openCreate} size="sm" className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
                <Icon name="person_add" className="mr-1 text-base" />
                Novo Usuário
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">

          {/* Left panel */}
          <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden flex flex-col`}>
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
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center">
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
                          <tr
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className={`odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-secondary' : ''}`}
                          >
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — desktop only */}
          {hasSidePanel && !isMobile && (
            <div className="w-1/2 min-w-0">
              {showEditForm && (
                <UserFormPanel
                  inPage
                  isEdit={isEditing}
                  formData={formData}
                  units={units}
                  jobTitles={jobTitles}
                  saving={saving}
                  error={formError}
                  onClose={handleCloseSidePanel}
                  onSubmit={handleSubmit}
                  onChange={handleFormChange}
                  onToggleUnit={handleToggleFormUnit}
                />
              )}
              {showDetailPanel && selectedUser && (
                <UserDetailPanel
                  user={selectedUser}
                  currentUserId={currentUser?.id}
                  onClose={handleCloseSidePanel}
                  onEdit={handleEditOpen}
                  onDelete={(u) => setDeleteUser(u)}
                  onManageUnits={openAssign}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile modals ─────────────────────────────────────────────────────── */}

      {isMobile && selectedUser && !isEditing && (
        <Modal
          isOpen
          onClose={handleCloseSidePanel}
          title={`${selectedUser.firstName} ${selectedUser.lastName}`}
          size="wide"
        >
          <div className="p-4 space-y-2">
            <button
              onClick={handleEditOpen}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-[4px] hover:bg-gray-800 transition-colors"
            >
              <Icon name="edit" className="text-base" />
              Editar
            </button>
            <button
              onClick={() => { openAssign(selectedUser); handleCloseSidePanel() }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-[4px] hover:bg-muted transition-colors text-sm text-foreground"
            >
              <Icon name="apartment" className="text-base" />
              Gerenciar Unidades
            </button>
            {selectedUser.id !== currentUser?.id && (
              <button
                onClick={() => { setDeleteUser(selectedUser); handleCloseSidePanel() }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-[4px] hover:bg-destructive/10 transition-colors text-sm"
              >
                <Icon name="delete" className="text-base" />
                Excluir
              </button>
            )}
          </div>
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Papel</p>
                <p className="text-sm text-foreground">{getRoleDisplayName(selectedUser.role as UserRole)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm text-foreground">
                  {selectedUser.enabled ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success">Ativo</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-danger/10 text-danger">Inativo</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm text-foreground">{selectedUser.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unidades</p>
                <p className="text-sm text-foreground">
                  {selectedUser.units.length === 0 ? '—' : selectedUser.units.map(u => u.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isMobile && (isCreating || (selectedUser && isEditing)) && (
        <Modal
          isOpen
          onClose={handleCloseSidePanel}
          title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          size="xl"
        >
          <UserFormPanel
            isEdit={isEditing}
            formData={formData}
            units={units}
            jobTitles={jobTitles}
            saving={saving}
            error={formError}
            onClose={handleCloseSidePanel}
            onSubmit={handleSubmit}
            onChange={handleFormChange}
            onToggleUnit={handleToggleFormUnit}
          />
        </Modal>
      )}

      {/* Unit Assignment Modal (always overlay) */}
      <Modal
        isOpen={!!assignUser}
        onClose={() => setAssignUser(null)}
        title={`Unidades — ${assignUser?.firstName} ${assignUser?.lastName}`}
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
