import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/user-roles'

// GET - Buscar RAF por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        workOrder:WorkOrder!workOrderId(
          id,
          internalId,
          title,
          status,
          osType,
          type,
          maintenanceArea:MaintenanceArea(id, name, code),
          serviceType:ServiceType(id, code, name),
          asset:Asset(id, name, tag)
        )
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error) throw error

    if (!raf) {
      return NextResponse.json({ error: 'RAF não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: raf })
  } catch (error: any) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'RAF não encontrado' }, { status: 404 })
    }
    console.error('Error fetching RAF:', error)
    return NextResponse.json({ error: 'Erro ao buscar RAF' }, { status: 500 })
  }
}

// PUT - Atualizar RAF
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!isAdminRole(session)) {
      return NextResponse.json({ error: 'Apenas administradores podem editar RAFs' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    }

    // Campos opcionais - atualizar apenas os enviados
    if (body.occurrenceDate !== undefined) updateData.occurrenceDate = new Date(body.occurrenceDate).toISOString()
    if (body.occurrenceTime !== undefined) updateData.occurrenceTime = body.occurrenceTime
    if (body.panelOperator !== undefined) updateData.panelOperator = body.panelOperator
    if (body.stopExtension !== undefined) updateData.stopExtension = body.stopExtension
    if (body.failureBreakdown !== undefined) updateData.failureBreakdown = body.failureBreakdown
    if (body.productionLost !== undefined) updateData.productionLost = body.productionLost ? parseFloat(body.productionLost) : null
    if (body.failureDescription !== undefined) updateData.failureDescription = body.failureDescription
    if (body.observation !== undefined) updateData.observation = body.observation
    if (body.immediateAction !== undefined) updateData.immediateAction = body.immediateAction
    if (body.fiveWhys !== undefined) updateData.fiveWhys = body.fiveWhys
    if (body.hypothesisTests !== undefined) updateData.hypothesisTests = body.hypothesisTests
    if (body.failureType !== undefined) updateData.failureType = body.failureType
    if (body.actionPlan !== undefined) updateData.actionPlan = body.actionPlan

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .update(updateData)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select(`
        *,
        createdBy:User!createdById(id, firstName, lastName, email),
        workOrder:WorkOrder!workOrderId(
          id,
          internalId,
          title,
          status,
          osType,
          type,
          maintenanceArea:MaintenanceArea(id, name, code),
          serviceType:ServiceType(id, code, name),
          asset:Asset(id, name, tag)
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ data: raf })
  } catch (error) {
    console.error('Error updating RAF:', error)
    return NextResponse.json({ error: 'Erro ao atualizar RAF' }, { status: 500 })
  }
}

// DELETE - Deletar RAF
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!isAdminRole(session)) {
      return NextResponse.json({ error: 'Apenas administradores podem deletar RAFs' }, { status: 403 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('FailureAnalysisReport')
      .delete()
      .eq('id', id)
      .eq('companyId', session.companyId)

    if (error) throw error

    return NextResponse.json({ message: 'RAF deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting RAF:', error)
    return NextResponse.json({ error: 'Erro ao deletar RAF' }, { status: 500 })
  }
}
