import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId')
    const assetId = searchParams.get('assetId')

    // Se pediu detalhes de um ativo específico, retornar OSs, SSs e PAs pendentes
    if (assetId) {
      const [woRes, ssRes, rafRes] = await Promise.all([
        supabase.from('WorkOrder')
          .select('id, title, status, priority, plannedStartDate, type')
          .eq('assetId', assetId)
          .in('status', ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD'])
          .order('createdAt', { ascending: false }),
        supabase.from('Request')
          .select('id, title, status, priority, createdAt')
          .eq('assetId', assetId)
          .in('status', ['PENDING', 'APPROVED'])
          .order('createdAt', { ascending: false }),
        supabase.from('FailureAnalysisReport')
          .select('id, rafNumber, equipment, actionPlan, createdAt')
          .eq('companyId', session.companyId)
          .order('createdAt', { ascending: false }),
      ])

      // Filtrar RAFs que mencionam o ativo e têm ações pendentes
      const rafsWithPendingActions = (rafRes.data || []).filter((raf: any) => {
        if (!raf.actionPlan) return false
        const actions = Array.isArray(raf.actionPlan) ? raf.actionPlan : []
        return actions.some((a: any) => a.status !== 'DONE')
      })

      return NextResponse.json({
        data: {
          workOrders: woRes.data || [],
          requests: ssRes.data || [],
          rafs: rafsWithPendingActions,
        }
      })
    }

    // Buscar unidades (agora são Localizações)
    const { data: units, error: unitsError } = await supabase
      .from('Location')
      .select('id, name, address')
      .eq('companyId', session.companyId)
      .order('name')
    if (unitsError) throw unitsError

    // Se especificou unitId, buscar áreas e ativos dessa unidade
    if (unitId) {
      const [areasRes, workCentersRes, assetsRes] = await Promise.all([
        supabase.from('Area')
          .select('id, name')
          .eq('unitId', unitId)
          .order('name'),
        supabase.from('WorkCenter')
          .select('id, name, areaId')
          .eq('unitId', unitId)
          .order('name'),
        supabase.from('Asset')
          .select('id, name, tag, parentAssetId, status, areaId, workCenterId, unitId')
          .eq('unitId', unitId)
          .eq('archived', false)
          .order('name'),
      ])

      return NextResponse.json({
        data: {
          units: units || [],
          areas: areasRes.data || [],
          workCenters: workCentersRes.data || [],
          assets: assetsRes.data || [],
        }
      })
    }

    return NextResponse.json({ data: { units: units || [] } })
  } catch (error) {
    console.error('Tree API error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
