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

    // Buscar todas as unidades (agora são Localizações)
    const { data: units } = await supabase
      .from('Location')
      .select('id, name, address')
      .eq('companyId', session.companyId)
      .order('name')

    const unitSummaries = []

    for (const unit of (units || [])) {
      // Contar OSs por status
      const { data: wos } = await supabase
        .from('WorkOrder')
        .select('id, status, type')
        .eq('unitId', unit.id)

      // Contar ativos
      const { count: assetCount } = await supabase
        .from('Asset')
        .select('id', { count: 'exact', head: true })
        .eq('unitId', unit.id)
        .eq('archived', false)

      // Contar SSs pendentes
      const { count: pendingRequests } = await supabase
        .from('Request')
        .select('id', { count: 'exact', head: true })
        .eq('unitId', unit.id)
        .eq('status', 'PENDING')

      // Contar usuários
      const { count: userCount } = await supabase
        .from('User')
        .select('id', { count: 'exact', head: true })
        .eq('unitId', unit.id)
        .eq('enabled', true)

      const woList = wos || []
      const completed = woList.filter(w => w.status === 'COMPLETE').length
      const pending = woList.filter(w => ['PENDING', 'RELEASED'].includes(w.status)).length
      const inProgress = woList.filter(w => w.status === 'IN_PROGRESS').length
      const correctives = woList.filter(w => w.type === 'CORRECTIVE').length
      const preventives = woList.filter(w => w.type === 'PREVENTIVE').length

      unitSummaries.push({
        unit: { id: unit.id, name: unit.name },
        assets: assetCount || 0,
        users: userCount || 0,
        pendingRequests: pendingRequests || 0,
        workOrders: {
          total: woList.length,
          completed,
          pending,
          inProgress,
          correctives,
          preventives,
        },
      })
    }

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

    return NextResponse.json({ data: { totals, units: unitSummaries } })
  } catch (error) {
    console.error('Corporate dashboard error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
