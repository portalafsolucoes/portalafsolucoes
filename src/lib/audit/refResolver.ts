// Resolve FKs (UUIDs) presentes em diff/snapshot/metadata de entradas de auditoria
// para rotulos legiveis (ex.: 'parentAssetId: 8293...' -> 'BRITADOR PRIMARIO DE MANDIBULA').
//
// Estrategia:
// 1. Varre cada entry coletando pares (table, id) para keys com FK conhecida.
// 2. Faz batch fetch por tabela com filtro de companyId quando aplicavel para
//    nao vazar dados cross-tenant.
// 3. Devolve um mapa global { id -> label } compartilhado entre todas as entries.

import { supabase } from '@/lib/supabase'
import type { AuditEntry } from './types'

interface RefSpec {
  table: string
  fields: string[]
  /** Tabela tem coluna companyId que deve ser filtrada para isolar tenant. */
  hasCompanyId: boolean
  toLabel: (row: Record<string, unknown>) => string
}

function userLabel(r: Record<string, unknown>): string {
  const fn = String(r.firstName ?? '').trim()
  const ln = String(r.lastName ?? '').trim()
  const full = `${fn} ${ln}`.trim()
  return full || String(r.id ?? '')
}

function formatManNumber(raw: string): string {
  // Garante prefixo MAN- e padding de 6 digitos quando o valor armazenado
  // for puramente numerico (ex.: '45' -> 'MAN-000045', '000045' -> 'MAN-000045').
  const trimmed = raw.trim()
  if (trimmed.toUpperCase().startsWith('MAN-')) return trimmed.toUpperCase()
  if (/^\d+$/.test(trimmed)) {
    return `MAN-${trimmed.padStart(6, '0')}`
  }
  return trimmed
}

function workOrderLabel(r: Record<string, unknown>): string {
  // Ordem de preferencia:
  // 1. internalId  (legado MAN-XXXXXX ou numero puro)
  // 2. sequenceNumber  (formato novo, Int -> MAN-{pad6})
  // 3. externalId  (numero do ERP/TOTVS)
  // 4. customId / protheusCode  (identificadores externos)
  // 5. title  (ultimo recurso)
  const internal = r.internalId ? String(r.internalId).trim() : ''
  if (internal) return formatManNumber(internal)

  const seq = r.sequenceNumber
  if (seq !== null && seq !== undefined && seq !== '') {
    const n = Number(seq)
    if (Number.isFinite(n) && n > 0) {
      return `MAN-${String(Math.trunc(n)).padStart(6, '0')}`
    }
  }

  const external = r.externalId ? String(r.externalId).trim() : ''
  if (external) return external
  const custom = r.customId ? String(r.customId).trim() : ''
  if (custom) return custom
  const protheus = r.protheusCode ? String(r.protheusCode).trim() : ''
  if (protheus) return protheus

  const title = r.title ? String(r.title).trim() : ''
  if (title) return title
  return ''
}

