import { supabase, generateId } from '@/lib/supabase'
import { toDecimalHours } from '@/lib/units/time'

/**
 * Copia recursos do plano de manutenção do ativo (AssetMaintenanceTaskResource)
 * para a tabela WorkOrderResource da OS recém-criada.
 *
 * Usado em 3 locais:
 * - Geração manual de OS (generate-pending)
 * - Geração automática ao criar plano (plans/route.ts)
 * - Geração por cron (generate-preventive-maintenance)
 */
export async function copyPlanResourcesToWorkOrder(
  assetMaintenancePlanId: string,
  workOrderId: string
): Promise<void> {
  try {
    // Buscar todas as tarefas (com executionTime e order) e seus recursos do plano
    const { data: tasks } = await supabase
      .from('AssetMaintenanceTask')
      .select('id, order, executionTime')
      .eq('planId', assetMaintenancePlanId)

    if (!tasks || tasks.length === 0) return

    const taskIds = tasks.map(t => t.id)
    const execTimeByTask = new Map<string, number | null>(
      tasks.map((t: { id: string; executionTime: number | null }) => [t.id, t.executionTime ?? null])
    )
    // Map AssetMaintenanceTask.id -> order. Usado para casar com a Task da OS
    // criada por copyPlanTasksToWorkOrder, que preserva o mesmo `order`.
    const orderByPlanTask = new Map<string, number>(
      tasks.map((t: { id: string; order: number }) => [t.id, t.order])
    )

    const { data: planResources } = await supabase
      .from('AssetMaintenanceTaskResource')
      .select('taskId, resourceType, resourceId, jobTitleId, userId, resourceCount, hours, unit')
      .in('taskId', taskIds)

    if (!planResources || planResources.length === 0) return

    // Buscar tasks da OS recem-criada para resolver plan.taskId -> wo.taskId via order
    const { data: woTasks } = await supabase
      .from('Task')
      .select('id, order')
      .eq('workOrderId', workOrderId)

    const woTaskIdByOrder = new Map<number, string>(
      (woTasks || []).map((t: { id: string; order: number }) => [t.order, t.id])
    )

    const woResources = planResources.map((r: {
      taskId: string
      resourceType: string | null
      resourceId: string | null
      jobTitleId: string | null
      userId: string | null
      resourceCount: number | null
      hours: number | null
      unit: string | null
    }) => {
      const type = r.resourceType || 'MATERIAL'
      const isPersonOrTool = type === 'SPECIALTY' || type === 'LABOR' || type === 'TOOL'
      const execTime = toDecimalHours(execTimeByTask.get(r.taskId) ?? null)

      // Para recursos de pessoa/ferramenta, derivar hours do executionTime da tarefa
      // (executionTime ja esta em horas decimais — sem conversao de unidade aqui)
      const derivedHours = isPersonOrTool && execTime
        ? execTime
        : (r.hours ?? null)

      // Resolver taskId destino: plan.taskId -> order -> wo.task.id
      const planOrder = orderByPlanTask.get(r.taskId)
      const woTaskId = planOrder !== undefined ? woTaskIdByOrder.get(planOrder) || null : null

      return {
        id: generateId(),
        workOrderId,
        taskId: woTaskId,
        resourceType: type,
        resourceId: r.resourceId || null,
        jobTitleId: r.jobTitleId || null,
        userId: r.userId || null,
        quantity: r.resourceCount ?? null,
        hours: derivedHours,
        unit: r.unit || null,
      }
    })

    await supabase.from('WorkOrderResource').insert(woResources)
  } catch (error) {
    console.error('Error copying plan resources to WO:', error)
  }
}

/**
 * Copia tarefas (AssetMaintenanceTask) e suas etapas (GenericStep)
 * do plano de manutenção para a tabela Task da OS recém-criada.
 */
