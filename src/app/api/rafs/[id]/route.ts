import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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
      .select('*, createdBy:User!createdById(id, firstName, lastName, email)')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error) throw error

    if (!raf) {
      return NextResponse.json({ error: 'RAF não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: raf })
  } catch (error: any) {
    // Supabase returns PGRST116 when .single() finds no rows
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

    // Verificar se é admin
    if (session.role !== 'GESTOR' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem editar RAFs' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .update({
        rafNumber: body.rafNumber,
        area: body.area,
        equipment: body.equipment,
        occurrenceDate: new Date(body.occurrenceDate).toISOString(),
        occurrenceTime: body.occurrenceTime,
        panelOperator: body.panelOperator,
        stopExtension: body.stopExtension || false,
        failureBreakdown: body.failureBreakdown || false,
        productionLost: body.productionLost ? parseFloat(body.productionLost) : null,
        failureDescription: body.failureDescription,
        observation: body.observation,
        immediateAction: body.immediateAction,
        fiveWhys: body.fiveWhys || [],
        hypothesisTests: body.hypothesisTests || [],
        failureType: body.failureType || 'RANDOM',
        actionPlan: body.actionPlan || []
      })
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select('*, createdBy:User!createdById(id, firstName, lastName, email)')
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

    // Verificar se é admin
    if (session.role !== 'GESTOR' && session.role !== 'SUPER_ADMIN') {
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
