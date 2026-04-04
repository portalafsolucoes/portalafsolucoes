import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Retorna contagens agregadas para o dashboard (sem carregar registros inteiros)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = session.companyId

    // Fazer todas as contagens em paralelo usando count queries (sem transferir dados)
    const [
      woTotal, woOpen, woInProgress, woCompleted,
      assetsTotal, assetsOperational, assetsDown,
      reqTotal, reqPending
    ] = await Promise.all([
      supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'PENDING'),
      supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'IN_PROGRESS'),
      supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'COMPLETE'),
      supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false),
      supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false).eq('status', 'OPERATIONAL'),
      supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('archived', false).eq('status', 'DOWN'),
      supabase.from('Request').select('id', { count: 'exact', head: true }).eq('companyId', companyId),
      supabase.from('Request').select('id', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'PENDING'),
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
