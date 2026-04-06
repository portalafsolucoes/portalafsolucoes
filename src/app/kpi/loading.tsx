import { AppLayout } from '@/components/layout/AppLayout'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <AppLayout>
      <PageSkeleton />
    </AppLayout>
  )
}
