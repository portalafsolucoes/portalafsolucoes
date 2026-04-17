import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { countUserReferences } from '@/lib/users/userReferences'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'people-teams', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { id } = await params

    const { data: user, error: findError } = await supabase
      .from('User')
      .select('id, companyId')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await countUserReferences(id)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Get user references error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
