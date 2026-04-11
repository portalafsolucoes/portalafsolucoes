'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useActiveUnit } from '@/hooks/useActiveUnit'
import type { ApiItemResponse, ApiListResponse } from '@/types/api'
import type {
  AreaOption,
  AssetFamilyModelOption,
  AssetFamilyOption,
  AssetOption,
  CalendarOption,
  CharacteristicValueOption,
  CostCenterOption,
  PositionOption,
  WorkCenterOption,
} from '@/types/catalog'

interface Asset {
  id?: string
  name: string
  description?: string
  locationId?: string
  parentAssetId?: string | null
  image?: string | null
  location?: { id: string; name: string }
  files?: { id: string; name: string; url: string }[]
  gutGravity?: number
  gutUrgency?: number
  gutTendency?: number
  protheusCode?: string
  tag?: string
  barCode?: string
  fixedAssetCode?: string
  assetPlate?: string
  familyId?: string
  familyModelId?: string
  assetCategoryType?: string
  assetPriority?: string
  ownershipType?: string
  unitId?: string | null
  areaId?: string | null
  workCenterId?: string
  costCenterId?: string
  positionId?: string
  warehouse?: string
  shiftCode?: string
  manufacturer?: string
  modelName?: string
  serialNumber?: string
  hasStructure?: boolean
  hasCounter?: boolean
  counterType?: string
  counterPosition?: number
  counterLimit?: number
  dailyVariation?: number
  purchaseValue?: number
  acquisitionCost?: number
  hourlyCost?: number
  purchaseDate?: string
  installationDate?: string
  supplierCode?: string
  supplierStore?: string
  warrantyPeriod?: number
  warrantyUnit?: string
  warrantyDate?: string
  maintenanceStatus?: string
  deactivationDate?: string
  deactivationReason?: string
  lifeValue?: number
  lifeUnit?: string
}

interface AssetEditPanelProps {
  asset: Asset
  onClose: () => void
  onSuccess: () => void
}

interface CharacteristicRow {
  characteristicId: string
  value: string
  unit: string
  isExisting?: boolean
}

