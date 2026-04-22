import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { hasPermission } from '@/lib/permissions'

// Janela de tempo suportada
type Period = '30d' | '90d' | '12m'

interface WoRow {
  id: string
  type: string | null
  status: string
  osType: string | null
  createdAt: string
  completedOn: string | null
  dueDate: string | null
  rescheduledDate: string | null
  rescheduleCount: number | null
  actualDuration: number | null
  laborCost: number | null
  partsCost: number | null
  thirdPartyCost: number | null
  toolsCost: number | null
  assetId: string | null
  realMaintenanceStart: string | null
  realMaintenanceEnd: string | null
  realStopStart: string | null
  realStopEnd: string | null
}

interface AssetRow {
  id: string
  name: string | null
  tag: string | null
  status: string | null
  gutGravity: number | null
  gutUrgency: number | null
  gutTendency: number | null
}

interface RequestRow {
  id: string
  status: string
  createdAt: string
}

interface RafRow {
  id: string
  status: string | null
  actionPlan: unknown
}

const CORRECTIVE_TYPES = new Set(['CORRECTIVE', 'CORRECTIVE_IMMEDIATE', 'CORRECTIVE_PLANNED'])
const PREVENTIVE_TYPES = new Set(['PREVENTIVE', 'PREVENTIVE_MANUAL'])

function isCorrective(w: WoRow): boolean {
  return (
    (w.type && CORRECTIVE_TYPES.has(w.type)) ||
    (w.osType && CORRECTIVE_TYPES.has(w.osType)) ||
    false
  )
}
function isPreventive(w: WoRow): boolean {
  return (
    (w.type && PREVENTIVE_TYPES.has(w.type)) ||
    (w.osType && PREVENTIVE_TYPES.has(w.osType)) ||
    false
  )
}

function periodBounds(period: Period): { start: Date; previousStart: Date; buckets: number; bucketKind: 'month' | 'week' } {
  const start = new Date()
  const previousStart = new Date()
  let buckets = 12
  let bucketKind: 'month' | 'week' = 'month'

  if (period === '30d') {
    start.setDate(start.getDate() - 30)
    previousStart.setDate(previousStart.getDate() - 60)
    buckets = 6
    bucketKind = 'week'
  } else if (period === '90d') {
    start.setDate(start.getDate() - 90)
    previousStart.setDate(previousStart.getDate() - 180)
    buckets = 13
    bucketKind = 'week'
  } else {
    start.setMonth(start.getMonth() - 12)
    previousStart.setMonth(previousStart.getMonth() - 24)
    buckets = 12
    bucketKind = 'month'
  }
  return { start, previousStart, buckets, bucketKind }
}

