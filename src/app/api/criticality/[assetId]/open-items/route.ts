import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { hasPermission } from '@/lib/permissions'
import { requireCompanyScope } from '@/lib/user-roles'

export const dynamic = 'force-dynamic'

const OPEN_REQUEST_STATUSES = ['PENDING', 'APPROVED']
const OPEN_WORK_ORDER_STATUSES = ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD']

type OriginKind = 'work_order' | 'request' | 'legacy_name_match'

interface RequestItem {
  id: string
  requestNumber: string | null
  title: string
  status: string
  priority: string
  createdAt: string | null
  dueDate: string | null
}

interface WorkOrderItem {
  id: string
  internalId: string | null
  externalId: string | null
  title: string
  status: string
  priority: string
  createdAt: string | null
  dueDate: string | null
}

interface RafItem {
  id: string
  rafNumber: string
  failureType: string | null
  occurrenceDate: string | null
  createdAt: string | null
  originKind: OriginKind
  originLabel: string | null
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let companyId: string
    try {
      companyId = requireCompanyScope(session)
    } catch {
      return NextResponse.json(
        { error: 'Empresa não definida na sessão' },
        { status: 403 }
      )
    }

    const { assetId } = await params
    if (!assetId) {
      return NextResponse.json({ error: 'assetId obrigatório' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)

    // Valida que o ativo pertence à empresa (e unidade, se aplicável)
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id, name, unitId')
      .eq('id', assetId)
      .eq('companyId', companyId)
      .maybeSingle()
    if (assetError) {
      console.error('Error loading asset for drilldown:', assetError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    if (!asset) {
      return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 })
    }
    if (effectiveUnitId && asset.unitId && asset.unitId !== effectiveUnitId) {
      return NextResponse.json({ error: 'Ativo fora do escopo' }, { status: 403 })
    }

    const canViewRequests = hasPermission(session, 'requests', 'view')
    const canViewWorkOrders = hasPermission(session, 'work-orders', 'view')
    const canViewRafs = hasPermission(session, 'rafs', 'view')

    // ── SS abertas ───────────────────────────────────────────────────────────
    let requests: RequestItem[] = []
    if (canViewRequests) {
      const { data: requestsRows, error: requestsError } = await supabase
        .from('Request')
        .select('id, requestNumber, title, status, priority, createdAt, dueDate')
        .eq('companyId', companyId)
        .eq('assetId', assetId)
        .in('status', OPEN_REQUEST_STATUSES)

      if (requestsError) {
        console.error('Error loading requests for asset drilldown:', requestsError)
      } else {
        requests = (requestsRows || []) as RequestItem[]
      }
    }

    // ── OS abertas ───────────────────────────────────────────────────────────
    let workOrders: WorkOrderItem[] = []
    if (canViewWorkOrders) {
      const { data: workOrdersRows, error: workOrdersError } = await supabase
        .from('WorkOrder')
        .select('id, internalId, externalId, title, status, priority, createdAt, dueDate')
        .eq('companyId', companyId)
        .eq('assetId', assetId)
        .eq('archived', false)
        .in('status', OPEN_WORK_ORDER_STATUSES)

      if (workOrdersError) {
        console.error('Error loading work orders for asset drilldown:', workOrdersError)
      } else {
        workOrders = (workOrdersRows || []) as WorkOrderItem[]
      }
    }

    // ── RAFs do ativo (FK primeiro, fallback por nome exato) ─────────────────
    const rafs: RafItem[] = []
    if (canViewRafs) {
      const seen = new Set<string>()

      // 1) Via WorkOrder.assetId
      const { data: rafsFromWo } = await supabase
        .from('FailureAnalysisReport')
        .select(`
          id, rafNumber, failureType, occurrenceDate, createdAt,
          workOrder:WorkOrder!workOrderId(id, internalId, assetId),
          request:Request!requestId(id, requestNumber, assetId)
        `)
        .eq('companyId', companyId)
        .not('workOrderId', 'is', null)

      for (const r of rafsFromWo || []) {
        const rec = r as unknown as {
          id: string
          rafNumber: string
          failureType: string | null
          occurrenceDate: string | null
          createdAt: string | null
          workOrder: { id: string; internalId: string | null; assetId: string | null } | null
        }
        if (rec.workOrder?.assetId === assetId && !seen.has(rec.id)) {
          seen.add(rec.id)
          rafs.push({
            id: rec.id,
            rafNumber: rec.rafNumber,
            failureType: rec.failureType,
            occurrenceDate: rec.occurrenceDate,
            createdAt: rec.createdAt,
            originKind: 'work_order',
            originLabel: rec.workOrder?.internalId || null,
          })
        }
      }

      // 2) Via Request.assetId
      const { data: rafsFromReq } = await supabase
        .from('FailureAnalysisReport')
        .select(`
          id, rafNumber, failureType, occurrenceDate, createdAt,
          request:Request!requestId(id, requestNumber, assetId)
        `)
        .eq('companyId', companyId)
        .not('requestId', 'is', null)

      for (const r of rafsFromReq || []) {
        const rec = r as unknown as {
          id: string
          rafNumber: string
          failureType: string | null
          occurrenceDate: string | null
          createdAt: string | null
          request: { id: string; requestNumber: string | null; assetId: string | null } | null
        }
        if (rec.request?.assetId === assetId && !seen.has(rec.id)) {
          seen.add(rec.id)
          rafs.push({
            id: rec.id,
            rafNumber: rec.rafNumber,
            failureType: rec.failureType,
            occurrenceDate: rec.occurrenceDate,
            createdAt: rec.createdAt,
            originKind: 'request',
            originLabel: rec.request?.requestNumber || null,
          })
        }
      }

      // 3) Legado: match exato por nome, apenas quando sem FK alguma
      const { data: rafsLegacy } = await supabase
        .from('FailureAnalysisReport')
        .select('id, rafNumber, failureType, occurrenceDate, createdAt, equipment, workOrderId, requestId')
        .eq('companyId', companyId)
        .is('workOrderId', null)
        .is('requestId', null)

      const assetNameNormalized = normalizeText(asset.name)
      if (assetNameNormalized) {
        for (const raf of rafsLegacy || []) {
          if (seen.has(raf.id)) continue
          if (normalizeText(raf.equipment) === assetNameNormalized) {
            seen.add(raf.id)
            rafs.push({
              id: raf.id,
              rafNumber: raf.rafNumber,
              failureType: raf.failureType,
              occurrenceDate: raf.occurrenceDate,
              createdAt: raf.createdAt,
              originKind: 'legacy_name_match',
              originLabel: null,
            })
          }
        }
      }
    }

    // ── Ordenação por prazo (dueDate asc NULLS LAST, depois createdAt asc) ──
    const byDueDate = (
      a: { dueDate: string | null; createdAt: string | null },
      b: { dueDate: string | null; createdAt: string | null }
    ) => {
      const aHas = a.dueDate ? 0 : 1
      const bHas = b.dueDate ? 0 : 1
      if (aHas !== bHas) return aHas - bHas
      if (a.dueDate && b.dueDate) {
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (diff !== 0) return diff
      }
      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ac - bc
    }

    requests.sort(byDueDate)
    workOrders.sort(byDueDate)

    // RAF: ordenar por occurrenceDate desc (mais recente primeiro)
    rafs.sort((a, b) => {
      const ao = a.occurrenceDate ? new Date(a.occurrenceDate).getTime() : 0
      const bo = b.occurrenceDate ? new Date(b.occurrenceDate).getTime() : 0
      return bo - ao
    })

    return NextResponse.json({
      data: {
        requests,
        workOrders,
        rafs,
      },
    })
  } catch (error) {
    console.error('Criticality drilldown error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
