export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TECHNICIAN'
  | 'LIMITED_TECHNICIAN'
  | 'REQUESTER'
  | 'VIEW_ONLY'
  | 'GESTOR'
  | 'PLANEJADOR'
  | 'MECANICO'
  | 'ELETRICISTA'
  | 'OPERADOR'
  | 'CONSTRUTOR_CIVIL'

export type WorkOrderStatus = 'PENDING' | 'RELEASED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETE'

export type WorkOrderPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AssetStatus = 'OPERATIONAL' | 'DOWN'

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type OsType = 'PREVENTIVE_MANUAL' | 'CORRECTIVE_PLANNED' | 'CORRECTIVE_IMMEDIATE'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  jobTitle?: string
  username: string
  role: UserRole
  image?: string
  rate: number
  enabled: boolean
  lastLogin?: Date
  protheusMatricula?: string
  companyId: string
  locationId?: string
  unitId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Company {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  website?: string
  logo?: string
  createdAt: Date
  updatedAt: Date
}

// Unit foi removido — Location agora serve como unidade organizacional.
// Use a interface Location para representar unidades.

export interface WorkOrder {
  id: string
  customId?: string
  title: string
  description?: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  dueDate?: Date
  completedOn?: Date
  estimatedDuration?: number
  archived: boolean
  feedback?: string
  osType?: OsType
  protheusCode?: string
  plannedStartDate?: Date
  sequenceNumber?: number
  companyId: string
  assetId?: string
  locationId?: string
  categoryId?: string
  createdById?: string
  completedById?: string
  unitId?: string
  serviceTypeId?: string
  assetMaintenancePlanId?: string
  maintenancePlanExecId?: string
  parentRequestId?: string
  parentPreventiveMaintenanceId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Asset {
  id: string
  customId?: string
  name: string
  description?: string
  barCode?: string
  nfcId?: string
  area?: string
  acquisitionCost?: number
  image?: string
  status: AssetStatus
  archived: boolean
  tag?: string
  protheusCode?: string
  hasStructure?: boolean
  manufacturer?: string
  modelName?: string
  serialNumber?: string
  companyId: string
  locationId?: string
  categoryId?: string
  primaryUserId?: string
  parentAssetId?: string
  unitId?: string
  areaId?: string
  workCenterId?: string
  costCenterId?: string
  positionId?: string
  familyId?: string
  familyModelId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Part {
  id: string
  name: string
  description?: string
  cost: number
  quantity: number
  minQuantity: number
  barcode?: string
  area?: string
  image?: string
  companyId: string
  categoryId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Location {
  id: string
  name: string
  address?: string
  latitude?: number
  longitude?: number
  companyId: string
  parentId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  description?: string
  companyId: string
  createdAt: Date
  updatedAt: Date
  members?: TeamMember[]
  _count?: {
    members: number
  }
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  createdAt: Date
  user?: User
  team?: Team
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
