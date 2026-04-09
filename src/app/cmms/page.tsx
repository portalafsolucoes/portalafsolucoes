import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getDefaultCmmsPath } from '@/lib/user-roles'

export default async function CmmsEntryPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login?returnUrl=/cmms')
  }

  redirect(getDefaultCmmsPath(session))
}
