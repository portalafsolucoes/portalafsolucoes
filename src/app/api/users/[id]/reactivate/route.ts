import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { recordAudit } from '@/lib/audit/recordAudit'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    const { data: user, error: findError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Usuario ja esta ativo' },
        { status: 409 }
      )
    }

    if (user.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Nao e possivel reativar um usuario anonimizado' },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabase
      .from('User')
      .update({
        status: 'ACTIVE',
        enabled: true,
        deactivatedAt: null,
        deactivatedById: null,
      })
      .eq('id', id)

    if (updateError) throw updateError

    await recordAudit({
      session,
      entity: 'User',
      entityId: id,
      entityLabel: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || null,
      action: 'UPDATE',
      before: user as Record<string, unknown>,
      after: { ...user, status: 'ACTIVE', enabled: true, deactivatedAt: null, deactivatedById: null },
      companyId: user.companyId ?? session.companyId,
      unitId: user.activeUnitId ?? null,
      metadata: { event: 'REACTIVATED' },
    })

    return NextResponse.json({ message: 'Usuario reativado com sucesso' })
  } catch (error) {
    console.error('Reactivate user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
