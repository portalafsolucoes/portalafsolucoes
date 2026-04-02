import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// Mapeamento de entidades para tabelas Supabase e configurações
const ENTITY_CONFIG: Record<string, {
  table: string
  scope: 'company' | 'unit' | 'child'  // company = compartilhado, unit = por unidade, child = filho (sem companyId direto)
  requiredFields: string[]
  orderBy?: string
}> = {
  calendars: {
    table: 'Calendar',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
  areas: {
    table: 'Area',
    scope: 'unit',
    requiredFields: ['name', 'unitId'],
    orderBy: 'name',
  },
  'cost-centers': {
    table: 'CostCenter',
    scope: 'company',
    requiredFields: ['code', 'name'],
    orderBy: 'code',
  },
  'work-centers': {
    table: 'WorkCenter',
    scope: 'unit',
    requiredFields: ['name', 'unitId'],
    orderBy: 'name',
  },
  'asset-families': {
    table: 'AssetFamily',
    scope: 'company',
    requiredFields: ['code', 'name'],
    orderBy: 'code',
  },
  'asset-family-models': {
    table: 'AssetFamilyModel',
    scope: 'child',
    requiredFields: ['name', 'familyId'],
    orderBy: 'name',
  },
  positions: {
    table: 'Position',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
  characteristics: {
    table: 'Characteristic',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
  resources: {
    table: 'Resource',
    scope: 'company',
    requiredFields: ['name', 'type'],
    orderBy: 'name',
  },
  'maintenance-types': {
    table: 'MaintenanceType',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
  'maintenance-areas': {
    table: 'MaintenanceArea',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
  'service-types': {
    table: 'ServiceType',
    scope: 'company',
    requiredFields: ['code', 'name', 'maintenanceTypeId', 'maintenanceAreaId'],
    orderBy: 'code',
  },
  'generic-tasks': {
    table: 'GenericTask',
    scope: 'company',
    requiredFields: ['code', 'name'],
    orderBy: 'code',
  },
  'generic-steps': {
    table: 'GenericStep',
    scope: 'company',
    requiredFields: ['name'],
    orderBy: 'name',
  },
}

// GET - Listar todos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity } = await params
    const config = ENTITY_CONFIG[entity]
    if (!config) {
      return NextResponse.json({ error: 'Entidade não encontrada' }, { status: 404 })
    }

    let query = supabase
      .from(config.table)
      .select('*')

    if (config.scope === 'company') {
      query = query.eq('companyId', session.companyId)
    }

    // Filtro por unitId via query param (para entidades de unidade)
    const url = new URL(request.url)
    const unitId = url.searchParams.get('unitId')
    if (config.scope === 'unit' && unitId) {
      query = query.eq('unitId', unitId)
    }

    // Filtro por familyId via query param (para entidades filhas)
    const familyId = url.searchParams.get('familyId')
    if (config.scope === 'child' && familyId) {
      query = query.eq('familyId', familyId)
    }

    if (config.orderBy) {
      query = query.order(config.orderBy, { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching ${entity}:`, error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar novo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { entity } = await params
    const config = ENTITY_CONFIG[entity]
    if (!config) {
      return NextResponse.json({ error: 'Entidade não encontrada' }, { status: 404 })
    }

    const body = await request.json()

    // Validar campos obrigatórios
    for (const field of config.requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { error: `Campo obrigatório: ${field}` },
          { status: 400 }
        )
      }
    }

    // Adicionar companyId para entidades compartilhadas
    if (config.scope === 'company') {
      body.companyId = session.companyId
    }

    // Para AssetFamilyModel, não precisa de companyId direto
    if (entity === 'asset-family-models') {
      delete body.companyId
    }

    const { data, error } = await supabase
      .from(config.table)
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error(`Error creating ${entity}:`, error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Registro duplicado' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao criar registro' }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Registro criado com sucesso' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