function bucketKey(d: Date, kind: 'month' | 'week'): string {
  if (kind === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  // Semana ISO simplificada: ano-W##
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function bucketLabel(key: string, kind: 'month' | 'week'): string {
  if (kind === 'month') {
    const [y, m] = key.split('-')
    const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
    return `${MESES[Number(m) - 1]}/${y.slice(2)}`
  }
  const [, w] = key.split('-W')
  return `S${w}`
}

function enumerateBuckets(start: Date, kind: 'month' | 'week'): string[] {
  const keys: string[] = []
  const cur = new Date(start)
  const now = new Date()
  if (kind === 'month') {
    cur.setUTCDate(1)
    while (cur <= now) {
      keys.push(bucketKey(cur, 'month'))
      cur.setUTCMonth(cur.getUTCMonth() + 1)
    }
  } else {
    while (cur <= now) {
      keys.push(bucketKey(cur, 'week'))
      cur.setUTCDate(cur.getUTCDate() + 7)
    }
  }
  return Array.from(new Set(keys))
}

function diffHours(a: string | null, b: string | null): number {
  if (!a || !b) return 0
  const av = new Date(a).getTime()
  const bv = new Date(b).getTime()
  return Math.max(0, (bv - av) / 3600000)
}

function woCost(w: WoRow): number {
  return (w.laborCost || 0) + (w.partsCost || 0) + (w.thirdPartyCost || 0) + (w.toolsCost || 0)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!hasPermission(session, 'dashboard', 'view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    // SUPER_ADMIN sem companyId usa CorporateDashboard (rota separada)
    if (!session.companyId) {
      return NextResponse.json({ error: 'Empresa não definida na sessão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodParam = (searchParams.get('period') || '12m') as Period
    const period: Period = periodParam === '30d' || periodParam === '90d' ? periodParam : '12m'
    const unitIdParam = searchParams.get('unitId')
    const unitId = getEffectiveUnitId(session, unitIdParam)

    const { start, previousStart, bucketKind } = periodBounds(period)
    const now = new Date()

    // Buscar WOs do período atual + anterior em uma única query (para calcular delta)
    // Depois dividimos em memória
    let woQuery = supabase
      .from('WorkOrder')
      .select(
        'id, type, status, osType, createdAt, completedOn, dueDate, rescheduledDate, rescheduleCount, actualDuration, laborCost, partsCost, thirdPartyCost, toolsCost, assetId, realMaintenanceStart, realMaintenanceEnd, realStopStart, realStopEnd'
      )
      .eq('companyId', session.companyId)
      .gte('createdAt', previousStart.toISOString())
      .limit(20000)
    if (unitId) woQuery = woQuery.eq('unitId', unitId)

    let assetQuery = supabase
      .from('Asset')
      .select('id, name, tag, status, gutGravity, gutUrgency, gutTendency')
      .eq('companyId', session.companyId)
      .eq('archived', false)
      .limit(5000)
    if (unitId) assetQuery = assetQuery.eq('unitId', unitId)

    let reqQuery = supabase
      .from('Request')
      .select('id, status, createdAt')
      .eq('companyId', session.companyId)
      .gte('createdAt', start.toISOString())
      .limit(10000)
    if (unitId) reqQuery = reqQuery.eq('unitId', unitId)

    let pendingReqQuery = supabase
      .from('Request')
      .select('id', { count: 'exact', head: true })
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')
    if (unitId) pendingReqQuery = pendingReqQuery.eq('unitId', unitId)

    let rafQuery = supabase
      .from('FailureAnalysisReport')
      .select('id, status, actionPlan')
      .eq('companyId', session.companyId)
      .limit(5000)
    if (unitId) rafQuery = rafQuery.eq('unitId', unitId)

    const [woRes, assetRes, reqRes, reqPendRes, rafRes] = await Promise.all([
      woQuery,
      assetQuery,
      reqQuery,
      pendingReqQuery,
      rafQuery,
    ])

    const allWos = (woRes.data || []) as WoRow[]
    const assets = (assetRes.data || []) as AssetRow[]
    const requests = (reqRes.data || []) as RequestRow[]
    const pendingRequestsCount = reqPendRes.count || 0
    const rafs = (rafRes.data || []) as RafRow[]

    const wosCurrent = allWos.filter(w => new Date(w.createdAt) >= start)
    const wosPrevious = allWos.filter(w => new Date(w.createdAt) >= previousStart && new Date(w.createdAt) < start)

    // ============ KPIs ============
    function kpisFor(rows: WoRow[]) {
      const completed = rows.filter(w => w.status === 'COMPLETE')
      const correctives = rows.filter(isCorrective)
      const preventives = rows.filter(isPreventive)
      const completedCorr = completed.filter(isCorrective)
      const completedPrev = completed.filter(isPreventive)
      const pending = rows.filter(w => ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status))

      // MTBF
      let totalUptime = 0
      for (const wo of completedCorr) {
        if (wo.realStopStart && wo.realMaintenanceStart) {
          totalUptime += diffHours(wo.realStopStart, wo.realMaintenanceStart)
        }
      }
      const mtbf = completedCorr.length > 0 ? Math.round((totalUptime / completedCorr.length) * 10) / 10 : 0

      // MTTR
      let totalRepair = 0
      let repairCount = 0
      for (const wo of completedCorr) {
        if (wo.actualDuration) {
          totalRepair += wo.actualDuration / 60
          repairCount++
        } else if (wo.realMaintenanceStart && wo.realMaintenanceEnd) {
          totalRepair += diffHours(wo.realMaintenanceStart, wo.realMaintenanceEnd)
          repairCount++
        }
      }
      const mttr = repairCount > 0 ? Math.round((totalRepair / repairCount) * 10) / 10 : 0

      const availability = mtbf + mttr > 0 ? Math.round((mtbf / (mtbf + mttr)) * 1000) / 10 : 100

      // PMC
      const pmc = preventives.length > 0
        ? Math.round((completedPrev.length / preventives.length) * 1000) / 10
        : 0

      // Taxa de Reprogramação
      const reprogrammed = rows.filter(w => (w.rescheduleCount || 0) > 0)
      const reschedulingRate = rows.length > 0
        ? Math.round((reprogrammed.length / rows.length) * 1000) / 10
        : 0

      // Backlog em horas
      let backlogHours = 0
      for (const wo of pending) backlogHours += (wo.actualDuration || 120) / 60
      const backlogWeeks = Math.round((backlogHours / 40) * 10) / 10

      // Custo total
      let totalCost = 0
      for (const wo of completed) totalCost += woCost(wo)

      return {
        totalWos: rows.length,
        completedWos: completed.length,
        pendingWos: pending.length,
        correctiveCount: correctives.length,
        preventiveCount: preventives.length,
        mtbf,
        mttr,
        availability,
        pmc,
        reschedulingRate,
        backlogWeeks,
        totalCost,
      }
    }

    const current = kpisFor(wosCurrent)
    const previous = kpisFor(wosPrevious)

    function delta(cur: number, prev: number): number | null {
      if (prev === 0) return null
      return Math.round(((cur - prev) / prev) * 1000) / 10
    }

    // ============ Séries temporais ============
    const bucketKeys = enumerateBuckets(start, bucketKind)
    const bucketMap = new Map<string, { mtbfSum: number; mtbfCount: number; mttrSum: number; mttrCount: number; completedPrev: number; totalPrev: number; cost: number; wosCompleted: number; correctives: number; preventives: number }>()
    for (const k of bucketKeys) {
      bucketMap.set(k, { mtbfSum: 0, mtbfCount: 0, mttrSum: 0, mttrCount: 0, completedPrev: 0, totalPrev: 0, cost: 0, wosCompleted: 0, correctives: 0, preventives: 0 })
    }
    for (const w of wosCurrent) {
      const key = bucketKey(new Date(w.createdAt), bucketKind)
      const b = bucketMap.get(key)
      if (!b) continue
      if (isCorrective(w)) b.correctives++
      if (isPreventive(w)) b.preventives++
      if (w.status === 'COMPLETE') {
        b.wosCompleted++
        b.cost += woCost(w)
      }
      if (isPreventive(w)) {
        b.totalPrev++
        if (w.status === 'COMPLETE') b.completedPrev++
      }
      if (isCorrective(w) && w.status === 'COMPLETE') {
        if (w.realStopStart && w.realMaintenanceStart) {
          b.mtbfSum += diffHours(w.realStopStart, w.realMaintenanceStart)
          b.mtbfCount++
        }
        if (w.actualDuration) {
          b.mttrSum += w.actualDuration / 60
          b.mttrCount++
        } else if (w.realMaintenanceStart && w.realMaintenanceEnd) {
          b.mttrSum += diffHours(w.realMaintenanceStart, w.realMaintenanceEnd)
          b.mttrCount++
        }
      }
    }
    const series = bucketKeys.map(k => {
      const b = bucketMap.get(k)!
      const mtbf = b.mtbfCount > 0 ? Math.round((b.mtbfSum / b.mtbfCount) * 10) / 10 : 0
      const mttr = b.mttrCount > 0 ? Math.round((b.mttrSum / b.mttrCount) * 10) / 10 : 0
      const availability = mtbf + mttr > 0 ? Math.round((mtbf / (mtbf + mttr)) * 1000) / 10 : 0
      const pmc = b.totalPrev > 0 ? Math.round((b.completedPrev / b.totalPrev) * 1000) / 10 : 0
      return {
        key: k,
        label: bucketLabel(k, bucketKind),
        mtbf,
        mttr,
        availability,
        pmc,
        cost: Math.round(b.cost * 100) / 100,
        wosCompleted: b.wosCompleted,
        correctives: b.correctives,
        preventives: b.preventives,
      }
    })

    // ============ Breakdown OS por status ============
    const statusLabels: Record<string, string> = {
      PENDING: 'PENDENTE',
      RELEASED: 'LIBERADA',
      IN_PROGRESS: 'EM ANDAMENTO',
      ON_HOLD: 'EM ESPERA',
      COMPLETE: 'CONCLUIDA',
      CANCELLED: 'CANCELADA',
      REPROGRAMMED: 'REPROGRAMADA',
    }
    const statusMap = new Map<string, number>()
    for (const w of wosCurrent) {
      statusMap.set(w.status, (statusMap.get(w.status) || 0) + 1)
    }
    const woByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      label: statusLabels[status] || status,
      count,
    }))

    // ============ Breakdown tipo ============
    const correctives = wosCurrent.filter(isCorrective).length
    const preventives = wosCurrent.filter(isPreventive).length
    const others = wosCurrent.length - correctives - preventives
    const woByType = [
      { key: 'PREVENTIVE', label: 'PREVENTIVAS', count: preventives },
      { key: 'CORRECTIVE', label: 'CORRETIVAS', count: correctives },
      { key: 'OTHER', label: 'OUTRAS', count: others },
    ]

    // ============ Custo por categoria ============
    const completedCurrent = wosCurrent.filter(w => w.status === 'COMPLETE')
    const costBreakdown = {
      labor: Math.round(completedCurrent.reduce((s, w) => s + (w.laborCost || 0), 0) * 100) / 100,
      parts: Math.round(completedCurrent.reduce((s, w) => s + (w.partsCost || 0), 0) * 100) / 100,
      thirdParty: Math.round(completedCurrent.reduce((s, w) => s + (w.thirdPartyCost || 0), 0) * 100) / 100,
      tools: Math.round(completedCurrent.reduce((s, w) => s + (w.toolsCost || 0), 0) * 100) / 100,
    }

    // ============ Top 10 ativos ============
    const assetStats = new Map<string, { count: number; cost: number }>()
    for (const w of wosCurrent) {
      if (!w.assetId) continue
      const cur = assetStats.get(w.assetId) || { count: 0, cost: 0 }
      cur.count++
      if (w.status === 'COMPLETE') cur.cost += woCost(w)
      assetStats.set(w.assetId, cur)
    }
    const assetsById = new Map<string, AssetRow>()
    for (const a of assets) assetsById.set(a.id, a)
    const topAssets = Array.from(assetStats.entries())
      .map(([id, s]) => {
        const a = assetsById.get(id)
        return {
          id,
          name: a?.name || '—',
          tag: a?.tag || '',
          count: s.count,
          totalCost: Math.round(s.cost * 100) / 100,
        }
      })
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost)
      .slice(0, 10)

    // ============ Matriz GUT (quadrantes) ============
    const gutBuckets = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    for (const a of assets) {
      const g = a.gutGravity || 0
      const u = a.gutUrgency || 0
      const t = a.gutTendency || 0
      if (!g && !u && !t) continue
      const score = g * u * t
      if (score >= 100) gutBuckets.critical++
      else if (score >= 50) gutBuckets.high++
      else if (score >= 25) gutBuckets.medium++
      else gutBuckets.low++
    }

    // ============ Alertas operacionais ============
    const nowIso = now.toISOString()
    const overdueWos = allWos.filter(w =>
      !['COMPLETE', 'CANCELLED'].includes(w.status) &&
      w.dueDate &&
      w.dueDate < nowIso
    ).length
    const rescheduledWos = allWos.filter(w => (w.rescheduleCount || 0) >= 2 && !['COMPLETE', 'CANCELLED'].includes(w.status)).length

    // RAF: ações com prazo vencido
    const todayYmd = now.toISOString().slice(0, 10)
    let overdueRafActions = 0
    let openRafs = 0
    let finalizedRafs = 0
    for (const raf of rafs) {
      if (raf.status === 'FINALIZADA') finalizedRafs++
      else openRafs++
      const plan = Array.isArray(raf.actionPlan) ? (raf.actionPlan as Array<{ status?: string; deadline?: string }>) : []
      for (const item of plan) {
        if (item.status === 'COMPLETED') continue
        if (!item.deadline) continue
        const dl = typeof item.deadline === 'string' ? item.deadline.slice(0, 10) : ''
        // Aceita ISO e dd/mm/yyyy
        let ymd = dl
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dl)) {
          const [d, m, y] = dl.split('/')
          ymd = `${y}-${m}-${d}`
        }
        if (ymd && ymd < todayYmd) overdueRafActions++
      }
    }

    const downAssets = assets.filter(a => a.status === 'DOWN').length

    const alerts = {
      overdueWos,
      rescheduledWos,
      pendingRequests: pendingRequestsCount,
      overdueRafActions,
      downAssets,
      openRafs,
      finalizedRafs,
    }

    // ============ Requests stats do período ============
    const requestsBreakdown = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
    }

    return NextResponse.json({
      data: {
        period,
        range: { start: start.toISOString(), end: now.toISOString(), bucketKind },
        kpis: {
          totalWos: { value: current.totalWos, delta: delta(current.totalWos, previous.totalWos) },
          completedWos: { value: current.completedWos, delta: delta(current.completedWos, previous.completedWos) },
          mtbf: { value: current.mtbf, delta: delta(current.mtbf, previous.mtbf) },
          mttr: { value: current.mttr, delta: delta(current.mttr, previous.mttr) },
          availability: { value: current.availability, delta: delta(current.availability, previous.availability) },
          pmc: { value: current.pmc, delta: delta(current.pmc, previous.pmc) },
          reschedulingRate: { value: current.reschedulingRate, delta: delta(current.reschedulingRate, previous.reschedulingRate) },
          backlogWeeks: { value: current.backlogWeeks, delta: delta(current.backlogWeeks, previous.backlogWeeks) },
          totalCost: { value: Math.round(current.totalCost * 100) / 100, delta: delta(current.totalCost, previous.totalCost) },
        },
        series,
        woByStatus,
        woByType,
        costBreakdown,
        topAssets,
        gutBuckets,
        alerts,
        requestsBreakdown,
        assets: {
          total: assets.length,
          operational: assets.filter(a => a.status === 'OPERATIONAL').length,
          down: downAssets,
        },
      },
    })
  } catch (error) {
    console.error('Dashboard overview error:', error)
    return NextResponse.json({ error: 'Erro ao montar dashboard' }, { status: 500 })
  }
}
