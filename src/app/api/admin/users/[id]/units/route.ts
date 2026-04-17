import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'
import { isAdminRole } from '@/lib/user-roles'

/**
 * GET /api/admin/users/[id]/units
 * Lista unidades vinculadas a um usuário.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { data: userUnits, error } = await supabase
    .from('UserUnit')
    .select('unitId, unit:Location!unitId(id, name, address)')
    .eq('userId', id)

  if (error) {
    console.error('Error fetching user units:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    data: (userUnits || []).map((uu: { unit: unknown }) => uu.unit),
  })
}

/**
 * PUT /api/admin/users/[id]/units
 * Substitui os vínculos de unidades do usuário.
 * Body: { unitIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdminRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { unitIds } = body

  if (!Array.isArray(unitIds)) {
    return NextResponse.json({ error: 'unitIds deve ser um array' }, { status: 400 })
  }

  // Verificar que o usuário pertence à empresa
  const { data: user } = await supabase
    .from('User')
    .select('id')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Remover todos os vínculos existentes
  await supabase.from('UserUnit').delete().eq('userId', id)

  // Criar novos vínculos
  if (unitIds.length > 0) {
    const now = new Date().toISOString()
    const rows = unitIds.map((unitId: string) => ({
      id: generateId(),
      userId: id,
      unitId,
      createdAt: now,
    }))

    const { error } = await supabase.from('UserUnit').insert(rows)
    if (error) {
      console.error('Error creating user-unit links:', error)
      return NextResponse.json({ error: 'Erro ao vincular unidades' }, { status: 500 })
    }
  }

  // Atualizar activeUnitId se necessário
  const { data: currentUser } = await supabase
    .from('User')
    .select('activeUnitId')
    .eq('id', id)
    .single()

  if (currentUser && (!currentUser.activeUnitId || !unitIds.includes(currentUser.activeUnitId))) {
    await supabase
      .from('User')
      .update({ activeUnitId: unitIds.length > 0 ? unitIds[0] : null })
      .eq('id', id)
  }

  return NextResponse.json({ message: 'Unidades atualizadas com sucesso' })
}
