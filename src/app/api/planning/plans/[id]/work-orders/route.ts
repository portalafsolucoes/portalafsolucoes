import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar OSs vinculadas a um plano de manutenção
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    // Verificar se o plano pertence à empresa
    const { data: plan, error: planError } = await supabase
      .from('MaintenancePlanExecution')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Buscar OSs abertas (não concluídas/canceladas) vinculadas ao plano
    const { data: workOrders, error: woError } = await supabase
      .from('WorkOrder')
      .select('id, internalId, customId, externalId, title, status, priority, type, dueDate, plannedStartDate, createdAt, asset:Asset!assetId(id, name, tag)')
      .eq('maintenancePlanExecId', id)
      .neq('status', 'COMPLETE')
      .order('createdAt', { ascending: false })

    if (woError) {
      console.error('Error querying work orders for plan:', id, woError)
      throw woError
    }

    return NextResponse.json({ data: workOrders || [] })
  } catch (error) {
    console.error('Error fetching plan work orders:', error)
    return NextResponse.json({ error: 'Erro ao buscar ordens de serviço' }, { status: 500 })
  }
}
