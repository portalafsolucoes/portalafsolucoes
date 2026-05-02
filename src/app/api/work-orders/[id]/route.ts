import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { isOperationalRole, normalizeUserRole } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { recordAudit } from '@/lib/audit/recordAudit'
import { toDecimalHours, diffHours } from '@/lib/units/time'
import {
  isTaskResourcesAllowed,
  validateTaskResources,
  validateLaborUsers,
  insertTaskResources,
  type TaskResourcePayload,
} from '@/lib/workOrders/taskResources'

// Mesmo helper do POST: valida janela planejada e deriva executionTime
// quando ambos os timestamps existirem.
function normalizeTaskWindow(task: {
  plannedStart?: string | Date | null
  plannedEnd?: string | Date | null
  executionTime?: number | string | null
}): { plannedStart: string | null; plannedEnd: string | null; executionTime: number | null; error?: string } {
  const psRaw = task.plannedStart ?? null
  const peRaw = task.plannedEnd ?? null
  const ps = psRaw ? new Date(psRaw) : null
  const pe = peRaw ? new Date(peRaw) : null
  if (ps && Number.isNaN(ps.getTime())) return { plannedStart: null, plannedEnd: null, executionTime: null, error: 'Data/hora de inicio invalida' }
  if (pe && Number.isNaN(pe.getTime())) return { plannedStart: null, plannedEnd: null, executionTime: null, error: 'Data/hora de fim invalida' }
  if ((ps && !pe) || (!ps && pe)) {
    return { plannedStart: null, plannedEnd: null, executionTime: null, error: 'Preencha ambos os campos de previsao (inicio e fim) ou nenhum' }
  }
  if (ps && pe && pe.getTime() < ps.getTime()) {
    return { plannedStart: null, plannedEnd: null, executionTime: null, error: 'Fim previsto deve ser posterior ao inicio previsto' }
  }
  let executionTime = toDecimalHours(task.executionTime ?? null)
  if (ps && pe) executionTime = diffHours(ps, pe)
  return {
    plannedStart: ps ? ps.toISOString() : null,
    plannedEnd: pe ? pe.toISOString() : null,
    executionTime,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const permError = checkApiPermission(session, 'work-orders', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    let query = supabase
      .from('WorkOrder')
      .select(`
        *,
        asset:Asset(*, parentAsset:Asset!parentAssetId(id, name, parentAssetId, parentAsset:Asset!parentAssetId(id, name, parentAssetId))),
        location:Location!locationId(*),
        createdBy:User!createdById(id, firstName, lastName, email, image),
        completedBy:User!completedById(id, firstName, lastName, email),
        assignedTo:User!assignedToId(id, firstName, lastName),
        tasks:Task(
          *,
          resources:TaskResource(
            id, resourceType, hours, quantity,
            user:User(id, firstName, lastName),
            jobTitle:JobTitle(id, name)
          )
        ),
        woResources:WorkOrderResource(id, resourceType, quantity, hours, unit, resource:Resource(id, name), jobTitle:JobTitle(id, name), user:User(id, firstName, lastName)),
        files:File(*),
        sourceRequest:Request(
          *,
          files:File(*),
          createdBy:User!createdById(id, firstName, lastName, email)
        ),
        assetMaintenancePlan:AssetMaintenancePlan(id, name, sequence),
        maintenancePlanExec:MaintenancePlanExecution(id, planNumber),
        serviceType:ServiceType(id, code, name),
        maintenanceArea:MaintenanceArea(id, name, code),
        raf:FailureAnalysisReport(id, rafNumber),
        rescheduleHistory:WorkOrderRescheduleHistory(
          id, previousDate, newDate, previousStatus, wasOverdue, reason, createdAt,
          user:User!userId(id, firstName, lastName)
        )
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (isOperationalRole(session)) query = query.eq('assignedToId', session.id)

    const { data: workOrder, error } = await query.single()

    if (error || !workOrder) {
      console.error('Get work order error:', error)
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Buscar equipes atribuídas via tabela de junção
    let assignedTeams: { id: string; name: string }[] = []
    const { data: teamLinks } = await supabase
      .from('_WorkOrderTeams')
      .select('B')
      .eq('A', id)

    if (teamLinks && teamLinks.length > 0) {
      const teamIds = teamLinks.map((l: { B: string }) => l.B)
      const { data: teams } = await supabase
        .from('Team')
        .select('id, name')
        .in('id', teamIds)
      assignedTeams = teams || []
    }

    return NextResponse.json({ data: { ...workOrder, assignedTeams } })
  } catch (error) {
    console.error('Get work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar permissão de edição
    const permError = checkApiPermission(session, 'work-orders', 'PATCH')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = normalizeTextPayload(await request.json())

    // Verificar se a OS existe e pertence à empresa (capturando estado completo para auditoria)
    let existingQuery = supabase
      .from('WorkOrder')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (isOperationalRole(session)) existingQuery = existingQuery.eq('assignedToId', session.id)
    const { data: workOrder, error: findError } = await existingQuery.single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Validar relacoes em paralelo
    const [assignedResult, assetResult, locationResult, categoryResult] = await Promise.all([
      body.assignedToId
        ? supabase.from('User').select('id, role').eq('id', body.assignedToId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.assetId
        ? supabase.from('Asset').select('id').eq('id', body.assetId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.locationId
        ? supabase.from('Location').select('id').eq('id', body.locationId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.categoryId
        ? supabase.from('WorkOrderCategory').select('id').eq('id', body.categoryId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
    ])

    if (assignedResult.data && normalizeUserRole((assignedResult.data as { role?: string | null }).role) !== 'MANUTENTOR') {
      return NextResponse.json(
        { error: 'Apenas pessoas com papel Manutentor podem ser executantes de OS' },
        { status: 400 }
      )
    }

    const validAssignedToId = assignedResult.data ? body.assignedToId : null
    const validAssetId = assetResult.data ? body.assetId : null
    const validLocationId = locationResult.data ? body.locationId : null
    const validCategoryId = categoryResult.data ? body.categoryId : null

    // Validar equipes se fornecido
    let validTeamIds: string[] = []
    if (body.assignedTeamIds && Array.isArray(body.assignedTeamIds)) {
      const { data: teams } = await supabase
        .from('Team')
        .select('id')
        .in('id', body.assignedTeamIds)
        .eq('companyId', session.companyId)
      validTeamIds = (teams || []).map((t: { id: string }) => t.id)
    }

    // Validar usuários se fornecido
    let validUserIds: string[] = []
    if (body.assignedUserIds && Array.isArray(body.assignedUserIds)) {
      const { data: users } = await supabase
        .from('User')
        .select('id')
        .in('id', body.assignedUserIds)
        .eq('companyId', session.companyId)
      validUserIds = (users || []).map((u: { id: string }) => u.id)
    }

    // Calcular dueDate com tolerancia (mesmo padrao do POST)
    let finalDueDate: string | null = body.dueDate ? new Date(body.dueDate).toISOString() : null
    if (finalDueDate && body.toleranceDays && Number(body.toleranceDays) > 0) {
      const d = new Date(finalDueDate)
      d.setDate(d.getDate() + Number(body.toleranceDays))
      finalDueDate = d.toISOString()
    }

    // Sincronizar title com a primeira tarefa quando tasks vier no payload
    // (mesma convencao do POST: title = primeira tarefa)
    let effectiveTitle: unknown = body.title
    if (Array.isArray(body.tasks) && body.tasks.length > 0) {
      const firstTaskLabel = (body.tasks[0] as { label?: string }).label
      if (firstTaskLabel && firstTaskLabel.trim()) {
        effectiveTitle = firstTaskLabel
      }
    }

    // Preparar dados de atualização
    const updateData: Record<string, unknown> = {
      title: effectiveTitle,
      description: body.description,
      type: body.type,
      osType: body.osType !== undefined ? (body.osType || null) : undefined,
      priority: body.priority,
      status: body.status,
      dueDate: finalDueDate,
      completedOn: body.completedOn ? new Date(body.completedOn).toISOString() : null,
      assetId: validAssetId,
      locationId: validLocationId,
      categoryId: validCategoryId,
      assignedToId: validAssignedToId,
      serviceTypeId: body.serviceTypeId !== undefined ? (body.serviceTypeId || null) : undefined,
      maintenanceAreaId: body.maintenanceAreaId !== undefined ? (body.maintenanceAreaId || null) : undefined,
      maintenanceFrequency: body.maintenanceFrequency || null,
      frequencyValue: body.frequencyValue ? parseInt(body.frequencyValue) : null,
      externalId: body.externalId || null,
      estimatedDuration: body.estimatedDuration !== undefined ? toDecimalHours(body.estimatedDuration) : undefined
    }

    // Atualizar a work order
    const { data: updatedWorkOrder, error: updateError } = await supabase
      .from('WorkOrder')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        asset:Asset(*),
        location:Location!locationId(*),
        category:WorkOrderCategory(*),
        tasks:Task(*)
      `)
      .single()

    if (updateError) throw updateError

    // Sync de tasks/etapas: quando o body traz `tasks`, substituimos integralmente
    // o conjunto atual (delete + insert). Etapas viajam como array nativo dentro de
    // cada task (campo `steps` Json?) — nao stringificar para nao corromper chaves.
    if (Array.isArray(body.tasks)) {
      type IncomingTask = {
        label?: string
        notes?: string | null
        order?: number
        executionTime?: number | string | null
        plannedStart?: string | Date | null
        plannedEnd?: string | Date | null
        steps?: unknown
        resources?: TaskResourcePayload[]
      }
      const incomingTasks = body.tasks as IncomingTask[]
      const validTasks = incomingTasks.filter((t) => t && typeof t.label === 'string' && t.label.trim())

      // Validar janela planejada antes de qualquer DELETE para nao deixar a OS
      // com tasks inconsistentes em caso de payload invalido.
      const taskWindows = validTasks.map((task) => normalizeTaskWindow(task))
      for (let i = 0; i < taskWindows.length; i++) {
        const w = taskWindows[i]
        if (w.error) {
          return NextResponse.json(
            { error: `Tarefa ${i + 1}: ${w.error}` },
            { status: 400 }
          )
        }
      }

      // Gating de mao de obra por tarefa: usa o assetMaintenancePlanId
      // ja persistido na OS (ou null para OSs manuais).
      const planId = (workOrder as { assetMaintenancePlanId?: string | null }).assetMaintenancePlanId || null
      const allowsTaskResources = await isTaskResourcesAllowed(planId, session.companyId)
      const taskResourcesByIndex: TaskResourcePayload[][] = validTasks.map((t) =>
        Array.isArray(t.resources) ? t.resources : []
      )
      const hasAnyTaskResources = taskResourcesByIndex.some((r) => r.length > 0)
      if (hasAnyTaskResources && !allowsTaskResources) {
        return NextResponse.json(
          { error: 'Mao de obra por tarefa so e permitida em OSs manuais ou de plano UNICA' },
          { status: 400 }
        )
      }
      for (let i = 0; i < taskResourcesByIndex.length; i++) {
        const shapeError = validateTaskResources(taskResourcesByIndex[i])
        if (shapeError) {
          return NextResponse.json(
            { error: `Tarefa ${i + 1}: ${shapeError}` },
            { status: 400 }
          )
        }
      }
      const allLaborResources = taskResourcesByIndex.flat()
      const laborError = await validateLaborUsers(allLaborResources, session.companyId)
      if (laborError) {
        return NextResponse.json({ error: laborError }, { status: 400 })
      }

      const { error: deleteTasksError } = await supabase
        .from('Task')
        .delete()
        .eq('workOrderId', id)
      if (deleteTasksError) throw deleteTasksError

      if (validTasks.length > 0) {
        const nowIso = new Date().toISOString()
        const taskInserts = validTasks.map((task, index) => ({
          id: generateId(),
          label: task.label as string,
          notes: task.notes || null,
          order: task.order ?? index,
          executionTime: taskWindows[index].executionTime,
          plannedStart: taskWindows[index].plannedStart,
          plannedEnd: taskWindows[index].plannedEnd,
          steps: task.steps || null,
          workOrderId: id,
          createdAt: nowIso,
          updatedAt: nowIso,
        }))
        const { error: insertTasksError } = await supabase.from('Task').insert(taskInserts)
        if (insertTasksError) throw insertTasksError

        // Persistir TaskResource por tarefa
        for (let index = 0; index < taskInserts.length; index++) {
          const resources = taskResourcesByIndex[index]
          if (resources.length === 0) continue
          await insertTaskResources(taskInserts[index].id, resources)
        }
      }
    }

    // Sync de recursos (woResources): mesmo padrao — quando `resources` esta no body,
    // substituimos integralmente para refletir o estado do formulario.
    if (Array.isArray(body.resources)) {
      type IncomingResource = {
        resourceType?: string
        resourceId?: string | null
        jobTitleId?: string | null
        userId?: string | null
        quantity?: number | null
        hours?: number | null
        unit?: string | null
      }
      const incomingResources = body.resources as IncomingResource[]

      const { error: deleteResError } = await supabase
        .from('WorkOrderResource')
        .delete()
        .eq('workOrderId', id)
      if (deleteResError) throw deleteResError

      if (incomingResources.length > 0) {
        const resourceInserts = incomingResources.map((r) => ({
          id: generateId(),
          workOrderId: id,
          resourceType: r.resourceType || 'MATERIAL',
          resourceId: r.resourceId || null,
          jobTitleId: r.jobTitleId || null,
          userId: r.userId || null,
          quantity: r.quantity ?? null,
          hours: r.hours ?? null,
          unit: r.unit || null,
        }))
        const { error: insertResError } = await supabase.from('WorkOrderResource').insert(resourceInserts)
        if (insertResError) throw insertResError
      }
    }

    // Processar equipes na tabela de junção
    if (body.assignedTeamIds !== undefined) {
      // Remover associações existentes
      await supabase
        .from('_WorkOrderTeams')
        .delete()
        .eq('A', id)

      // Inserir novas associações
      if (validTeamIds.length > 0) {
        const teamInserts = validTeamIds.map((teamId: string) => ({
          A: id,
          B: teamId
        }))
        await supabase.from('_WorkOrderTeams').insert(teamInserts)
      }
    }

    // Processar usuários na tabela de junção
    if (body.assignedUserIds !== undefined) {
      // Remover associações existentes
      await supabase
        .from('_WorkOrderUsers')
        .delete()
        .eq('A', id)

      // Inserir novas associações
      if (validUserIds.length > 0) {
        const userInserts = validUserIds.map((userId: string) => ({
          A: id,
          B: userId
        }))
        await supabase.from('_WorkOrderUsers').insert(userInserts)
      }
    }

    // Buscar usuários atribuídos para a resposta
    const { data: assignedUsers } = await supabase
      .from('_WorkOrderUsers')
      .select('B')
      .eq('A', id)

    let assignedUserDetails: Array<{ id: string; firstName: string; lastName: string; email: string }> = []
    if (assignedUsers && assignedUsers.length > 0) {
      const userIds = assignedUsers.map((u: { B: string }) => u.B)
      const { data: users } = await supabase
        .from('User')
        .select('id, firstName, lastName, email')
        .in('id', userIds)
      assignedUserDetails = (users || []) as Array<{ id: string; firstName: string; lastName: string; email: string }>
    }

    await recordAudit({
      session,
      entity: 'WorkOrder',
      entityId: id,
      entityLabel: workOrder.internalId ?? workOrder.externalId ?? null,
      action: 'UPDATE',
      before: workOrder as Record<string, unknown>,
      after: updatedWorkOrder as Record<string, unknown>,
      companyId: workOrder.companyId ?? session.companyId,
      unitId: workOrder.unitId ?? session.unitId,
    })

    return NextResponse.json({
      data: { ...updatedWorkOrder, assignedUsers: assignedUserDetails },
      message: 'Work order updated successfully'
    })
  } catch (error) {
    console.error('Update work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar permissão de exclusão
    const permError = checkApiPermission(session, 'work-orders', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    // Verificar se a OS existe e pertence à empresa (capturando estado completo para auditoria)
    const { data: workOrder, error: findError } = await supabase
      .from('WorkOrder')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('WorkOrder')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    await recordAudit({
      session,
      entity: 'WorkOrder',
      entityId: id,
      entityLabel: workOrder.internalId ?? workOrder.externalId ?? null,
      action: 'DELETE',
      before: workOrder as Record<string, unknown>,
      companyId: workOrder.companyId ?? session.companyId,
      unitId: workOrder.unitId ?? session.unitId,
    })

    return NextResponse.json({
      message: 'Work order deleted successfully'
    })
  } catch (error) {
    console.error('Delete work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
