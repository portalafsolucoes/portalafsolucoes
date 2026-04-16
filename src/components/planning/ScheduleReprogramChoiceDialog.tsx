'use client'

import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

type ReprogramMode = 'reset' | 'preserve'

interface ScheduleReprogramChoiceDialogProps {
  isOpen: boolean
  onClose: () => void
  onChoose: (mode: ReprogramMode) => void
  loading?: boolean
}

export function ScheduleReprogramChoiceDialog({
  isOpen, onClose, onChoose, loading = false,
}: ScheduleReprogramChoiceDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title="Reprogramar" size="md">
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Escolha como deseja continuar com esta programação confirmada:
        </p>

        {/* Opção 1: Reprogramar tudo */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onChoose('reset')}
          className="w-full text-left p-4 rounded-[4px] border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-[4px] bg-amber-100 flex items-center justify-center">
              <Icon name="refresh" className="text-xl text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900 mb-0.5">
                Reprogramar as OSs já programadas
              </p>
              <p className="text-xs text-amber-800">
                Reverte as OSs liberadas para pendente e abre a programação para refazer do zero.
                Use quando precisar redistribuir as OSs na agenda.
              </p>
            </div>
            <Icon name="chevron_right" className="text-base text-amber-700 flex-shrink-0" />
          </div>
        </button>

        {/* Opção 2: Editar mantendo */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onChoose('preserve')}
          className="w-full text-left p-4 rounded-[4px] border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-[4px] bg-blue-100 flex items-center justify-center">
              <Icon name="edit_calendar" className="text-xl text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-blue-900 mb-0.5">
                Editar OSs mantendo programação atual
              </p>
              <p className="text-xs text-blue-800">
                Abre a programação para edição sem alterar as OSs já liberadas.
                Use para adicionar novas OSs ou ajustar datas sem impactar o que já foi programado.
              </p>
            </div>
            <Icon name="chevron_right" className="text-base text-blue-700 flex-shrink-0" />
          </div>
        </button>
      </div>

      <div className="flex gap-3 px-4 py-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1 min-h-[44px]"
        >
          Cancelar
        </Button>
      </div>
    </Modal>
  )
}
