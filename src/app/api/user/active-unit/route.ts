import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { canSwitchUnits, isSuperAdminRole } from '@/lib/user-roles'

/**
 * PUT /api/user/active-unit
 * Altera a unidade ativa do usuário logado.
 * Admins podem trocar para qualquer unidade da empresa.
 * Não-admins só podem trocar para unidades em que estão vinculados (UserUnit).
 */
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { unitId } = body

  if (!unitId) {
    return NextResponse.json({ error: 'unitId is required' }, { status: 400 })
  }

  // Verificar se a unidade pertence à empresa do usuário
  const { data: unit } = await supabase
    .from('Location')
    .select('id, name, companyId')
    .eq('id', unitId)
    .eq('companyId', session.companyId)
    .single()

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found in your company' }, { status: 404 })
  }

  // Se não pode trocar unidade, verificar se tem acesso à unidade via UserUnit
  if (!canSwitchUnits(session)) {
    const { data: userUnit } = await supabase
      .from('UserUnit')
      .select('id')
      .eq('userId', session.id)
      .eq('unitId', unitId)
      .single()

    if (!userUnit) {
      return NextResponse.json({ error: 'You do not have access to this unit' }, { status: 403 })
    }
  }

  // Atualizar activeUnitId do usuário
  const { error } = await supabase
    .from('User')
    .update({ activeUnitId: unitId })
    .eq('id', session.id)

  if (error) {
    console.error('Error updating active unit:', error)
    return NextResponse.json({ error: 'Failed to update active unit' }, { status: 500 })
  }

  // Reconstruir session com a nova unidade ativa
  await createSession({
    ...session,
    unitId,
  })

  return NextResponse.json({ success: true, unitId, unitName: unit.name })
}

/**
 * GET /api/user/active-unit
 * Retorna a unidade ativa e as unidades disponíveis para o usuário
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Buscar activeUnitId e unidades disponíveis em paralelo
  const userPromise = supabase
    .from('User')
    .select('activeUnitId')
    .eq('id', session.id)
    .single()

  const unitsPromise = isSuperAdminRole(session)
    ? supabase
        .from('Location')
        .select('id, name')
        .eq('companyId', session.companyId)
        .is('parentId', null)
        .order('name')
    : supabase
        .from('UserUnit')
        .select(`
          unit:unitId (
            id,
            name
          )
        `)
        .eq('userId', session.id)

  const [{ data: user }, { data: unitsData }] = await Promise.all([userPromise, unitsPromise])

  const availableUnits = isSuperAdminRole(session)
    ? unitsData || []
    : ((unitsData || []) as unknown as Array<{ unit: unknown }>).map((uu) => uu.unit).filter(Boolean)

  return NextResponse.json({
    activeUnitId: user?.activeUnitId || null,
    availableUnits,
  })
}
