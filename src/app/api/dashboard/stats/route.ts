import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'

// GET - Retorna contagens agregadas para o dashboard (sem carregar registros inteiros)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = session.companyId
    const { searchParams } = new URL(request.url)
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)

    // Helper para aplicar filtro de unidade
    const withUnit = (q: any) => effectiveUnitId ? q.eq('unitId', effectiveUnitId) : q

    // Serializar em 3 batches para evitar rate limit do Supabase
    const [woTotal, woOpen, woInProgress] = await Promise.all([
      withUnit(supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId)),
      withUnit(supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'PENDING')),
      withUnit(supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'IN_PROGRESS')),
    ])

    const [woCompleted, assetsTotal, assetsOperational] = await Promise.all([
      withUnit(supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'COMPLETE')),
      withUnit(supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false)),
      withUnit(supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false).eq('status', 'OPERATIONAL')),
    ])

    const [assetsDown, reqTotal, reqPending] = await Promise.all([
      withUnit(supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false).eq('status', 'DOWN')),
      withUnit(supabase.from('Request').select('id', { count: 'exact', head: true }).eq('companyId', companyId)),
      withUnit(supabase.from('Request').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'PENDING')),
    ])

    const response = NextResponse.json({
      data: {
        workOrders: {
          total: woTotal.count || 0,
          open: woOpen.count || 0,
          inProgress: woInProgress.count || 0,
          completed: woCompleted.count || 0,
        },
        assets: {
          total: assetsTotal.count || 0,
          operational: assetsOperational.count || 0,
          down: assetsDown.count || 0,
        },
        requests: {
          total: reqTotal.count || 0,
          pending: reqPending.count || 0,
        },
      }
    })

    // Cache por 30 segundos, revalidar em background por até 60s
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
