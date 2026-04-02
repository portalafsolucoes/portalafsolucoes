import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar todos os RAFs
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: rafs, error } = await supabase
      .from('FailureAnalysisReport')
      .select('*, createdBy:User!createdById(id, firstName, lastName, email)')
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: rafs })
  } catch (error) {
    console.error('Error fetching RAFs:', error)
    return NextResponse.json({ error: 'Erro ao buscar RAFs' }, { status: 500 })
  }
}

// POST - Criar novo RAF
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    if (session.role !== 'GESTOR' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem criar RAFs' }, { status: 403 })
    }

    const body = await request.json()

    const { data: raf, error } = await supabase
      .from('FailureAnalysisReport')
      .insert({
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
        actionPlan: body.actionPlan || [],
        companyId: session.companyId,
        createdById: session.id
      })
      .select('*, createdBy:User!createdById(id, firstName, lastName, email)')
      .single()

    if (error) throw error

    return NextResponse.json({ data: raf }, { status: 201 })
  } catch (error) {
    console.error('Error creating RAF:', error)
    return NextResponse.json({ error: 'Erro ao criar RAF' }, { status: 500 })
  }
}
