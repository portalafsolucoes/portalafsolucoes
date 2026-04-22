import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/notifications/read-all
 * Marca todas as notificacoes do usuario como lidas.
 */
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('Notification')
    .update({ read: true })
    .eq('userId', session.id)
    .eq('read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
