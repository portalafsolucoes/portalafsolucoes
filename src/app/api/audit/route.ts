import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { hasPermission } from '@/lib/permissions'
import { isPlatformStaff } from '@/lib/user-roles'
import type {
  AuditEntry,
  AuditEntryAction,
  AuditPageResponse,
  AuditSource,
} from '@/lib/audit/types'
import { resolveAuditRefs } from '@/lib/audit/refResolver'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200
const LEGACY_SAMPLE_CAP = 500

const AUDIT_LOG_FIELDS = `
  id, createdAt, companyId, unitId, userId, userName, userRole,
  entity, entityId, entityLabel, action, diff, metadata
`.replace(/\s+/g, ' ').trim()

interface AuditLogRow {
  id: string
  createdAt: string
  companyId: string | null
  unitId: string | null
  userId: string | null
  userName: string | null
  userRole: string | null
  entity: string
  entityId: string
  entityLabel: string | null
  action: AuditEntryAction
  diff: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

function safeNumber(input: string | null, fallback: number, max?: number): number {
  if (!input) return fallback
  const n = Number(input)
  if (!Number.isFinite(n)) return fallback
  if (n < 1) return fallback
  if (max && n > max) return max
  return Math.floor(n)
}

function summarizeAuditLog(row: AuditLogRow): string {
  if (row.action === 'CREATE') {
    return `Criou ${row.entity}${row.entityLabel ? ` ${row.entityLabel}` : ''}`
  }
  if (row.action === 'DELETE') {
    return `Excluiu ${row.entity}${row.entityLabel ? ` ${row.entityLabel}` : ''}`
  }
  // UPDATE — listar campos alterados
  const diff = row.diff as Record<string, unknown> | null
  const fields = diff ? Object.keys(diff).filter((k) => !k.startsWith('__')) : []
  const label = row.entityLabel ? ` ${row.entityLabel}` : ''
  if (fields.length === 0) return `Atualizou ${row.entity}${label}`
  if (fields.length <= 3) return `Alterou ${fields.join(', ')} em ${row.entity}${label}`
  return `Alterou ${fields.length} campos em ${row.entity}${label}`
}

function mapAuditLog(row: AuditLogRow): AuditEntry {
  let detail: Record<string, unknown>
  if (row.action === 'CREATE') {
    detail = { kind: 'create', after: (row.diff as { __create?: unknown })?.__create ?? null }
  } else if (row.action === 'DELETE') {
    detail = { kind: 'delete', before: (row.diff as { __delete?: unknown })?.__delete ?? null }
  } else {
    detail = { kind: 'diff', diff: row.diff ?? {} }
  }

  return {
    id: row.id,
    source: 'audit_log',
    createdAt: row.createdAt,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    userId: row.userId,
    userName: row.userName,
    userRole: row.userRole,
    companyId: row.companyId,
    unitId: row.unitId,
    summary: summarizeAuditLog(row),
    detail: { ...detail, metadata: row.metadata ?? null },
  }
}

async function fetchAuditLog(params: {
  companyId: string | null
  unitId?: string
  entity?: string
  action?: AuditEntryAction
  userId?: string
  dateFrom?: string
  dateTo?: string
  limit: number
}): Promise<AuditLogRow[]> {
  let q = supabase.from('AuditLog').select(AUDIT_LOG_FIELDS).order('createdAt', { ascending: false })
  if (params.companyId) q = q.eq('companyId', params.companyId)
  if (params.unitId) q = q.eq('unitId', params.unitId)
  if (params.entity) q = q.eq('entity', params.entity)
  if (params.action) q = q.eq('action', params.action)
  if (params.userId) q = q.eq('userId', params.userId)
  if (params.dateFrom) q = q.gte('createdAt', params.dateFrom)
  if (params.dateTo) q = q.lte('createdAt', params.dateTo)
  q = q.limit(params.limit)

  const { data, error } = await q
  if (error) {
    console.error('[audit] fetch AuditLog failed:', error.message)
    return []
  }
  return (data ?? []) as unknown as AuditLogRow[]
}

interface AssetHistoryRow {
  id: string
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  assetId: string
  workOrderId: string | null
  requestId: string | null
  userId: string | null
  Asset?: { id: string; name: string | null; tag: string | null; companyId: string }
}

async function fetchAssetHistory(params: {
  companyId: string | null
  userId?: string
  dateFrom?: string
  dateTo?: string
  limit: number
}): Promise<AssetHistoryRow[]> {
  let q = supabase
    .from('AssetHistory')
    .select(`
      id, eventType, title, description, metadata, createdAt,
      assetId, workOrderId, requestId, userId,
      Asset:Asset!inner(id, name, tag, companyId)
    `)
    .order('createdAt', { ascending: false })
    .limit(params.limit)
  if (params.companyId) q = q.eq('Asset.companyId', params.companyId)
  if (params.userId) q = q.eq('userId', params.userId)
  if (params.dateFrom) q = q.gte('createdAt', params.dateFrom)
  if (params.dateTo) q = q.lte('createdAt', params.dateTo)

  const { data, error } = await q
  if (error) {
    console.error('[audit] fetch AssetHistory failed:', error.message)
    return []
  }
  return (data ?? []) as unknown as AssetHistoryRow[]
}

function mapAssetHistory(row: AssetHistoryRow, userMap: Map<string, string>): AuditEntry {
  const action: AuditEntryAction = row.eventType.includes('CREATED')
    ? 'CREATE'
    : row.eventType.includes('DELETED')
    ? 'DELETE'
    : 'UPDATE'
  const assetLabel = row.Asset?.tag || row.Asset?.name || row.assetId
  return {
    id: `ah_${row.id}`,
    source: 'asset_history',
    createdAt: row.createdAt,
    action,
    entity: 'Asset',
    entityId: row.assetId,
    entityLabel: assetLabel,
    userId: row.userId,
    userName: row.userId ? userMap.get(row.userId) ?? null : null,
    userRole: null,
    companyId: row.Asset?.companyId ?? null,
    unitId: null,
    summary: row.title,
    detail: {
      kind: 'asset_history',
      eventType: row.eventType,
      description: row.description,
      metadata: row.metadata,
      workOrderId: row.workOrderId,
      requestId: row.requestId,
    },
  }
}

interface WorkOrderRescheduleRow {
  id: string
  workOrderId: string
  previousDate: string | null
  newDate: string
  previousStatus: string | null
  wasOverdue: boolean
  reason: string | null
  userId: string | null
  createdAt: string
  WorkOrder?: { id: string; internalId: string | null; companyId: string }
}

async function fetchWorkOrderReschedules(params: {
  companyId: string | null
  userId?: string
  dateFrom?: string
  dateTo?: string
  limit: number
}): Promise<WorkOrderRescheduleRow[]> {
  let q = supabase
    .from('WorkOrderRescheduleHistory')
    .select(`
      id, workOrderId, previousDate, newDate, previousStatus, wasOverdue, reason, userId, createdAt,
      WorkOrder:WorkOrder!inner(id, internalId, companyId)
    `)
    .order('createdAt', { ascending: false })
    .limit(params.limit)
  if (params.companyId) q = q.eq('WorkOrder.companyId', params.companyId)
  if (params.userId) q = q.eq('userId', params.userId)
  if (params.dateFrom) q = q.gte('createdAt', params.dateFrom)
  if (params.dateTo) q = q.lte('createdAt', params.dateTo)

  const { data, error } = await q
  if (error) {
    console.error('[audit] fetch WorkOrderRescheduleHistory failed:', error.message)
    return []
  }
  return (data ?? []) as unknown as WorkOrderRescheduleRow[]
}

function formatDateBR(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

function mapWorkOrderReschedule(row: WorkOrderRescheduleRow, userMap: Map<string, string>): AuditEntry {
  const woLabel = row.WorkOrder?.internalId || row.workOrderId
  return {
    id: `wr_${row.id}`,
    source: 'wo_reschedule',
    createdAt: row.createdAt,
    action: 'UPDATE',
    entity: 'WorkOrder',
    entityId: row.workOrderId,
    entityLabel: woLabel,
    userId: row.userId,
    userName: row.userId ? userMap.get(row.userId) ?? null : null,
    userRole: null,
    companyId: row.WorkOrder?.companyId ?? null,
    unitId: null,
    summary: `Reprogramou OS ${woLabel} de ${formatDateBR(row.previousDate)} para ${formatDateBR(row.newDate)}`,
    detail: {
      kind: 'wo_reschedule',
      previousDate: row.previousDate,
      newDate: row.newDate,
      previousStatus: row.previousStatus,
      wasOverdue: row.wasOverdue,
      reason: row.reason,
    },
  }
}

interface RejectedCompanyRow {
  id: string
  cnpj: string | null
  razaoSocial: string | null
  nomeFantasia: string | null
  originalEmail: string
  rejectedReason: string
  rejectedById: string | null
  rejectedAt: string
  originalPayload: Record<string, unknown> | null
}

async function fetchRejectedCompanies(params: {
  userId?: string
  dateFrom?: string
  dateTo?: string
  limit: number
}): Promise<RejectedCompanyRow[]> {
  let q = supabase
    .from('RejectedCompanyLog')
    .select(`
      id, cnpj, razaoSocial, nomeFantasia, originalEmail,
      rejectedReason, rejectedById, rejectedAt, originalPayload
    `)
    .order('rejectedAt', { ascending: false })
    .limit(params.limit)
  if (params.userId) q = q.eq('rejectedById', params.userId)
  if (params.dateFrom) q = q.gte('rejectedAt', params.dateFrom)
  if (params.dateTo) q = q.lte('rejectedAt', params.dateTo)

  const { data, error } = await q
  if (error) {
    console.error('[audit] fetch RejectedCompanyLog failed:', error.message)
    return []
  }
  return (data ?? []) as RejectedCompanyRow[]
}

function mapRejectedCompany(row: RejectedCompanyRow, userMap: Map<string, string>): AuditEntry {
  const label = row.razaoSocial || row.nomeFantasia || row.cnpj || row.originalEmail
  return {
    id: `rc_${row.id}`,
    source: 'company_rejection',
    createdAt: row.rejectedAt,
    action: 'DELETE',
    entity: 'Company',
    entityId: row.id,
    entityLabel: label,
    userId: row.rejectedById,
    userName: row.rejectedById ? userMap.get(row.rejectedById) ?? null : null,
    userRole: null,
    companyId: null,
    unitId: null,
    summary: `Rejeitou cadastro: ${label}`,
    detail: {
      kind: 'company_rejection',
      cnpj: row.cnpj,
      razaoSocial: row.razaoSocial,
      nomeFantasia: row.nomeFantasia,
      originalEmail: row.originalEmail,
      rejectedReason: row.rejectedReason,
      originalPayload: row.originalPayload,
    },
  }
}

async function fetchUserNamesForIds(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (userIds.length === 0) return map
  const { data, error } = await supabase
    .from('User')
    .select('id, firstName, lastName')
    .in('id', userIds)
  if (error || !data) return map
  for (const u of data) {
    map.set(u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.id)
  }
  return map
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(session, 'audit', 'view')) {
      return NextResponse.json({ error: 'Sem permissao para acessar auditoria' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const source = (searchParams.get('source') as AuditSource | 'all' | null) ?? 'all'
    const entity = searchParams.get('entity') ?? undefined
    const action = (searchParams.get('action') as AuditEntryAction | null) ?? undefined
    const userId = searchParams.get('userId') ?? undefined
    const unitId = searchParams.get('unitId') ?? undefined
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const page = safeNumber(searchParams.get('page'), 1)
    const pageSize = safeNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    // Tenant scope: SUPER_ADMIN cross-tenant (companyId vazio) ve tudo; demais filtram pela empresa.
    const platform = isPlatformStaff(session)
    const companyScope = platform ? null : session.companyId

    // Quando MANUTENTOR, ja teria sido bloqueado pelo hasPermission acima.
    // Coleta candidatos por fonte com cap de amostragem.
    const sources: AuditSource[] = source === 'all'
      ? ['audit_log', 'asset_history', 'wo_reschedule', 'company_rejection']
      : [source]

    const merged: AuditEntry[] = []
    let approximate = false

    if (sources.includes('audit_log')) {
      const rows = await fetchAuditLog({
        companyId: companyScope,
        unitId,
        entity,
        action,
        userId,
        dateFrom,
        dateTo,
        limit: source === 'audit_log' ? Math.max(pageSize * page, pageSize) + 1 : LEGACY_SAMPLE_CAP,
      })
      for (const r of rows) merged.push(mapAuditLog(r))
      if (rows.length === LEGACY_SAMPLE_CAP) approximate = true
    }

    // Pre-coleta dos IDs de usuario presentes nas fontes legadas para batch fetch de nomes.
    const legacyUserIds = new Set<string>()

    let assetHistoryRows: AssetHistoryRow[] = []
    if (sources.includes('asset_history')) {
      assetHistoryRows = await fetchAssetHistory({
        companyId: companyScope,
        userId,
        dateFrom,
        dateTo,
        limit: LEGACY_SAMPLE_CAP,
      })
      for (const r of assetHistoryRows) if (r.userId) legacyUserIds.add(r.userId)
      if (assetHistoryRows.length === LEGACY_SAMPLE_CAP) approximate = true
    }

    let woRescheduleRows: WorkOrderRescheduleRow[] = []
    if (sources.includes('wo_reschedule')) {
      woRescheduleRows = await fetchWorkOrderReschedules({
        companyId: companyScope,
        userId,
        dateFrom,
        dateTo,
        limit: LEGACY_SAMPLE_CAP,
      })
      for (const r of woRescheduleRows) if (r.userId) legacyUserIds.add(r.userId)
      if (woRescheduleRows.length === LEGACY_SAMPLE_CAP) approximate = true
    }

    let rejectedCompanyRows: RejectedCompanyRow[] = []
    if (sources.includes('company_rejection') && platform) {
      // RejectedCompanyLog nao tem companyId — so SUPER_ADMIN cross-tenant ve.
      rejectedCompanyRows = await fetchRejectedCompanies({
        userId,
        dateFrom,
        dateTo,
        limit: LEGACY_SAMPLE_CAP,
      })
      for (const r of rejectedCompanyRows) if (r.rejectedById) legacyUserIds.add(r.rejectedById)
      if (rejectedCompanyRows.length === LEGACY_SAMPLE_CAP) approximate = true
    }

    const userMap = await fetchUserNamesForIds(Array.from(legacyUserIds))

    for (const r of assetHistoryRows) merged.push(mapAssetHistory(r, userMap))
    for (const r of woRescheduleRows) merged.push(mapWorkOrderReschedule(r, userMap))
    for (const r of rejectedCompanyRows) merged.push(mapRejectedCompany(r, userMap))

    // Filtros aplicados em memoria sobre os legados (entity/action/q sao server-side em audit_log).
    const filtered = merged.filter((e) => {
      if (entity && e.entity !== entity) return false
      if (action && e.action !== action) return false
      if (unitId && e.unitId && e.unitId !== unitId) return false
      if (q) {
        const hay = `${e.summary} ${e.userName ?? ''} ${e.entityLabel ?? ''} ${e.entity}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Sort merged result desc por createdAt.
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    // Resolve FKs (parentAssetId, locationId, companyId, userId, etc.) apenas das
    // entries da pagina atual — evita batch enorme quando o filtro e amplo.
    const resolvedRefs = await resolveAuditRefs(data, companyScope)

    const response: AuditPageResponse = { data, total, page, pageSize, approximate, resolvedRefs }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    if (message.startsWith('CompanyScopeRequired')) {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }
    console.error('[audit] GET failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
