'use client'

import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import InspectionStatusBadge from './InspectionStatusBadge'
import type { InspectionDetail } from './types'

interface Props {
  inspection: InspectionDetail
  onClose: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onPrint?: (id: string) => void
  onSubmitForReview?: (id: string) => void
  onReturnToDraft?: (id: string) => void
  onFinalize?: (id: string) => void
  onReopen?: (id: string) => void
  onOpenExecution?: (id: string) => void
  canEdit?: boolean
  canDelete?: boolean
  canFinalize?: boolean
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('pt-BR')
}

const userName = (u: { firstName: string | null; lastName: string | null } | null | undefined) => {
  if (!u) return '-'
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-'
}

export default function InspectionDetailPanel({
  inspection,
  onClose,
  onEdit,
  onDelete,
  onPrint,
  onSubmitForReview,
  onReturnToDraft,
  onFinalize,
  onReopen,
  onOpenExecution,
  canEdit = false,
  canDelete = false,
  canFinalize = false,
}: Props) {
  const totalSteps = inspection.assets.reduce((acc, a) => acc + a.steps.length, 0)
  const answered = inspection.assets.reduce(
    (acc, a) => acc + a.steps.filter((s) => s.answer != null).length,
    0
  )
  const noks = inspection.assets.reduce(
    (acc, a) => acc + a.steps.filter((s) => s.answer === 'NOK').length,
    0
  )
  const generated = inspection.assets.reduce(
    (acc, a) => acc + a.steps.filter((s) => s.requestId).length,
    0
  )

  const isDraft = inspection.status === 'RASCUNHO'
  const isReview = inspection.status === 'EM_REVISAO'
  const isFinalized = inspection.status === 'FINALIZADO'
  const allAnswered = totalSteps > 0 && answered === totalSteps

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-gray-900">Inspeção #{inspection.number}</h2>
            <InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />
          </div>
          <p className="text-sm text-gray-600 truncate">{inspection.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors"
          aria-label="Fechar"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Identificacao */}
        <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
          <Icon name="info" className="text-base text-gray-700" />
          <h3 className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Identificação</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Vencimento</div>
            <div className="text-[13px] font-medium text-gray-900">{fmtDate(inspection.dueDate)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Atribuído a</div>
            <div className="text-[13px] font-medium text-gray-900">{userName(inspection.assignedTo)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Check List Padrão</div>
            <div className="text-[13px] font-medium text-gray-900">{inspection.checklistName}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Centro de Trabalho</div>
            <div className="text-[13px] font-medium text-gray-900">{inspection.workCenterName}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Tipo de Serviço</div>
            <div className="text-[13px] font-medium text-gray-900">{inspection.serviceTypeName}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Criado por</div>
            <div className="text-[13px] font-medium text-gray-900">
              {userName(inspection.createdBy)} em {fmtDateTime(inspection.createdAt)}
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
          <Icon name="bar_chart" className="text-base text-gray-700" />
          <h3 className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Resumo</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
          <div className="bg-white border border-gray-200 rounded-[4px] p-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Bens</div>
            <div className="text-xl font-black text-gray-900">{inspection.assets.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-[4px] p-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Etapas</div>
            <div className="text-xl font-black text-gray-900">
              {answered}/{totalSteps}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-[4px] p-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">NOKs</div>
            <div className="text-xl font-black text-gray-900">{noks}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-[4px] p-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">SSs geradas</div>
            <div className="text-xl font-black text-gray-900">{generated}</div>
          </div>
        </div>

        {/* Histórico do workflow */}
        {(inspection.submittedForReviewAt || inspection.finalizedAt || inspection.reopenedAt) && (
          <>
            <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
              <Icon name="history" className="text-base text-gray-700" />
              <h3 className="font-bold text-[12px] uppercase tracking-wider text-gray-900">Histórico</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 px-1 text-[12px]">
              {inspection.submittedForReviewAt && (
                <div className="text-gray-700">
                  <span className="font-bold">Enviado para revisão:</span>{' '}
                  {fmtDateTime(inspection.submittedForReviewAt)} por {userName(inspection.submittedForReviewBy)}
                </div>
              )}
              {inspection.finalizedAt && (
                <div className="text-gray-700">
                  <span className="font-bold">Finalizado:</span>{' '}
                  {fmtDateTime(inspection.finalizedAt)} por {userName(inspection.finalizedBy)}
                </div>
              )}
              {inspection.reopenedAt && (
                <div className="text-gray-700">
                  <span className="font-bold">Reaberto:</span>{' '}
                  {fmtDateTime(inspection.reopenedAt)} por {userName(inspection.reopenedBy)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
        {/* Acoes de workflow */}
        {(isDraft || isReview) && onOpenExecution && (
          <Button
            type="button"
            onClick={() => onOpenExecution(inspection.id)}
            className="w-full bg-gray-900 text-white hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Icon name="edit_note" />
            {isDraft ? 'Preencher respostas' : 'Revisar respostas'}
          </Button>
        )}
        {isDraft && allAnswered && onSubmitForReview && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onSubmitForReview(inspection.id)}
            className="w-full"
          >
            <Icon name="send" className="mr-2" />
            Enviar para revisão
          </Button>
        )}
        {isReview && canFinalize && onReturnToDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onReturnToDraft(inspection.id)}
            className="w-full"
          >
            <Icon name="undo" className="mr-2" />
            Devolver ao manutentor
          </Button>
        )}
        {isReview && canFinalize && onFinalize && (
          <Button
            type="button"
            onClick={() => onFinalize(inspection.id)}
            className="w-full bg-gray-900 text-white hover:bg-gray-800"
          >
            <Icon name="check_circle" className="mr-2" />
            Finalizar e gerar SSs
          </Button>
        )}
        {isFinalized && canFinalize && onReopen && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onReopen(inspection.id)}
            className="w-full"
          >
            <Icon name="lock_open" className="mr-2" />
            Reabrir inspeção
          </Button>
        )}

        {/* Acoes secundarias */}
        {onPrint && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onPrint(inspection.id)}
            className="w-full"
          >
            <Icon name="print" className="mr-2" />
            Imprimir
          </Button>
        )}

        {/* Acoes de gerenciamento */}
        {canEdit && onEdit && !isFinalized && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit(inspection.id)}
            className="w-full"
          >
            <Icon name="edit" className="mr-2" />
            Editar
          </Button>
        )}
        {canDelete && onDelete && !isFinalized && (
          <Button
            type="button"
            onClick={() => onDelete(inspection.id)}
            className="w-full bg-danger text-white hover:bg-danger/90"
          >
            <Icon name="delete" className="mr-2" />
            Excluir
          </Button>
        )}
      </div>
    </div>
  )
}
