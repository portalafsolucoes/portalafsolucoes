'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminSettingsPage() {
  const { role, user, companyName, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [logoSuccess, setLogoSuccess] = useState('')
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [logoInitialized, setLogoInitialized] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Inicializar logo do user
  if (!logoInitialized && user?.company?.logo !== undefined) {
    setCurrentLogo(user.company.logo || null)
    setLogoInitialized(true)
  }

  if (authLoading) return null

  if (role !== 'GESTOR' && role !== 'SUPER_ADMIN') {
    router.push('/dashboard')
    return null
  }

  const companyId = user?.companyId

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Use JPG, PNG, WebP ou SVG')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('A logo deve ter no máximo 2MB')
      return
    }

    setLogoError('')
    setLogoSuccess('')
    setUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`/api/admin/companies/${companyId}/logo`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setLogoError(data.error || 'Erro ao enviar logo')
        return
      }

      setCurrentLogo(data.logo)
      setLogoSuccess('Logo atualizada com sucesso!')
      // Invalidar cache do auth para atualizar sidebar
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!companyId) return
    setUploadingLogo(true)
    setLogoError('')
    setLogoSuccess('')

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/logo`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setLogoError(data.error || 'Erro ao remover logo')
        return
      }

      setCurrentLogo(null)
      setLogoSuccess('Logo removida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <PageContainer variant="form">
      <PageHeader
        title="Configurações da Empresa"
        description="Gerencie a identidade visual e dados da sua empresa"
      />

      {/* Logo Section */}
      <div className="bg-card rounded-[4px] ambient-shadow p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">Logo da Empresa</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Esta logo será exibida na barra lateral para todos os usuários da empresa <strong>{companyName}</strong>.
        </p>

        {logoError && (
          <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm mb-4">
            {logoError}
          </div>
        )}

        {logoSuccess && (
          <div className="p-3 bg-green-50 text-green-700 rounded-[4px] text-sm mb-4">
            {logoSuccess}
          </div>
        )}

        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            {currentLogo ? (
              <div className="relative w-48 h-24 bg-secondary rounded-[4px] overflow-hidden">
                <Image
                  src={currentLogo}
                  alt={companyName || 'Logo'}
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

          {/* Controls */}
          <div className="flex flex-col gap-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />

            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-primary-graphite transition-colors disabled:opacity-50 text-sm"
            >
              <Icon name="upload" className="text-base" />
              {uploadingLogo ? 'Enviando...' : currentLogo ? 'Trocar Logo' : 'Enviar Logo'}
            </button>

            {currentLogo && (
              <button
                onClick={handleRemoveLogo}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 border border-danger text-danger rounded-[4px] hover:bg-danger/10 transition-colors disabled:opacity-50 text-sm"
              >
                <Icon name="delete" className="text-base" />
                Remover Logo
              </button>
            )}

            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP ou SVG. Máximo 2MB.<br />
              Recomendado: fundo transparente, proporção horizontal.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
