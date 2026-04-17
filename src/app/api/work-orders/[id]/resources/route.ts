import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar recursos da OS
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: workOrderId } = await params

    // Validar que a OS pertence à empresa
    const { data: wo, error: woError } = await supabase
      .from('WorkOrder')
      .select('id')
      .eq('id', workOrderId)
      .eq('companyId', session.companyId)
      .single()
    if (woError || !wo) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    const { data: resources, error } = await supabase
      .from('WorkOrderResource')
      .select(`
        id, resourceType, quantity, hours, unit,
        resource:Resource(id, name, type, unit, unitCost),
        jobTitle:JobTitle(id, name),
        user:User(id, firstName, lastName, jobTitle, rate)
      `)
      .eq('workOrderId', workOrderId)

    if (error) throw error

    return NextResponse.json({ data: resources || [] })
  } catch (error) {
    console.error('Error fetching WO resources:', error)
    return NextResponse.json({ error: 'Erro ao buscar recursos' }, { status: 500 })
  }
}

// PUT - Substituir recursos da OS (batch replace)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: workOrderId } = await params

    const { data: wo, error: woError } = await supabase
      .from('WorkOrder')
      .select('id')
      .eq('id', workOrderId)
      .eq('companyId', session.companyId)
      .single()
    if (woError || !wo) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { resources } = body

    if (!Array.isArray(resources)) {
      return NextResponse.json({ error: 'resources deve ser um array' }, { status: 400 })
    }

    // Deletar recursos existentes
    await supabase.from('WorkOrderResource').delete().eq('workOrderId', workOrderId)

    // Inserir novos
    if (resources.length > 0) {
      const toInsert = resources.map((r: {
        resourceType: string
        resourceId?: string | null
        jobTitleId?: string | null
        userId?: string | null
        quantity?: number | null
        hours?: number | null
        unit?: string | null
      }) => ({
        id: generateId(),
        workOrderId,
        resourceType: r.resourceType,
        resourceId: r.resourceId || null,
        jobTitleId: r.jobTitleId || null,
        userId: r.userId || null,
        quantity: r.quantity ?? null,
        hours: r.hours ?? null,
        unit: r.unit || null,
      }))
      const { error: insertError } = await supabase.from('WorkOrderResource').insert(toInsert)
      if (insertError) throw insertError
    }

    return NextResponse.json({ message: 'Recursos atualizados com sucesso' })
  } catch (error) {
    console.error('Error updating WO resources:', error)
    return NextResponse.json({ error: 'Erro ao salvar recursos' }, { status: 500 })
  }
}
