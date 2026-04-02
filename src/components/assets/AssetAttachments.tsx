'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Paperclip, Upload, Trash2, Download, Search, Filter, X,
  BookOpen, FileCode, FileSpreadsheet, PenTool, Camera, Video,
  Award, Shield, ClipboardList, FileText, ClipboardCheck, ListOrdered,
  Lightbulb, AlertTriangle, File, Loader2, Eye, Plus, ChevronDown,
  Calendar, Tag, ExternalLink
} from 'lucide-react'

interface AssetAttachment {
  id: string
  name: string
  description: string | null
  category: string
  url: string
  mimeType: string | null
  size: number | null
  version: string | null
  tags: string[]
  isPublic: boolean
  expiresAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  assetId: string
  uploadedById: string | null
}

interface AssetAttachmentsProps {
  assetId: string
  assetName?: string
  readOnly?: boolean
}

// Category configuration
const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  MANUAL: { icon: BookOpen, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Manual' },
  TECHNICAL_DOCUMENT: { icon: FileCode, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Documento Técnico' },
  DATASHEET: { icon: FileSpreadsheet, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Folha de Dados' },
  DRAWING: { icon: PenTool, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Desenho Técnico' },
  PHOTO: { icon: Camera, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Foto' },
  VIDEO: { icon: Video, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Vídeo' },
  CERTIFICATE: { icon: Award, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Certificado' },
  WARRANTY: { icon: Shield, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Garantia' },
  WORK_ORDER_DOC: { icon: ClipboardList, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Documento de OS' },
  MAINTENANCE_REPORT: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Relatório de Manutenção' },
  INSPECTION_REPORT: { icon: ClipboardCheck, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Relatório de Inspeção' },
  TIP: { icon: Lightbulb, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Dica' },
  PROCEDURE: { icon: ListOrdered, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Procedimento' },
  SAFETY: { icon: AlertTriangle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Segurança' },
  OTHER: { icon: File, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Outro' }
}

const categoryOptions = Object.entries(categoryConfig).map(([value, config]) => ({
  value,
  label: config.label,
  icon: config.icon
}))

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AssetAttachments({ assetId, assetName, readOnly = false }: AssetAttachmentsProps) {
  const [attachments, setAttachments] = useState<AssetAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<AssetAttachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    version: '',
    tags: '',
    expiresAt: '',
    isPublic: false,
    file: null as File | null
  })

  const fetchAttachments = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'all') {
        params.append('category', filterCategory)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/assets/${assetId}/attachments?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar anexos')
      }
      const result = await response.json()
      setAttachments(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (assetId) {
      fetchAttachments()
    }
  }, [assetId, filterCategory, searchQuery])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '')
      }))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file && !uploadForm.name) {
      setError('Nome ou arquivo é obrigatório')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', uploadForm.name)
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)
      formData.append('version', uploadForm.version)
      formData.append('tags', uploadForm.tags)
      formData.append('isPublic', uploadForm.isPublic.toString())
      if (uploadForm.expiresAt) {
        formData.append('expiresAt', uploadForm.expiresAt)
      }
      if (uploadForm.file) {
        formData.append('file', uploadForm.file)
      }

      const response = await fetch(`/api/assets/${assetId}/attachments`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      // Reset form and refresh
      setUploadForm({
        name: '',
        description: '',
        category: 'OTHER',
        version: '',
        tags: '',
        expiresAt: '',
        isPublic: false,
        file: null
      })
      setShowUploadModal(false)
      fetchAttachments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) {
      return
    }

    try {
      const response = await fetch(`/api/assets/${assetId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir anexo')
      }

      fetchAttachments()
      setSelectedAttachment(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const filteredAttachments = attachments.filter(attachment => {
    if (filterCategory !== 'all' && attachment.category !== filterCategory) {
      return false
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return (
        attachment.name.toLowerCase().includes(searchLower) ||
        attachment.description?.toLowerCase().includes(searchLower) ||
        attachment.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  // Group by category for display
  const groupedByCategory: Record<string, AssetAttachment[]> = {}
  filteredAttachments.forEach(attachment => {
    if (!groupedByCategory[attachment.category]) {
      groupedByCategory[attachment.category] = []
    }
    groupedByCategory[attachment.category].push(attachment)
  })

  const getCategoryConfig = (category: string) => {
    return categoryConfig[category] || categoryConfig.OTHER
  }

  if (loading && attachments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-600">Carregando anexos...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Anexos e Documentos
            </h3>
            <span className="text-sm text-gray-500">
              ({attachments.length})
            </span>
          </div>
          {!readOnly && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar Anexo
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar anexos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="all">Todas as Categorias</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4 inline" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-12">
            <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery || filterCategory !== 'all'
                ? 'Nenhum anexo encontrado com os filtros aplicados'
                : 'Nenhum anexo adicionado'
              }
            </p>
            {!readOnly && !searchQuery && filterCategory === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Adicionar primeiro anexo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, categoryAttachments]) => {
              const config = getCategoryConfig(category)
              const Icon = config.icon

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <h4 className="font-medium text-gray-900">{config.label}</h4>
                    <span className="text-sm text-gray-500">
                      ({categoryAttachments.length})
                    </span>
                  </div>

                  {/* Attachments Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryAttachments.map(attachment => {
                      const isImage = attachment.mimeType?.startsWith('image/')
                      const isPDF = attachment.mimeType === 'application/pdf'

                      return (
                        <div
                          key={attachment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => setSelectedAttachment(attachment)}
                        >
                          {/* Preview or Icon */}
                          <div className="mb-3">
                            {isImage ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-24 object-cover rounded"
                              />
                            ) : (
                              <div className={`w-full h-24 rounded flex items-center justify-center ${config.bgColor}`}>
                                <Icon className={`h-10 w-10 ${config.color}`} />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <h5 className="font-medium text-gray-900 truncate" title={attachment.name}>
                            {attachment.name}
                          </h5>
                          {attachment.version && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Versão: {attachment.version}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{formatFileSize(attachment.size)}</span>
                            <span>•</span>
                            <span>{format(new Date(attachment.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>

                          {/* Tags */}
                          {attachment.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {attachment.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {attachment.tags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{attachment.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Expiration Warning */}
                          {attachment.expiresAt && new Date(attachment.expiresAt) <= new Date() && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                              <AlertTriangle className="h-3 w-3" />
                              Expirado
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Adicionar Anexo</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors"
                >
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-8 w-8 text-gray-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Clique para selecionar ou arraste um arquivo
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Nome do documento"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Descrição do documento..."
                />
              </div>

              {/* Version & Tags Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    placeholder="ex: 1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Expiração
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiresAt}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="ex: elétrica, motor, bomba"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.name}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Detail Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                {selectedAttachment.name}
              </h3>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              {selectedAttachment.mimeType?.startsWith('image/') ? (
                <img
                  src={selectedAttachment.url}
                  alt={selectedAttachment.name}
                  className="w-full max-h-96 object-contain rounded-lg bg-gray-100 mb-6"
                />
              ) : (
                <div className={`w-full h-48 rounded-lg flex items-center justify-center mb-6 ${getCategoryConfig(selectedAttachment.category).bgColor}`}>
                  {(() => {
                    const Icon = getCategoryConfig(selectedAttachment.category).icon
                    return <Icon className={`h-16 w-16 ${getCategoryConfig(selectedAttachment.category).color}`} />
                  })()}
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Categoria</label>
                    <p className="font-medium text-gray-900">
                      {getCategoryConfig(selectedAttachment.category).label}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Tamanho</label>
                    <p className="font-medium text-gray-900">
                      {formatFileSize(selectedAttachment.size)}
                    </p>
                  </div>
                  {selectedAttachment.version && (
                    <div>
                      <label className="text-sm text-gray-500">Versão</label>
                      <p className="font-medium text-gray-900">{selectedAttachment.version}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">Adicionado em</label>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedAttachment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedAttachment.description && (
                  <div>
                    <label className="text-sm text-gray-500">Descrição</label>
                    <p className="text-gray-900 mt-1">{selectedAttachment.description}</p>
                  </div>
                )}

                {selectedAttachment.tags.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedAttachment.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAttachment.expiresAt && (
                  <div>
                    <label className="text-sm text-gray-500">Expira em</label>
                    <p className={`font-medium ${
                      new Date(selectedAttachment.expiresAt) <= new Date()
                        ? 'text-gray-600'
                        : 'text-gray-900'
                    }`}>
                      {format(new Date(selectedAttachment.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                      {new Date(selectedAttachment.expiresAt) <= new Date() && ' (Expirado)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                <div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDelete(selectedAttachment.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <a
                    href={selectedAttachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </a>
                  <a
                    href={selectedAttachment.url}
                    download={selectedAttachment.name}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
