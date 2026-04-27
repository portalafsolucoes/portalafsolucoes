'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PanelCloseButton } from '@/components/ui/PanelCloseButton'
import type { AuditEntry, AuditEntryAction, AuditSource } from '@/lib/audit/types'
import { assetEventLabel, entityLabel, fieldLabel } from '@/lib/audit/labels'

interface AuditDetailPanelProps {
  entry: AuditEntry
  onClose: () => void
  inPage?: boolean
  /** Mapa { uuid -> rotulo legivel } populado pelo /api/audit. */
  resolvedRefs?: Record<string, string>
}

const FK_FIELD_KEYS = new Set([
  'parentAssetId', 'assetId', 'workOrderId', 'requestId', 'inspectionId',
  'locationId', 'unitId', 'companyId',
  'userId', 'assignedToId', 'responsibleUserId', 'createdById',
  'finalizedById', 'reopenedById', 'submittedForReviewById', 'detachedById', 'rejectedById',
  'costCenterId', 'workCenterId', 'serviceTypeId', 'maintenanceAreaId', 'maintenanceTypeId',
  'assetFamilyId', 'familyId', 'familyModelId', 'jobTitleId',
  'standardChecklistId', 'standardPlanId',
])

const ACTION_LABELS: Record<AuditEntryAction, string> = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
}

const SOURCE_LABELS: Record<AuditSource, string> = {
  audit_log: 'Auditoria geral',
  asset_history: 'Histórico de ativo',
  wo_reschedule: 'Reprogramação de OS',
  company_rejection: 'Rejeição de empresa',
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
  } catch {
    return iso
  }
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'string') {
    // Tentar reconhecer datas ISO
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try { return new Date(v).toLocaleString('pt-BR') } catch { /* fallthrough */ }
    }
    return v
  }
  if (typeof v === 'number') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

interface DiffEntryView {
  field: string
  before?: unknown
  after?: unknown
  longChange?: { lengthBefore: number; lengthAfter: number }
}

function extractDiff(detail: Record<string, unknown>): DiffEntryView[] {
  const out: DiffEntryView[] = []
  if (!detail) return out
  if (detail.kind === 'diff' && detail.diff && typeof detail.diff === 'object') {
    for (const [field, val] of Object.entries(detail.diff as Record<string, unknown>)) {
      if (field.startsWith('__')) continue
      const v = val as { before?: unknown; after?: unknown; changed?: boolean; lengthBefore?: number; lengthAfter?: number }
      if (v && typeof v === 'object' && v.changed === true) {
        out.push({ field, longChange: { lengthBefore: v.lengthBefore ?? 0, lengthAfter: v.lengthAfter ?? 0 } })
      } else {
        out.push({ field, before: v?.before, after: v?.after })
      }
    }
  }
  return out
}

function extractCreate(detail: Record<string, unknown>): Record<string, unknown> | null {
  if (detail?.kind === 'create' && detail.after && typeof detail.after === 'object') {
    return detail.after as Record<string, unknown>
  }
  return null
}

function extractDelete(detail: Record<string, unknown>): Record<string, unknown> | null {
  if (detail?.kind === 'delete' && detail.before && typeof detail.before === 'object') {
    return detail.before as Record<string, unknown>
  }
  return null
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm">
      <span className="font-bold text-[12px] uppercase tracking-wider text-gray-900">{title}</span>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 break-words">{value}</p>
    </div>
  )
}

function resolveRefValue(
  key: string,
  value: unknown,
  resolvedRefs: Record<string, string>
): ReactNode {
  if (FK_FIELD_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
    const label = resolvedRefs[value]
    if (label) {
      return (
        <span className="inline-flex flex-col">
          <span className="text-gray-900 font-medium">{label}</span>
        </span>
      )
    }
  }
  return formatValue(value)
}

