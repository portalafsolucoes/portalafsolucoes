import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import { markAsOverridden } from '@/lib/maintenance-plans/standardSync'
import { recordAudit } from '@/lib/audit/recordAudit'

// GET - Detalhe do plano do bem com tarefas, etapas e recursos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    const { data: plan, error } = await supabase
      .from('AssetMaintenancePlan')
      .select(`
        *,
        asset:Asset!assetId(id, name, tag, protheusCode, familyId, familyModelId,
          family:AssetFamily!familyId(id, code, name),
          familyModel:AssetFamilyModel!familyModelId(id, name)
        ),
        serviceType:ServiceType!serviceTypeId(id, code, name),
        maintenanceArea:MaintenanceArea!maintenanceAreaId(id, name),
        maintenanceType:MaintenanceType!maintenanceTypeId(id, name),
        calendar:Calendar!calendarId(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      throw error
    }

    // Buscar tarefas com etapas e recursos
    const { data: tasks } = await supabase
      .from('AssetMaintenanceTask')
      .select('*')
      .eq('planId', id)
      .order('order')

    if (tasks) {
      for (const task of tasks) {
        const [stepsRes, resourcesRes] = await Promise.all([
          supabase.from('AssetMaintenanceTaskStep')
            .select('*, step:GenericStep!stepId(id, name, protheusCode, optionType, options:GenericStepOption(id, label, order))')
            .eq('taskId', task.id)
            .order('order'),
          supabase.from('AssetMaintenanceTaskResource')
            .select('*, resource:Resource(id, name, type, unit), jobTitle:JobTitle(id, name), user:User(id, firstName, lastName, jobTitle)')
            .eq('taskId', task.id),
        ])
        task.steps = stepsRes.data || []
        task.resources = resourcesRes.data || []
      }
    }

    return NextResponse.json({ data: { ...plan, tasks: tasks || [] } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar plano do bem
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const body = normalizeTextPayload(await request.json())

    delete body.id
    delete body.companyId
    delete body.createdAt
    delete body.asset
    delete body.serviceType
    delete body.maintenanceArea
    delete body.maintenanceType
    delete body.calendar
    delete body.tasks
    body.updatedAt = new Date().toISOString()

    // Sanitizar FKs opcionais: string vazia → null
    if (!body.maintenanceAreaId) body.maintenanceAreaId = null
    if (!body.maintenanceTypeId) body.maintenanceTypeId = null
    if (!body.calendarId) body.calendarId = null
    if (!body.standardPlanId) body.standardPlanId = null

    const { data: prev } = await supabase
      .from('AssetMaintenancePlan')
      .select('*')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('AssetMaintenancePlan')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Fase 4: editar campos estruturais do plano marca como customizado (se vier de padrao).
    // markAsOverridden e no-op quando standardPlanId e null ou ja esta marcado.
    if (session.companyId) {
      await markAsOverridden(id, session.id, session.companyId)
    }

    if (prev) {
      await recordAudit({
        session,
        entity: 'AssetMaintenancePlan',
        entityId: id,
        entityLabel: prev.name ?? data?.name ?? null,
        action: 'UPDATE',
        before: prev as Record<string, unknown>,
        after: data as Record<string, unknown>,
        companyId: prev.companyId ?? session.companyId,
        unitId: session.unitId,
      })
    }

    return NextResponse.json({ data, message: 'Plano atualizado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params

    const { data: prev } = await supabase
      .from('AssetMaintenancePlan')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('AssetMaintenancePlan').delete().eq('id', id)
    if (error) throw error

    if (prev) {
      await recordAudit({
        session,
        entity: 'AssetMaintenancePlan',
        entityId: id,
        entityLabel: prev.name ?? null,
        action: 'DELETE',
        before: prev as Record<string, unknown>,
        companyId: prev.companyId ?? session.companyId,
        unitId: session.unitId,
      })
    }

    return NextResponse.json({ message: 'Plano excluído' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
