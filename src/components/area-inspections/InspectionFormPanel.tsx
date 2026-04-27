'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface StandardChecklistOption {
  id: string
  name: string
  isActive: boolean
  workCenter?: { id: string; name: string } | null
  serviceType?: { id: string; name: string } | null
}

interface UserOption {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  role: string | null
  enabled?: boolean
  status?: string
}

interface EligibleAsset {
  id: string
  name: string
  tag: string | null
  protheusCode: string | null
  family: { id: string; name: string } | null
  familyModel: { id: string; name: string } | null
}

interface Props {
  inPage?: boolean
  onClose: () => void
  onSuccess: (id: string) => void
}

const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

export default function InspectionFormPanel({ onClose, onSuccess }: Props) {
  const [checklists, setChecklists] = useState<StandardChecklistOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  const [standardChecklistId, setStandardChecklistId] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedToId, setAssignedToId] = useState('')

  const [eligibleAssets, setEligibleAssets] = useState<EligibleAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [clRes, userRes] = await Promise.all([
          fetch('/api/maintenance-plans/standard-checklists'),
          fetch('/api/users'),
        ])
        const [cl, us] = await Promise.all([clRes.json(), userRes.json()])
        const items = (cl.data || []) as StandardChecklistOption[]
        setChecklists(items.filter((c) => c.isActive))
        setUsers((us.data || []) as UserOption[])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    if (!standardChecklistId) {
      setEligibleAssets([])
      return
    }
    setLoadingAssets(true)
    void (async () => {
      try {
        const res = await fetch(`/api/maintenance-plans/standard-checklists/${standardChecklistId}/eligible-assets`)
        const json = await res.json()
        if (!res.ok) {
          setEligibleAssets([])
          setError(json.error || 'Erro ao buscar bens compatíveis')
          return
        }
        setEligibleAssets((json.data || []) as EligibleAsset[])
        setError(null)
      } catch (e) {
        console.error(e)
        setEligibleAssets([])
      } finally {
        setLoadingAssets(false)
      }
    })()
  }, [standardChecklistId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!standardChecklistId || !description || !dueDate || !assignedToId) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    if (eligibleAssets.length === 0) {
      setError('Não há bens compatíveis para este check list na unidade ativa')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standardChecklistId, description, dueDate, assignedToId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao criar inspeção')
        return
      }
      onSuccess(json.data.id)
    } catch (e) {
      console.error(e)
      setError('Erro ao criar inspeção')
    } finally {
      setSaving(false)
    }
  }

  const userLabel = (u: UserOption) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id
    const inactive = u.enabled === false || (u.status && u.status !== 'ACTIVE')
    return inactive ? `${name} (inativo)` : name
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="h-full flex flex-1 min-h-0 flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]"
    >
      <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-black text-gray-900">Novo Check List</h2>
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
        {error && (
          <div className="bg-danger-light border border-danger/30 text-danger text-sm p-3 rounded-[4px]">
            {error}
          </div>
        )}

        <div>
          <label className={labelCls}>Check List Padrão *</label>
          <select
            className={inputCls}
            value={standardChecklistId}
            onChange={(e) => setStandardChecklistId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.workCenter?.name || '?'} / {c.serviceType?.name || '?'}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Descrição *</label>
            <input
              type="text"
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: INSPECAO DIARIA WC-100"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Vencimento *</label>
            <input
              type="date"
              className={inputCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Manutentor responsável *</label>
          <select
            className={inputCls}
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
        </div>

        {standardChecklistId && (
          <div className="border border-gray-200 rounded-[4px] bg-gray-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">
                Bens compatíveis ({eligibleAssets.length})
              </h3>
              {loadingAssets && (
                <span className="text-xs text-muted-foreground">Carregando...</span>
              )}
            </div>
            {!loadingAssets && eligibleAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum bem compatível encontrado nesta unidade. Verifique se há bens cadastrados
                no centro de trabalho com a família e o tipo modelo configurados no check list padrão.
              </p>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-auto">
                {eligibleAssets.map((a) => (
                  <li
                    key={a.id}
                    className="text-xs bg-white rounded-[4px] border border-gray-200 px-2 py-1.5 flex items-center gap-2"
                  >
                    <span className="font-bold text-gray-900">{a.tag || a.protheusCode || a.id.slice(0, 6)}</span>
                    <span className="text-gray-700 truncate flex-1">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {a.family?.name || '-'} / {a.familyModel?.name || '-'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving || eligibleAssets.length === 0}
          className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="save" className="text-base mr-2" />
          {saving ? 'Salvando...' : 'Criar Inspeção'}
        </Button>
      </div>
    </form>
  )
}
