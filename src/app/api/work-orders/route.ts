import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { generateInternalId, isValidExternalId, determineSystemStatus } from '@/lib/workOrderUtils'

// Função para calcular próxima data de execução
function calculateNextExecutionDate(frequency: string, value: number): Date {
  const now = new Date()
  
  switch (frequency) {
    case 'DAILY':
      now.setDate(now.getDate() + value)
      break
    case 'WEEKLY':
      now.setDate(now.getDate() + (value * 7))
      break
    case 'BIWEEKLY':
      now.setDate(now.getDate() + (value * 14))
      break
    case 'MONTHLY':
      now.setMonth(now.getMonth() + value)
      break
    case 'QUARTERLY':
      now.setMonth(now.getMonth() + (value * 3))
      break
    case 'SEMI_ANNUAL':
      now.setMonth(now.getMonth() + (value * 6))
      break
    case 'ANNUAL':
      now.setFullYear(now.getFullYear() + value)
      break
    default:
      now.setMonth(now.getMonth() + value) // Default to monthly
  }
  
  return now
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const systemStatus = searchParams.get('systemStatus')
    const assetId = searchParams.get('assetId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build query
    let query = supabase
      .from('WorkOrder')
      .select(`
        *,
        asset:Asset(*),
        location:Location!WorkOrder_locationId_fkey(*),
        createdBy:User!WorkOrder_createdById_fkey(id, firstName, lastName, email)
      `, { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('archived', false)
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    if (status) query = query.eq('status', status)
    if (systemStatus) query = query.eq('systemStatus', systemStatus)
    if (assetId) query = query.eq('assetId', assetId)

    const { data: workOrders, error, count: total } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: workOrders,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get work orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description,
      type,
      priority, 
      dueDate, 
      assetId, 
      locationId, 
      categoryId,
      assignedUserIds,
      assignedTeamIds,
      assignedToId,
      tasks,
      externalId,
      maintenanceFrequency,
      frequencyValue
    } = body
    const now = new Date().toISOString()

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Converter strings vazias para undefined
    const cleanAssetId = assetId && assetId.trim() ? assetId : undefined
    const cleanLocationId = locationId && locationId.trim() ? locationId : undefined
    const cleanCategoryId = categoryId && categoryId.trim() ? categoryId : undefined
    const cleanAssignedToId = assignedToId && assignedToId.trim() ? assignedToId : undefined
    const cleanAssignedUserIds = Array.isArray(assignedUserIds) && assignedUserIds.length > 0 
      ? assignedUserIds.filter((id: string) => id && id.trim()) 
      : undefined
    const cleanAssignedTeamIds = Array.isArray(assignedTeamIds) && assignedTeamIds.length > 0 
      ? assignedTeamIds.filter((id: string) => id && id.trim()) 
      : undefined

    // Validar e processar externalId
    let processedExternalId = null
    let internalId = null
    let systemStatus: 'IN_SYSTEM' | 'OUT_OF_SYSTEM' = 'OUT_OF_SYSTEM'

    if (externalId && externalId.trim()) {
      const cleanedExternalId = externalId.trim()
      if (isValidExternalId(cleanedExternalId)) {
        processedExternalId = cleanedExternalId
        systemStatus = 'IN_SYSTEM'
      } else {
        return NextResponse.json(
          { error: 'Número externo deve conter exatamente 6 dígitos numéricos' },
          { status: 400 }
        )
      }
    }

    // Se não tiver externalId, gerar internalId
    if (!processedExternalId) {
      internalId = await generateInternalId()
      systemStatus = 'OUT_OF_SYSTEM'
    }

    // Calcular nextExecutionDate se for preventiva
    let nextExecutionDate = null
    if (type === 'PREVENTIVE' && maintenanceFrequency) {
      nextExecutionDate = calculateNextExecutionDate(maintenanceFrequency, parseInt(frequencyValue) || 1)
    }

    // Validar se as equipes existem antes de tentar conectá-las
    let validTeamIds: string[] = []
    if (cleanAssignedTeamIds && cleanAssignedTeamIds.length > 0) {
      const { data: existingTeams } = await supabase
        .from('Team')
        .select('id')
        .in('id', cleanAssignedTeamIds)
        .eq('companyId', session.companyId)
      validTeamIds = existingTeams?.map((team: any) => team.id) || []
    }

    // Validar se os usuários existem antes de tentar conectá-los
    let validUserIds: string[] = []
    if (cleanAssignedUserIds && cleanAssignedUserIds.length > 0) {
      const { data: existingUsers } = await supabase
        .from('User')
        .select('id')
        .in('id', cleanAssignedUserIds)
        .eq('companyId', session.companyId)
      validUserIds = existingUsers?.map((user: any) => user.id) || []
    }

    // Validar assignedToId (técnico específico)
    let validAssignedToId: string | undefined = undefined
    if (cleanAssignedToId) {
      const { data: assignedUser } = await supabase
        .from('User')
        .select('id')
        .eq('id', cleanAssignedToId)
        .eq('companyId', session.companyId)
        .single()
      validAssignedToId = assignedUser?.id
    }

    // Validar assetId
    let validAssetId: string | undefined = undefined
    if (cleanAssetId) {
      const { data: asset } = await supabase
        .from('Asset')
        .select('id')
        .eq('id', cleanAssetId)
        .eq('companyId', session.companyId)
        .single()
      validAssetId = asset?.id
    }

    // Validar locationId
    let validLocationId: string | undefined = undefined
    if (cleanLocationId) {
      const { data: location } = await supabase
        .from('Location')
        .select('id')
        .eq('id', cleanLocationId)
        .eq('companyId', session.companyId)
        .single()
      validLocationId = location?.id
    }

    // Validar categoryId
    let validCategoryId: string | undefined = undefined
    if (cleanCategoryId) {
      const { data: category } = await supabase
        .from('WorkOrderCategory')
        .select('id')
        .eq('id', cleanCategoryId)
        .eq('companyId', session.companyId)
        .single()
      validCategoryId = category?.id
    }

    // Criar WorkOrder principal
    const { data: workOrder, error: woError } = await supabase
      .from('WorkOrder')
      .insert({
        id: randomUUID(),
        title,
        description,
        type: type || 'CORRECTIVE',
        priority: priority || 'NONE',
        status: 'PENDING',
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        externalId: processedExternalId,
        internalId,
        systemStatus,
        companyId: session.companyId,
        createdById: session.id,
        assetId: validAssetId || null,
        locationId: validLocationId || null,
        categoryId: validCategoryId || null,
        assignedToId: validAssignedToId || null,
        maintenanceFrequency: maintenanceFrequency || null,
        frequencyValue: frequencyValue ? parseInt(frequencyValue) : null,
        nextExecutionDate: nextExecutionDate ? nextExecutionDate.toISOString() : null,
        createdAt: now,
        updatedAt: now
      })
      .select('*')
      .single()

    if (woError || !workOrder) {
      console.error('Create work order error:', woError)
      return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
    }

    // Criar tasks se fornecidas
    if (tasks && tasks.length > 0) {
      const taskInserts = tasks.map((task: any, index: number) => ({
        id: randomUUID(),
        label: task.label,
        notes: task.notes,
        order: index,
        workOrderId: workOrder.id,
        createdAt: now,
        updatedAt: now
      }))
      await supabase.from('Task').insert(taskInserts).select()
    }

    // TODO: Adicionar relacionamentos many-to-many quando disponíveis no schema
    // Atualmente não temos tabelas de junção para assignedUsers/Teams

    return NextResponse.json(
      { data: workOrder, message: 'Work order created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
