// Helpers para mao de obra e especialidade por tarefa.
//
// Disponivel apenas em:
//   - OSs manuais (sem assetMaintenancePlanId), OU
//   - OSs originadas de plano UNICA (AssetMaintenancePlan.period = 'UNICA').
//
// Planos REPETITIVA NAO recebem este conceito — o gating client-side ja
// esconde o bloco; este helper e a defesa em profundidade no servidor.

import { supabase, generateId } from '@/lib/supabase'
import { normalizeUserRole } from '@/lib/user-roles'
import { toDecimalHours } from '@/lib/units/time'

export type TaskResourcePayload = {
  resourceType?: string
  userId?: string | null
  jobTitleId?: string | null
  hours?: number | string | null
  quantity?: number | null
}

const ALLOWED_TYPES = new Set(['LABOR', 'SPECIALTY'])

export async function isTaskResourcesAllowed(
  assetMaintenancePlanId: string | null | undefined,
  companyId: string,
): Promise<boolean> {
  if (!assetMaintenancePlanId) return true
  const { data } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, period')
    .eq('id', assetMaintenancePlanId)
    .eq('companyId', companyId)
    .single()
  if (!data) return true
  const period = String(data.period || '').toUpperCase()
  return period !== 'REPETITIVA'
}

// Valida o conteudo do array `resources` de uma task. Retorna mensagem de
// erro friendly (ou null quando OK).
export function validateTaskResources(
  resources: TaskResourcePayload[] | undefined,
): string | null {
  if (!Array.isArray(resources)) return null
  for (const r of resources) {
    const type = String(r.resourceType || '').toUpperCase()
    if (!ALLOWED_TYPES.has(type)) {
      return `Tipo de recurso de tarefa invalido: ${r.resourceType}. Use LABOR ou SPECIALTY.`
    }
    if (type === 'LABOR' && !r.userId) {
      return 'Mao de obra exige selecao de uma pessoa'
    }
    if (type === 'SPECIALTY' && !r.jobTitleId) {
      return 'Especialidade exige selecao de um cargo'
    }
  }
  return null
}

// Valida que toda Mao de Obra (LABOR) referencia um usuario MANUTENTOR
// dentro da empresa ativa. Mesmo padrao usado nos recursos da OS.
export async function validateLaborUsers(
  resources: TaskResourcePayload[],
  companyId: string,
): Promise<string | null> {
  const laborUserIds = resources
    .filter((r) => String(r.resourceType || '').toUpperCase() === 'LABOR' && !!r.userId)
    .map((r) => r.userId as string)
  if (laborUserIds.length === 0) return null
  const { data } = await supabase
    .from('User')
    .select('id, role')
    .in('id', laborUserIds)
    .eq('companyId', companyId)
  const invalid = (data || []).find((u) => normalizeUserRole(u.role) !== 'MANUTENTOR')
  if (invalid) {
    return 'Apenas pessoas com papel Manutentor podem ser alocadas como Mao de Obra na tarefa'
  }
  return null
}

// Insere recursos de uma tarefa. Assume que a validacao ja foi feita
// (gating e shape) — apenas persiste.
export async function insertTaskResources(
  taskId: string,
  resources: TaskResourcePayload[],
): Promise<void> {
  if (!resources.length) return
  const inserts = resources.map((r) => ({
    id: generateId(),
    taskId,
    resourceType: String(r.resourceType || '').toUpperCase(),
    userId: r.userId || null,
    jobTitleId: r.jobTitleId || null,
    hours: toDecimalHours(r.hours ?? null),
    quantity: r.quantity ?? null,
  }))
  const { error } = await supabase.from('TaskResource').insert(inserts)
  if (error) throw error
}
