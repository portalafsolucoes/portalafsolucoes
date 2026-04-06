import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Dashboard corporativo (apenas SUPER_ADMIN)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 })
    }

    // Buscar unidades e todos os dados em paralelo (elimina N+1 queries)
    const [
      { data: units },
      { data: allWOs },
      { data: allAssets },
      { data: allRequests },
      { data: allUsers }
    ] = await Promise.all([
      supabase.from('Location').select('id, name, address').eq('companyId', session.companyId).order('name'),
      supabase.from('WorkOrder').select('id, status, type, unitId').eq('companyId', session.companyId).limit(10000),
      supabase.from('Asset').select('id, unitId').eq('companyId', session.companyId).eq('archived', false).limit(10000),
      supabase.from('Request').select('id, unitId, status').eq('companyId', session.companyId).eq('status', 'PENDING').limit(5000),
      supabase.from('User').select('id, unitId').eq('companyId', session.companyId).eq('enabled', true).limit(5000),
    ])

    // Agrupar dados por unitId em memória (muito mais rápido que N queries)
    const woByUnit = new Map<string, typeof allWOs>()
    for (const wo of (allWOs || [])) {
      const list = woByUnit.get(wo.unitId) || []
      list.push(wo)
      woByUnit.set(wo.unitId, list)
    }

    const assetCountByUnit = new Map<string, number>()
    for (const a of (allAssets || [])) {
      assetCountByUnit.set(a.unitId, (assetCountByUnit.get(a.unitId) || 0) + 1)
    }

    const pendingReqByUnit = new Map<string, number>()
    for (const r of (allRequests || [])) {
      pendingReqByUnit.set(r.unitId, (pendingReqByUnit.get(r.unitId) || 0) + 1)
    }

    const userCountByUnit = new Map<string, number>()
    for (const u of (allUsers || [])) {
      userCountByUnit.set(u.unitId, (userCountByUnit.get(u.unitId) || 0) + 1)
    }

    const unitSummaries = (units || []).map(unit => {
      const woList = woByUnit.get(unit.id) || []
      const completed = woList.filter(w => w.status === 'COMPLETE').length
      const pending = woList.filter(w => ['PENDING', 'RELEASED'].includes(w.status)).length
      const inProgress = woList.filter(w => w.status === 'IN_PROGRESS').length
      const correctives = woList.filter(w => w.type === 'CORRECTIVE').length
      const preventives = woList.filter(w => w.type === 'PREVENTIVE').length

      return {
        unit: { id: unit.id, name: unit.name },
        assets: assetCountByUnit.get(unit.id) || 0,
        users: userCountByUnit.get(unit.id) || 0,
        pendingRequests: pendingReqByUnit.get(unit.id) || 0,
        workOrders: { total: woList.length, completed, pending, inProgress, correctives, preventives },
      }
    })

    // Totais corporativos
    const totals = {
      units: (units || []).length,
      assets: unitSummaries.reduce((sum, u) => sum + u.assets, 0),
      users: unitSummaries.reduce((sum, u) => sum + u.users, 0),
      workOrders: unitSummaries.reduce((sum, u) => sum + u.workOrders.total, 0),
      completedWOs: unitSummaries.reduce((sum, u) => sum + u.workOrders.completed, 0),
      pendingWOs: unitSummaries.reduce((sum, u) => sum + u.workOrders.pending, 0),
      pendingRequests: unitSummaries.reduce((sum, u) => sum + u.pendingRequests, 0),
    }

    const response = NextResponse.json({ data: { totals, units: unitSummaries } })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('Corporate dashboard error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
