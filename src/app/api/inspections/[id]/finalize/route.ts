import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'
import { normalizeTextPayload } from '@/lib/textNormalizer'

type RouteContext = { params: Promise<{ id: string }> }

interface NokDetailInput {
  stepId: string
  title?: string
  description?: string
  priority?: string
  maintenanceAreaId?: string
  dueDate?: string | null
}

const VALID_PRIORITIES = new Set(['NONE', 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'])

async function nextRequestNumber(): Promise<string> {
  const { data: lastRequest } = await supabase
    .from('Request')
    .select('requestNumber')
    .not('requestNumber', 'is', null)
    .order('requestNumber', { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextNum = 1
  if (lastRequest?.requestNumber) {
    const num = parseInt(String(lastRequest.requestNumber).replace('SS-', ''), 10)
    if (!Number.isNaN(num)) nextNum = num + 1
  }
  return `SS-${String(nextNum).padStart(6, '0')}`
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const canonicalRole = normalizeUserRole(session)
    if (canonicalRole === 'MANUTENTOR') {
      return NextResponse.json({ error: 'Apenas gestores podem finalizar' }, { status: 403 })
    }

    const { id } = await context.params

    const { data: inspection } = await supabase
      .from('AreaInspection')
      .select('id, status, unitId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .maybeSingle()
    if (!inspection) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

    if (session.unitId && inspection.unitId !== session.unitId) {
      return NextResponse.json({ error: 'Inspeção fora da unidade ativa' }, { status: 403 })
    }

    if (inspection.status !== 'EM_REVISAO') {
      return NextResponse.json(
        { error: 'Apenas inspeções em revisão podem ser finalizadas' },
        { status: 409 }
      )
    }

    const body = normalizeTextPayload(await request.json()) as { nokDetails?: NokDetailInput[] }
    const nokDetails = Array.isArray(body.nokDetails) ? body.nokDetails : []

    // Carrega bens + steps NOK pendentes (sem requestId)
    const { data: assets } = await supabase
      .from('AreaInspectionAsset')
      .select('id, assetId')
      .eq('inspectionId', id)
    const assetById = new Map<string, { id: string; assetId: string | null }>()
    for (const a of (assets || []) as Array<{ id: string; assetId: string | null }>) {
      assetById.set(a.id, a)
    }
    const assetIds = Array.from(assetById.keys())

    if (assetIds.length === 0) {
      return NextResponse.json({ error: 'Inspeção sem bens' }, { status: 400 })
    }

    const { data: stepsRaw } = await supabase
      .from('AreaInspectionStep')
      .select('id, answer, requestId, inspectionAssetId, stepName')
      .in('inspectionAssetId', assetIds)

    type StepRow = {
      id: string
      answer: string | null
      requestId: string | null
      inspectionAssetId: string
      stepName: string
    }
    const allSteps = (stepsRaw || []) as StepRow[]

    // NOKs sem SS ainda
    const pendingNoks = allSteps.filter((s) => s.answer === 'NOK' && !s.requestId)
    const detailByStep = new Map(nokDetails.map((d) => [d.stepId, d]))

    // Validação: cada NOK pendente precisa de detalhe completo
    const missingDetails: string[] = []
    for (const step of pendingNoks) {
      const d = detailByStep.get(step.id)
      if (!d || !d.title || !d.maintenanceAreaId) {
        missingDetails.push(step.id)
      }
    }
    if (missingDetails.length > 0) {
      return NextResponse.json(
        {
          error: 'Existem NOKs sem dados completos para gerar SS (título e área de manutenção obrigatórios)',
          missing: missingDetails,
        },
        { status: 400 }
      )
    }

    // Validar maintenanceAreas (uma query agregada)
    const areaIds = Array.from(
      new Set(
        pendingNoks
          .map((s) => detailByStep.get(s.id)?.maintenanceAreaId)
          .filter((a): a is string => !!a)
      )
    )
    if (areaIds.length > 0) {
      const { data: validAreas } = await supabase
        .from('MaintenanceArea')
        .select('id')
        .in('id', areaIds)
        .eq('companyId', session.companyId)
      const valid = new Set(((validAreas || []) as Array<{ id: string }>).map((a) => a.id))
      const invalid = areaIds.filter((a) => !valid.has(a))
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: 'Área de manutenção inválida para esta empresa', invalid },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()
    const createdRequestIds: string[] = []

    // Cria SSs em sequência (manter rastreio para rollback)
    for (const step of pendingNoks) {
      const d = detailByStep.get(step.id)
      if (!d) continue
      const requestNumber = await nextRequestNumber()
      const requestId = generateId()
      const priority =
        d.priority && VALID_PRIORITIES.has(d.priority) ? d.priority : 'NORMAL'
      const asset = assetById.get(step.inspectionAssetId)

      const { error: createError } = await supabase
        .from('Request')
        .insert({
          id: requestId,
          requestNumber,
          title: d.title || step.stepName,
          description: d.description || null,
          priority,
          status: 'PENDING',
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
          assetId: asset?.assetId || null,
          maintenanceAreaId: d.maintenanceAreaId,
          teamApprovalStatus: 'PENDING',
          convertToWorkOrder: false,
          companyId: session.companyId,
          unitId: session.unitId || null,
          createdById: session.id,
          inspectionId: id,
          createdAt: now,
          updatedAt: now,
        })
      if (createError) {
        console.error('Create request from inspection error:', createError)
        // Rollback
        if (createdRequestIds.length > 0) {
          await supabase.from('Request').delete().in('id', createdRequestIds)
        }
        return NextResponse.json({ error: 'Erro ao gerar SS', details: createError.message }, { status: 500 })
      }
      createdRequestIds.push(requestId)

      // Vincula step <- request
      const { error: linkError } = await supabase
        .from('AreaInspectionStep')
        .update({ requestId, updatedAt: now })
        .eq('id', step.id)
      if (linkError) {
        console.error('Link step->request error:', linkError)
        if (createdRequestIds.length > 0) {
          await supabase.from('Request').delete().in('id', createdRequestIds)
        }
        return NextResponse.json({ error: 'Erro ao vincular SS à etapa' }, { status: 500 })
      }
    }

    // Marca inspeção como FINALIZADA
    const { error: updateError } = await supabase
      .from('AreaInspection')
      .update({
        status: 'FINALIZADO',
        finalizedAt: now,
        finalizedById: session.id,
        updatedAt: now,
      })
      .eq('id', id)
    if (updateError) {
      console.error('Finalize inspection error:', updateError)
      // Rollback das SSs criadas
      if (createdRequestIds.length > 0) {
        await supabase.from('Request').delete().in('id', createdRequestIds)
        // Limpar requestId das steps
        await supabase
          .from('AreaInspectionStep')
          .update({ requestId: null, updatedAt: now })
          .in('requestId', createdRequestIds)
      }
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        id,
        status: 'FINALIZADO',
        createdRequests: createdRequestIds.length,
      },
    })
  } catch (error) {
    console.error('Finalize error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