export async function copyPlanTasksToWorkOrder(
  assetMaintenancePlanId: string,
  workOrderId: string
): Promise<void> {
  try {
    // Buscar tarefas ativas do plano
    const { data: tasks } = await supabase
      .from('AssetMaintenanceTask')
      .select('id, description, order, executionTime')
      .eq('planId', assetMaintenancePlanId)
      .eq('isActive', true)
      .order('order', { ascending: true })

    if (!tasks || tasks.length === 0) return

    const taskIds = tasks.map(t => t.id)

    // Buscar etapas de todas as tarefas com os dados do GenericStep
    const { data: taskSteps } = await supabase
      .from('AssetMaintenanceTaskStep')
      .select('taskId, order, step:GenericStep(id, name, optionType, options:GenericStepOption(id, label, order))')
      .in('taskId', taskIds)
      .order('order', { ascending: true })

    // Agrupar etapas por taskId
    type TaskStep = {
      taskId: string
      order: number
      step?: {
        id?: string
        name?: string
        optionType?: string
        options?: Array<{ id: string; label: string; order: number }>
      } | null
    }
    const stepsByTask = new Map<string, TaskStep[]>()
    for (const ts of ((taskSteps || []) as unknown as TaskStep[])) {
      const list = stepsByTask.get(ts.taskId) || []
      list.push(ts)
      stepsByTask.set(ts.taskId, list)
    }

    const now = new Date().toISOString()
    const woTasks = tasks.map((task: { id: string; description: string; order: number; executionTime: number | null }) => {
      const rawSteps = stepsByTask.get(task.id) || []
      const steps = rawSteps
        .sort((a, b) => a.order - b.order)
        .map((ts) => ({
          stepId: ts.step?.id || '',
          stepName: ts.step?.name || '',
          optionType: ts.step?.optionType || 'NONE',
          options: (ts.step?.options || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((o) => ({ id: o.id, label: o.label, order: o.order })),
        }))

      return {
        id: generateId(),
        label: task.description,
        notes: null,
        completed: false,
        order: task.order,
        executionTime: toDecimalHours(task.executionTime),
        steps: steps.length > 0 ? JSON.stringify(steps) : null,
        workOrderId,
        createdAt: now,
        updatedAt: now,
      }
    })

    await supabase.from('Task').insert(woTasks)
  } catch (error) {
    console.error('Error copying plan tasks to WO:', error)
  }
}

/**
 * Copia Task records de uma OS existente para outra OS
 * (usado na geração recorrente de preventivas por cron)
 */
export async function copyWorkOrderTasks(
  sourceWorkOrderId: string,
  targetWorkOrderId: string
): Promise<void> {
  try {
    const { data: tasks } = await supabase
      .from('Task')
      .select('label, notes, order, executionTime, steps')
      .eq('workOrderId', sourceWorkOrderId)
      .order('order', { ascending: true })

    if (!tasks || tasks.length === 0) return

    const now = new Date().toISOString()
    const newTasks = tasks.map((t: {
      label: string
      notes: string | null
      order: number
      executionTime: number | null
      steps: unknown
    }) => ({
      id: generateId(),
      label: t.label,
      notes: t.notes || null,
      completed: false,
      order: t.order,
      executionTime: toDecimalHours(t.executionTime),
      steps: t.steps || null,
      workOrderId: targetWorkOrderId,
      createdAt: now,
      updatedAt: now,
    }))

    await supabase.from('Task').insert(newTasks)
  } catch (error) {
    console.error('Error copying WO tasks:', error)
  }
}

/**
 * Copia WorkOrderResource de uma OS existente para outra OS
 * (usado na geração recorrente de preventivas por cron)
 */
export async function copyWorkOrderResources(
  sourceWorkOrderId: string,
  targetWorkOrderId: string
): Promise<void> {
  try {
    const { data: resources } = await supabase
      .from('WorkOrderResource')
      .select('resourceType, resourceId, jobTitleId, userId, quantity, hours, unit, taskId')
      .eq('workOrderId', sourceWorkOrderId)

    if (!resources || resources.length === 0) return

    // Resolver mapping de Task.id (source) -> Task.id (target) via campo `order`,
    // preservando a vinculacao de MATERIAL/TOOL com a tarefa correta na OS nova
    // (cron de OS recorrente, generate-pending, etc).
    const sourceTaskIds = Array.from(
      new Set(
        (resources as Array<{ taskId: string | null }>)
          .map((r) => r.taskId)
          .filter((tid): tid is string => !!tid)
      )
    )
    const orderBySourceTask = new Map<string, number>()
    const targetTaskIdByOrder = new Map<number, string>()
    if (sourceTaskIds.length > 0) {
      const [{ data: sourceTasks }, { data: targetTasks }] = await Promise.all([
        supabase
          .from('Task')
          .select('id, order')
          .in('id', sourceTaskIds),
        supabase
          .from('Task')
          .select('id, order')
          .eq('workOrderId', targetWorkOrderId),
      ])
      for (const t of (sourceTasks || []) as { id: string; order: number }[]) {
        orderBySourceTask.set(t.id, t.order)
      }
      for (const t of (targetTasks || []) as { id: string; order: number }[]) {
        targetTaskIdByOrder.set(t.order, t.id)
      }
    }

    const newResources = resources.map((r: {
      resourceType: string
      resourceId: string | null
      jobTitleId: string | null
      userId: string | null
      quantity: number | null
      hours: number | null
      unit: string | null
      taskId: string | null
    }) => {
      const sourceOrder = r.taskId !== null ? orderBySourceTask.get(r.taskId) : undefined
      const resolvedTaskId = sourceOrder !== undefined
        ? (targetTaskIdByOrder.get(sourceOrder) || null)
        : null
      return {
        id: generateId(),
        workOrderId: targetWorkOrderId,
        taskId: resolvedTaskId,
        resourceType: r.resourceType,
        resourceId: r.resourceId || null,
        jobTitleId: r.jobTitleId || null,
        userId: r.userId || null,
        quantity: r.quantity ?? null,
        hours: r.hours ?? null,
        unit: r.unit || null,
      }
    })

    await supabase.from('WorkOrderResource').insert(newResources)
  } catch (error) {
    console.error('Error copying WO resources:', error)
  }
}
