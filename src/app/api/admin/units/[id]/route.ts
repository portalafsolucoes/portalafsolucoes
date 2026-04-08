import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * PUT /api/admin/units/[id]
 * Atualiza uma unidade.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, address, latitude, longitude } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  // Verificar que a unidade pertence à empresa
  const { data: existing } = await supabase
    .from('Location')
    .select('id')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
  }

  const { data: unit, error } = await supabase
    .from('Location')
    .update({
      name: name.trim(),
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating unit:', error)
    return NextResponse.json({ error: 'Erro ao atualizar unidade' }, { status: 500 })
  }

  return NextResponse.json({ data: unit })
}

/**
 * DELETE /api/admin/units/[id]
 * Exclui uma unidade (se não houver dependências críticas).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Verificar que pertence à empresa
  const { data: existing } = await supabase
    .from('Location')
    .select('id')
    .eq('id', id)
    .eq('companyId', session.companyId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
  }

  // Verificar dependências (ativos, ordens vinculadas)
  const { count: assetCount } = await supabase
    .from('Asset')
    .select('id', { count: 'exact', head: true })
    .eq('unitId', id)

  if (assetCount && assetCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${assetCount} ativo(s) vinculado(s) a esta unidade` },
      { status: 409 }
    )
  }

  const { count: woCount } = await supabase
    .from('WorkOrder')
    .select('id', { count: 'exact', head: true })
    .eq('unitId', id)

  if (woCount && woCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${woCount} ordem(ns) de serviço vinculada(s)` },
      { status: 409 }
    )
  }

  // Remover vínculos UserUnit antes de deletar
  await supabase.from('UserUnit').delete().eq('unitId', id)

  const { error } = await supabase
    .from('Location')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting unit:', error)
    return NextResponse.json({ error: 'Erro ao excluir unidade' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Unidade excluída com sucesso' })
}
