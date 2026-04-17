import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

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
      .select('id, status, companyId')
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

    return NextResponse.json({ message: 'Usuario reativado com sucesso' })
  } catch (error) {
    console.error('Reactivate user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
