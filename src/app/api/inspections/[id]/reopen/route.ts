import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { normalizeUserRole, requireCompanyScope } from '@/lib/user-roles'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permError = checkApiPermission(session, 'area-inspections', 'PUT')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    try { requireCompanyScope(session) } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatória' }, { status: 403 })
    }

    const canonicalRole = normalizeUserRole(session)
    if (canonicalRole === 'MANUTENTOR') {
      return NextResponse.json({ error: 'Apenas gestores podem reabrir' }, { status: 403 })
    }

    const { id } = await context.params

    const { data: inspection } = await supabase
      .from('AreaInspection')
      .select('id, status, unitId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .maybeSingle()
    if (!inspection) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

    if (session.unitId && inspection.unitId !== session.unitId) {
      return NextResponse.json({ error: 'Inspeção fora da unidade ativa' }, { status: 403 })
    }

    if (inspection.status !== 'FINALIZADO') {
      return NextResponse.json(
        { error: 'Apenas inspeções finalizadas podem ser reabertas' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('AreaInspection')
      .update({
        status: 'EM_REVISAO',
        reopenedAt: now,
        reopenedById: session.id,
        updatedAt: now,
      })
      .eq('id', id)
    if (updateError) {
      console.error('Reopen error:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: { id, status: 'EM_REVISAO' } })
  } catch (error) {
    console.error('Reopen error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
