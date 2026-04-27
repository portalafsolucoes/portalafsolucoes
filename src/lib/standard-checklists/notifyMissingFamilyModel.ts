import { supabase, generateId } from '@/lib/supabase'

// Notifica os criadores de checklists padrao de um WC quando um bem entra
// (ou e atualizado) com um par (familia, modelo) ainda nao mapeado naquele
// checklist. Falha silenciosa: nao deve quebrar o salvamento do bem.
export async function notifyMissingFamilyModel(args: {
  assetId: string
  assetName: string
  workCenterId: string | null | undefined
  assetFamilyId: string | null | undefined
  familyModelId: string | null | undefined
  companyId: string
}): Promise<void> {
  try {
    const { assetId, assetName, workCenterId, assetFamilyId, familyModelId, companyId } = args
    if (!workCenterId || !assetFamilyId || !familyModelId) return

    // busca checklists ativos do WC
    const { data: checklists } = await supabase
      .from('StandardChecklist')
      .select('id, name, createdById, serviceTypeId, serviceType:ServiceType!serviceTypeId(name)')
      .eq('workCenterId', workCenterId)
      .eq('companyId', companyId)
      .eq('isActive', true)

    if (!checklists || checklists.length === 0) return

    // para cada checklist, verifica se ja existe grupo (familia, modelo)
    const now = new Date().toISOString()
    type ServiceTypeRef = { name: string } | { name: string }[] | null
    const pickOne = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? (v[0] || null) : v

    for (const cl of checklists) {
      const { data: existingGroup } = await supabase
        .from('StandardChecklistFamilyGroup')
        .select('id')
        .eq('checklistId', cl.id)
        .eq('assetFamilyId', assetFamilyId)
        .eq('familyModelId', familyModelId)
        .maybeSingle()

      if (existingGroup) continue
      if (!cl.createdById) continue

      // verifica se o criador esta ativo
      const { data: creator } = await supabase
        .from('User')
        .select('id, status, enabled')
        .eq('id', cl.createdById)
        .single()
      if (!creator) continue
      if (creator.status === 'ARCHIVED' || creator.status === 'INACTIVE') continue
      if (creator.enabled === false) continue

      const stRef = pickOne(cl.serviceType as ServiceTypeRef)
      const stName = stRef?.name || ''

      await supabase.from('Notification').insert({
        id: generateId(),
        userId: cl.createdById,
        title: 'Familia/modelo sem etapas no check list padrao',
        message: `O bem "${assetName}" entrou no centro de trabalho com uma combinacao de familia e modelo ainda nao mapeada no check list "${cl.name}"${stName ? ` (servico ${stName})` : ''}. Edite o check list para adicionar as etapas dessa familia.`,
        href: `/maintenance-plan/standard-checklists?checklistId=${cl.id}`,
        read: false,
        createdAt: now,
        updatedAt: now,
        // metadata sao colunas opcionais; se nao existirem, o insert ignora
      })

      // log silencioso para diagnostico (sem PII de bem)
      console.log(`[notifyMissingFamilyModel] checklist=${cl.id} userId=${cl.createdById} assetId=${assetId}`)
    }
  } catch (e) {
    // nunca propagar — eh side-effect
    console.error('[notifyMissingFamilyModel] falha silenciosa:', e)
  }
}
