import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeTextPayload } from '@/lib/textNormalizer'
import {
  moveOverdueItemToNewSchedule,
  revertMovedItemForWorkOrder,
} from '@/lib/scheduleStatus'

// GET - Listar itens da programação com dados completos das OSs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    // Verificar que a programação pertence à empresa
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('WorkOrderScheduleItem')
      .select(`
        id, scheduledDate, status,
        workOrder:WorkOrder!workOrderId(
          id, externalId, internalId, title, description, status, priority, type,
          dueDate, plannedStartDate, estimatedDuration,
          asset:Asset!assetId(id, name, tag),
          serviceType:ServiceType!serviceTypeId(id, name)
        )
      `)
      .eq('scheduleId', id)
      .order('scheduledDate', { ascending: true })

    if (itemsError) throw itemsError

    return NextResponse.json({ data: items || [] })
  } catch (error) {
    console.error('Error fetching schedule items:', error)
    return NextResponse.json({ error: 'Erro ao buscar itens da programação' }, { status: 500 })
  }
}

// PUT - Atualizar itens da programação (adicionar/remover OSs, alterar datas)
// Ao adicionar uma OS atrasada vinda de outra programação CONFIRMED/PARTIALLY_EXECUTED,
// marca o item antigo como MOVED (preserva histórico) e recomputa o status da antiga.
// Ao remover uma OS que havia sido movida, reverte o item antigo para PENDING.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'schedules', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    const { items } = body // Array de { workOrderId, scheduledDate }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items deve ser um array' }, { status: 400 })
    }

    // Verificar que a programação existe e está editável
    const { data: schedule, error: schedError } = await supabase
      .from('WorkOrderSchedule')
      .select('id, status')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json({ error: 'Programação não encontrada' }, { status: 404 })
    }

    if (schedule.status !== 'DRAFT' && schedule.status !== 'REPROGRAMMING') {
      return NextResponse.json(
        { error: 'Apenas programações em rascunho ou reprogramação podem ter itens alterados' },
        { status: 409 }
      )
    }

    // Carregar snapshot atual dos itens para detectar mudancas de data e remocoes
    const { data: existingItems } = await supabase
      .from('WorkOrderScheduleItem')
      .select('workOrderId, scheduledDate')
      .eq('scheduleId', id)

    const existingByWO = new Map<string, string>()
    for (const it of existingItems || []) {
      existingByWO.set(it.workOrderId, String(it.scheduledDate).split('T')[0])
    }

    // Conjuntos para detectar adicionadas vs removidas
    const incomingWoIds = new Set<string>(
      (items as { workOrderId: string }[]).map(it => it.workOrderId)
    )
    const removedWoIds: string[] = []
    for (const woId of existingByWO.keys()) {
      if (!incomingWoIds.has(woId)) removedWoIds.push(woId)
    }
    const addedWoIds: string[] = []
    for (const woId of incomingWoIds) {
      if (!existingByWO.has(woId)) addedWoIds.push(woId)
    }

    // Remover itens existentes e reinserir (mantendo comportamento atual)
    const { error: deleteError } = await supabase
      .from('WorkOrderScheduleItem')
      .delete()
      .eq('scheduleId', id)

    if (deleteError) throw deleteError

    // Inserir novos itens
    if (items.length > 0) {
      const newItems = items.map((item: { workOrderId: string; scheduledDate: string }) => {
        // Preservar a data exata sem deslocamento de timezone
        const dateStr = item.scheduledDate.split('T')[0]
        return {
          id: generateId(),
          scheduleId: id,
          workOrderId: item.workOrderId,
          scheduledDate: `${dateStr}T12:00:00.000Z`,
          status: 'PENDING',
        }
      })

      const { error: insertError } = await supabase
        .from('WorkOrderScheduleItem')
        .insert(newItems)

      if (insertError) throw insertError
    }

    // Regra de OS atrasada reprogramada (status REPROGRAMMED + rescheduledDate):
    // Para cada item cuja scheduledDate mudou em relacao ao snapshot, se a OS estiver
    // atrasada (dueDate < hoje e status nao final), preencher rescheduledDate e marcar
    // como REPROGRAMMED.
    const todayStr = new Date().toISOString().split('T')[0]
    const reprogrammedPayload: { workOrderId: string; newDateISO: string }[] = []

    for (const raw of items as { workOrderId: string; scheduledDate: string }[]) {
      const newDateStr = raw.scheduledDate.split('T')[0]
      const previousDateStr = existingByWO.get(raw.workOrderId)
      // Considera reprogramacao quando a data mudou ou quando a OS esta sendo adicionada pela primeira vez na programacao
      const dateChanged = !previousDateStr || previousDateStr !== newDateStr
      if (dateChanged) {
        reprogrammedPayload.push({
          workOrderId: raw.workOrderId,
          newDateISO: `${newDateStr}T12:00:00.000Z`,
        })
      }
    }

    if (reprogrammedPayload.length > 0) {
      const candidateIds = reprogrammedPayload.map(p => p.workOrderId)
      const { data: candidates } = await supabase
        .from('WorkOrder')
        .select('id, dueDate, status, rescheduledDate, rescheduleCount')
        .in('id', candidateIds)

      const overdueWOs = new Map<string, { dueStr: string; status: string; rescheduledDate: string | null; count: number }>()
      for (const wo of candidates || []) {
        if (!wo.dueDate) continue
        const dueStr = String(wo.dueDate).split('T')[0]
        const isOverdue = dueStr < todayStr
        const isFinal = wo.status === 'COMPLETE'
        if (isOverdue && !isFinal) {
          overdueWOs.set(wo.id, {
            dueStr,
            status: wo.status,
            rescheduledDate: wo.rescheduledDate || null,
            count: wo.rescheduleCount || 0,
          })
        }
      }

      const nowIso = new Date().toISOString()
      const historyInserts: Array<{
        id: string
        workOrderId: string
        previousDate: string | null
        newDate: string
        previousStatus: string | null
        wasOverdue: boolean
        userId: string | null
        createdAt: string
      }> = []

      for (const p of reprogrammedPayload) {
        const ctx = overdueWOs.get(p.workOrderId)
        if (!ctx) continue

        // Atualiza WO: status REPROGRAMMED, rescheduledDate nova, contador +1
        await supabase
          .from('WorkOrder')
          .update({
            status: 'REPROGRAMMED',
            rescheduledDate: p.newDateISO,
            rescheduleCount: ctx.count + 1,
            updatedAt: nowIso,
          })
          .eq('id', p.workOrderId)

        // Entry de auditoria: previousDate = ultima data efetiva (rescheduledDate ou dueDate original)
        const previousDateIso = ctx.rescheduledDate
          ? new Date(ctx.rescheduledDate).toISOString()
          : `${ctx.dueStr}T12:00:00.000Z`

        historyInserts.push({
          id: generateId(),
          workOrderId: p.workOrderId,
          previousDate: previousDateIso,
          newDate: p.newDateISO,
          previousStatus: ctx.status,
          wasOverdue: true,
          userId: session.id,
          createdAt: nowIso,
        })
      }

      if (historyInserts.length > 0) {
        await supabase.from('WorkOrderRescheduleHistory').insert(historyInserts)
      }
    }

    // Mover para MOVED os itens de programacoes CONFIRMED/PARTIALLY_EXECUTED
    // quando a OS atrasada foi adicionada aqui pela primeira vez.
    const movedFromSchedules = new Set<string>()
    for (const woId of addedWoIds) {
      const movedFromId = await moveOverdueItemToNewSchedule(woId, id)
      if (movedFromId) movedFromSchedules.add(movedFromId)
    }

    // Reverter movimento quando OS foi retirada desta programacao (ainda DRAFT)
    const revertedSchedules = new Set<string>()
    for (const woId of removedWoIds) {
      const revertedFromId = await revertMovedItemForWorkOrder(woId)
      if (revertedFromId) revertedSchedules.add(revertedFromId)
    }

    // Atualizar timestamp da programação
    await supabase
      .from('WorkOrderSchedule')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({
      message: `${items.length} item(ns) atualizado(s)`,
      itemCount: items.length,
      movedFromScheduleCount: movedFromSchedules.size,
      revertedFromScheduleCount: revertedSchedules.size,
    })
  } catch (error) {
    console.error('Error updating schedule items:', error)
    return NextResponse.json({ error: 'Erro ao atualizar itens da programação' }, { status: 500 })
  }
}
