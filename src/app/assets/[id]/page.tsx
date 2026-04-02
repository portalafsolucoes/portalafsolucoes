'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { FileUpload } from '@/components/ui/FileUpload'
import { Edit, Trash2, Plus, FileText, Download, History, Paperclip, FolderTree, GitBranch } from 'lucide-react'
import AssetTimeline from '@/components/assets/AssetTimelineEnhanced'
import AssetAttachments from '@/components/assets/AssetAttachments'
import { getStatusColor, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface UploadedFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  mimeType?: string
}

interface Asset {
  id: string
  name: string
  description?: string
  status: string
  barCode?: string
  acquisitionCost?: number
  area?: number
  location?: { id: string; name: string }
  category?: { name: string }
  primaryUser?: { firstName: string; lastName: string }
  parentAsset?: { id: string; name: string }
  childAssets?: Array<{ id: string; name: string; status: string }>
  files?: UploadedFile[]
  createdAt: string
  updatedAt: string
}

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    barCode: '',
    acquisitionCost: '',
    area: '',
    status: 'OPERATIONAL'
  })
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'history' | 'hierarchy'>('details')

  useEffect(() => {
    if (id) {
      loadAsset()
    }
  }, [id])

  const loadAsset = async () => {
    try {
      const res = await fetch(`/api/assets/${id}`)
      const data = await res.json()
      
      if (data.data) {
        setAsset(data.data)
        setFormData({
          name: data.data.name || '',
          description: data.data.description || '',
          barCode: data.data.barCode || '',
          acquisitionCost: data.data.acquisitionCost?.toString() || '',
          area: data.data.area?.toString() || '',
          status: data.data.status || 'OPERATIONAL'
        })
        setFiles(data.data.files || [])
      }
    } catch (error) {
      console.error('Error loading asset:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const payload = {
        ...formData,
        acquisitionCost: formData.acquisitionCost ? parseFloat(formData.acquisitionCost) : undefined,
        area: formData.area ? parseFloat(formData.area) : undefined
      }

      const res = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        await loadAsset()
        setEditing(false)
      } else {
        alert('Erro ao salvar ativo')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este ativo?')) return

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        router.push('/assets')
      } else {
        alert('Erro ao deletar ativo')
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Ativo não encontrado</p>
              <Button className="mt-4" onClick={() => router.push('/assets')}>
                Voltar para Ativos
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{asset.name}</h1>
              <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Criado em {formatDate(asset.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Link href={`/assets/new?parentId=${asset.id}`}>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Subativo
                  </Button>
                </Link>
                <Button variant="danger" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'details'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="inline-block h-4 w-4 mr-2" />
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'attachments'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Paperclip className="inline-block h-4 w-4 mr-2" />
              Anexos e Documentos
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="inline-block h-4 w-4 mr-2" />
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'hierarchy'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GitBranch className="inline-block h-4 w-4 mr-2" />
              Hierarquia
            </button>
          </nav>
        </div>

        {/* Conteúdo da aba Anexos */}
        {activeTab === 'attachments' && (
          <AssetAttachments assetId={id} assetName={asset.name} />
        )}

        {/* Conteúdo da aba Histórico */}
        {activeTab === 'history' && (
          <AssetTimeline assetId={id} assetName={asset.name} />
        )}

        {/* Conteúdo da aba Detalhes */}
        {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Ativo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <Input
                      label="Nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Código de Barras"
                        value={formData.barCode}
                        onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
                      />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="OPERATIONAL">Operacional</option>
                          <option value="DOWN">Inativo</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Custo de Aquisição"
                        type="number"
                        step="0.01"
                        value={formData.acquisitionCost}
                        onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                      />
                      <Input
                        label="Área (m²)"
                        type="number"
                        step="0.01"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {asset.description && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-1">Descrição</h4>
                        <p className="text-foreground">{asset.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {asset.barCode && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Código de Barras</h4>
                          <p className="text-foreground">{asset.barCode}</p>
                        </div>
                      )}
                      {asset.acquisitionCost && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Custo de Aquisição</h4>
                          <p className="text-foreground">{formatCurrency(asset.acquisitionCost)}</p>
                        </div>
                      )}
                      {asset.area && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Área</h4>
                          <p className="text-foreground">{asset.area} m²</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Arquivos e Fotos */}
            <Card>
              <CardHeader>
                <CardTitle>Fotos e Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                {files && files.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="border border-border rounded-lg p-3">
                        {file.mimeType?.startsWith('image/') || file.type?.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-gray-800 flex items-center gap-1 mt-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum arquivo anexado</p>
                )}
              </CardContent>
            </Card>

            {/* Subativos */}
            {asset.childAssets && asset.childAssets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Subativos ({asset.childAssets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {asset.childAssets.map((child) => (
                      <Link key={child.id} href={`/assets/${child.id}`}>
                        <div className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-secondary cursor-pointer">
                          <span className="font-medium text-foreground">{child.name}</span>
                          <Badge className={getStatusColor(child.status)}>{child.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Detalhes Rápidos */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset.location && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Localização</h4>
                    <p className="text-foreground">{asset.location.name}</p>
                  </div>
                )}
                {asset.category && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Categoria</h4>
                    <p className="text-foreground">{asset.category.name}</p>
                  </div>
                )}
                {asset.primaryUser && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Responsável</h4>
                    <p className="text-foreground">
                      {asset.primaryUser.firstName} {asset.primaryUser.lastName}
                    </p>
                  </div>
                )}
                {asset.parentAsset && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Ativo Pai</h4>
                    <Link href={`/assets/${asset.parentAsset.id}`}>
                      <p className="text-primary hover:text-gray-800">{asset.parentAsset.name}</p>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Conteúdo da aba Hierarquia */}
        {activeTab === 'hierarchy' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Hierarquia do Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Parent Asset Path */}
              {asset.parentAsset && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Ativo Pai</h4>
                  <Link href={`/assets/${asset.parentAsset.id}`}>
                    <div className="inline-flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary transition-colors">
                      <FolderTree className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-foreground">{asset.parentAsset.name}</span>
                      <Badge className="ml-2 bg-gray-100 text-gray-800">Pai</Badge>
                    </div>
                  </Link>
                </div>
              )}

              {/* Current Asset */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Ativo Atual</h4>
                <div className="inline-flex items-center gap-2 p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                  <FolderTree className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{asset.name}</span>
                  <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                </div>
              </div>

              {/* Child Assets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Subativos ({asset.childAssets?.length || 0})
                  </h4>
                  <Link href={`/assets/new?parentId=${asset.id}`}>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Subativo
                    </Button>
                  </Link>
                </div>
                
                {asset.childAssets && asset.childAssets.length > 0 ? (
                  <div className="space-y-2 ml-6 border-l-2 border-gray-200 pl-4">
                    {asset.childAssets.map((child) => (
                      <Link key={child.id} href={`/assets/${child.id}`}>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                          <div className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-foreground">{child.name}</span>
                          </div>
                          <Badge className={getStatusColor(child.status)}>{child.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <FolderTree className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum subativo cadastrado</p>
                    <Link href={`/assets/new?parentId=${asset.id}`}>
                      <Button variant="ghost" className="mt-2 text-gray-600 hover:text-gray-800">
                        Adicionar primeiro subativo
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Info about hierarchy */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sobre a Hierarquia</h4>
                <p className="text-sm text-gray-600">
                  A estrutura hierárquica permite organizar ativos em níveis ilimitados. 
                  Você pode criar subativos para representar componentes, partes ou equipamentos 
                  relacionados a este ativo principal.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