function DiffTable({ entries, resolvedRefs }: { entries: DiffEntryView[]; resolvedRefs: Record<string, string> }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Nenhum campo alterado registrado.</p>
  }
  return (
    <div className="border border-gray-200 rounded-[4px] overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700">Campo</th>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700">Antes</th>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700">Depois</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {entries.map((e) => (
            <tr key={e.field}>
              <td className="px-3 py-2 align-top font-bold text-gray-900 whitespace-nowrap">{fieldLabel(e.field)}</td>
              {e.longChange ? (
                <td className="px-3 py-2 italic text-muted-foreground" colSpan={2}>
                  Conteúdo extenso alterado ({e.longChange.lengthBefore} → {e.longChange.lengthAfter} chars)
                </td>
              ) : (
                <>
                  <td className="px-3 py-2 align-top text-gray-700 break-words max-w-[260px]">{resolveRefValue(e.field, e.before, resolvedRefs)}</td>
                  <td className="px-3 py-2 align-top text-gray-900 break-words max-w-[260px]">{resolveRefValue(e.field, e.after, resolvedRefs)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FIELD_NAME_ARRAY_KEYS = new Set(['updatedFields', 'changedFields', 'fields'])

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function renderSnapshotValue(key: string, value: unknown, resolvedRefs: Record<string, string>): ReactNode {
  if (FIELD_NAME_ARRAY_KEYS.has(key) && isStringArray(value)) {
    if (value.length === 0) return '—'
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((field) => (
          <span
            key={field}
            className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200"
          >
            {fieldLabel(field)}
          </span>
        ))}
      </div>
    )
  }
  if (FK_FIELD_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
    const label = resolvedRefs[value]
    if (label) return <span className="text-gray-900 font-medium">{label}</span>
  }
  return formatValue(value)
}

function SnapshotTable({
  data,
  label,
  resolvedRefs,
}: {
  data: Record<string, unknown>
  label: string
  resolvedRefs: Record<string, string>
}) {
  const fields = Object.entries(data).filter(([k]) => !k.startsWith('__'))
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sem dados estruturados disponíveis.</p>
  }
  return (
    <div className="border border-gray-200 rounded-[4px] overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700">Campo</th>
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700">{label}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {fields.map(([key, value]) => (
            <tr key={key}>
              <td className="px-3 py-2 align-top font-bold text-gray-900 whitespace-nowrap">{fieldLabel(key)}</td>
              <td className="px-3 py-2 align-top text-gray-900 break-words max-w-[400px]">{renderSnapshotValue(key, value, resolvedRefs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LegacyDetail({ detail, resolvedRefs }: { detail: Record<string, unknown>; resolvedRefs: Record<string, string> }) {
  const kind = detail.kind as string | undefined
  if (kind === 'asset_history') {
    return (
      <div className="space-y-3">
        <FieldRow label="Tipo de evento" value={assetEventLabel(detail.eventType as string | null | undefined)} />
        <FieldRow label="Descrição" value={String(detail.description ?? '—')} />
        {!!detail.metadata && typeof detail.metadata === 'object' && (
          <SnapshotTable data={detail.metadata as Record<string, unknown>} label="Metadados" resolvedRefs={resolvedRefs} />
        )}
      </div>
    )
  }
  if (kind === 'wo_reschedule') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Data anterior" value={formatDateTime(detail.previousDate as string)} />
          <FieldRow label="Nova data" value={formatDateTime(detail.newDate as string)} />
          <FieldRow label="Status anterior" value={String(detail.previousStatus ?? '—')} />
          <FieldRow label="Estava atrasada?" value={detail.wasOverdue ? 'sim' : 'não'} />
        </div>
        <FieldRow label="Motivo" value={String(detail.reason ?? '—')} />
      </div>
    )
  }
  if (kind === 'company_rejection') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="CNPJ" value={String(detail.cnpj ?? '—')} />
          <FieldRow label="Razão social" value={String(detail.razaoSocial ?? '—')} />
          <FieldRow label="Nome fantasia" value={String(detail.nomeFantasia ?? '—')} />
          <FieldRow label="Email original" value={String(detail.originalEmail ?? '—')} />
        </div>
        <FieldRow label="Motivo da rejeição" value={String(detail.rejectedReason ?? '—')} />
      </div>
    )
  }
  return null
}

export function AuditDetailPanel({ entry, onClose, inPage = false, resolvedRefs }: AuditDetailPanelProps) {
  const diff = extractDiff(entry.detail)
  const create = extractCreate(entry.detail)
  const del = extractDelete(entry.detail)
  const isLegacy = entry.source !== 'audit_log'
  const refs = resolvedRefs ?? {}

  const containerClasses = inPage
    ? 'h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]'
    : 'h-full flex flex-col bg-card'

  return (
    <div className={containerClasses}>
      <div className="flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{SOURCE_LABELS[entry.source]}</p>
          <h2 className="text-lg font-black text-gray-900 truncate">
            {ACTION_LABELS[entry.action]} · {entityLabel(entry.entity)}{entry.entityLabel ? ` · ${entry.entityLabel}` : ''}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 truncate">{entry.summary}</p>
        </div>
        <PanelCloseButton onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <SectionHeader title="Identificação" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1">
            <FieldRow label="Data/Hora" value={formatDateTime(entry.createdAt)} />
            <FieldRow label="Ação" value={ACTION_LABELS[entry.action]} />
            <FieldRow label="Usuário" value={entry.userName ?? '—'} />
            <FieldRow label="Perfil" value={entry.userRole ?? '—'} />
            <FieldRow label="Entidade" value={entityLabel(entry.entity)} />
            <FieldRow label="Identificador" value={entry.entityLabel ?? '—'} />
          </div>
        </div>

        {entry.action === 'UPDATE' && !isLegacy && (
          <div>
            <SectionHeader title="Campos alterados" />
            <DiffTable entries={diff} resolvedRefs={refs} />
          </div>
        )}

        {entry.action === 'CREATE' && create && (
          <div>
            <SectionHeader title="Dados criados" />
            <SnapshotTable data={create} label="Valor" resolvedRefs={refs} />
          </div>
        )}

        {entry.action === 'DELETE' && del && (
          <div>
            <SectionHeader title="Dados removidos" />
            <SnapshotTable data={del} label="Valor" resolvedRefs={refs} />
          </div>
        )}

        {isLegacy && (
          <div>
            <SectionHeader title="Detalhes do evento" />
            <LegacyDetail detail={entry.detail} resolvedRefs={refs} />
          </div>
        )}

        {entry.source === 'audit_log' && !!entry.detail?.metadata && typeof entry.detail.metadata === 'object' ? (
          <div>
            <SectionHeader title="Metadados" />
            <SnapshotTable data={entry.detail.metadata as Record<string, unknown>} label="Valor" resolvedRefs={refs} />
          </div>
        ) : null}

        {!isLegacy && entry.action === 'UPDATE' && diff.length === 0 && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-[4px] p-3 text-sm text-muted-foreground">
            <Icon name="info" className="text-base mt-0.5" />
            <span>Esta entrada não registra alterações estruturadas. Veja os metadados acima para mais contexto.</span>
          </div>
        )}
      </div>
    </div>
  )
}
