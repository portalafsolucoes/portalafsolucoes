import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// DELETE - Excluir plano (somente se nenhuma OS foi liberada para execução)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'plans', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    // Verificar se o plano existe e pertence à empresa
    const { data: plan, error: planError } = await supabase
      .from('MaintenancePlanExecution')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Verificar se alguma OS do plano já foi liberada (status diferente de PENDING)
    const { data: releasedOrders, error: woError } = await supabase
      .from('WorkOrder')
      .select('id, status')
      .eq('maintenancePlanExecId', id)
      .neq('status', 'PENDING')

    if (woError) throw woError

    if (releasedOrders && releasedOrders.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir este plano. Existem OSs que já foram liberadas para execução.' },
        { status: 409 }
      )
    }

    // Excluir OSs vinculadas (todas PENDING)
    const { error: deleteWoError } = await supabase
      .from('WorkOrder')
      .delete()
      .eq('maintenancePlanExecId', id)

    if (deleteWoError) throw deleteWoError

    // Excluir o plano
    const { error: deletePlanError } = await supabase
      .from('MaintenancePlanExecution')
      .delete()
      .eq('id', id)

    if (deletePlanError) throw deletePlanError

    return NextResponse.json({ message: 'Plano excluído com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao excluir plano' }, { status: 500 })
  }
}
