// Tipos compartilhados para histórico do ativo (AssetTimelineEnhanced + AssetHistoryPrintView)

export interface WoResource {
  id: string
  resourceType?: string | null
  quantity?: number | null
  hours?: number | null
  unit?: string | null
  resource?: { id: string; name: string } | null
  jobTitle?: { id: string; name: string } | null
  user?: { id: string; firstName: string; lastName: string } | null
}

export interface WorkOrderFullDetail {
  id: string
  title?: string | null
  type?: string | null
  status?: string | null
  sequenceNumber?: number | null
  internalId?: string | null
  externalId?: string | null
  executionNotes?: string | null
  laborCost?: number | null
  partsCost?: number | null
  thirdPartyCost?: number | null
  toolsCost?: number | null
  createdAt?: string | null
  completedOn?: string | null
  serviceType?: { id: string; name: string; code?: string | null } | null
  maintenanceArea?: { id: string; name: string; code?: string | null } | null
  assetMaintenancePlan?: { id: string; name?: string | null; sequence?: number | null } | null
  maintenancePlanExec?: { id: string; planNumber?: number | null } | null
  woResources?: WoResource[]
}

export interface RequestFullDetail {
  id: string
  requestNumber?: string | null
  title?: string | null
  status?: string | null
  failureDescription?: string | null
  rejectionReason?: string | null
  createdAt?: string | null
  maintenanceArea?: { id: string; name: string; code?: string | null } | null
  requester?: { id: string; firstName: string; lastName: string } | null
  failureAnalysisReport?: { id: string; rafNumber: string } | null
}

export interface AssetHistoryEvent {
  id: string
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  assetId: string
  workOrderId: string | null
  requestId: string | null
  fileId: string | null
  userId: string | null
  userName: string | null
  workOrder?: WorkOrderFullDetail | null
  request?: RequestFullDetail | null
}
