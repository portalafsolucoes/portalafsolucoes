import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

const TABLE_MAP: Record<string, string> = {
  calendars: 'Calendar',
  areas: 'Area',
  'cost-centers': 'CostCenter',
  'work-centers': 'WorkCenter',
  'asset-families': 'AssetFamily',
  'asset-family-models': 'AssetFamilyModel',
  positions: 'Position',
  characteristics: 'Characteristic',
  resources: 'Resource',
  'maintenance-types': 'MaintenanceType',
  'maintenance-areas': 'MaintenanceArea',
  'service-types': 'ServiceType',
  'generic-tasks': 'GenericTask',
  'generic-steps': 'GenericStep',
}

// GET - Buscar por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity, id } = await params
    const table = TABLE_MAP[entity]
    if (!table) {
      return NextResponse.json({ error: 'Entidade não encontrada' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity, id } = await params
    const table = TABLE_MAP[entity]
    if (!table) {
      return NextResponse.json({ error: 'Entidade não encontrada' }, { status: 404 })
    }

    const body = await request.json()

    // Remover campos que não devem ser atualizados
    delete body.id
    delete body.createdAt
    delete body.companyId

    // Atualizar updatedAt
    body.updatedAt = new Date().toISOString()

    const { data, error } = await supabase
      .from(table)
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Registro duplicado' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data, message: 'Registro atualizado com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity, id } = await params
    const table = TABLE_MAP[entity]
    if (!table) {
      return NextResponse.json({ error: 'Entidade não encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Não é possível excluir: registro está sendo usado por outros cadastros' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ message: 'Registro excluído com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