interface AssetCharacteristicValue {
  characteristicId: string
  value?: string | null
  unit?: string | null
  characteristic?: {
    unit?: string | null
  } | null
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 text-[12px] font-bold text-gray-900 uppercase tracking-wider hover:bg-gray-200 transition-colors"
      >
        {open ? <Icon name="expand_more" className="text-base" /> : <Icon name="chevron_right" className="text-base" />}
        {title}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

function formatDate(value: string | undefined | null): string {
  if (!value) return ''
  try { return new Date(value).toISOString().split('T')[0] } catch { return '' }
}

export function AssetEditPanel({ asset, onClose, onSuccess }: AssetEditPanelProps) {
  const { availableUnits } = useActiveUnit()
  const unitName = availableUnits.find(u => u.id === asset.unitId)?.name || ''

  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<AssetOption[]>([])
  const [families, setFamilies] = useState<AssetFamilyOption[]>([])
  const [familyModels, setFamilyModels] = useState<AssetFamilyModelOption[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenterOption[]>([])
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [characteristics, setCharacteristics] = useState<CharacteristicValueOption[]>([])
  const [characteristicRows, setCharacteristicRows] = useState<CharacteristicRow[]>([])
  const [originalCharacteristicIds, setOriginalCharacteristicIds] = useState<string[]>([])
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string>(asset.image || '')
  const [attachments, setAttachments] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState(asset.files || [])

  const [formData, setFormData] = useState({
    // Identificação
    protheusCode: asset.protheusCode || '',
    tag: asset.tag || '',
    name: asset.name || '',
    description: asset.description || '',
    barCode: asset.barCode || '',
    fixedAssetCode: asset.fixedAssetCode || '',
    assetPlate: asset.assetPlate || '',
    // Classificação
    parentAssetId: asset.parentAssetId || '',
    familyId: asset.familyId || '',
    familyModelId: asset.familyModelId || '',
    assetCategoryType: asset.assetCategoryType || 'BEM',
    assetPriority: asset.assetPriority || '',
    ownershipType: asset.ownershipType || 'PROPRIO',
    // Localização
    unitId: asset.unitId || '',
    locationId: asset.location?.id || asset.locationId || '',
    areaId: asset.areaId || '',
    workCenterId: asset.workCenterId || '',
    costCenterId: asset.costCenterId || '',
    positionId: asset.positionId || '',
    warehouse: asset.warehouse || '',
    shiftCode: asset.shiftCode || '',
    // Técnico
    manufacturer: asset.manufacturer || '',
    modelName: asset.modelName || '',
    serialNumber: asset.serialNumber || '',
    hasStructure: asset.hasStructure || false,
    hasCounter: asset.hasCounter || false,
    counterType: asset.counterType || '',
    counterPosition: asset.counterPosition?.toString() || '',
    counterLimit: asset.counterLimit?.toString() || '',
    dailyVariation: asset.dailyVariation?.toString() || '',
    lifeValue: asset.lifeValue?.toString() || '',
    lifeUnit: asset.lifeUnit || '',
    // Financeiro (mantidos no state para API)
    purchaseValue: asset.purchaseValue?.toString() || '',
    acquisitionCost: asset.acquisitionCost?.toString() || '',
    hourlyCost: asset.hourlyCost?.toString() || '',
    purchaseDate: formatDate(asset.purchaseDate),
    installationDate: formatDate(asset.installationDate),
    supplierCode: asset.supplierCode || '',
    supplierStore: asset.supplierStore || '',
    // Garantia (mantidos no state para API)
    warrantyPeriod: asset.warrantyPeriod?.toString() || '',
    warrantyUnit: asset.warrantyUnit || '',
    warrantyDate: formatDate(asset.warrantyDate),
    // GUT
    gutGravity: asset.gutGravity || 1,
    gutUrgency: asset.gutUrgency || 1,
    gutTendency: asset.gutTendency || 1,
    // Status
    maintenanceStatus: asset.maintenanceStatus || 'ACTIVE',
    deactivationDate: formatDate(asset.deactivationDate),
    deactivationReason: asset.deactivationReason || '',
  })

  const loadData = useCallback(async () => {
    try {
      const [assetsRes, familiesRes, familyModelsRes, costCentersRes, workCentersRes, positionsRes, areasRes, characteristicsRes, calendarsRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/basic-registrations/asset-families'),
        fetch('/api/basic-registrations/asset-family-models'),
        fetch('/api/basic-registrations/cost-centers'),
        fetch('/api/basic-registrations/work-centers'),
        fetch('/api/basic-registrations/positions'),
        fetch('/api/basic-registrations/areas'),
        fetch('/api/basic-registrations/characteristics'),
        fetch('/api/basic-registrations/calendars'),
      ])

      const [assetsData, familiesData, familyModelsData, costCentersData, workCentersData, positionsData, areasData, characteristicsData, calendarsData] = await Promise.all([
        assetsRes.json() as Promise<ApiListResponse<AssetOption>>,
        familiesRes.json() as Promise<ApiListResponse<AssetFamilyOption>>,
        familyModelsRes.json() as Promise<ApiListResponse<AssetFamilyModelOption>>,
        costCentersRes.json() as Promise<ApiListResponse<CostCenterOption>>,
        workCentersRes.json() as Promise<ApiListResponse<WorkCenterOption>>,
        positionsRes.json() as Promise<ApiListResponse<PositionOption>>,
        areasRes.json() as Promise<ApiListResponse<AreaOption>>,
        characteristicsRes.json() as Promise<ApiListResponse<CharacteristicValueOption>>,
        calendarsRes.json() as Promise<ApiListResponse<CalendarOption>>,
      ])

      setAssets(assetsData.data || [])
      setFamilies(familiesData.data || [])
      setFamilyModels(familyModelsData.data || [])
      setCostCenters(costCentersData.data || [])
      setWorkCenters(workCentersData.data || [])
      setPositions(positionsData.data || [])
      setAreas(areasData.data || [])
      setCharacteristics(characteristicsData.data || [])
      setCalendars(calendarsData.data || [])

      // Carregar características existentes do ativo
      if (asset.id) {
        const charRes = await fetch(`/api/assets/${asset.id}/characteristics`)
        const charData = await charRes.json() as ApiListResponse<AssetCharacteristicValue>
        if (charData.data && charData.data.length > 0) {
          const rows: CharacteristicRow[] = charData.data.map(cv => ({
            characteristicId: cv.characteristicId,
            value: cv.value || '',
            unit: cv.unit || cv.characteristic?.unit || '',
            isExisting: true,
          }))
          setCharacteristicRows(rows)
          setOriginalCharacteristicIds(rows.map(r => r.characteristicId))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [asset.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setMainImage(file)
      const reader = new FileReader()
      reader.onloadend = () => { setMainImagePreview(reader.result as string) }
      reader.readAsDataURL(file)
    }
  }

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalFiles = existingFiles.length + attachments.length + files.length
    if (totalFiles <= 10) {
      setAttachments([...attachments, ...files])
    } else {
      alert('Máximo de 10 arquivos anexos permitido')
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const removeExistingFile = async (fileId: string) => {
    if (confirm('Deseja realmente excluir este arquivo?')) {
      try {
        await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
        setExistingFiles(existingFiles.filter(f => f.id !== fileId))
      } catch {
        alert('Erro ao excluir arquivo')
      }
    }
  }

  const updateField = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Áreas e centros de trabalho já vêm filtrados pela unidade ativa via API
  const filteredAreas = areas
  const filteredWorkCenters = workCenters

  // Características
  const addCharacteristicRow = () => {
    setCharacteristicRows(prev => [...prev, { characteristicId: '', value: '', unit: '' }])
  }

  const removeCharacteristicRow = (index: number) => {
    setCharacteristicRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateCharacteristicRow = (index: number, field: keyof CharacteristicRow, value: string) => {
    setCharacteristicRows(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'characteristicId') {
        const char = characteristics.find(c => c.id === value)
        if (char?.unit) {
          updated[index].unit = char.unit
        }
      }
      return updated
    })
  }

  const usedCharacteristicIds = characteristicRows.map(r => r.characteristicId)

  const filteredModels = formData.familyId
    ? familyModels.filter(model => {
        const family = families.find(familyItem => familyItem.id === formData.familyId)
        if (!family?.modelMappings || family.modelMappings.length === 0) return true
        return family.modelMappings.some(mapping => mapping.modelId === model.id)
      })
    : familyModels

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('name', formData.name)

      const stringFields = [
        'protheusCode', 'tag', 'description', 'barCode', 'fixedAssetCode', 'assetPlate',
        'parentAssetId', 'familyId', 'familyModelId', 'assetCategoryType', 'assetPriority', 'ownershipType',
        'locationId', 'areaId', 'workCenterId', 'costCenterId', 'positionId', 'warehouse', 'shiftCode',
        'manufacturer', 'modelName', 'serialNumber',
        'counterType', 'counterPosition', 'counterLimit', 'dailyVariation',
        'purchaseValue', 'acquisitionCost', 'hourlyCost', 'purchaseDate', 'installationDate',
        'supplierCode', 'supplierStore',
        'warrantyPeriod', 'warrantyUnit', 'warrantyDate',
        'maintenanceStatus', 'deactivationDate', 'deactivationReason', 'lifeValue', 'lifeUnit',
      ] as const

      for (const field of stringFields) {
        const value = formData[field]
        if (typeof value === 'string') {
          fd.append(field, value.trim())
        }
      }

      // GUT
      fd.append('gutGravity', formData.gutGravity.toString())
      fd.append('gutUrgency', formData.gutUrgency.toString())
      fd.append('gutTendency', formData.gutTendency.toString())

      // Booleans
      fd.append('hasStructure', String(formData.hasStructure))
      fd.append('hasCounter', String(formData.hasCounter))

      if (mainImage) fd.append('mainImage', mainImage)

      attachments.forEach((file, index) => {
        fd.append(`attachment_${index}`, file)
      })

      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        body: fd
      })

      if (res.ok) {
        // Sincronizar características
        if (asset.id) {
          const currentCharIds = characteristicRows.filter(r => r.characteristicId).map(r => r.characteristicId)

          // Deletar características removidas
          const deletedIds = originalCharacteristicIds.filter(id => !currentCharIds.includes(id))
          await Promise.all(
            deletedIds.map(charId =>
              fetch(`/api/assets/${asset.id}/characteristics?characteristicId=${charId}`, { method: 'DELETE' })
            )
          )

          // Upsert características atuais
          await Promise.all(
            characteristicRows
              .filter(r => r.characteristicId && r.value)
              .map(r =>
                fetch(`/api/assets/${asset.id}/characteristics`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    characteristicId: r.characteristicId,
                    value: r.value,
                    unit: r.unit || null,
                  }),
                })
              )
          )
        }

        onSuccess()
      } else {
        const data = await res.json() as ApiItemResponse<Asset>
        alert(data.error || 'Erro ao salvar ativo')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const selectClass = "w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring text-sm"

  return (
    <div className="h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-black text-gray-900">Editar Ativo</h2>
        <button onClick={onClose} className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors">
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* === IDENTIFICAÇÃO === */}
        <Section title="Identificação" defaultOpen={true}>
          <Input
            label="Código do Bem"
            value={formData.protheusCode}
            onChange={(e) => updateField('protheusCode', e.target.value)}
            placeholder="Ex: A1J01"
          />
          <Input
            label="Nome do Ativo *"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value.slice(0, 40))}
            maxLength={40}
            required
            placeholder="Digite o nome do Ativo"
          />
        </Section>

        {/* === CLASSIFICAÇÃO === */}
        <Section title="Classificação" defaultOpen={true}>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Ativo Pai</label>
            <select value={formData.parentAssetId} onChange={(e) => updateField('parentAssetId', e.target.value)} className={selectClass}>
              <option value="">Nenhum (Ativo Raiz)</option>
              {assets.filter(a => !a.parentAssetId && a.id !== asset.id).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Família</label>
              <select value={formData.familyId} onChange={(e) => { updateField('familyId', e.target.value); updateField('familyModelId', '') }} className={selectClass}>
                <option value="">Selecione</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.code ? `${f.code} - ${f.name}` : f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Modelo</label>
              <select value={formData.familyModelId} onChange={(e) => updateField('familyModelId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Prioridade</label>
              <select value={formData.assetPriority} onChange={(e) => updateField('assetPriority', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                <option value="AAA">AAA - Altíssima</option>
                <option value="AA">AA - Muito Alta</option>
                <option value="A">A - Alta</option>
                <option value="B">B - Média</option>
                <option value="C">C - Baixa</option>
                <option value="ZZZ">ZZZ - Sem prioridade</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Proprietário</label>
              <select value={formData.ownershipType} onChange={(e) => updateField('ownershipType', e.target.value)} className={selectClass}>
                <option value="PROPRIO">Próprio</option>
                <option value="TERCEIRO">Terceiro</option>
              </select>
            </div>
          </div>
        </Section>

        {/* === LOCALIZAÇÃO === */}
        <Section title="Localização e Organização" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Unidade</label>
              <input type="text" value={unitName} disabled className={`${selectClass} opacity-70 cursor-not-allowed`} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Área</label>
              <select value={formData.areaId} onChange={(e) => updateField('areaId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {filteredAreas.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Centro de Trabalho</label>
              <select value={formData.workCenterId} onChange={(e) => updateField('workCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {filteredWorkCenters.map((wc) => (<option key={wc.id} value={wc.id}>{wc.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Centro de Custo</label>
              <select value={formData.costCenterId} onChange={(e) => updateField('costCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {costCenters.map((cc) => (<option key={cc.id} value={cc.id}>{cc.code ? `${cc.code} - ${cc.name}` : cc.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Posição</label>
              <select value={formData.positionId} onChange={(e) => updateField('positionId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {positions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Turno</label>
            <select value={formData.shiftCode} onChange={(e) => updateField('shiftCode', e.target.value)} className={selectClass}>
              <option value="">Selecione</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.name}>{cal.name}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* === DADOS TÉCNICOS === */}
        <Section title="Dados Técnicos" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Fabricante" value={formData.manufacturer} onChange={(e) => updateField('manufacturer', e.target.value)} placeholder="Nome do fabricante" />
            <Input label="Modelo" value={formData.modelName} onChange={(e) => updateField('modelName', e.target.value)} placeholder="Modelo do equipamento" />
          </div>
          <Input label="Número de Série" value={formData.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} placeholder="Número de série" />
          <div className="flex gap-6 py-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.hasStructure} onChange={(e) => updateField('hasStructure', e.target.checked)} className="rounded border-input" />
              Tem Estrutura
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.hasCounter} onChange={(e) => updateField('hasCounter', e.target.checked)} className="rounded border-input" />
              Controlado por Contador
            </label>
          </div>
          {formData.hasCounter && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-[4px]">
              <Input label="Tipo do Contador" value={formData.counterType} onChange={(e) => updateField('counterType', e.target.value)} placeholder="Ex: Horímetro" />
              <Input label="Posição Atual" value={formData.counterPosition} onChange={(e) => updateField('counterPosition', e.target.value)} placeholder="0" type="number" />
              <Input label="Limite do Contador" value={formData.counterLimit} onChange={(e) => updateField('counterLimit', e.target.value)} placeholder="0" type="number" />
              <Input label="Variação Diária" value={formData.dailyVariation} onChange={(e) => updateField('dailyVariation', e.target.value)} placeholder="0" type="number" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Vida Útil (valor)" value={formData.lifeValue} onChange={(e) => updateField('lifeValue', e.target.value)} placeholder="0" type="number" />
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Vida Útil (unidade)</label>
              <select value={formData.lifeUnit} onChange={(e) => updateField('lifeUnit', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                <option value="HORAS">Horas</option>
                <option value="DIAS">Dias</option>
                <option value="MESES">Meses</option>
                <option value="ANOS">Anos</option>
                <option value="KM">Quilômetros</option>
                <option value="CICLOS">Ciclos</option>
              </select>
            </div>
          </div>

          {/* Características Dinâmicas */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Características</label>
              <button type="button" onClick={addCharacteristicRow} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                <Icon name="add_circle" className="text-base" />
                Adicionar
              </button>
            </div>
            {characteristicRows.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma característica adicionada. Clique em &quot;Adicionar&quot; para incluir.</p>
            ) : (
              <div className="space-y-2">
                {characteristicRows.map((row, index) => (
                  <div key={index} className="flex items-end gap-2 p-2 bg-muted/30 rounded-[4px]">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Característica</label>
                      <select
                        value={row.characteristicId}
                        onChange={(e) => updateCharacteristicRow(index, 'characteristicId', e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Selecione</option>
                        {characteristics
                          .filter(c => c.id === row.characteristicId || !usedCharacteristicIds.includes(c.id))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Valor</label>
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateCharacteristicRow(index, 'value', e.target.value)}
                        className={selectClass}
                        placeholder="Ex: 50"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Unidade</label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => updateCharacteristicRow(index, 'unit', e.target.value)}
                        className={selectClass}
                        placeholder="Ex: KW"
                      />
                    </div>
                    <button type="button" onClick={() => removeCharacteristicRow(index)} className="p-2 text-danger hover:bg-red-50 rounded transition-colors">
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* === CRITICIDADE GUT === */}
        <Section title="Criticidade (Matriz GUT)" defaultOpen={false}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="monitoring" className="text-xl text-primary" />
            <p className="text-xs text-muted-foreground">Avalie de 1 (baixo) a 5 (alto) cada critério.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gravidade (G) - Impacto se falhar</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutGravity', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutGravity === value ? 'bg-neutral-800 text-white ring-2 ring-neutral-400' : 'bg-secondary hover:bg-neutral-300 text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutGravity === 1 && 'Sem gravidade'}{formData.gutGravity === 2 && 'Pouco grave'}{formData.gutGravity === 3 && 'Grave'}{formData.gutGravity === 4 && 'Muito grave'}{formData.gutGravity === 5 && 'Extremamente grave'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Urgência (U) - Tempo disponível para resolver</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutUrgency', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutUrgency === value ? 'bg-neutral-800 text-white ring-2 ring-neutral-400' : 'bg-secondary hover:bg-neutral-300 text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutUrgency === 1 && 'Pode esperar'}{formData.gutUrgency === 2 && 'Pouco urgente'}{formData.gutUrgency === 3 && 'Urgente'}{formData.gutUrgency === 4 && 'Muito urgente'}{formData.gutUrgency === 5 && 'Ação imediata'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tendência (T) - Piora se não tratado</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutTendency', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutTendency === value ? 'bg-neutral-800 text-white ring-2 ring-neutral-400' : 'bg-secondary hover:bg-neutral-300 text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutTendency === 1 && 'Não piora'}{formData.gutTendency === 2 && 'Piora a longo prazo'}{formData.gutTendency === 3 && 'Piora a médio prazo'}{formData.gutTendency === 4 && 'Piora a curto prazo'}{formData.gutTendency === 5 && 'Piora rapidamente'}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Score GUT:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{formData.gutGravity * formData.gutUrgency * formData.gutTendency}</span>
                  <span className="text-xs text-muted-foreground">({formData.gutGravity} x {formData.gutUrgency} x {formData.gutTendency})</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* === STATUS === */}
        <Section title="Status" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Situação de Manutenção</label>
              <select value={formData.maintenanceStatus} onChange={(e) => updateField('maintenanceStatus', e.target.value)} className={selectClass}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
            <Input label="Data de Baixa" value={formData.deactivationDate} onChange={(e) => updateField('deactivationDate', e.target.value)} type="date" />
          </div>
          <Input label="Motivo da Baixa" value={formData.deactivationReason} onChange={(e) => updateField('deactivationReason', e.target.value)} placeholder="Motivo da baixa do ativo" />
        </Section>

        {/* === IMAGENS E ANEXOS === */}
        <Section title="Imagens e Anexos" defaultOpen={false}>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Foto Principal do Ativo</label>
            {mainImagePreview ? (
              <div className="relative h-48 w-full overflow-hidden rounded-[4px]">
                <Image src={mainImagePreview} alt="Preview" fill unoptimized className="object-cover" />
                <button type="button" onClick={() => { setMainImage(null); setMainImagePreview('') }} className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full hover:bg-red-700">
                  <Icon name="close" className="text-base" />
                </button>
              </div>
            ) : (
              <div onClick={() => mainImageInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-[4px] cursor-pointer hover:bg-secondary">
                <Icon name="image" className="text-3xl text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para adicionar foto principal</p>
                <input ref={mainImageInputRef} type="file" accept="image/*" onChange={handleMainImageChange} className="hidden" />
              </div>
            )}
          </div>

          {existingFiles.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Arquivos Existentes ({existingFiles.length}/10)</label>
              <div className="space-y-1">
                {existingFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <div className="flex items-center gap-2">
                      <Icon name="description" className="text-base text-muted-foreground" />
                      <span className="text-sm text-foreground truncate">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeExistingFile(file.id)} className="text-danger hover:text-danger">
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Novos Anexos (até {10 - existingFiles.length})</label>
            <input ref={attachmentsInputRef} type="file" multiple onChange={handleAttachmentsChange} className="hidden" disabled={existingFiles.length + attachments.length >= 10} />
            <div onClick={() => attachmentsInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-[4px] cursor-pointer hover:bg-secondary">
              <Icon name="upload" className="text-2xl text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Adicionar PDFs, fotos, etc.</p>
              <p className="text-xs text-muted-foreground">{existingFiles.length + attachments.length}/10 arquivos</p>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-primary/5 rounded">
                    <div className="flex items-center gap-2">
                      <Icon name="description" className="text-base text-blue-500" />
                      <span className="text-sm text-foreground truncate">{file.name}</span>
                      <span className="text-xs text-primary">(novo)</span>
                    </div>
                    <button type="button" onClick={() => removeAttachment(index)} className="text-danger hover:text-danger">
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
