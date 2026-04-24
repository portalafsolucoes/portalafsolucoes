// Helper canonico para sincronizacao entre StandardMaintenancePlan e AssetMaintenancePlan.
// Fonte unica da logica usada pelos 3 fluxos:
//   - Situacao 1: bem -> planos padrao compativeis
//   - Situacao 2: plano padrao -> bens compativeis
//   - Propagacao: edicao de plano padrao -> replica para planos de ativo sem override
//
// Regras centrais:
//   - Match familia/modelo: plano com familyModelId=NULL casa com qualquer modelo da familia
//     (regra assimetrica — asset com modelo X casa com plano modelo X OU plano modelo NULL;
//     asset sem modelo so casa com plano modelo NULL)
//   - Duplicata: mesmo (assetId, serviceTypeId, maintenanceTime, timeUnit, trackingType)
//     ja existe no ativo. sequence nao conta, porque e incremental.
//   - Override: AssetMaintenancePlan.hasLocalOverrides=true sinaliza plano customizado
//     individualmente; nao recebe propagacao automatica, mas continua vinculado ao padrao
//     (preserva standardPlanId para suportar "Reverter ao padrao").

import { supabase, generateId } from '@/lib/supabase'

// =============================================================================
// TIPOS
// =============================================================================

export interface StandardPlanSummary {
  id: string
  sequence: number
  name: string
  maintenanceTime: number
  timeUnit: string
  period: string
  priority: string
  stopsAsset: boolean
  toleranceDays: number
  trackingType: string
  familyId: string
  familyModelId: string | null
  serviceTypeId: string
  calendarId: string | null
  serviceType?: { id: string; code: string | null; name: string } | null
  family?: { id: string; code: string | null; name: string } | null
  familyModel?: { id: string; name: string } | null
  calendar?: { id: string; name: string } | null
  tasks?: StandardTaskSummary[]
}

export interface StandardTaskSummary {
  id: string
  taskCode: number
  description: string
  order: number
  executionTime: number | null
  steps?: Array<{
    id: string
    order: number
    stepId: string
    step?: { id: string; name: string } | null
  }>
  resources?: Array<{
    id: string
    resourceType: string
    resourceCount: number
    quantity: number
    hours: number
    unit: string
    generatesReserve: boolean
    resourceId: string | null
    resource?: { id: string; name: string; type: string | null; unit: string | null } | null
  }>
}

export interface CompatibleAssetSummary {
  id: string
  name: string
  tag: string | null
  protheusCode: string | null
  status: string
  familyId: string | null
  familyModelId: string | null
  location?: { id: string; name: string } | null
  assetArea?: { id: string; name: string } | null
  family?: { id: string; code: string | null; name: string } | null
  familyModel?: { id: string; name: string } | null
  activeMaintenancePlansCount: number
}

export interface DuplicateKey {
  serviceTypeId: string
  maintenanceTime: number | null
  timeUnit: string | null
  trackingType: string
}

// =============================================================================
// REGRA DE DUPLICATA (chave funcional, sem sequence)
// =============================================================================

function normalizeDuplicateKey(
  serviceTypeId: string | null | undefined,
  maintenanceTime: number | null | undefined,
  timeUnit: string | null | undefined,
  trackingType: string | null | undefined
): DuplicateKey {
  return {
    serviceTypeId: String(serviceTypeId || ''),
    maintenanceTime: typeof maintenanceTime === 'number' ? maintenanceTime : null,
    timeUnit: timeUnit ? String(timeUnit).toUpperCase() : null,
    trackingType: trackingType ? String(trackingType).toUpperCase() : 'TIME',
  }
}

export function isSameDuplicateKey(a: DuplicateKey, b: DuplicateKey): boolean {
  return (
    a.serviceTypeId === b.serviceTypeId &&
    a.maintenanceTime === b.maintenanceTime &&
    a.timeUnit === b.timeUnit &&
    a.trackingType === b.trackingType
  )
}

/**
 * Verifica se um determinado par (serviceTypeId + maintenanceTime + timeUnit + trackingType)
 * ja existe como AssetMaintenancePlan deste ativo. Usado como defesa em profundidade
 * antes de criar um novo plano individual.
 */
export async function isDuplicatePlan(
  assetId: string,
  companyId: string,
  key: DuplicateKey
): Promise<boolean> {
  const { data } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, serviceTypeId, maintenanceTime, timeUnit, trackingType')
    .eq('assetId', assetId)
    .eq('companyId', companyId)
    .eq('serviceTypeId', key.serviceTypeId)

  if (!data || data.length === 0) return false

  return data.some((plan) => {
    const existing = normalizeDuplicateKey(
      plan.serviceTypeId,
      plan.maintenanceTime,
      plan.timeUnit,
      plan.trackingType
    )
    return isSameDuplicateKey(existing, key)
  })
}

