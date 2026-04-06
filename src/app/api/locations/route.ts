import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const summary = searchParams.get('summary') === 'true'

    const { data: locations, error } = await supabase
      .from('Location')
      .select(summary ? 'id, name, address' : '*, Asset!locationId(count), WorkOrder!locationId(count)')
      .eq('companyId', session.companyId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (summary) {
      return NextResponse.json({ data: locations || [] })
    }

    const locationsWithCount = (locations || []).map((loc: Record<string, unknown>) => {
      const { Asset, WorkOrder, ...rest } = loc
      return {
        ...rest,
        _count: {
          assets: (Asset as { count: number }[])?.[0]?.count ?? 0,
          workOrders: (WorkOrder as { count: number }[])?.[0]?.count ?? 0,
        },
      }
    })

    return NextResponse.json({ data: locationsWithCount })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, latitude, longitude, parentId } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data: location, error: createError } = await supabase
      .from('Location')
      .insert({
        id: generateId(),
        name,
        address,
        latitude,
        longitude,
        parentId,
        companyId: session.companyId,
        createdAt: now,
        updatedAt: now
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Create location error:', createError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(
      { data: location, message: 'Location created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
