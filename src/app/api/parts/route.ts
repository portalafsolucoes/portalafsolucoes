import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {
      companyId: session.companyId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    let query = supabase
      .from('Part')
      .select('*, category:Category(*)', { count: 'exact' })
      .eq('companyId', session.companyId)
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1)

    if (categoryId) query = query.eq('categoryId', categoryId)
    if (lowStock) query = query.lte('quantity', supabase.rpc('get_min_quantity'))

    const { data: parts, error, count: total } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: parts || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get parts error:', error)
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
    const { name, description, cost, quantity, minQuantity, categoryId, barcode } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const { data: part, error: createError } = await supabase
      .from('Part')
      .insert({
        name,
        description,
        cost: cost || 0,
        quantity: quantity || 0,
        minQuantity: minQuantity || 0,
        categoryId,
        barcode,
        companyId: session.companyId
      })
      .select('*, category:Category(*)')
      .single()

    if (createError) {
      console.error('Create part error:', createError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(
      { data: part, message: 'Part created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create part error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
