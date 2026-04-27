import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { isLastActiveSuperAdmin } from '@/lib/users/userReferences'
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

    const permError = checkApiPermission(session, 'people-teams', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    if (id === session.id) {
      return NextResponse.json(
        { error: 'Voce nao pode desativar sua propria conta' },
        { status: 400 }
      )
    }

    const { data: user, error: findError } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Usuario ja esta anonimizado' },
        { status: 409 }
      )
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Usuario ja esta inativo' },
        { status: 409 }
      )
    }

    if (user.role === 'SUPER_ADMIN') {
      const isLast = await isLastActiveSuperAdmin(id, session.companyId)
      if (isLast) {
        return NextResponse.json(
          { error: 'Nao e possivel desativar o ultimo SUPER_ADMIN ativo da empresa' },
          { status: 409 }
        )
      }
    }

    const { error: updateError } = await supabase
      .from('User')
      .update({
        status: 'INACTIVE',
        enabled: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedById: session.id,
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
      after: { ...user, status: 'INACTIVE', enabled: false, deactivatedAt: new Date().toISOString(), deactivatedById: session.id },
      companyId: user.companyId ?? session.companyId,
      unitId: user.activeUnitId ?? null,
      metadata: { event: 'DEACTIVATED' },
    })

    return NextResponse.json({ message: 'Usuario desativado com sucesso' })
  } catch (error) {
    console.error('Deactivate user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
