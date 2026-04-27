import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { isLastActiveSuperAdmin } from '@/lib/users/userReferences'
import { recordAudit } from '@/lib/audit/recordAudit'

export async function POST(
  request: NextRequest,
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
        { error: 'Voce nao pode anonimizar sua propria conta' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null

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

    if (user.role === 'SUPER_ADMIN' && user.status === 'ACTIVE') {
      const isLast = await isLastActiveSuperAdmin(id, session.companyId)
      if (isLast) {
        return NextResponse.json(
          { error: 'Nao e possivel anonimizar o ultimo SUPER_ADMIN ativo da empresa' },
          { status: 409 }
        )
      }
    }

    const shortId = id.slice(-8)
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('User')
      .update({
        status: 'ARCHIVED',
        enabled: false,
        firstName: 'Usuario',
        lastName: `Removido #${shortId}`,
        email: `removido_${shortId}@archived.local`,
        username: `removido_${shortId}`,
        phone: null,
        image: null,
        password: '',
        archivedAt: now,
        archivedById: session.id,
        archivalReason: reason,
        deactivatedAt: user.status === 'ACTIVE' ? now : undefined,
        deactivatedById: user.status === 'ACTIVE' ? session.id : undefined,
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
      after: {
        ...user,
        status: 'ARCHIVED',
        enabled: false,
        firstName: 'Usuario',
        lastName: `Removido #${shortId}`,
        archivedAt: now,
        archivedById: session.id,
        archivalReason: reason,
      },
      companyId: user.companyId ?? session.companyId,
      unitId: user.activeUnitId ?? null,
      metadata: { event: 'ARCHIVED', reason },
    })

    return NextResponse.json({ message: 'Usuario anonimizado com sucesso' })
  } catch (error) {
    console.error('Archive user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
