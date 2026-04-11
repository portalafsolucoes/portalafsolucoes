import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
        id, email, firstName, lastName, role, jobTitle, companyId, activeUnitId, locationId,
        company:Company(id, name, logo),
        location:Location!locationId(id, name)
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
      role: session.canonicalRole,
      legacyRole: user.role,
      activeUnitId: session.unitId || user.activeUnitId,
      unitIds: session.unitIds || [],
      companyName: session.companyName || user.company?.name || '',
      canonicalRole: session.canonicalRole,
    }

    const response = NextResponse.json({ user: enrichedUser })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
