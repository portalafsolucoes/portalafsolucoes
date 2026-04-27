import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession, getEffectiveUnitId } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { generateSequentialId, isValidExternalId, getPriorityFromGut } from '@/lib/workOrderUtils'
import { isOperationalRole } from '@/lib/user-roles'
import { sanitizeLimit } from '@/lib/pagination'
import { generateRafNumber } from '@/lib/rafUtils'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'

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
    const limit = sanitizeLimit(searchParams.get('limit'))
    const skip = (page - 1) * limit
    const summary = searchParams.get('summary') === 'true'
    const idsParam = searchParams.get('ids')

    const permError = checkApiPermission(session, 'work-orders', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    // Modo batch para impressão em lote (?ids=id1,id2,...): resposta sem paginação,
    // limite máximo de 50 IDs por request. A ordem de retorno preserva a ordem dos IDs.
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ data: [] })
      }
      if (ids.length > 50) {
        return NextResponse.json(
          { error: 'Máximo de 50 IDs por requisição' },
          { status: 400 }
        )
      }

      let batchQuery = supabase
        .from('WorkOrder')
        .select(`
          *,
          asset:Asset(*),
          location:Location!locationId(*),
          createdBy:User!createdById(id, firstName, lastName, email),
          maintenancePlanExec:MaintenancePlanExecution(planNumber, trackingType),
          assetMaintenancePlan:AssetMaintenancePlan(trackingType, maintenanceTime, timeUnit),
          tasks:Task(id, label, notes, completed, order, executionTime, steps),
          woResources:WorkOrderResource(
            id, resourceType, quantity, hours, unit,
            resource:Resource(id, name),
            jobTitle:JobTitle(id, name),
            user:User(id, firstName, lastName)
          )
        `)
        .in('id', ids)
        .eq('companyId', session.companyId)
        .eq('archived', false)

      const unitIdParam = searchParams.get('unitId')
      const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
      if (effectiveUnitId) batchQuery = batchQuery.eq('unitId', effectiveUnitId)
      if (isOperationalRole(session)) batchQuery = batchQuery.eq('assignedToId', session.id)

      const { data: batchData, error: batchError } = await batchQuery
      if (batchError) {
        console.error('Batch work-orders error:', batchError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Preservar ordem original dos IDs enviados
      const byId = new Map<string, unknown>()
      for (const row of batchData || []) {
        byId.set((row as { id: string }).id, row)
      }
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
      return NextResponse.json({ data: ordered })
    }

    // Build query
    let query = supabase
      .from('WorkOrder')
      .select(summary
        ? `
            id, customId, externalId, internalId, systemStatus, title, description,
            priority, status, dueDate, rescheduledDate, rescheduleCount,
            dueMeterReading, createdAt, assignedToId,
            maintenancePlanExecId,
            assetMaintenancePlanId,
            asset:Asset(name, tag, protheusCode),
            location:Location!locationId(name),
            maintenancePlanExec:MaintenancePlanExecution(planNumber, trackingType),
            assetMaintenancePlan:AssetMaintenancePlan(trackingType, maintenanceTime, timeUnit)
          `
        : `
            *,
            asset:Asset(*),
            location:Location!locationId(*),
            createdBy:User!createdById(id, firstName, lastName, email),
            maintenancePlanExec:MaintenancePlanExecution(planNumber, trackingType),
            assetMaintenancePlan:AssetMaintenancePlan(trackingType, maintenanceTime, timeUnit)
          `,
        { count: summary ? undefined : 'exact' }
      )
      .eq('companyId', session.companyId)
      .eq('archived', false)
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    // Filtrar por unidade ativa da session
    const unitIdParam = searchParams.get('unitId')
    const effectiveUnitId = getEffectiveUnitId(session, unitIdParam)
    if (effectiveUnitId) query = query.eq('unitId', effectiveUnitId)
    if (isOperationalRole(session)) query = query.eq('assignedToId', session.id)

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
      pagination: summary ? undefined : {
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

    // Verificar permissão de criação
    const permError = checkApiPermission(session, 'work-orders', 'POST')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())
    const {
      title,
      description,
      type,
      osType,
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
      frequencyValue,
      estimatedDuration,
      serviceTypeId,
      maintenanceAreaId,
      toleranceDays,
      sourceRequestId
    } = body
    const now = new Date().toISOString()

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Converter strings vazias para undefined
    const cleanSourceRequestId = sourceRequestId && typeof sourceRequestId === 'string' && sourceRequestId.trim() ? sourceRequestId.trim() : undefined
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

    // Validar SS de origem (quando OS for criada via "Emitir OS" a partir de uma solicitacao)
    let sourceRequest: { id: string; status: string; workOrderId: string | null; companyId: string } | null = null
    if (cleanSourceRequestId) {
      const { data: req } = await supabase
        .from('Request')
        .select('id, status, workOrderId, companyId')
        .eq('id', cleanSourceRequestId)
        .eq('companyId', session.companyId)
        .single()

      if (!req) {
        return NextResponse.json(
          { error: 'Solicitação de origem não encontrada' },
          { status: 404 }
        )
      }
      if (req.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Apenas solicitações aprovadas podem gerar OS' },
          { status: 400 }
        )
      }
      if (req.workOrderId) {
        return NextResponse.json(
          { error: 'Esta solicitação já possui OS vinculada' },
          { status: 409 }
        )
      }
      sourceRequest = req
    }

    // Validar externalId fornecido ou gerar sequencial
    let processedExternalId: string

    if (externalId && externalId.trim()) {
      const cleanedExternalId = externalId.trim()
      if (isValidExternalId(cleanedExternalId)) {
        processedExternalId = cleanedExternalId
      } else {
        return NextResponse.json(
          { error: 'Número externo deve conter exatamente 6 dígitos numéricos' },
          { status: 400 }
        )
      }
    } else {
      processedExternalId = await generateSequentialId()
    }

    // Calcular nextExecutionDate se for preventiva
    let nextExecutionDate = null
    if (type === 'PREVENTIVE' && maintenanceFrequency) {
      nextExecutionDate = calculateNextExecutionDate(maintenanceFrequency, parseInt(frequencyValue) || 1)
    }

    // Validar se as equipes existem antes de tentar conectá-las
    let _validTeamIds: string[] = []
    if (cleanAssignedTeamIds && cleanAssignedTeamIds.length > 0) {
      const { data: existingTeams } = await supabase
        .from('Team')
        .select('id')
        .in('id', cleanAssignedTeamIds)
        .eq('companyId', session.companyId)
      _validTeamIds = existingTeams?.map((team: { id: string }) => team.id) || []
    }

    // Validar se os usuários existem antes de tentar conectá-los
    let _validUserIds: string[] = []
    if (cleanAssignedUserIds && cleanAssignedUserIds.length > 0) {
      const { data: existingUsers } = await supabase
        .from('User')
        .select('id')
        .in('id', cleanAssignedUserIds)
        .eq('companyId', session.companyId)
      _validUserIds = existingUsers?.map((user: { id: string }) => user.id) || []
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

    // Fallback: se nao veio maintenanceAreaId mas veio serviceTypeId, herdar do ServiceType
    // Garante que toda OS criada com um tipo de servico definido tenha area preenchida,
    // evitando divergencia entre OS e dados usados nos filtros do planejamento.
    let effectiveMaintenanceAreaId: string | null = maintenanceAreaId || null
    if (!effectiveMaintenanceAreaId && serviceTypeId) {
      const { data: st } = await supabase
        .from('ServiceType')
        .select('maintenanceAreaId')
        .eq('id', serviceTypeId)
        .eq('companyId', session.companyId)
        .single()
      if (st?.maintenanceAreaId) effectiveMaintenanceAreaId = st.maintenanceAreaId
    }

    // Auto-priorização por GUT se tiver ativo vinculado e prioridade não informada
    let effectivePriority = priority || 'NONE'
    if ((!priority || priority === 'NONE') && validAssetId) {
      const { data: assetGut } = await supabase
        .from('Asset')
        .select('gutGravity, gutUrgency, gutTendency')
        .eq('id', validAssetId)
        .single()
      if (assetGut) {
        effectivePriority = getPriorityFromGut(assetGut.gutGravity, assetGut.gutUrgency, assetGut.gutTendency)
      }
    }

    // Calcular dueDate com tolerância
    let finalDueDate: string | null = dueDate ? new Date(dueDate).toISOString() : null
    if (finalDueDate && toleranceDays && Number(toleranceDays) > 0) {
      const d = new Date(finalDueDate)
      d.setDate(d.getDate() + Number(toleranceDays))
      finalDueDate = d.toISOString()
    }

    // Criar WorkOrder principal
    const { data: workOrder, error: woError } = await supabase
      .from('WorkOrder')
      .insert({
        id: generateId(),
        title,
        description,
        type: type || 'CORRECTIVE',
        priority: effectivePriority,
        status: 'PENDING',
        dueDate: finalDueDate,
        externalId: processedExternalId,
        internalId: null,
        systemStatus: 'IN_SYSTEM',
        companyId: session.companyId,
        unitId: session.unitId || null,
        createdById: session.id,
        assetId: validAssetId || null,
        locationId: validLocationId || null,
        categoryId: validCategoryId || null,
        assignedToId: validAssignedToId || null,
        osType: osType || null,
        serviceTypeId: serviceTypeId || null,
        maintenanceAreaId: effectiveMaintenanceAreaId,
        maintenanceFrequency: maintenanceFrequency || null,
        frequencyValue: frequencyValue ? parseInt(frequencyValue) : null,
        nextExecutionDate: nextExecutionDate ? nextExecutionDate.toISOString() : null,
        estimatedDuration: estimatedDuration ? Number(estimatedDuration) : null,
        sourceRequestId: sourceRequest?.id || null,
        createdAt: now,
        updatedAt: now
      })
      .select('*')
      .single()

    if (woError || !workOrder) {
      console.error('Create work order error:', woError)
      return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
    }

    // Vincular SS de origem a OS recem criada
    if (sourceRequest) {
      await supabase
        .from('Request')
        .update({
          workOrderId: workOrder.id,
          convertToWorkOrder: true,
          updatedAt: now,
        })
        .eq('id', sourceRequest.id)
    }

    // Criar tasks se fornecidas
    if (tasks && tasks.length > 0) {
      const taskInserts = tasks.map((task: {
        label: string
        notes?: string | null
        order?: number
        executionTime?: number | null
        steps?: unknown
      }, index: number) => ({
        id: generateId(),
        label: task.label,
        notes: task.notes || null,
        order: task.order ?? index,
        executionTime: task.executionTime || null,
        steps: task.steps || null,
        workOrderId: workOrder.id,
        createdAt: now,
        updatedAt: now
      }))
      await supabase.from('Task').insert(taskInserts).select()
    }

    // Criar recursos se fornecidos
    const { resources } = body
    if (Array.isArray(resources) && resources.length > 0) {
      const resourceInserts = resources.map((r: {
        resourceType: string
        resourceId?: string | null
        jobTitleId?: string | null
        userId?: string | null
        quantity?: number | null
        hours?: number | null
        unit?: string | null
      }) => ({
        id: generateId(),
        workOrderId: workOrder.id,
        resourceType: r.resourceType,
        resourceId: r.resourceId || null,
        jobTitleId: r.jobTitleId || null,
        userId: r.userId || null,
        quantity: r.quantity ?? null,
        hours: r.hours ?? null,
        unit: r.unit || null,
      }))
      await supabase.from('WorkOrderResource').insert(resourceInserts)
    }

    // Criar RAF automaticamente se OS for corretiva imediata
    let createdRaf = null
    if (osType === 'CORRECTIVE_IMMEDIATE') {
      try {
        const rafNum = await generateRafNumber(
          validAssetId || null,
          maintenanceAreaId || null,
          session.companyId
        )

        const { data: rafData } = await supabase
          .from('FailureAnalysisReport')
          .insert({
            id: generateId(),
            rafNumber: rafNum,
            occurrenceDate: now,
            occurrenceTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            panelOperator: session.firstName ? `${session.firstName} ${session.lastName || ''}`.trim() : 'N/A',
            workOrderId: workOrder.id,
            companyId: session.companyId,
            unitId: session.unitId || null,
            createdById: session.id,
            createdAt: now,
            updatedAt: now,
          })
          .select('id, rafNumber')
          .single()

        createdRaf = rafData
      } catch (rafError) {
        console.error('Error creating RAF for corrective immediate OS:', rafError)
      }
    }

    await recordAudit({
      session,
      entity: 'WorkOrder',
      entityId: workOrder.id,
      entityLabel: workOrder.internalId ?? workOrder.externalId ?? null,
      action: 'CREATE',
      after: workOrder as Record<string, unknown>,
      companyId: workOrder.companyId ?? session.companyId,
      unitId: workOrder.unitId ?? session.unitId,
    })

    if (createdRaf) {
      await recordAudit({
        session,
        entity: 'FailureAnalysisReport',
        entityId: createdRaf.id,
        entityLabel: createdRaf.rafNumber ?? null,
        action: 'CREATE',
        after: createdRaf as Record<string, unknown>,
        companyId: session.companyId,
        unitId: session.unitId,
        metadata: { event: 'CREATED_FROM_CORRECTIVE_IMMEDIATE_WO', workOrderId: workOrder.id },
      })
    }

    if (sourceRequest) {
      await recordAudit({
        session,
        entity: 'Request',
        entityId: sourceRequest.id,
        entityLabel: null,
        action: 'UPDATE',
        before: sourceRequest as unknown as Record<string, unknown>,
        after: { ...sourceRequest, workOrderId: workOrder.id, convertToWorkOrder: true },
        companyId: sourceRequest.companyId ?? session.companyId,
        unitId: session.unitId,
        metadata: { event: 'WORK_ORDER_GENERATED', workOrderId: workOrder.id },
      })
    }

    return NextResponse.json(
      { data: workOrder, raf: createdRaf, message: 'Work order created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
