import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'

/**
 * GET /api/admin/units
 * Lista unidades da empresa do admin logado.
 * Apenas SUPER_ADMIN e GESTOR podem acessar.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: units, error } = await supabase
    .from('Location')
    .select('id, name, address, latitude, longitude, parentId, createdAt')
    .eq('companyId', session.companyId)
    .order('name')

  if (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }

  // Contar membros (UserUnit) e ativos por unidade
  const enriched = await Promise.all(
    (units || []).map(async (unit: any) => {
      const [membersResult, assetsResult] = await Promise.all([
        supabase
          .from('UserUnit')
          .select('id', { count: 'exact', head: true })
          .eq('unitId', unit.id),
        supabase
          .from('Asset')
          .select('id', { count: 'exact', head: true })
          .eq('unitId', unit.id),
      ])

      return {
        ...unit,
        memberCount: membersResult.count || 0,
        assetCount: assetsResult.count || 0,
      }
    })
  )

  return NextResponse.json({ data: enriched })
}

/**
 * POST /api/admin/units
 * Cria uma nova unidade/filial.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, address, latitude, longitude } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data: unit, error } = await supabase
    .from('Location')
    .insert({
      id: generateId(),
      name: name.trim(),
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      companyId: session.companyId,
      createdAt: now,
      updatedAt: now,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: 'Erro ao criar unidade' }, { status: 500 })
  }

  return NextResponse.json({ data: unit }, { status: 201 })
}
