'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FileUpload } from '@/components/ui/FileUpload'

interface UploadedFile {
  name: string
  url: string
  size: number
  type: string
}

export default function NewAssetPage() {
  const router = useRouter()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const parentId = searchParams.get('parentId')
  
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [parentAsset, setParentAsset] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    barCode: '',
    acquisitionCost: '',
    area: '',
    locationId: '',
    categoryId: '',
    primaryUserId: '',
    parentAssetId: parentId || ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [locationsRes, usersRes, assetsRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/users'),
        fetch('/api/assets')
      ])

      const [locationsData, usersData, assetsData] = await Promise.all([
        locationsRes.json(),
        usersRes.json(),
        assetsRes.json()
      ])

      setLocations(locationsData.data || [])
      setUsers(usersData.data || [])
      setAssets(assetsData.data || [])

      // Se tiver parentId, buscar dados do ativo pai
      if (parentId) {
        const parentRes = await fetch(`/api/assets/${parentId}`)
        const parentData = await parentRes.json()
        setParentAsset(parentData.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        acquisitionCost: formData.acquisitionCost ? parseFloat(formData.acquisitionCost) : undefined,
        area: formData.area ? parseFloat(formData.area) : undefined,
        locationId: formData.locationId || undefined,
        categoryId: formData.categoryId || undefined,
        primaryUserId: formData.primaryUserId || undefined,
        parentAssetId: formData.parentAssetId || undefined,
        files: files.length > 0 ? files : undefined
      }

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        router.push('/assets')
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao criar ativo')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{parentAsset ? `Novo Subativo de ${parentAsset.name}` : 'Novo Ativo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {parentAsset && (
                <div className="bg-primary/5 border border-blue-200 rounded-[4px] p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Ativo Pai:</strong> {parentAsset.name}
                  </p>
                </div>
              )}

              <Input
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Código de Barras"
                  value={formData.barCode}
                  onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
                />

                <Input
                  label="Custo de Aquisição"
                  type="number"
                  step="0.01"
                  value={formData.acquisitionCost}
                  onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Área (m²)"
                  type="number"
                  step="0.01"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Localização
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione uma localização</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Responsável Principal
                </label>
                <select
                  value={formData.primaryUserId}
                  onChange={(e) => setFormData({ ...formData, primaryUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um usuário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {!parentId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ativo Pai (Opcional)
                  </label>
                  <select
                    value={formData.parentAssetId}
                    onChange={(e) => setFormData({ ...formData, parentAssetId: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Nenhum (Ativo Principal)</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecione um ativo pai para criar uma hierarquia
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Fotos e Arquivos
                </label>
                <FileUpload
                  onFilesUploaded={setFiles}
                  existingFiles={files}
                  maxFiles={20}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Adicione fotos, PDFs, planilhas e documentos relacionados ao ativo
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Ativo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
