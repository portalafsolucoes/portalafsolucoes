import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/admin/portal/stats
 * Estatísticas globais do portal (todas as empresas).
 * Apenas SUPER_ADMIN pode acessar.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    companiesResult,
    usersResult,
    usersActiveResult,
    unitsResult,
    workOrdersResult,
    workOrdersOpenResult,
    assetsResult,
    requestsResult,
  ] = await Promise.all([
    supabase.from('Company').select('id', { count: 'exact', head: true }),
    supabase.from('User').select('id', { count: 'exact', head: true }),
    supabase.from('User').select('id', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('Location').select('id', { count: 'exact', head: true }).is('parentId', null),
    supabase.from('WorkOrder').select('id', { count: 'exact', head: true }),
    supabase.from('WorkOrder').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_PROGRESS']),
    supabase.from('Asset').select('id', { count: 'exact', head: true }).eq('archived', false),
    supabase.from('Request').select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    companies: companiesResult.count || 0,
    users: usersResult.count || 0,
    usersActive: usersActiveResult.count || 0,
    units: unitsResult.count || 0,
    workOrders: workOrdersResult.count || 0,
    workOrdersOpen: workOrdersOpenResult.count || 0,
    assets: assetsResult.count || 0,
    requests: requestsResult.count || 0,
  })
}