const FK_FIELD_TO_REF: Record<string, RefSpec> = {
  parentAssetId: { table: 'Asset', fields: ['id', 'tag', 'name'], hasCompanyId: true, toLabel: (r) => String(r.tag || r.name || r.id) },
  assetId: { table: 'Asset', fields: ['id', 'tag', 'name'], hasCompanyId: true, toLabel: (r) => String(r.tag || r.name || r.id) },
  workOrderId: { table: 'WorkOrder', fields: ['id', 'internalId', 'sequenceNumber', 'externalId', 'customId', 'protheusCode', 'title'], hasCompanyId: true, toLabel: workOrderLabel },
  requestId: { table: 'Request', fields: ['id', 'requestNumber', 'title'], hasCompanyId: true, toLabel: (r) => String(r.requestNumber || r.title || r.id) },
  inspectionId: { table: 'AreaInspection', fields: ['id', 'number', 'description'], hasCompanyId: true, toLabel: (r) => (r.number ? String(r.number) : String(r.description || r.id)) },
  locationId: { table: 'Location', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  unitId: { table: 'Location', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  companyId: { table: 'Company', fields: ['id', 'nomeFantasia', 'razaoSocial'], hasCompanyId: false, toLabel: (r) => String(r.nomeFantasia || r.razaoSocial || r.id) },
  userId: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  assignedToId: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  responsibleUserId: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  createdById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  finalizedById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  reopenedById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  submittedForReviewById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  detachedById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  rejectedById: { table: 'User', fields: ['id', 'firstName', 'lastName'], hasCompanyId: true, toLabel: userLabel },
  costCenterId: { table: 'CostCenter', fields: ['id', 'code', 'name'], hasCompanyId: true, toLabel: (r) => String(r.code || r.name || r.id) },
  workCenterId: { table: 'WorkCenter', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  serviceTypeId: { table: 'ServiceType', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  maintenanceAreaId: { table: 'MaintenanceArea', fields: ['id', 'code', 'name'], hasCompanyId: true, toLabel: (r) => String(r.code || r.name || r.id) },
  maintenanceTypeId: { table: 'MaintenanceType', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  assetFamilyId: { table: 'AssetFamily', fields: ['id', 'code', 'name'], hasCompanyId: true, toLabel: (r) => String(r.code || r.name || r.id) },
  familyId: { table: 'AssetFamily', fields: ['id', 'code', 'name'], hasCompanyId: true, toLabel: (r) => String(r.code || r.name || r.id) },
  familyModelId: { table: 'AssetFamilyModel', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  jobTitleId: { table: 'JobTitle', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  standardChecklistId: { table: 'StandardChecklist', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
  standardPlanId: { table: 'StandardMaintenancePlan', fields: ['id', 'name'], hasCompanyId: true, toLabel: (r) => String(r.name || r.id) },
}

export function isResolvableFkKey(key: string): boolean {
  return key in FK_FIELD_TO_REF
}

function collectFromDetail(detail: Record<string, unknown>): Array<{ table: string; id: string }> {
  const out: Array<{ table: string; id: string }> = []

  function visitField(key: string, value: unknown) {
    const ref = FK_FIELD_TO_REF[key]
    if (!ref) return
    if (typeof value === 'string' && value.length > 0) {
      out.push({ table: ref.table, id: value })
    }
  }

  if (detail.kind === 'diff' && detail.diff && typeof detail.diff === 'object') {
    for (const [key, val] of Object.entries(detail.diff as Record<string, unknown>)) {
      if (key.startsWith('__')) continue
      const v = val as { before?: unknown; after?: unknown }
      visitField(key, v?.before)
      visitField(key, v?.after)
    }
  }
  if (detail.kind === 'create' && detail.after && typeof detail.after === 'object') {
    for (const [key, value] of Object.entries(detail.after as Record<string, unknown>)) {
      visitField(key, value)
    }
  }
  if (detail.kind === 'delete' && detail.before && typeof detail.before === 'object') {
    for (const [key, value] of Object.entries(detail.before as Record<string, unknown>)) {
      visitField(key, value)
    }
  }
  if (detail.metadata && typeof detail.metadata === 'object') {
    for (const [key, value] of Object.entries(detail.metadata as Record<string, unknown>)) {
      visitField(key, value)
    }
  }
  if (detail.kind === 'asset_history') {
    if (typeof detail.workOrderId === 'string') visitField('workOrderId', detail.workOrderId)
    if (typeof detail.requestId === 'string') visitField('requestId', detail.requestId)
  }

  return out
}

export async function resolveAuditRefs(
  entries: AuditEntry[],
  companyScope: string | null
): Promise<Record<string, string>> {
  const byTable = new Map<string, Set<string>>()
  for (const entry of entries) {
    const refs = collectFromDetail(entry.detail)
    for (const { table, id } of refs) {
      if (!byTable.has(table)) byTable.set(table, new Set())
      byTable.get(table)!.add(id)
    }
  }

  if (byTable.size === 0) return {}

  // Acha o spec representativo da tabela (qualquer key que aponta para ela serve).
  const tableSpec = new Map<string, RefSpec>()
  for (const spec of Object.values(FK_FIELD_TO_REF)) {
    if (!tableSpec.has(spec.table)) tableSpec.set(spec.table, spec)
  }

  const resolved: Record<string, string> = {}

  await Promise.all(
    Array.from(byTable.entries()).map(async ([table, ids]) => {
      const spec = tableSpec.get(table)
      if (!spec || ids.size === 0) return

      let q = supabase.from(table).select(spec.fields.join(',')).in('id', Array.from(ids))
      if (spec.hasCompanyId && companyScope) {
        q = q.eq('companyId', companyScope)
      }
      const { data, error } = await q
      if (error) {
        console.error(`[audit/refResolver] ${table} query failed:`, error.message)
        return
      }
      if (!data) return

      for (const row of data as unknown as Record<string, unknown>[]) {
        const id = String(row.id ?? '')
        if (!id) continue
        const label = spec.toLabel(row)
        // Pula labels vazias ou identicas ao proprio UUID — nesses casos
        // a UI cai no fallback de formatValue.
        if (!label || label === id) continue
        resolved[id] = label
      }
    })
  )

  return resolved
}
