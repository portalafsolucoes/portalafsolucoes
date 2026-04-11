'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface CompanyLogoCardProps {
  companyId?: string
  companyName?: string
  currentLogo?: string | null
  canEdit: boolean
}

export function CompanyLogoCard({
  companyId,
  companyName,
  currentLogo,
  canEdit,
}: CompanyLogoCardProps) {
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [logoSuccess, setLogoSuccess] = useState('')
  const [logo, setLogo] = useState(currentLogo || null)

  if (!canEdit) return null

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

      setLogo(data.logo)
      setLogoSuccess('Logo atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
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

      setLogo(null)
      setLogoSuccess('Logo removida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    } catch {
      setLogoError('Erro de conexão')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="image" className="text-xl" />
          Identidade da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Esta logo será exibida na barra lateral para todos os usuários da empresa{' '}
          <strong>{companyName}</strong>.
        </p>

        {logoError && (
          <div className="mb-4 rounded-[4px] bg-danger/10 p-3 text-sm text-danger">
            {logoError}
          </div>
        )}

        {logoSuccess && (
          <div className="mb-4 rounded-[4px] bg-success-light p-3 text-sm text-success">
            {logoSuccess}
          </div>
        )}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex-shrink-0">
            {logo ? (
              <div className="relative h-24 w-48 overflow-hidden rounded-[4px] bg-secondary">
                <Image
                  src={logo}
                  alt={companyName || 'Logo da empresa'}
                  fill
                  className="object-contain"
                  sizes="192px"
                />
              </div>
            ) : (
              <div className="flex h-24 w-48 flex-col items-center justify-center rounded-[4px] bg-secondary text-muted-foreground">
                <Icon name="image" className="mb-1 text-3xl" />
                <span className="text-xs">Sem logo</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Button
                  type="button"
                  disabled={uploadingLogo}
                  className="gap-2 pointer-events-none"
                >
                  <Icon name="upload" className="text-base" />
                  {uploadingLogo ? 'Enviando...' : logo ? 'Trocar Logo' : 'Enviar Logo'}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
              </div>

              {logo && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="gap-2 border-danger text-danger hover:bg-danger/10"
                >
                  <Icon name="delete" className="text-base" />
                  Remover
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP ou SVG. Máximo 2MB. Recomendado: fundo transparente e formato horizontal.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