// =============================================================================
// FINDER: Bem -> Planos Padrao compativeis (Situacao 1)
// =============================================================================

/**
 * Retorna planos padrao compativeis com a familia+modelo do ativo, ja filtrando:
 *   - planos ja vinculados a este ativo (via standardPlanId)
 *   - planos que gerariam duplicata por serviceTypeId+maintenanceTime+timeUnit+trackingType
 *
 * Inclui tasks com steps e resources para exibicao expansivel no dialogo.
 * Retorna lista vazia quando o ativo nao tem familia definida.
 */
export async function findCompatibleStandardPlansForAsset(
  assetId: string,
  companyId: string
): Promise<StandardPlanSummary[]> {
  // 1. Buscar o ativo para pegar familia e tipo modelo
  const { data: asset, error: assetError } = await supabase
    .from('Asset')
    .select('id, familyId, familyModelId, companyId')
    .eq('id', assetId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (assetError || !asset || !asset.familyId) return []

  // 2. Buscar planos padrao compativeis
  //    Match: familyId = asset.familyId
  //           AND (familyModelId IS NULL OR familyModelId = asset.familyModelId)
  let query = supabase
    .from('StandardMaintenancePlan')
    .select(`
      *,
      serviceType:ServiceType!serviceTypeId(id, code, name),
      family:AssetFamily!familyId(id, code, name),
      familyModel:AssetFamilyModel!familyModelId(id, name),
      calendar:Calendar!calendarId(id, name)
    `)
    .eq('companyId', companyId)
    .eq('familyId', asset.familyId)

  if (asset.familyModelId) {
    query = query.or(`familyModelId.is.null,familyModelId.eq.${asset.familyModelId}`)
  } else {
    query = query.is('familyModelId', null)
  }

  const { data: plans, error: plansError } = await query.order('sequence')
  if (plansError || !plans || plans.length === 0) return []

  // 3. Buscar planos ja existentes no ativo (para filtrar duplicatas e ja-vinculados)
  const { data: existingPlans } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, standardPlanId, serviceTypeId, maintenanceTime, timeUnit, trackingType')
    .eq('assetId', assetId)
    .eq('companyId', companyId)

  const linkedStandardIds = new Set<string>(
    (existingPlans || [])
      .map((p) => p.standardPlanId)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
  )
  const existingKeys: DuplicateKey[] = (existingPlans || []).map((p) =>
    normalizeDuplicateKey(p.serviceTypeId, p.maintenanceTime, p.timeUnit, p.trackingType)
  )

  // 4. Filtrar planos: remover ja-vinculados e que gerariam duplicata
  const compatible = plans.filter((plan) => {
    if (linkedStandardIds.has(plan.id)) return false
    const planKey = normalizeDuplicateKey(
      plan.serviceTypeId,
      plan.maintenanceTime,
      plan.timeUnit,
      plan.trackingType
    )
    return !existingKeys.some((k) => isSameDuplicateKey(k, planKey))
  })

  if (compatible.length === 0) return []

  // 5. Enriquecer cada plano com tasks (steps + resources)
  const enriched: StandardPlanSummary[] = []
  for (const plan of compatible) {
    const { data: tasks } = await supabase
      .from('StandardMaintenanceTask')
      .select('*')
      .eq('planId', plan.id)
      .order('order')

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        const [stepsRes, resourcesRes] = await Promise.all([
          supabase
            .from('StandardMaintenanceTaskStep')
            .select('*, step:GenericStep!stepId(id, name)')
            .eq('taskId', task.id)
            .order('order'),
          supabase
            .from('StandardMaintenanceTaskResource')
            .select('*, resource:Resource!resourceId(id, name, type, unit)')
            .eq('taskId', task.id),
        ])
        task.steps = stepsRes.data || []
        task.resources = resourcesRes.data || []
      }
    }

    enriched.push({ ...(plan as StandardPlanSummary), tasks: (tasks || []) as StandardTaskSummary[] })
  }

  return enriched
}

// =============================================================================
// FINDER: Plano Padrao -> Bens compativeis (Situacao 2)
// =============================================================================

/**
 * Retorna ativos compativeis com a familia+modelo do plano padrao, ja filtrando:
 *   - ativos ja vinculados a este plano padrao (AssetMaintenancePlan.standardPlanId = X)
 *   - ativos onde o vinculo geraria duplicata por chave funcional
 *
 * Retorna lista vazia se o plano nao for encontrado no tenant.
 */
