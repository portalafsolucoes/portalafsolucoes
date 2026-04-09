'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface TeamMember {
  id: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface Request {
  id: string
  title: string
  team?: { id: string; name: string }
}

interface ApproveRequestModalProps {
  isOpen: boolean
  onClose: () => void
  request: Request | null
  onApprove: (assignedToId?: string) => void
  processing: boolean
}

export function ApproveRequestModal({
  isOpen,
  onClose,
  request,
  onApprove,
  processing
}: ApproveRequestModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedExecutor, setSelectedExecutor] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && request?.team?.id) {
      loadTeamMembers()
    }
  }, [isOpen, request])

  const loadTeamMembers = async () => {
    if (!request?.team?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${request.team.id}/members`)
      const data = await res.json()
      
      if (res.ok) {
        setTeamMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    onApprove(selectedExecutor || undefined)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aprovar Solicitação">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {request?.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Ao aprovar, uma Ordem de Serviço será criada automaticamente.
          </p>
        </div>

        {request?.team && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <Icon name="person" className="inline text-base mr-1" />
              Atribuir Executante (Opcional)
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Selecione um membro da equipe {request.team.name} para executar esta OS
            </p>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
              </div>
            ) : (
              <select
                value={selectedExecutor}
                onChange={(e) => setSelectedExecutor(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um executante...</option>
                {teamMembers.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.firstName} {member.user.lastName} ({member.user.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex gap-3 px-4 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing}
            className="flex-1"
          >
            {processing ? 'Aprovando...' : 'Aprovar e Criar OS'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
