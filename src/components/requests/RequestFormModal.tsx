'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FileUploader } from './FileUploader'
import { Icon } from '@/components/ui/Icon'

interface UploadedFile {
  name: string
  url: string
  size: number
  type: string
}

interface Team {
  id: string
  name: string
}

interface RequestFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  request?: any
  inPage?: boolean
}

export function RequestFormModal({ isOpen, onClose, onSuccess, request, inPage = false }: RequestFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'NONE',
    dueDate: '',
    teamId: ''
  })

  useEffect(() => {
    const shouldInit = inPage || isOpen
    if (shouldInit) {
      loadTeams()
      if (request) {
        setFormData({
          title: request.title || '',
          description: request.description || '',
          priority: request.priority || 'NONE',
          dueDate: request.dueDate ? new Date(request.dueDate).toISOString().split('T')[0] : '',
          teamId: request.teamId || ''
        })
        setFiles(request.files || [])
      } else {
        resetForm()
      }
    }
  }, [isOpen, request, inPage])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'NONE',
      dueDate: '',
      teamId: ''
    })
    setFiles([])
  }

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      setTeams(data.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = request ? `/api/requests/${request.id}` : '/api/requests'
      const method = request ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          files: files.map(f => ({
            name: f.name,
            url: f.url,
            size: f.size,
            type: f.type
          }))
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao salvar solicitação')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  const formFields = (
    <>
      <ModalSection title="Solicitação">
        <Input
          label="Título *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="Ex: Vazamento no banheiro"
        />

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Descreva detalhadamente o problema ou necessidade..."
          />
        </div>
      </ModalSection>

      <ModalSection title="Prioridade e Prazo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="NONE">Nenhuma</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Data Desejada (Opcional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Icon name="calendar_today" className="absolute right-3 top-2.5 text-xl text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </ModalSection>

      <ModalSection title="Atribuição">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Atribuir a Equipe (Opcional)
          </label>
          <select
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Nenhuma equipe</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            A equipe poderá aceitar ou recusar esta solicitação
          </p>
        </div>
      </ModalSection>

      <ModalSection title="Anexos">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          maxFiles={10}
        />
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        className="flex-1"
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {loading ? 'Salvando...' : request ? 'Salvar Alterações' : 'Salvar'}
      </Button>
    </div>
  )

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {request ? 'Editar Solicitação' : 'Nova Solicitação'}
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formFields}
          </div>
          {formFooter}
        </form>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={request ? 'Editar Solicitação de Serviço (SC)' : 'Nova Solicitação de Serviço (SC)'}
    >
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formFields}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
