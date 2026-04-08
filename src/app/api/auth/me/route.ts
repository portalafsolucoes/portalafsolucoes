import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        *,
        company:Company(*),
        location:Location!locationId(*)
      `)
      .eq('id', session.id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Enriquecer com dados da session (unitId, unitIds, companyName)
    const enrichedUser = {
      ...user,
      activeUnitId: session.unitId || user.activeUnitId,
      unitIds: session.unitIds || [],
      companyName: session.companyName || user.company?.name || '',
    }

    const response = NextResponse.json({ user: enrichedUser })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
