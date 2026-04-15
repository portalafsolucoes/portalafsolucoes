'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { AdaptiveSplitPanel } from '@/components/layout/AdaptiveSplitPanel'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  logo: string | null
  createdAt: string
  userCount: number
  moduleCount: number
}

interface PortalStats {
  companies: number
  users: number
  usersActive: number
  units: number
  workOrders: number
  workOrdersOpen: number
  assets: number
  requests: number
}

interface ModuleConfig {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  order: number
  enabled: boolean
}

type CompanySortField = 'name' | 'contact' | 'userCount' | 'moduleCount' | 'createdAt'
type CompanySortDirection = 'asc' | 'desc'

// ─── Company Detail Panel ───────────────────────────────────────────────────

interface CompanyDetailPanelProps {
  company: Company
  onClose: () => void
  onEdit: () => void
  onDelete: (company: Company) => void
  onManageLogo: (company: Company) => void
  onManageModules: (company: Company) => void
}

function CompanyDetailPanel({
  company,
  onClose,
  onEdit,
  onDelete,
  onManageLogo,
  onManageModules,
}: CompanyDetailPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
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
            onClick={() => onManageLogo(company)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-[4px] hover:bg-muted transition-colors text-sm text-foreground"
          >
            <Icon name="image" className="text-base" />
            Gerenciar Logo
          </button>
          <button
            onClick={() => onManageModules(company)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-[4px] hover:bg-muted transition-colors text-sm text-foreground"
          >
            <Icon name="extension" className="text-base" />
            Configurar Módulos
          </button>
          <button
            onClick={() => onDelete(company)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-danger/90 transition-colors"
          >
            <Icon name="delete" className="text-base" />
            Excluir
          </button>
        </div>

        {/* Logo */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Logo</h3>
          <div className="flex items-center gap-3">
            {company.logo ? (
              <div className="relative w-24 h-12 rounded-[4px] overflow-hidden bg-secondary flex-shrink-0">
                <Image
                  src={company.logo}
                  alt={company.name}
                  fill
                  className="object-contain"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="w-24 h-12 rounded-[4px] bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon name="image" className="text-2xl text-muted-foreground" />
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {company.logo ? 'Logo configurada' : 'Sem logo'}
            </span>
          </div>
        </div>

        {/* Data */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="text-sm text-foreground">{company.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="text-sm text-foreground">{company.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Website</p>
              <p className="text-sm text-foreground">{company.website || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criada em</p>
              <p className="text-sm text-foreground">
                {new Date(company.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuários</p>
              <p className="text-sm text-foreground">{company.userCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Módulos ativos</p>
              <p className="text-sm text-foreground">{company.moduleCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Company Form Panel / Modal ──────────────────────────────────────────────

interface CompanyFormData {
  companyName: string
  companyEmail: string
  companyPhone: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}

interface CompanyFormPanelProps {
  inPage?: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  formData: CompanyFormData
  onChange: (field: keyof CompanyFormData, value: string) => void
  saving: boolean
  error: string
  isEdit?: boolean
}

function CompanyFormPanel({
  inPage,
  onClose,
  onSubmit,
  formData,
  onChange,
  saving,
  error,
  isEdit,
}: CompanyFormPanelProps) {
  const formContent = (
    <form onSubmit={onSubmit} className={inPage ? 'flex flex-1 min-h-0 flex-col' : undefined}>
      <div className={inPage ? 'flex-1 overflow-y-auto p-4 space-y-3' : 'p-4 space-y-3'}>
        {error && (
          <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
            {error}
          </div>
        )}

        <ModalSection title="Dados da Empresa">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Nome da Empresa <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => onChange('companyName', e.target.value)}
                required
                placeholder="Ex: Acme Ltda"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                E-mail da Empresa
              </label>
              <input
                type="email"
                value={formData.companyEmail}
                onChange={(e) => onChange('companyEmail', e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={formData.companyPhone}
                onChange={(e) => onChange('companyPhone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </ModalSection>

        {!isEdit && (
          <ModalSection title="Administrador Inicial">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.adminFirstName}
                  onChange={(e) => onChange('adminFirstName', e.target.value)}
                  required={!isEdit}
                  placeholder="Nome"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Sobrenome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.adminLastName}
                  onChange={(e) => onChange('adminLastName', e.target.value)}
                  required={!isEdit}
                  placeholder="Sobrenome"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  E-mail do Admin <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => onChange('adminEmail', e.target.value)}
                  required={!isEdit}
                  placeholder="admin@empresa.com"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Senha <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => onChange('adminPassword', e.target.value)}
                  required={!isEdit}
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </ModalSection>
        )}
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
            {isEdit ? 'Editar Empresa' : 'Nova Empresa'}
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminPortalPage() {
  const { role, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Sort state
  const [sortField, setSortField] = useState<CompanySortField>('name')
  const [sortDirection, setSortDirection] = useState<CompanySortDirection>('asc')

  // Split-panel state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const showSidePanel = !!(selectedCompany !== null || isCreating)

  // Company form
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [createForm, setCreateForm] = useState<CompanyFormData>({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  })

  // Modules modal
  const [modulesCompany, setModulesCompany] = useState<Company | null>(null)
  const [modules, setModules] = useState<ModuleConfig[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [savingModules, setSavingModules] = useState(false)

  // Logo modal
  const [logoCompany, setLogoCompany] = useState<Company | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Delete confirmation
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [authLoading, role, router])

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch {
      console.error('Error loading companies')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const res = await fetch('/api/admin/portal/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      console.error('Error loading stats')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      fetchCompanies()
      fetchStats()
    }
  }, [role, fetchCompanies, fetchStats])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedCompany(null)
    setIsEditing(false)
    setFormError('')
    setCreateForm({
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
    })
    setIsCreating(true)
  }

  const handleSelectCompany = (company: Company) => {
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
    setSelectedCompany(company)
  }

  const handleEditOpen = () => {
    if (!selectedCompany) return
    setCreateForm({
      companyName: selectedCompany.name,
      companyEmail: selectedCompany.email || '',
      companyPhone: selectedCompany.phone || '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
    })
    setFormError('')
    setIsEditing(true)
    setIsCreating(false)
  }

  const handleCloseSidePanel = () => {
    setSelectedCompany(null)
    setIsCreating(false)
    setIsEditing(false)
    setFormError('')
  }

  const handleFormChange = (field: keyof CompanyFormData, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }

  // Create company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!createForm.companyName.trim() || !createForm.adminEmail.trim() ||
        !createForm.adminFirstName.trim() || !createForm.adminLastName.trim() ||
        !createForm.adminPassword.trim()) {
      setFormError('Preencha todos os campos obrigatórios')
      return
    }

    if (createForm.adminPassword.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Erro ao criar empresa')
        return
      }

      setIsCreating(false)
      fetchCompanies()
      fetchStats()
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  // Edit company (only name/email/phone)
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    setFormError('')

    if (!createForm.companyName.trim()) {
      setFormError('Nome da empresa é obrigatório')
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/admin/companies/${selectedCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.companyName,
          email: createForm.companyEmail || null,
          phone: createForm.companyPhone || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Erro ao atualizar empresa')
        return
      }

      // Refresh and update selected company
      await fetchCompanies()
      const updated = { ...selectedCompany, name: createForm.companyName, email: createForm.companyEmail || null, phone: createForm.companyPhone || null }
      setSelectedCompany(updated)
      setIsEditing(false)
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  // Delete company
  const handleDeleteCompany = async () => {
    if (!deleteCompany) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/admin/companies/${deleteCompany.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir empresa')
        return
      }
      setDeleteCompany(null)
      if (selectedCompany?.id === deleteCompany.id) setSelectedCompany(null)
      fetchCompanies()
      fetchStats()
    } catch {
      alert('Erro de conexão')
    } finally {
      setDeleting(false)
    }
  }

  // Modules
  const openModules = async (company: Company) => {
    setModulesCompany(company)
    setModulesLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/modules`)
      if (res.ok) {
        const data = await res.json()
        setModules(data)
      }
    } catch {
      console.error('Error loading modules')
    } finally {
      setModulesLoading(false)
    }
  }

  const toggleModule = (slug: string) => {
    setModules(prev =>
      prev.map(m => m.slug === slug ? { ...m, enabled: !m.enabled } : m)
    )
  }

  const saveModules = async () => {
    if (!modulesCompany) return
    try {
      setSavingModules(true)
      const res = await fetch(`/api/admin/companies/${modulesCompany.id}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: modules.map(m => ({ slug: m.slug, enabled: m.enabled })),
        }),
      })

      if (!res.ok) {
        throw new Error('Falha ao salvar módulos')
      }

      if (modulesCompany.id === user?.companyId) {
        await queryClient.invalidateQueries({ queryKey: ['company-modules'] })
      }

      setModulesCompany(null)
      fetchCompanies()
    } catch {
      console.error('Error saving modules')
    } finally {
      setSavingModules(false)
    }
  }

  // Logo Upload
  const openLogoModal = (company: Company) => {
    setLogoCompany(company)
    setLogoError('')
    setLogoPreview(company.logo)
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !logoCompany) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Use JPG, PNG, WebP ou SVG')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('A logo deve ter no máximo 2MB')
      return
    }

    setLogoError('')
    setUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`/api/admin/companies/${logoCompany.id}/logo`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setLogoError(data.error || 'Erro ao enviar logo')
        return
      }

      setLogoPreview(data.logo)
      setCompanies(prev =>
        prev.map(c => c.id === logoCompany.id ? { ...c, logo: data.logo } : c)
      )
      setLogoCompany(prev => prev ? { ...prev, logo: data.logo } : null)
      if (selectedCompany?.id === logoCompany.id) {
        setSelectedCompany(prev => prev ? { ...prev, logo: data.logo } : null)
      }
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!logoCompany) return
    setUploadingLogo(true)
    setLogoError('')

    try {
      const res = await fetch(`/api/admin/companies/${logoCompany.id}/logo`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setLogoError(data.error || 'Erro ao remover logo')
        return
      }

      setLogoPreview(null)
      setCompanies(prev =>
        prev.map(c => c.id === logoCompany.id ? { ...c, logo: null } : c)
      )
      setLogoCompany(prev => prev ? { ...prev, logo: null } : null)
      if (selectedCompany?.id === logoCompany.id) {
        setSelectedCompany(prev => prev ? { ...prev, logo: null } : null)
      }
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSort = (field: CompanySortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const renderSortIcon = (field: CompanySortField) => {
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

  const sortedCompanies = [...companies].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * modifier
      case 'contact':
        return (a.email || '').localeCompare(b.email || '') * modifier
      case 'userCount':
        return (a.userCount - b.userCount) * modifier
      case 'moduleCount':
        return (a.moduleCount - b.moduleCount) * modifier
      case 'createdAt':
        return a.createdAt.localeCompare(b.createdAt) * modifier
      default:
        return 0
    }
  })

  if (authLoading) return null

  const statCards = stats ? [
    { label: 'Empresas', value: stats.companies, icon: 'domain', color: 'text-blue-600 bg-blue-100' },
    { label: 'Usuários Ativos', value: `${stats.usersActive}/${stats.users}`, icon: 'group', color: 'text-green-600 bg-green-100' },
    { label: 'Unidades', value: stats.units, icon: 'apartment', color: 'text-purple-600 bg-purple-100' },
    { label: 'Ativos', value: stats.assets, icon: 'inventory_2', color: 'text-amber-600 bg-amber-100' },
    { label: 'Ordens de Serviço', value: stats.workOrders, icon: 'construction', color: 'text-red-600 bg-red-100' },
    { label: 'OS em Aberto', value: stats.workOrdersOpen, icon: 'pending_actions', color: 'text-orange-600 bg-orange-100' },
    { label: 'Solicitações', value: stats.requests, icon: 'assignment', color: 'text-teal-600 bg-teal-100' },
  ] : []

  // Determine what the right panel shows
  const showEditForm = isCreating || (selectedCompany !== null && isEditing)
  const showDetailPanel = selectedCompany !== null && !isEditing && !isCreating

  const activePanel = showEditForm ? (
    <CompanyFormPanel
      inPage
      isEdit={isEditing}
      onClose={handleCloseSidePanel}
      onSubmit={isEditing ? handleEditCompany : handleCreateCompany}
      formData={createForm}
      onChange={handleFormChange}
      saving={saving}
      error={formError}
    />
  ) : showDetailPanel && selectedCompany ? (
    <CompanyDetailPanel
      company={selectedCompany}
      onClose={handleCloseSidePanel}
      onEdit={handleEditOpen}
      onDelete={(c) => setDeleteCompany(c)}
      onManageLogo={openLogoModal}
      onManageModules={openModules}
    />
  ) : null

  const listContent = (
    <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-card rounded-[4px] ambient-shadow p-4 animate-pulse">
              <div className="h-10 bg-secondary rounded" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-card rounded-[4px] ambient-shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center ${card.color}`}>
                  <Icon name={card.icon} className="text-lg" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table section heading */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Empresas Cadastradas</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
          <Icon name="domain" className="text-6xl text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma empresa cadastrada</h3>
          <p className="text-muted-foreground mb-4">Adicione a primeira empresa para começar.</p>
          <Button onClick={openCreate} className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
            <Icon name="add" className="mr-1 text-base" />
            Nova Empresa
          </Button>
        </div>
      ) : (
        <div className="h-full flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1">
                      <span>Empresa</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('contact')} className="flex items-center gap-1">
                      <span>Contato</span>
                      {renderSortIcon('contact')}
                    </button>
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('userCount')} className="flex items-center gap-1 mx-auto">
                      <span>Usuários</span>
                      {renderSortIcon('userCount')}
                    </button>
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('moduleCount')} className="flex items-center gap-1 mx-auto">
                      <span>Módulos</span>
                      {renderSortIcon('moduleCount')}
                    </button>
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('createdAt')} className="flex items-center gap-1 mx-auto">
                      <span>Criada em</span>
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-100">
                {sortedCompanies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className={`odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors ${selectedCompany?.id === company.id ? 'bg-secondary' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          <div className="relative w-10 h-10 rounded-[4px] overflow-hidden flex-shrink-0 bg-secondary">
                            <Image
                              src={company.logo}
                              alt={company.name}
                              fill
                              className="object-contain"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-[4px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon name="domain" className="text-xl text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{company.name}</div>
                          {company.website && (
                            <div className="text-xs text-muted-foreground">{company.website}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div>{company.email || '—'}</div>
                      <div className="text-xs text-muted-foreground">{company.phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-foreground">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-[4px] text-sm font-medium text-foreground">
                        <Icon name="group" className="text-base text-muted-foreground" />
                        {company.userCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-foreground">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-[4px] text-sm font-medium text-foreground">
                        <Icon name="extension" className="text-base text-muted-foreground" />
                        {company.moduleCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
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

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
        <PageHeader
          title="Administração do Portal"
          description="Gerencie empresas, módulos e visualize estatísticas globais"
          className="mb-0"
          actions={
            <Button onClick={openCreate} size="sm" className="bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md">
              <Icon name="add" className="text-base" />
              <span className="hidden sm:inline ml-1">Nova Empresa</span>
            </Button>
          }
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
          <AdaptiveSplitPanel
            list={listContent}
            panel={activePanel}
            showPanel={showSidePanel}
            panelTitle="Empresa"
            onClosePanel={handleCloseSidePanel}
          />
        </div>
      </div>

      {/* Logo Upload Modal (always overlay) */}
      <Modal
        isOpen={!!logoCompany}
        onClose={() => { setLogoCompany(null); setLogoPreview(null); setLogoError('') }}
        title={`Logo — ${logoCompany?.name || ''}`}
        size="sm"
      >
        <div className="p-4 space-y-3">
          {logoError && (
            <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
              {logoError}
            </div>
          )}

          <ModalSection title="Logo Atual">
            <div className="space-y-4">
              <div className="flex justify-center">
                {logoPreview ? (
                  <div className="relative w-48 h-24 bg-secondary rounded-[4px] overflow-hidden">
                    <Image
                      src={logoPreview}
                      alt={logoCompany?.name || 'Logo'}
                      fill
                      className="object-contain"
                      sizes="192px"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-24 bg-secondary rounded-[4px] flex flex-col items-center justify-center text-muted-foreground">
                    <Icon name="image" className="text-3xl mb-1" />
                    <span className="text-xs">Sem logo</span>
                  </div>
                )}
              </div>
              {logoPreview && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="w-full"
                >
                  <Icon name="delete" className="text-base mr-2" />
                  Remover Logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG, WebP ou SVG. Máximo 2MB.
              </p>
            </div>
          </ModalSection>
        </div>

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setLogoCompany(null); setLogoPreview(null); setLogoError('') }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <div className="relative flex-1">
            <Button
              type="button"
              disabled={uploadingLogo}
              className="w-full pointer-events-none"
            >
              <Icon name="upload" className="text-base mr-2" />
              {uploadingLogo ? 'Enviando...' : logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
            </Button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoFileChange}
              disabled={uploadingLogo}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </Modal>

      {/* Modules Config Modal (always overlay) */}
      <Modal
        isOpen={!!modulesCompany}
        onClose={() => setModulesCompany(null)}
        title={`Módulos — ${modulesCompany?.name || ''}`}
        size="md"
      >
        <div className="p-4 space-y-3">
          {modulesLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                <p className="mt-2 text-muted-foreground">Carregando...</p>
              </div>
            </div>
          ) : (
            <ModalSection title="Módulos Disponíveis">
              <p className="text-sm text-muted-foreground mb-4">
                Ative ou desative os módulos disponíveis para esta empresa.
              </p>
              <div className="space-y-2">
                {modules.map((mod) => (
                  <label
                    key={mod.slug}
                    className="flex items-center justify-between p-3 rounded-[4px] hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {mod.icon && (
                        <Icon name={mod.icon} className="text-xl text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">{mod.name}</div>
                        {mod.description && (
                          <div className="text-xs text-muted-foreground">{mod.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.slug)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        mod.enabled ? 'bg-primary' : 'bg-on-surface-variant/30'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          mod.enabled ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {modules.filter(m => m.enabled).length} de {modules.length} módulos ativos
              </p>
            </ModalSection>
          )}
        </div>

        {!modulesLoading && (
          <div className="flex gap-3 px-4 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setModulesCompany(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={saveModules} disabled={savingModules} className="flex-1">
              <Icon name="save" className="text-base mr-2" />
              {savingModules ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCompany}
        onClose={() => setDeleteCompany(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-4">
          <p className="text-foreground mb-2">
            Tem certeza que deseja excluir a empresa:
          </p>
          <p className="font-semibold text-foreground mb-4">{deleteCompany?.name}</p>
          <p className="text-sm text-muted-foreground mb-6">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button variant="outline" onClick={() => setDeleteCompany(null)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteCompany} disabled={deleting} className="flex-1">
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