export async function findCompatibleAssetsForStandardPlan(
  standardPlanId: string,
  companyId: string
): Promise<CompatibleAssetSummary[]> {
  // 1. Buscar o plano padrao
  const { data: plan, error: planError } = await supabase
    .from('StandardMaintenancePlan')
    .select('id, familyId, familyModelId, serviceTypeId, maintenanceTime, timeUnit, trackingType, companyId')
    .eq('id', standardPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (planError || !plan) return []

  const planKey = normalizeDuplicateKey(
    plan.serviceTypeId,
    plan.maintenanceTime,
    plan.timeUnit,
    plan.trackingType
  )

  // 2. Buscar ativos compativeis (mesma familia, modelo NULL no plano = todos da familia)
  let query = supabase
    .from('Asset')
    .select(`
      id, name, tag, protheusCode, status, familyId, familyModelId,
      location:Location!locationId(id, name),
      assetArea:Area!areaId(id, name),
      family:AssetFamily!familyId(id, code, name),
      familyModel:AssetFamilyModel!familyModelId(id, name)
    `)
    .eq('companyId', companyId)
    .eq('archived', false)
    .eq('familyId', plan.familyId)

  if (plan.familyModelId) {
    query = query.eq('familyModelId', plan.familyModelId)
  }

  const { data: assets, error: assetsError } = await query.order('name')
  if (assetsError || !assets || assets.length === 0) return []

  // 3. Para cada ativo, buscar seus planos existentes (para filtrar duplicatas e vinculos)
  const assetIds = assets.map((a) => a.id)
  const { data: existingPlans } = await supabase
    .from('AssetMaintenancePlan')
    .select('assetId, standardPlanId, serviceTypeId, maintenanceTime, timeUnit, trackingType, isActive')
    .in('assetId', assetIds)
    .eq('companyId', companyId)

  const linksByAsset = new Map<string, Set<string>>()
  const keysByAsset = new Map<string, DuplicateKey[]>()
  const activeCountByAsset = new Map<string, number>()

  for (const p of existingPlans || []) {
    if (p.standardPlanId) {
      if (!linksByAsset.has(p.assetId)) linksByAsset.set(p.assetId, new Set())
      linksByAsset.get(p.assetId)!.add(p.standardPlanId)
    }
    const keys = keysByAsset.get(p.assetId) || []
    keys.push(normalizeDuplicateKey(p.serviceTypeId, p.maintenanceTime, p.timeUnit, p.trackingType))
    keysByAsset.set(p.assetId, keys)
    if (p.isActive) {
      activeCountByAsset.set(p.assetId, (activeCountByAsset.get(p.assetId) || 0) + 1)
    }
  }

  // 4. Filtrar ativos: remover ja-vinculados a este plano e que gerariam duplicata
  const compatible: CompatibleAssetSummary[] = []
  for (const asset of assets) {
    const links = linksByAsset.get(asset.id)
    if (links && links.has(standardPlanId)) continue

    const keys = keysByAsset.get(asset.id) || []
    if (keys.some((k) => isSameDuplicateKey(k, planKey))) continue

    compatible.push({
      ...(asset as unknown as CompatibleAssetSummary),
      activeMaintenancePlansCount: activeCountByAsset.get(asset.id) || 0,
    })
  }

  return compatible
}

// =============================================================================
// LISTAGEM: Ativos vinculados a um Plano Padrao (para botao "Propagar" e confirm delete)
// =============================================================================

export interface LinkedAssetPlan {
  assetMaintenancePlanId: string
  assetId: string
  assetName: string
  assetTag: string | null
  assetProtheusCode: string | null
  hasLocalOverrides: boolean
  detachedAt: string | null
  detachedBy: { id: string; firstName: string; lastName: string } | null
  isActive: boolean
  updatedAt: string
}

/**
 * Lista todos os AssetMaintenancePlan que referenciam o standardPlanId informado.
 * Retorna info enriquecida para UI de propagacao e confirmacao de exclusao.
 */
export async function listLinkedAssetsForStandardPlan(
  standardPlanId: string,
  companyId: string
): Promise<LinkedAssetPlan[]> {
  const { data, error } = await supabase
    .from('AssetMaintenancePlan')
    .select(`
      id, assetId, hasLocalOverrides, detachedAt, detachedById, isActive, updatedAt,
      asset:Asset!assetId(id, name, tag, protheusCode),
      detachedBy:User!detachedById(id, firstName, lastName)
    `)
    .eq('standardPlanId', standardPlanId)
    .eq('companyId', companyId)
    .order('updatedAt', { ascending: false })

  if (error || !data) return []

  type Row = {
    id: string
    assetId: string
    hasLocalOverrides: boolean
    detachedAt: string | null
    detachedById: string | null
    isActive: boolean
    updatedAt: string
    asset: { id: string; name: string; tag: string | null; protheusCode: string | null } | null
    detachedBy: { id: string; firstName: string; lastName: string } | null
  }

  return (data as unknown as Row[]).map((row) => ({
    assetMaintenancePlanId: row.id,
    assetId: row.assetId,
    assetName: row.asset?.name || '',
    assetTag: row.asset?.tag || null,
    assetProtheusCode: row.asset?.protheusCode || null,
    hasLocalOverrides: row.hasLocalOverrides,
    detachedAt: row.detachedAt,
    detachedBy: row.detachedBy,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  }))
}

export async function countLinkedAssets(
  standardPlanId: string,
  companyId: string
): Promise<number> {
  const { count } = await supabase
    .from('AssetMaintenancePlan')
    .select('id', { count: 'exact', head: true })
    .eq('standardPlanId', standardPlanId)
    .eq('companyId', companyId)
  return count || 0
}

// =============================================================================
// STUBS PARA FASES POSTERIORES (implementadas em 2-5)
// =============================================================================

/**
 * Fase 2/3: copia o conteudo estrutural de um StandardMaintenancePlan para um novo
 * AssetMaintenancePlan (tasks + steps + resources). Popula standardPlanId, isStandard=true
 * e standardSequence. Revalida duplicata como defesa em profundidade.
 *
 * Obs: supabase-js nao expoe transacao multi-table, entao seguimos o padrao ja usado em
 *   src/app/api/maintenance-plans/asset/route.ts (POST) — inserts sequenciais em ordem
 *   plan -> tasks -> steps/resources. Em caso de falha parcial, o caller decide se
 *   apaga o plano criado (ver batch-link, que marca o assetPlan como rollback alvo).
 */
export async function applyStandardToAsset(
  standardPlanId: string,
  assetId: string,
  companyId: string,
  actorId?: string | null
): Promise<{ assetMaintenancePlanId: string }> {
  void actorId // reservado para auditoria futura; applyStandard nao loga actor hoje

  // 1. Carregar plano padrao + tasks (com steps e resources)
  const { data: stdPlan, error: stdPlanError } = await supabase
    .from('StandardMaintenancePlan')
    .select('*')
    .eq('id', standardPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (stdPlanError || !stdPlan) {
    throw new Error(`Plano padrao ${standardPlanId} nao encontrado no tenant`)
  }

  // 2. Validar asset no tenant
  const { data: asset, error: assetError } = await supabase
    .from('Asset')
    .select('id, companyId')
    .eq('id', assetId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (assetError || !asset) {
    throw new Error(`Ativo ${assetId} nao encontrado no tenant`)
  }

  // 3. Defesa em profundidade: revalidar duplicata
  const dupKey = normalizeDuplicateKey(
    stdPlan.serviceTypeId,
    stdPlan.maintenanceTime,
    stdPlan.timeUnit,
    stdPlan.trackingType
  )
  if (await isDuplicatePlan(assetId, companyId, dupKey)) {
    throw new Error(
      `Ativo ${assetId} ja possui um plano com mesmo servico+periodicidade+trackingType`
    )
  }

  // 4. Calcular proximo sequence para (assetId, serviceTypeId)
  const { data: existingSeq } = await supabase
    .from('AssetMaintenancePlan')
    .select('sequence')
    .eq('assetId', assetId)
    .eq('serviceTypeId', stdPlan.serviceTypeId)
    .order('sequence', { ascending: false })
    .limit(1)
  const nextSequence = existingSeq && existingSeq.length > 0 ? existingSeq[0].sequence + 1 : 1

  // 5. Inserir AssetMaintenancePlan
  const now = new Date().toISOString()
  const newPlanId = generateId()

  const { error: planInsertError } = await supabase
    .from('AssetMaintenancePlan')
    .insert({
      id: newPlanId,
      sequence: nextSequence,
      name: stdPlan.name || null,
      isStandard: true,
      standardPlanId: stdPlan.id,
      standardSequence: stdPlan.sequence || null,
      lastMaintenanceDate: null,
      maintenanceTime: stdPlan.maintenanceTime || null,
      timeUnit: stdPlan.timeUnit || null,
      period: stdPlan.period || null,
      isActive: true,
      toleranceDays: stdPlan.toleranceDays ?? 0,
      considerPlanning: true,
      trackingType: stdPlan.trackingType || 'TIME',
      assetId,
      serviceTypeId: stdPlan.serviceTypeId,
      maintenanceAreaId: null,
      maintenanceTypeId: null,
      calendarId: stdPlan.calendarId || null,
      hasLocalOverrides: false,
      companyId,
      createdAt: now,
      updatedAt: now,
    })

  if (planInsertError) {
    throw new Error(`Erro ao criar AssetMaintenancePlan: ${planInsertError.message}`)
  }

  // 6. Copiar tasks (cada task traz seus steps e resources)
  const { data: stdTasks } = await supabase
    .from('StandardMaintenanceTask')
    .select('*')
    .eq('planId', stdPlan.id)
    .order('order')

  if (stdTasks && stdTasks.length > 0) {
    for (const stdTask of stdTasks) {
      const newTaskId = generateId()
      const { error: taskError } = await supabase
        .from('AssetMaintenanceTask')
        .insert({
          id: newTaskId,
          planId: newPlanId,
          taskCode: stdTask.taskCode,
          description: stdTask.description,
          order: stdTask.order,
          executionTime: stdTask.executionTime,
          isActive: true,
        })
      if (taskError) {
        // Rollback best-effort: apagar plano recem-criado para nao deixar orfao
        await supabase.from('AssetMaintenancePlan').delete().eq('id', newPlanId)
        throw new Error(`Erro ao copiar task ${stdTask.id}: ${taskError.message}`)
      }

      const [stdStepsRes, stdResourcesRes] = await Promise.all([
        supabase
          .from('StandardMaintenanceTaskStep')
          .select('id, stepId, order')
          .eq('taskId', stdTask.id),
        supabase
          .from('StandardMaintenanceTaskResource')
          .select('id, resourceType, resourceCount, quantity, hours, unit, generatesReserve, resourceId, jobTitleId, userId')
          .eq('taskId', stdTask.id),
      ])

      if (stdStepsRes.data && stdStepsRes.data.length > 0) {
        const stepsPayload = stdStepsRes.data.map((s: { stepId: string; order: number }) => ({
          id: generateId(),
          taskId: newTaskId,
          stepId: s.stepId,
          order: s.order,
        }))
        const { error: stepsError } = await supabase
          .from('AssetMaintenanceTaskStep')
          .insert(stepsPayload)
        if (stepsError) {
          await supabase.from('AssetMaintenancePlan').delete().eq('id', newPlanId)
          throw new Error(`Erro ao copiar steps da task ${stdTask.id}: ${stepsError.message}`)
        }
      }

      if (stdResourcesRes.data && stdResourcesRes.data.length > 0) {
        const resourcesPayload = stdResourcesRes.data.map((r: {
          resourceType: string
          resourceCount: number
          quantity: number
          hours: number
          unit: string
          generatesReserve: boolean
          resourceId: string | null
          jobTitleId: string | null
          userId: string | null
        }) => ({
          id: generateId(),
          taskId: newTaskId,
          resourceType: r.resourceType,
          resourceCount: r.resourceCount,
          quantity: r.quantity,
          hours: r.hours,
          unit: r.unit,
          generatesReserve: r.generatesReserve,
          resourceId: r.resourceId,
          jobTitleId: r.jobTitleId,
          userId: r.userId,
        }))
        const { error: resourcesError } = await supabase
          .from('AssetMaintenanceTaskResource')
          .insert(resourcesPayload)
        if (resourcesError) {
          await supabase.from('AssetMaintenancePlan').delete().eq('id', newPlanId)
          throw new Error(`Erro ao copiar resources da task ${stdTask.id}: ${resourcesError.message}`)
        }
      }
    }
  }

  return { assetMaintenancePlanId: newPlanId }
}

/**
 * Marca um AssetMaintenancePlan como customizado individualmente.
 * Chamado apos edicao estrutural do plano ou de suas tasks/steps/resources.
 *
 * Idempotente: se ja esta marcado, nao re-escreve detachedAt/detachedById
 * (preservamos o primeiro momento de divergencia em relacao ao padrao).
 *
 * Somente faz efeito quando o plano tem standardPlanId != null (ou seja, nasceu
 * de um plano padrao). Planos livres nao tem noise de override.
 */
export async function markAsOverridden(
  assetPlanId: string,
  userId: string | null | undefined,
  companyId: string
): Promise<void> {
  const { data: plan, error } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, standardPlanId, hasLocalOverrides')
    .eq('id', assetPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (error || !plan) return
  if (!plan.standardPlanId) return
  if (plan.hasLocalOverrides) return

  await supabase
    .from('AssetMaintenancePlan')
    .update({
      hasLocalOverrides: true,
      detachedAt: new Date().toISOString(),
      detachedById: userId || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', assetPlanId)
    .eq('companyId', companyId)
}

/**
 * Reverte um AssetMaintenancePlan customizado ao estado atual do seu
 * StandardMaintenancePlan de origem. Sobrescreve campos estruturais do plano
 * e recria tasks/steps/resources a partir do padrao. Zera hasLocalOverrides,
 * detachedAt e detachedById.
 *
 * Preserva campos operacionais do bem (assetId, lastMaintenanceDate, isActive,
 * toleranceDays, considerPlanning, maintenanceAreaId, maintenanceTypeId,
 * sequence do ativo) — revert nao toca rotina operacional, so o conteudo
 * tecnico herdado do padrao.
 *
 * Rejeita quando o plano nao tem standardPlanId (nao ha padrao para onde voltar)
 * ou quando o standardPlanId aponta para plano que nao existe mais no tenant.
 */
export async function revertToStandard(
  assetPlanId: string,
  companyId: string,
  _actorId?: string | null
): Promise<{ reverted: boolean }> {
  void _actorId

  // 1. Carregar o plano do ativo
  const { data: assetPlan, error: assetPlanError } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, assetId, standardPlanId, serviceTypeId')
    .eq('id', assetPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (assetPlanError || !assetPlan) {
    throw new Error(`Plano do ativo ${assetPlanId} nao encontrado no tenant`)
  }
  if (!assetPlan.standardPlanId) {
    throw new Error('Plano sem vinculo a um padrao — nao ha para onde reverter')
  }

  // 2. Carregar o plano padrao atual
  const { data: stdPlan, error: stdPlanError } = await supabase
    .from('StandardMaintenancePlan')
    .select('*')
    .eq('id', assetPlan.standardPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (stdPlanError || !stdPlan) {
    throw new Error('Plano padrao de origem nao existe mais — nao e possivel reverter')
  }

  // 3. Sobrescrever campos estruturais herdados do padrao.
  //    Preserva campos operacionais do bem (lastMaintenanceDate, isActive,
  //    toleranceDays, considerPlanning, maintenanceAreaId, maintenanceTypeId,
  //    sequence, assetId).
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('AssetMaintenancePlan')
    .update({
      name: stdPlan.name || null,
      standardSequence: stdPlan.sequence || null,
      maintenanceTime: stdPlan.maintenanceTime || null,
      timeUnit: stdPlan.timeUnit || null,
      period: stdPlan.period || null,
      trackingType: stdPlan.trackingType || 'TIME',
      serviceTypeId: stdPlan.serviceTypeId,
      calendarId: stdPlan.calendarId || null,
      hasLocalOverrides: false,
      detachedAt: null,
      detachedById: null,
      updatedAt: now,
    })
    .eq('id', assetPlanId)
    .eq('companyId', companyId)

  if (updateError) {
    throw new Error(`Erro ao atualizar plano: ${updateError.message}`)
  }

  // 4. Recriar tasks/steps/resources. O cascade delete em AssetMaintenanceTask
  //    remove steps e resources associados.
  const { error: deleteTasksError } = await supabase
    .from('AssetMaintenanceTask')
    .delete()
    .eq('planId', assetPlanId)

  if (deleteTasksError) {
    throw new Error(`Erro ao limpar tasks: ${deleteTasksError.message}`)
  }

  // 5. Copiar tasks atuais do padrao
  const { data: stdTasks } = await supabase
    .from('StandardMaintenanceTask')
    .select('*')
    .eq('planId', stdPlan.id)
    .order('order')

  if (stdTasks && stdTasks.length > 0) {
    for (const stdTask of stdTasks) {
      const newTaskId = generateId()
      const { error: taskError } = await supabase
        .from('AssetMaintenanceTask')
        .insert({
          id: newTaskId,
          planId: assetPlanId,
          taskCode: stdTask.taskCode,
          description: stdTask.description,
          order: stdTask.order,
          executionTime: stdTask.executionTime,
          isActive: true,
        })
      if (taskError) {
        throw new Error(`Erro ao recriar task ${stdTask.id}: ${taskError.message}`)
      }

      const [stdStepsRes, stdResourcesRes] = await Promise.all([
        supabase
          .from('StandardMaintenanceTaskStep')
          .select('id, stepId, order')
          .eq('taskId', stdTask.id),
        supabase
          .from('StandardMaintenanceTaskResource')
          .select('id, resourceType, resourceCount, quantity, hours, unit, generatesReserve, resourceId, jobTitleId, userId')
          .eq('taskId', stdTask.id),
      ])

      if (stdStepsRes.data && stdStepsRes.data.length > 0) {
        const stepsPayload = stdStepsRes.data.map((s: { stepId: string; order: number }) => ({
          id: generateId(),
          taskId: newTaskId,
          stepId: s.stepId,
          order: s.order,
        }))
        const { error: stepsError } = await supabase
          .from('AssetMaintenanceTaskStep')
          .insert(stepsPayload)
        if (stepsError) {
          throw new Error(`Erro ao recriar steps da task ${stdTask.id}: ${stepsError.message}`)
        }
      }

      if (stdResourcesRes.data && stdResourcesRes.data.length > 0) {
        const resourcesPayload = stdResourcesRes.data.map((r: {
          resourceType: string
          resourceCount: number
          quantity: number
          hours: number
          unit: string
          generatesReserve: boolean
          resourceId: string | null
          jobTitleId: string | null
          userId: string | null
        }) => ({
          id: generateId(),
          taskId: newTaskId,
          resourceType: r.resourceType,
          resourceCount: r.resourceCount,
          quantity: r.quantity,
          hours: r.hours,
          unit: r.unit,
          generatesReserve: r.generatesReserve,
          resourceId: r.resourceId,
          jobTitleId: r.jobTitleId,
          userId: r.userId,
        }))
        const { error: resourcesError } = await supabase
          .from('AssetMaintenanceTaskResource')
          .insert(resourcesPayload)
        if (resourcesError) {
          throw new Error(`Erro ao recriar resources da task ${stdTask.id}: ${resourcesError.message}`)
        }
      }
    }
  }

  return { reverted: true }
}

/**
 * Replica o estado atual de um StandardMaintenancePlan para um conjunto de
 * AssetMaintenancePlan selecionados.
 *
 * Regras:
 *   - O plano alvo deve ter standardPlanId == standardPlanId informado (defesa
 *     em profundidade contra ids cruzados)
 *   - Planos com hasLocalOverrides=true sao sempre rejeitados (skipped) — o usuario
 *     ja decidiu manter customizacoes locais e deve usar "Reverter ao padrao"
 *     explicitamente se quiser voltar ao estado do padrao
 *   - Planos sem standardPlanId ou apontando para outro padrao sao rejeitados
 *
 * Implementacao: igual a revertToStandard (sobrescreve campos estruturais,
 * recria tasks/steps/resources), mas preserva hasLocalOverrides=false
 * (plano continua seguindo o padrao apos propagacao).
 */
export async function propagateStandardChanges(
  standardPlanId: string,
  assetMaintenancePlanIds: string[],
  companyId: string
): Promise<{
  applied: string[]
  skipped: Array<{ id: string; reason: string }>
  failed: Array<{ id: string; reason: string }>
}> {
  const applied: string[] = []
  const skipped: Array<{ id: string; reason: string }> = []
  const failed: Array<{ id: string; reason: string }> = []

  if (assetMaintenancePlanIds.length === 0) {
    return { applied, skipped, failed }
  }

  // 1. Carregar plano padrao uma unica vez
  const { data: stdPlan, error: stdPlanError } = await supabase
    .from('StandardMaintenancePlan')
    .select('*')
    .eq('id', standardPlanId)
    .eq('companyId', companyId)
    .maybeSingle()

  if (stdPlanError || !stdPlan) {
    throw new Error('Plano padrao nao encontrado no tenant')
  }

  // 2. Carregar tasks do padrao uma unica vez (com steps e resources)
  const { data: stdTasks } = await supabase
    .from('StandardMaintenanceTask')
    .select('*')
    .eq('planId', stdPlan.id)
    .order('order')

  type StepPayload = { stepId: string; order: number }
  type ResourcePayload = {
    resourceType: string
    resourceCount: number
    quantity: number
    hours: number
    unit: string
    generatesReserve: boolean
    resourceId: string | null
    jobTitleId: string | null
    userId: string | null
  }

  const stdTasksWithChildren: Array<{
    task: Record<string, unknown>
    steps: StepPayload[]
    resources: ResourcePayload[]
  }> = []

  for (const task of stdTasks || []) {
    const [stepsRes, resourcesRes] = await Promise.all([
      supabase
        .from('StandardMaintenanceTaskStep')
        .select('id, stepId, order')
        .eq('taskId', task.id),
      supabase
        .from('StandardMaintenanceTaskResource')
        .select('id, resourceType, resourceCount, quantity, hours, unit, generatesReserve, resourceId, jobTitleId, userId')
        .eq('taskId', task.id),
    ])
    stdTasksWithChildren.push({
      task,
      steps: (stepsRes.data || []) as StepPayload[],
      resources: (resourcesRes.data || []) as ResourcePayload[],
    })
  }

  // 3. Revalidar todos os planos de ativo selecionados
  const { data: assetPlans, error: assetPlansError } = await supabase
    .from('AssetMaintenancePlan')
    .select('id, standardPlanId, hasLocalOverrides')
    .eq('companyId', companyId)
    .in('id', assetMaintenancePlanIds)

  if (assetPlansError) {
    throw new Error(`Erro ao carregar planos de ativo: ${assetPlansError.message}`)
  }

  const foundIds = new Set((assetPlans || []).map((p) => p.id))
  for (const id of assetMaintenancePlanIds) {
    if (!foundIds.has(id)) {
      skipped.push({ id, reason: 'Plano nao encontrado no tenant' })
    }
  }

  // 4. Processar cada plano alvo
  for (const plan of assetPlans || []) {
    if (plan.standardPlanId !== standardPlanId) {
      skipped.push({ id: plan.id, reason: 'Plano nao esta vinculado a este padrao' })
      continue
    }
    if (plan.hasLocalOverrides) {
      skipped.push({ id: plan.id, reason: 'Plano customizado — use reverter ao padrao' })
      continue
    }

    try {
      const now = new Date().toISOString()

      // 4.1 Atualizar campos estruturais (preserva operacionais)
      const { error: updateError } = await supabase
        .from('AssetMaintenancePlan')
        .update({
          name: stdPlan.name || null,
          standardSequence: stdPlan.sequence || null,
          maintenanceTime: stdPlan.maintenanceTime || null,
          timeUnit: stdPlan.timeUnit || null,
          period: stdPlan.period || null,
          trackingType: stdPlan.trackingType || 'TIME',
          serviceTypeId: stdPlan.serviceTypeId,
          calendarId: stdPlan.calendarId || null,
          updatedAt: now,
        })
        .eq('id', plan.id)
        .eq('companyId', companyId)

      if (updateError) {
        failed.push({ id: plan.id, reason: `Erro ao atualizar plano: ${updateError.message}` })
        continue
      }

      // 4.2 Deletar tasks existentes (cascade remove steps/resources)
      const { error: deleteError } = await supabase
        .from('AssetMaintenanceTask')
        .delete()
        .eq('planId', plan.id)

      if (deleteError) {
        failed.push({ id: plan.id, reason: `Erro ao limpar tasks: ${deleteError.message}` })
        continue
      }

      // 4.3 Recriar tasks do padrao
      let failedTask = false
      for (const { task: stdTask, steps, resources } of stdTasksWithChildren) {
        const newTaskId = generateId()
        const { error: taskError } = await supabase
          .from('AssetMaintenanceTask')
          .insert({
            id: newTaskId,
            planId: plan.id,
            taskCode: stdTask.taskCode,
            description: stdTask.description,
            order: stdTask.order,
            executionTime: stdTask.executionTime,
            isActive: true,
          })
        if (taskError) {
          failed.push({ id: plan.id, reason: `Erro ao recriar task: ${taskError.message}` })
          failedTask = true
          break
        }

        if (steps.length > 0) {
          const stepsPayload = steps.map((s) => ({
            id: generateId(),
            taskId: newTaskId,
            stepId: s.stepId,
            order: s.order,
          }))
          const { error: stepsError } = await supabase
            .from('AssetMaintenanceTaskStep')
            .insert(stepsPayload)
          if (stepsError) {
            failed.push({ id: plan.id, reason: `Erro ao recriar steps: ${stepsError.message}` })
            failedTask = true
            break
          }
        }

        if (resources.length > 0) {
          const resourcesPayload = resources.map((r) => ({
            id: generateId(),
            taskId: newTaskId,
            resourceType: r.resourceType,
            resourceCount: r.resourceCount,
            quantity: r.quantity,
            hours: r.hours,
            unit: r.unit,
            generatesReserve: r.generatesReserve,
            resourceId: r.resourceId,
            jobTitleId: r.jobTitleId,
            userId: r.userId,
          }))
          const { error: resourcesError } = await supabase
            .from('AssetMaintenanceTaskResource')
            .insert(resourcesPayload)
          if (resourcesError) {
            failed.push({ id: plan.id, reason: `Erro ao recriar resources: ${resourcesError.message}` })
            failedTask = true
            break
          }
        }
      }

      if (!failedTask) applied.push(plan.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      failed.push({ id: plan.id, reason: message })
    }
  }

  return { applied, skipped, failed }
}

// Exportacao nomeada para uso em testes (mantem API privada coerente)
export const __internal = {
  normalizeDuplicateKey,
  generateId,
}
