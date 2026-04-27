import type { InspectionStatus } from './InspectionStatusBadge'

export type InspectionAnswer = 'OK' | 'NOK' | 'NA'

export interface InspectionListItem {
  id: string
  number: string
  description: string
  dueDate: string
  status: InspectionStatus
  checklistName: string
  workCenterName: string
  serviceTypeName: string
  isOverdue?: boolean
  requestCount?: number
  createdAt: string
  assignedTo?: { id: string; firstName: string | null; lastName: string | null; email?: string | null } | null
  finalizedBy?: { id: string; firstName: string | null; lastName: string | null } | null
  createdBy?: { id: string; firstName: string | null; lastName: string | null } | null
  standardChecklist?: { id: string; name: string } | null
}

export interface InspectionStepDetail {
  id: string
  order: number
  stepName: string
  stepProtheusCode: string | null
  optionType: string | null
  answer: InspectionAnswer | null
  notes: string | null
  answeredAt: string | null
  answeredBy?: { id: string; firstName: string | null; lastName: string | null } | null
  requestId: string | null
  request?: { id: string; requestNumber: string | null; status: string } | null
}

export interface InspectionAssetDetail {
  id: string
  order: number
  assetId: string | null
  assetName: string
  assetTag: string | null
  assetProtheusCode: string | null
  familyName: string | null
  familyModelName: string | null
  steps: InspectionStepDetail[]
}

export interface InspectionDetail {
  id: string
  number: string
  description: string
  dueDate: string
  status: InspectionStatus
  isOverdue?: boolean
  checklistName: string
  workCenterName: string
  serviceTypeName: string
  standardChecklistId: string | null
  standardChecklist?: { id: string; name: string } | null
  assignedToId: string
  assignedTo?: { id: string; firstName: string | null; lastName: string | null; email?: string | null } | null
  submittedForReviewAt: string | null
  submittedForReviewBy?: { id: string; firstName: string | null; lastName: string | null } | null
  finalizedAt: string | null
  finalizedBy?: { id: string; firstName: string | null; lastName: string | null } | null
  reopenedAt: string | null
  reopenedBy?: { id: string; firstName: string | null; lastName: string | null } | null
  createdById: string
  createdBy?: { id: string; firstName: string | null; lastName: string | null } | null
  createdAt: string
  updatedAt: string
  assets: InspectionAssetDetail[]
}
