import { supabase, generateId } from '@/lib/supabase'
import { normalizeUserRole } from '@/lib/user-roles'

/**
 * Garante que TODOS os ADMINs de uma empresa estejam vinculados (UserUnit) à unidade informada.
 * Use após criar uma nova unidade (Location raiz) para preservar o invariante:
 *   "ADMIN tem acesso automático a todas as unidades da empresa cliente."
 *
 * Idempotente: insere apenas vínculos que ainda não existem.
 */
export async function linkAllCompanyAdminsToUnit(companyId: string, unitId: string): Promise<void> {
  const { data: candidates, error } = await supabase
    .from('User')
    .select('id, role')
    .eq('companyId', companyId)

  if (error) {
    console.error('linkAllCompanyAdminsToUnit: failed to load company users', error)
    return
  }

  const adminIds = (candidates || [])
    .filter((u: { id: string; role: string | null }) => normalizeUserRole(u.role) === 'ADMIN')
    .map((u: { id: string }) => u.id)

  if (adminIds.length === 0) return

  const { data: existingLinks } = await supabase
    .from('UserUnit')
    .select('userId')
    .eq('unitId', unitId)
    .in('userId', adminIds)

  const linkedSet = new Set((existingLinks || []).map((l: { userId: string }) => l.userId))
  const toInsert = adminIds
    .filter((id) => !linkedSet.has(id))
    .map((userId) => ({ id: generateId(), userId, unitId }))

  if (toInsert.length === 0) return

  const { error: insertError } = await supabase.from('UserUnit').insert(toInsert)
  if (insertError) {
    console.error('linkAllCompanyAdminsToUnit: failed to insert UserUnit', insertError)
  }
}

/**
 * Garante que um ADMIN específico tenha UserUnit para todas as unidades raiz da empresa.
 * Use ao promover um usuário existente para ADMIN.
 *
 * Idempotente: insere apenas vínculos que ainda não existem.
 */
export async function ensureAdminUnitAccess(companyId: string, userId: string): Promise<void> {
  const { data: units, error } = await supabase
    .from('Location')
    .select('id')
    .eq('companyId', companyId)
    .is('parentId', null)

  if (error) {
    console.error('ensureAdminUnitAccess: failed to load units', error)
    return
  }

  const unitIds = (units || []).map((u: { id: string }) => u.id)
  if (unitIds.length === 0) return

  const { data: existingLinks } = await supabase
    .from('UserUnit')
    .select('unitId')
    .eq('userId', userId)
    .in('unitId', unitIds)

  const linkedSet = new Set((existingLinks || []).map((l: { unitId: string }) => l.unitId))
  const toInsert = unitIds
    .filter((unitId) => !linkedSet.has(unitId))
    .map((unitId) => ({ id: generateId(), userId, unitId }))

  if (toInsert.length === 0) return

  const { error: insertError } = await supabase.from('UserUnit').insert(toInsert)
  if (insertError) {
    console.error('ensureAdminUnitAccess: failed to insert UserUnit', insertError)
  }
}
