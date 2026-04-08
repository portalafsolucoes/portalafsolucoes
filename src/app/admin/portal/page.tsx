'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
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

export default function AdminPortalPage() {
  const { role, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Create company modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createForm, setCreateForm] = useState({
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

  // --- Create Company ---
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!createForm.companyName.trim() || !createForm.adminEmail.trim() ||
        !createForm.adminFirstName.trim() || !createForm.adminLastName.trim() ||
        !createForm.adminPassword.trim()) {
      setCreateError('Preencha todos os campos obrigatórios')
      return
    }

    if (createForm.adminPassword.length < 8) {
      setCreateError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error || 'Erro ao criar empresa')
        return
      }

      setShowCreateModal(false)
      setCreateForm({
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
      })
      fetchCompanies()
      fetchStats()
    } catch {
      setCreateError('Erro de conexão')
    } finally {
      setCreating(false)
    }
  }

  // --- Modules ---
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
      await fetch(`/api/admin/companies/${modulesCompany.id}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: modules.map(m => ({ slug: m.slug, enabled: m.enabled })),
        }),
      })
      setModulesCompany(null)
      fetchCompanies()
    } catch {
      console.error('Error saving modules')
    } finally {
      setSavingModules(false)
    }
  }

  // --- Logo Upload ---
  const openLogoModal = (company: Company) => {
    setLogoCompany(company)
    setLogoError('')
    setLogoPreview(company.logo)
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !logoCompany) return

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Use JPG, PNG, WebP ou SVG')
      return
    }

    // Validar tamanho (2MB)
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
      // Atualizar a lista local
      setCompanies(prev =>
        prev.map(c => c.id === logoCompany.id ? { ...c, logo: data.logo } : c)
      )
      setLogoCompany(prev => prev ? { ...prev, logo: data.logo } : null)
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
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
    }
  }

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

  return (
    <PageContainer>
        <PageHeader
          title="Administração do Portal"
          description="Gerencie empresas, módulos e visualize estatísticas globais"
          actions={
            <button
              onClick={() => {
                setCreateError('')
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px] hover:bg-primary-graphite transition-colors"
            >
              <Icon name="add" className="text-xl" />
              Nova Empresa
            </button>
          }
        />

        {/* Stats Cards */}
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

        {/* Companies List */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Empresas Cadastradas</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
            <Icon name="domain" className="text-6xl text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma empresa cadastrada</h3>
            <p className="text-muted-foreground mb-4">Adicione a primeira empresa para começar.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-[4px]"
            >
              <Icon name="add" className="text-xl" />
              Nova Empresa
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-[4px] ambient-shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-on-surface-variant/10">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Usuários
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Módulos
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Criada em
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface-variant/10">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{company.email || '—'}</div>
                      <div className="text-xs text-muted-foreground">{company.phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-[4px] text-sm font-medium text-foreground">
                        <Icon name="group" className="text-base text-muted-foreground" />
                        {company.userCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-[4px] text-sm font-medium text-foreground">
                        <Icon name="extension" className="text-base text-muted-foreground" />
                        {company.moduleCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openLogoModal(company)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-[4px] transition-colors"
                          title="Gerenciar logo"
                        >
                          <Icon name="image" className="text-base" />
                          Logo
                        </button>
                        <button
                          onClick={() => openModules(company)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-[4px] transition-colors"
                          title="Configurar módulos"
                        >
                          <Icon name="extension" className="text-base" />
                          Módulos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {companies.length > 0 && (
          <div className="mt-4 text-center text-muted-foreground text-sm">
            {companies.length} empresa(s) cadastrada(s)
          </div>
        )}

      {/* Create Company Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Empresa"
        size="lg"
      >
        <form onSubmit={handleCreateCompany} className="p-6 space-y-6">
          {createError && (
            <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
              {createError}
            </div>
          )}

          {/* Dados da Empresa */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="domain" className="text-base" />
              Dados da Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nome da Empresa <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                  required
                  placeholder="Ex: Acme Ltda"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  E-mail da Empresa
                </label>
                <input
                  type="email"
                  value={createForm.companyEmail}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, companyEmail: e.target.value }))}
                  placeholder="contato@empresa.com"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={createForm.companyPhone}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, companyPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="h-px bg-on-surface-variant/10" />

          {/* Admin Inicial */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon name="admin_panel_settings" className="text-base" />
              Administrador Inicial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.adminFirstName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, adminFirstName: e.target.value }))}
                  required
                  placeholder="Nome"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Sobrenome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.adminLastName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, adminLastName: e.target.value }))}
                  required
                  placeholder="Sobrenome"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  E-mail do Admin <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                  required
                  placeholder="admin@empresa.com"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Senha <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.adminPassword}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2 border border-input rounded-[4px] focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-on-surface-variant/10">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-6 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
            >
              <Icon name="add" className="text-base" />
              {creating ? 'Criando...' : 'Criar Empresa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Logo Upload Modal */}
      <Modal
        isOpen={!!logoCompany}
        onClose={() => { setLogoCompany(null); setLogoPreview(null); setLogoError('') }}
        title={`Logo — ${logoCompany?.name || ''}`}
        size="sm"
      >
        <div className="p-6 space-y-4">
          {logoError && (
            <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">
              {logoError}
            </div>
          )}

          {/* Preview */}
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

          {/* Upload input (hidden) */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleLogoFileChange}
            className="hidden"
          />

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
            >
              <Icon name="upload" className="text-base" />
              {uploadingLogo ? 'Enviando...' : logoPreview ? 'Trocar Logo' : 'Enviar Logo'}
            </button>
            {logoPreview && (
              <button
                onClick={handleRemoveLogo}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 border border-danger text-danger rounded-[4px] hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                <Icon name="delete" className="text-base" />
                Remover
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG, WebP ou SVG. Máximo 2MB.
          </p>
        </div>
      </Modal>

      {/* Modules Config Modal */}
      <Modal
        isOpen={!!modulesCompany}
        onClose={() => setModulesCompany(null)}
        title={`Módulos — ${modulesCompany?.name || ''}`}
        size="md"
      >
        <div className="p-6">
          {modulesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Ative ou desative os módulos disponíveis para esta empresa.
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {modules.map((mod) => (
                  <label
                    key={mod.slug}
                    className="flex items-center justify-between p-3 rounded-[4px] hover:bg-secondary/50 transition-colors cursor-pointer"
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

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-on-surface-variant/10">
                <div className="text-sm text-muted-foreground">
                  {modules.filter(m => m.enabled).length} de {modules.length} módulos ativos
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModulesCompany(null)}
                    className="px-4 py-2 border border-input rounded-[4px] text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveModules}
                    disabled={savingModules}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50"
                  >
                    <Icon name="save" className="text-base" />
                    {savingModules ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </PageContainer>
  )
}
