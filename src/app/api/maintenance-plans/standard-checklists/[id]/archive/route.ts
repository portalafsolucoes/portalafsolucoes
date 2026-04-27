import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'

// PUT - alterna isActive do checklist (arquivar/reativar)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permissionError = checkApiPermission(session, 'standard-checklists', 'PUT')
    if (permissionError) return NextResponse.json({ error: permissionError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id } = await params
    const { isActive } = await request.json() as { isActive?: boolean }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Campo isActive (boolean) obrigatorio' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('StandardChecklist')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()
    if (!existing) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })

    const { error } = await supabase
      .from('StandardChecklist')
      .update({ isActive, updatedAt: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ data: { id, isActive }, message: isActive ? 'Reativado' : 'Arquivado' })
  } catch (error) {
    console.error('Error archiving standard checklist:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
