import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/notifications
 * Lista as notificacoes do usuario autenticado, ordenadas por data desc.
 * Query opcional: ?unreadOnly=1 e ?limit=N (default 30, max 100).
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === '1'
  const limitParam = Number(searchParams.get('limit') ?? '30')
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 30, 1), 100)

  let query = supabase
    .from('Notification')
    .select('id, title, message, read, href, createdAt')
    .eq('userId', session.id)
    .order('createdAt', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  const { count: unreadCount } = await supabase
    .from('Notification')
    .select('id', { count: 'exact', head: true })
    .eq('userId', session.id)
    .eq('read', false)

  return NextResponse.json({
    data: data ?? [],
    unreadCount: unreadCount ?? 0,
  })
}
