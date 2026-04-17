import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { normalizeUserRole } from '@/lib/user-roles'

/**
 * POST /api/admin/switch-company
 *
 * Permite que staff Portal AF (SUPER_ADMIN) selecione uma empresa para impersonar.
 * A sessão do usuário é reescrita com o companyId escolhido e com as unidades raiz
 * daquela empresa, preservando a role SUPER_ADMIN. Use `companyId: null` para
 * voltar ao modo "sem empresa" (tela de seleção).
 *
 * Body: { companyId: string | null }
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (normalizeUserRole(session) !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { companyId } = body as { companyId?: string | null }

  // companyId = null → voltar a staff Portal AF sem empresa selecionada.
  if (!companyId) {
    await createSession({
      ...session,
      companyId: '',
      companyName: '',
      unitId: null,
      unitIds: [],
    })
    return NextResponse.json({ data: { companyId: null } })
  }

  const { data: company, error } = await supabase
    .from('Company')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  const { data: units } = await supabase
    .from('Location')
    .select('id')
    .eq('companyId', company.id)
    .is('parentId', null)
    .order('name')

  const unitIds = (units || []).map((u: { id: string }) => u.id)
  const unitId = unitIds[0] ?? null

  await createSession({
    ...session,
    companyId: company.id,
    companyName: company.name,
    unitId,
    unitIds,
  })

  return NextResponse.json({ data: { companyId: company.id, companyName: company.name, unitId, unitIds } })
}
