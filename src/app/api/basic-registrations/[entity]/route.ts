import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { parseWorkDays, getWeeklyHours } from '@/lib/calendarUtils'

// Mapeamento de entidades para tabelas Supabase e configurações
const ENTITY_CONFIG: Record<string, {
  table: string
  scope: 'company' | 'unit' | 'child'  // company = compartilhado, unit = por unidade, child = filho (sem companyId direto)
  requiredFields: string[]
  orderBy?: string
  selectQuery?: string  // Query customizada para incluir relações (Supabase select syntax)
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
    selectQuery: '*, calendar:Calendar(name)',
  },
  'asset-families': {
    table: 'AssetFamily',
    scope: 'company',
    requiredFields: ['code', 'name'],
    orderBy: 'code',
    selectQuery: '*, modelMappings:AssetFamilyModelMapping(modelId, model:AssetFamilyModel!modelId(id, name))',
  },
  'asset-family-models': {
    table: 'AssetFamilyModel',
    scope: 'company',
    requiredFields: ['name'],
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
    selectQuery: '*, user:User!userId(id, firstName, lastName, jobTitle), calendar:Calendar(name, workDays)',
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
    selectQuery: '*, maintenanceType:MaintenanceType!maintenanceTypeId(id, name), maintenanceArea:MaintenanceArea!maintenanceAreaId(id, name)',
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
    selectQuery: '*, options:GenericStepOption(id, label, order)',
  },
  'counter-types': {
    table: 'CounterType',
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
      .select(config.selectQuery || '*')

    if (config.scope === 'company') {
      query = query.eq('companyId', session.companyId)
    }

    // Filtro por unitId (para entidades de unidade) — usa session, admin pode fazer override via query param
    const url = new URL(request.url)
    const unitIdParam = url.searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
    if (config.scope === 'unit' && effectiveUnitId) {
      query = query.eq('unitId', effectiveUnitId)
    }

    // Filtro por familyId via query param (para entidades filhas)
    const familyId = url.searchParams.get('familyId')
    if (config.scope === 'child' && familyId) {
      query = query.eq('familyId', familyId)
    }

    // Filtro por tipos (para resources: ?types=MATERIAL,TOOL)
    const types = url.searchParams.get('types')
    if (entity === 'resources' && types) {
      const typeList = types.split(',').map(t => t.trim()).filter(Boolean)
      if (typeList.length > 0) {
        query = query.in('type', typeList)
      }
    }

    if (config.orderBy) {
      query = query.order(config.orderBy, { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching ${entity}:`, error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    // Achatar relações para exibição na tabela
    let result = data || []
    if (entity === 'work-centers') {
      result = result.map((item: any) => ({
        ...item,
        calendarName: item.calendar?.name || '—',
      }))
    }
    if (entity === 'asset-families') {
      result = result.map((item: any) => ({
        ...item,
        modelNames: item.modelMappings?.map((m: any) => m.model?.name).filter(Boolean).join(', ') || '—',
      }))
    }
    if (entity === 'resources') {
      result = result.map((item: any) => {
        const workDays = item.calendar?.workDays ? parseWorkDays(item.calendar.workDays) : null
        const weeklyHrs = workDays ? getWeeklyHours(workDays) : null
        return {
          ...item,
          userName: item.user ? `${item.user.firstName} ${item.user.lastName}` : '—',
          calendarName: item.calendar?.name || '—',
          weeklyHours: weeklyHrs ? Math.round(weeklyHrs * 10) / 10 : null,
          calendar: item.calendar ? { name: item.calendar.name } : null, // remover workDays do response
        }
      })
    }

    return NextResponse.json({ data: result })
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

    // Verificar permissão de criação
    const permError = checkApiPermission(session, 'basic-registrations', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
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

    // Converter strings vazias em null (evita conflitos em unique constraints de campos opcionais)
    for (const key of Object.keys(body)) {
      if (body[key] === '') body[key] = null
    }

    // Definir updatedAt (Prisma @updatedAt não gera default no banco)
    body.updatedAt = new Date().toISOString()

    // Adicionar companyId para entidades que precisam
    if (config.scope === 'company' || entity === 'work-centers') {
      body.companyId = session.companyId
    }

    // Extrair options para generic-steps (campo virtual, não existe na tabela)
    let stepOptions: { label: string; order: number }[] | undefined
    if (entity === 'generic-steps' && body.options) {
      stepOptions = body.options
      delete body.options
    }

    // Gerar ID para a nova entidade
    body.id = generateId()

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

    // Criar opções da etapa genérica (se houver)
    if (entity === 'generic-steps' && stepOptions && stepOptions.length > 0) {
      const optionsToInsert = stepOptions.map((opt, i) => ({
        id: generateId(),
        stepId: body.id,
        label: opt.label,
        order: opt.order ?? i,
      }))
      await supabase.from('GenericStepOption').insert(optionsToInsert)
    }

    return NextResponse.json({ data, message: 'Registro criado com sucesso' }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
