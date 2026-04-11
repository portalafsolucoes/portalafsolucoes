export interface NamedEntity {
  id: string
  name: string
}

export interface CodeNamedEntity extends NamedEntity {
  code?: string | null
}

export type MaintenanceAreaOption = NamedEntity

export type MaintenanceTypeOption = NamedEntity

export interface ServiceTypeOption extends CodeNamedEntity {
  maintenanceAreaId?: string | null
  maintenanceTypeId?: string | null
  maintenanceArea?: MaintenanceAreaOption | null
  maintenanceType?: MaintenanceTypeOption | null
}

export interface AssetOption extends NamedEntity {
  tag?: string | null
  parentAssetId?: string | null
  familyId?: string | null
  familyModelId?: string | null
}

export interface FamilyModelLink {
  modelId: string
}

export interface AssetFamilyOption extends CodeNamedEntity {
  modelMappings?: FamilyModelLink[] | null
}

export type AssetFamilyModelOption = NamedEntity

export type CalendarOption = NamedEntity

export interface ResourceOption extends NamedEntity {
  type?: string | null
  unit?: string | null
}

export type CostCenterOption = CodeNamedEntity

export type WorkCenterOption = NamedEntity

export type PositionOption = NamedEntity

export type AreaOption = NamedEntity

export interface CharacteristicValueOption extends NamedEntity {
  unit?: string | null
  infoType?: string | null
}
