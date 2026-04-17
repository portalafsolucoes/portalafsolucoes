import { supabase } from '@/lib/supabase'

export type UserReferenceCounts = {
  workOrders: number
  workOrdersAssigned: number
  workOrdersCompleted: number
  workOrderSchedules: number
  workOrderRescheduleEntries: number
  workOrderResources: number
  labors: number
  requestsCreated: number
  requestsApproved: number
  requestsAssigned: number
  failureAnalysisReports: number
  teamLed: number
  teamMemberships: number
  primaryAssets: number
  resources: number
  standardTaskLabors: number
  assetTaskLabors: number
}

export type UserReferencesResult = {
  counts: UserReferenceCounts
  total: number
  hasHistory: boolean
}

async function countByField(table: string, field: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(field, userId)

  if (error) {
    console.error(`Error counting ${table}.${field}:`, error)
    return 0
  }
  return count || 0
}

export async function countUserReferences(userId: string): Promise<UserReferencesResult> {
  const [
    workOrders,
    workOrdersAssigned,
    workOrdersCompleted,
    workOrderSchedules,
    workOrderRescheduleEntries,
    workOrderResources,
    labors,
    requestsCreated,
    requestsApproved,
    requestsAssigned,
    failureAnalysisReports,
    teamLed,
    teamMemberships,
    primaryAssets,
    resources,
    standardTaskLabors,
    assetTaskLabors,
  ] = await Promise.all([
    countByField('WorkOrder', 'createdById', userId),
    countByField('WorkOrder', 'assignedToId', userId),
    countByField('WorkOrder', 'completedById', userId),
    countByField('WorkOrderSchedule', 'createdById', userId),
    countByField('WorkOrderRescheduleHistory', 'userId', userId),
    countByField('WorkOrderResource', 'userId', userId),
    countByField('Labor', 'userId', userId),
    countByField('Request', 'createdById', userId),
    countByField('Request', 'approvedById', userId),
    countByField('Request', 'assignedToId', userId),
    countByField('FailureAnalysisReport', 'createdById', userId),
    countByField('Team', 'leaderId', userId),
    countByField('TeamMember', 'userId', userId),
    countByField('Asset', 'primaryUserId', userId),
    countByField('Resource', 'userId', userId),
    countByField('StandardMaintenanceTaskResource', 'userId', userId),
    countByField('AssetMaintenanceTaskResource', 'userId', userId),
  ])

  const counts: UserReferenceCounts = {
    workOrders,
    workOrdersAssigned,
    workOrdersCompleted,
    workOrderSchedules,
    workOrderRescheduleEntries,
    workOrderResources,
    labors,
    requestsCreated,
    requestsApproved,
    requestsAssigned,
    failureAnalysisReports,
    teamLed,
    teamMemberships,
    primaryAssets,
    resources,
    standardTaskLabors,
    assetTaskLabors,
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return {
    counts,
    total,
    hasHistory: total > 0,
  }
}

export async function isLastActiveSuperAdmin(userId: string, companyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('User')
    .select('id')
    .eq('companyId', companyId)
    .eq('role', 'SUPER_ADMIN')
    .eq('status', 'ACTIVE')

  if (error || !data) return false
  if (data.length === 0) return false
  if (data.length > 1) return false
  return data[0].id === userId
}
