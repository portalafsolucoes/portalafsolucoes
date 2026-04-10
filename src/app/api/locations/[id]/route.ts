import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const permError = checkApiPermission(session, 'locations', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { data: location, error } = await supabase
      .from('Location')
      .select('*, Asset!locationId(count), WorkOrder!locationId(count), parent:parentId(id, name)')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { Asset, WorkOrder, parent, ...rest } = location as Record<string, unknown>
    const data = {
      ...rest,
      parent: parent ?? null,
      _count: {
        assets: (Asset as { count: number }[])?.[0]?.count ?? 0,
        workOrders: (WorkOrder as { count: number }[])?.[0]?.count ?? 0,
      },
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Get location error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const permError = checkApiPermission(session, 'locations', 'PUT')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, latitude, longitude, parentId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('Location')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { data: location, error } = await supabase
      .from('Location')
      .update({
        name: name.trim(),
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        parentId: parentId || null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Update location error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ data: location, message: 'Location updated successfully' })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const permError = checkApiPermission(session, 'locations', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('Location')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verificar dependências
    const { count: assetCount } = await supabase
      .from('Asset')
      .select('id', { count: 'exact', head: true })
      .eq('locationId', id)

    if (assetCount && assetCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${assetCount} ativo(s) vinculado(s) a esta localização` },
        { status: 409 }
      )
    }

    const { count: woCount } = await supabase
      .from('WorkOrder')
      .select('id', { count: 'exact', head: true })
      .eq('locationId', id)

    if (woCount && woCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${woCount} ordem(ns) de serviço vinculada(s)` },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('Location')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete location error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Location deleted successfully' })
  } catch (error) {
    console.error('Delete location error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
