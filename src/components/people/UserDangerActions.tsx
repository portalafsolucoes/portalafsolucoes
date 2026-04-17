'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

type ReferenceCounts = Record<string, number>

interface UserDangerActionsProps {
  userId: string
  userName: string
  status: UserStatus
  onAfterAction: () => void
}

const REFERENCE_LABELS: Record<string, string> = {
  workOrders: 'OS criadas',
  workOrdersAssigned: 'OS atribuidas',
  workOrdersCompleted: 'OS finalizadas',
  workOrderSchedules: 'Programacoes criadas',
  workOrderRescheduleEntries: 'Reprogramacoes registradas',
  workOrderResources: 'Mao de obra em OS',
  labors: 'Apontamentos de mao de obra',
  requestsCreated: 'SS criadas',
  requestsApproved: 'SS aprovadas',
  requestsAssigned: 'SS atribuidas',
  failureAnalysisReports: 'RAFs criadas',
  teamLed: 'Equipes lideradas',
  teamMemberships: 'Equipes participadas',
  primaryAssets: 'Ativos como responsavel',
  resources: 'Recursos cadastrados',
  standardTaskLabors: 'Mao de obra em planos padrao',
  assetTaskLabors: 'Mao de obra em planos por ativo',
}

export function UserDangerActions({ userId, userName, status, onAfterAction }: UserDangerActionsProps) {
  const [refs, setRefs] = useState<{ counts: ReferenceCounts; total: number; hasHistory: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'reactivate' | 'archive' | 'delete'>(null)
  const [archiveTyped, setArchiveTyped] = useState('')

  const fetchRefs = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/references`)
      const data = await res.json()
      if (data.data) setRefs(data.data)
    } catch (error) {
      console.error('Error loading references:', error)
    }
  }, [userId])

  useEffect(() => {
    void fetchRefs()
  }, [fetchRefs])

  const callAction = async (path: string, method: 'POST' | 'DELETE', body?: unknown) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Erro ao executar acao')
        return
      }
      setConfirm(null)
      setArchiveTyped('')
      onAfterAction()
    } catch (error) {
      console.error('Action error:', error)
      alert('Erro de rede ao executar acao')
    } finally {
      setLoading(false)
    }
  }

  const hasHistory = refs?.hasHistory ?? true

  const referenceList = refs
    ? Object.entries(refs.counts).filter(([, n]) => n > 0).map(([k, n]) => `${REFERENCE_LABELS[k] || k}: ${n}`)
    : []

  if (status === 'ARCHIVED') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <Icon name="shield_lock" className="text-base" />
          Usuario anonimizado
        </div>
        <p className="mt-1">As informacoes pessoais foram removidas para atender a LGPD. O historico operacional permanece preservado.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {status === 'ACTIVE' && (
          <button
            onClick={() => setConfirm('deactivate')}
            className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
          >
            <Icon name="person_off" className="text-base" />
            Desativar
          </button>
        )}

        {status === 'INACTIVE' && (
          <>
            <button
              onClick={() => setConfirm('reactivate')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
            >
              <Icon name="restart_alt" className="text-base" />
              Reativar
            </button>
            <button
              onClick={() => setConfirm('archive')}
              className="bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors"
            >
              <Icon name="shield_lock" className="text-base" />
              Anonimizar (LGPD)
            </button>
          </>
        )}

        {!hasHistory && (status === 'ACTIVE' || status === 'INACTIVE') && (
          <button
            onClick={() => setConfirm('delete')}
            className="bg-white hover:bg-gray-50 text-danger border border-danger/40 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] transition-colors text-sm"
          >
            <Icon name="delete_forever" className="text-base" />
            Excluir definitivamente
          </button>
        )}

        {hasHistory && refs && (
          <p className="text-[11px] text-muted-foreground px-1">
            Possui {refs.total} referencia(s) historica(s) — exclusao permanente bloqueada.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirm === 'deactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={() => callAction('/deactivate', 'POST')}
        title={`Desativar ${userName}?`}
        message="O usuario nao podera mais fazer login, mas o historico (OS, SS, RAF) sera preservado e seu nome continuara visivel em registros antigos. Voce pode reativar a qualquer momento."
        confirmText="Desativar"
        variant="danger"
        loading={loading}
      />

      <ConfirmDialog
        isOpen={confirm === 'reactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={() => callAction('/reactivate', 'POST')}
        title={`Reativar ${userName}?`}
        message="O usuario voltara a ter acesso ao sistema com as mesmas permissoes anteriores."
        confirmText="Reativar"
        variant="info"
        loading={loading}
      />

      <ConfirmDialog
        isOpen={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => callAction('', 'DELETE')}
        title={`Excluir definitivamente ${userName}?`}
        message="Como o usuario nao tem nenhum historico vinculado, ele pode ser removido permanentemente. Esta acao nao pode ser desfeita."
        confirmText="Excluir definitivamente"
        variant="danger"
        loading={loading}
      />

      {confirm === 'archive' && (
        <ArchiveConfirm
          userName={userName}
          referenceList={referenceList}
          loading={loading}
          archiveTyped={archiveTyped}
          setArchiveTyped={setArchiveTyped}
          onClose={() => { setConfirm(null); setArchiveTyped('') }}
          onConfirm={(reason) => callAction('/archive', 'POST', { reason })}
        />
      )}
    </>
  )
}

interface ArchiveConfirmProps {
  userName: string
  referenceList: string[]
  loading: boolean
  archiveTyped: string
  setArchiveTyped: (v: string) => void
  onClose: () => void
  onConfirm: (reason: string) => void
}

function ArchiveConfirm({ userName, referenceList, loading, archiveTyped, setArchiveTyped, onClose, onConfirm }: ArchiveConfirmProps) {
  const [reason, setReason] = useState('')
  const matches = archiveTyped.trim() === userName.trim()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Anonimizar {userName}?</h3>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
          <p>Esta acao remove as informacoes pessoais (nome, email, telefone, foto) do usuario para atender a LGPD. O <strong>historico operacional permanece preservado</strong>, mas o usuario aparecera como <em>&quot;Usuario Removido&quot;</em> em todos os registros antigos.</p>
          {referenceList.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[12px]">
              <p className="font-semibold text-amber-900 mb-1">Historico que sera mantido (anonimizado):</p>
              <ul className="list-disc pl-4 text-amber-900">
                {referenceList.slice(0, 6).map((line) => <li key={line}>{line}</li>)}
                {referenceList.length > 6 && <li>...e mais {referenceList.length - 6} categorias</li>}
              </ul>
            </div>
          )}
          <p className="text-danger font-semibold">Esta acao nao pode ser desfeita.</p>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Motivo (opcional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: solicitacao do titular, retencao expirada"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Para confirmar, digite o nome completo: <span className="text-gray-900">{userName}</span>
            </label>
            <input
              value={archiveTyped}
              onChange={(e) => setArchiveTyped(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-danger"
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-[4px] border border-gray-300 hover:bg-gray-100 text-sm">Cancelar</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !matches}
            className="flex-1 px-4 py-2 rounded-[4px] bg-danger text-white hover:bg-danger/90 disabled:opacity-50 text-sm"
          >
            {loading ? 'Anonimizando...' : 'Anonimizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
