import { supabase } from '@/lib/supabase'

// Status possiveis para WorkOrderSchedule (campo String livre, sem enum no schema):
// - DRAFT               rascunho editavel
// - REPROGRAMMING       programacao confirmada reaberta para edicao
// - CONFIRMED           confirmada e em execucao
// - PARTIALLY_EXECUTED  parte dos itens foi executada ou movida, mas ainda restam pendentes
// - COMPLETED           todos os itens foram executados ou movidos
//
// Status possiveis para WorkOrderScheduleItem:
// - PENDING    item em rascunho, ainda nao liberado
// - RELEASED   item liberado pela confirmacao da programacao
// - EXECUTED   OS finalizada
// - MOVED      OS foi reprogramada em outra programacao (preserva historico)

export type ScheduleStatus =
  | 'DRAFT'
  | 'REPROGRAMMING'
  | 'CONFIRMED'
  | 'PARTIALLY_EXECUTED'
  | 'COMPLETED'

export type ScheduleItemStatus =
  | 'PENDING'
  | 'RELEASED'
  | 'EXECUTED'
  | 'MOVED'

// Recomputa o status de uma programacao CONFIRMED/PARTIALLY_EXECUTED com base
// nos statuses dos seus itens. Nao altera programacoes DRAFT, REPROGRAMMING
// ou que ja estejam em COMPLETED.
//
// Regras:
// - Sem itens ativos restantes (tudo EXECUTED ou MOVED): status -> COMPLETED
// - Algum item EXECUTED ou MOVED convivendo com PENDING/RELEASED: status -> PARTIALLY_EXECUTED
// - Todos os itens ainda PENDING/RELEASED: status -> CONFIRMED
export async function recomputeScheduleStatus(scheduleId: string): Promise<ScheduleStatus | null> {
  if (!scheduleId) return null

  const { data: sched, error: schedErr } = await supabase
    .from('WorkOrderSchedule')
    .select('id, status')
    .eq('id', scheduleId)
    .single()

  if (schedErr || !sched) return null

  // Nao recomputa estados editaveis ou ja finais
  const currentStatus = sched.status as ScheduleStatus
  if (currentStatus !== 'CONFIRMED' && currentStatus !== 'PARTIALLY_EXECUTED') {
    return currentStatus
  }

  const { data: items } = await supabase
    .from('WorkOrderScheduleItem')
    .select('status')
    .eq('scheduleId', scheduleId)

  if (!items || items.length === 0) {
    // Programacao sem itens permanece como CONFIRMED (caso de borda)
    return currentStatus
  }

  let hasActive = false
  let hasResolved = false
  for (const it of items) {
    if (it.status === 'EXECUTED' || it.status === 'MOVED') {
      hasResolved = true
    } else {
      hasActive = true
    }
  }

  let nextStatus: ScheduleStatus = currentStatus
  if (!hasActive && hasResolved) nextStatus = 'COMPLETED'
  else if (hasActive && hasResolved) nextStatus = 'PARTIALLY_EXECUTED'
  else nextStatus = 'CONFIRMED'

  if (nextStatus !== currentStatus) {
    await supabase
      .from('WorkOrderSchedule')
      .update({ status: nextStatus, updatedAt: new Date().toISOString() })
      .eq('id', scheduleId)
  }

  return nextStatus
}

// Quando uma OS e movida de uma programacao anterior (atrasada) para a nova
// programacao em rascunho, localiza o item ativo mais antigo em programacao
// CONFIRMED/PARTIALLY_EXECUTED, marca-o como MOVED e recomputa o status.
// Retorna o scheduleId antigo afetado, ou null se nao havia item a mover.
export async function moveOverdueItemToNewSchedule(
  workOrderId: string,
  newScheduleId: string
): Promise<string | null> {
  if (!workOrderId || !newScheduleId) return null

  const todayISO = new Date().toISOString()

  // Buscar itens ativos da OS em programacoes CONFIRMED/PARTIALLY_EXECUTED
  const { data: items } = await supabase
    .from('WorkOrderScheduleItem')
    .select('id, scheduleId, scheduledDate, status, schedule:WorkOrderSchedule!scheduleId(id, status)')
    .eq('workOrderId', workOrderId)
    .in('status', ['PENDING', 'RELEASED'])

  if (!items || items.length === 0) return null

  // Filtrar apenas items em programacao CONFIRMED/PARTIALLY_EXECUTED, com scheduledDate vencida,
  // e que nao sejam a propria nova programacao
  const overdueItems = items.filter(it => {
    if (it.scheduleId === newScheduleId) return false
    const sched = it.schedule as unknown as { id: string; status: string } | null
    if (!sched) return false
    if (sched.status !== 'CONFIRMED' && sched.status !== 'PARTIALLY_EXECUTED') return false
    const scheduledISO = new Date(it.scheduledDate as string).toISOString()
    return scheduledISO < todayISO
  })

  if (overdueItems.length === 0) return null

  // Prefere o item mais antigo (primeiro a vencer)
  overdueItems.sort((a, b) => {
    const aISO = new Date(a.scheduledDate as string).toISOString()
    const bISO = new Date(b.scheduledDate as string).toISOString()
    return aISO.localeCompare(bISO)
  })
  const target = overdueItems[0]

  await supabase
    .from('WorkOrderScheduleItem')
    .update({ status: 'MOVED' })
    .eq('id', target.id)

  await recomputeScheduleStatus(target.scheduleId)
  return target.scheduleId
}

// Reverte items marcados como MOVED originados de uma programacao rascunho
// que esta sendo desfeita (DRAFT excluida ou OS removida antes de confirmar).
// Procura o item MOVED mais recente da OS e o restaura para PENDING, depois
// recomputa o status da programacao antiga.
// Retorna o scheduleId antigo restaurado, ou null se nao havia MOVED a reverter.
export async function revertMovedItemForWorkOrder(workOrderId: string): Promise<string | null> {
  if (!workOrderId) return null

  const { data: items } = await supabase
    .from('WorkOrderScheduleItem')
    .select('id, scheduleId, scheduledDate, status, schedule:WorkOrderSchedule!scheduleId(id, status)')
    .eq('workOrderId', workOrderId)
    .eq('status', 'MOVED')

  if (!items || items.length === 0) return null

  // Restaura apenas items cujo schedule de origem ainda e CONFIRMED/PARTIALLY_EXECUTED/COMPLETED
  const candidates = items.filter(it => {
    const sched = it.schedule as unknown as { id: string; status: string } | null
    if (!sched) return false
    return (
      sched.status === 'CONFIRMED' ||
      sched.status === 'PARTIALLY_EXECUTED' ||
      sched.status === 'COMPLETED'
    )
  })

  if (candidates.length === 0) return null

  // Prefere o mais recente (ultimo a ser movido)
  candidates.sort((a, b) => {
    const aISO = new Date(a.scheduledDate as string).toISOString()
    const bISO = new Date(b.scheduledDate as string).toISOString()
    return bISO.localeCompare(aISO)
  })
  const target = candidates[0]

  await supabase
    .from('WorkOrderScheduleItem')
    .update({ status: 'PENDING' })
    .eq('id', target.id)

  await recomputeScheduleStatus(target.scheduleId)
  return target.scheduleId
}
