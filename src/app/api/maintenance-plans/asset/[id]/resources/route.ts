import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

/**
 * GET /api/maintenance-plans/asset/[id]/resources
 *
 * Retorna todos os recursos vinculados às tarefas de um plano de manutenção,
 * incluindo informações de calendário de cada recurso.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id: planId } = await params

    // Buscar tarefas do plano
    const { data: tasks, error: tasksError } = await supabase
      .from('AssetMaintenanceTask')
      .select('id')
      .eq('planId', planId)

    if (tasksError) throw tasksError
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const taskIds = tasks.map(t => t.id)

    // Buscar recursos das tarefas com dados de calendário
    const { data: taskResources, error: resError } = await supabase
      .from('AssetMaintenanceTaskResource')
      .select(`
        id,
        resourceId,
        resourceCount,
        quantity,
        unit,
        resource:Resource!resourceId(
          id,
          name,
          type,
          unit,
          unitCost,
          calendarId,
          calendar:Calendar!calendarId(id, name)
        )
      `)
      .in('taskId', taskIds)

    if (resError) throw resError

    // Deduplica recursos e formata
    const resourceMap = new Map<string, any>()
    for (const tr of (taskResources || [])) {
      const resource = tr.resource as any
      if (!resource) continue
      if (!resourceMap.has(tr.resourceId)) {
        resourceMap.set(tr.resourceId, {
          resourceId: tr.resourceId,
          resourceName: resource.name,
          resourceType: resource.type,
          unit: resource.unit,
          unitCost: resource.unitCost,
          calendarId: resource.calendarId,
          calendarName: resource.calendar?.name || null,
          totalCount: tr.resourceCount || 1,
          totalQuantity: tr.quantity || 0,
        })
      } else {
        const existing = resourceMap.get(tr.resourceId)
        existing.totalCount += (tr.resourceCount || 1)
        existing.totalQuantity += (tr.quantity || 0)
      }
    }

    return NextResponse.json({ data: Array.from(resourceMap.values()) })
  } catch (error) {
    console.error('Error fetching plan resources:', error)
    return NextResponse.json({ error: 'Erro ao buscar recursos do plano' }, { status: 500 })
  }
}
