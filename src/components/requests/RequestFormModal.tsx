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
}

export function RequestFormModal({ isOpen, onClose, onSuccess, request }: RequestFormModalProps) {
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
    if (isOpen) {
      loadTeams()
      if (request) {
        // Modo edição
        setFormData({
          title: request.title || '',
          description: request.description || '',
          priority: request.priority || 'NONE',
          dueDate: request.dueDate ? new Date(request.dueDate).toISOString().split('T')[0] : '',
          teamId: request.teamId || ''
        })
        setFiles(request.files || [])
      } else {
        // Modo criação
        resetForm()
      }
    }
  }, [isOpen, request])

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 md:pb-4 border-b px-4 md:px-6 pt-4">
          <h2 className="text-lg md:text-2xl font-bold text-foreground">
            {request ? 'Editar' : 'Nova'} Solicitação de Serviço (SC)
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors"
            disabled={loading}
          >
            <Icon name="close" className="text-xl md:text-2xl text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-3 px-4">
          <ModalSection title="Solicitação">
            <Input
              label="Título *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Vazamento no banheiro"
            />

            <div>
              <label className="block text-sm md:text-base font-medium text-foreground mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Descreva detalhadamente o problema ou necessidade..."
              />
            </div>
          </ModalSection>

          <ModalSection title="Prioridade e Prazo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm md:text-base font-medium text-foreground mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="NONE">Nenhuma</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm md:text-base font-medium text-foreground mb-1">
                  Data Desejada (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Icon name="calendar_today" className="absolute right-3 top-2.5 text-xl text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Atribuição">
            <div>
              <label className="block text-sm md:text-base font-medium text-foreground mb-1">
                Atribuir a Equipe (Opcional)
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full px-3 py-2 text-sm md:text-base border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
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
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Salvando...' : request ? 'Atualizar' : 'Criar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
