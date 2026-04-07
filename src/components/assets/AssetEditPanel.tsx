'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
  // Campos TOTVS
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
  unitId?: string
  areaId?: string
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

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
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
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [familyModels, setFamilyModels] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [workCenters, setWorkCenters] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
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
    // Financeiro
    purchaseValue: asset.purchaseValue?.toString() || '',
    acquisitionCost: asset.acquisitionCost?.toString() || '',
    hourlyCost: asset.hourlyCost?.toString() || '',
    purchaseDate: formatDate(asset.purchaseDate),
    installationDate: formatDate(asset.installationDate),
    supplierCode: asset.supplierCode || '',
    supplierStore: asset.supplierStore || '',
    // Garantia
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [locationsRes, assetsRes, familiesRes, familyModelsRes, costCentersRes, workCentersRes, positionsRes, areasRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/assets'),
        fetch('/api/basic-registrations/asset-families'),
        fetch('/api/basic-registrations/asset-family-models'),
        fetch('/api/basic-registrations/cost-centers'),
        fetch('/api/basic-registrations/work-centers'),
        fetch('/api/basic-registrations/positions'),
        fetch('/api/basic-registrations/areas'),
      ])

      const [locationsData, assetsData, familiesData, familyModelsData, costCentersData, workCentersData, positionsData, areasData] = await Promise.all([
        locationsRes.json(), assetsRes.json(), familiesRes.json(), familyModelsRes.json(),
        costCentersRes.json(), workCentersRes.json(), positionsRes.json(), areasRes.json(),
      ])

      setLocations(locationsData.data || [])
      setAssets(assetsData.data || [])
      setFamilies(familiesData.data || [])
      setFamilyModels(familyModelsData.data || [])
      setCostCenters(costCentersData.data || [])
      setWorkCenters(workCentersData.data || [])
      setPositions(positionsData.data || [])
      setAreas(areasData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

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

  const filteredModels = formData.familyId
    ? familyModels.filter((m: any) => {
        const family = families.find((f: any) => f.id === formData.familyId)
        if (!family?.modelMappings) return true
        return family.modelMappings.some((mm: any) => mm.modelId === m.id)
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
        'unitId', 'locationId', 'areaId', 'workCenterId', 'costCenterId', 'positionId', 'warehouse', 'shiftCode',
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
        onSuccess()
      } else {
        const data = await res.json()
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
    <div className="h-full flex flex-col bg-card border-l border-on-surface-variant/10">
      <div className="flex items-center justify-between p-4 border-b border-on-surface-variant/10">
        <h2 className="text-xl font-bold text-foreground">Editar Ativo</h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* === IDENTIFICAÇÃO === */}
        <Section title="Identificação" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código do Bem"
              value={formData.protheusCode}
              onChange={(e) => updateField('protheusCode', e.target.value)}
              placeholder="Ex: A1J01"
            />
            <Input
              label="Tag"
              value={formData.tag}
              onChange={(e) => updateField('tag', e.target.value.slice(0, 6).toUpperCase())}
              maxLength={6}
              placeholder="Máx 6 caracteres"
            />
          </div>
          <Input
            label="Nome do Ativo *"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value.slice(0, 40))}
            maxLength={40}
            required
            placeholder="Digite o nome do Ativo"
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className={selectClass}
              placeholder="Adicione mais informações"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Código de Barras" value={formData.barCode} onChange={(e) => updateField('barCode', e.target.value)} placeholder="Código de barras" />
            <Input label="Cód. Imobilizado" value={formData.fixedAssetCode} onChange={(e) => updateField('fixedAssetCode', e.target.value)} placeholder="Código contábil" />
          </div>
          <Input label="Chapa Imobilizado" value={formData.assetPlate} onChange={(e) => updateField('assetPlate', e.target.value)} placeholder="Chapa do imobilizado" />
        </Section>

        {/* === CLASSIFICAÇÃO === */}
        <Section title="Classificação" defaultOpen={true}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ativo Pai</label>
            <select value={formData.parentAssetId} onChange={(e) => updateField('parentAssetId', e.target.value)} className={selectClass}>
              <option value="">Nenhum (Ativo Raiz)</option>
              {assets.filter(a => !a.parentAssetId && a.id !== asset.id).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Família</label>
              <select value={formData.familyId} onChange={(e) => { updateField('familyId', e.target.value); updateField('familyModelId', '') }} className={selectClass}>
                <option value="">Selecione</option>
                {families.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.code ? `${f.code} - ${f.name}` : f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
              <select value={formData.familyModelId} onChange={(e) => updateField('familyModelId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {filteredModels.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
              <select value={formData.assetCategoryType} onChange={(e) => updateField('assetCategoryType', e.target.value)} className={selectClass}>
                <option value="BEM">Bem</option>
                <option value="RECURSO">Recurso</option>
                <option value="FERRAMENTA">Ferramenta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Prioridade</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">Proprietário</label>
              <select value={formData.ownershipType} onChange={(e) => updateField('ownershipType', e.target.value)} className={selectClass}>
                <option value="PROPRIO">Próprio</option>
                <option value="TERCEIRO">Terceiro</option>
              </select>
            </div>
          </div>
        </Section>

        {/* === LOCALIZAÇÃO === */}
        <Section title="Localização e Organização" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Unidade</label>
              <select value={formData.unitId} onChange={(e) => updateField('unitId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {locations.filter((l: any) => !l.parentId).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Localização</label>
              <select value={formData.locationId} onChange={(e) => updateField('locationId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Área</label>
              <select value={formData.areaId} onChange={(e) => updateField('areaId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {areas.map((a: any) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Centro de Trabalho</label>
              <select value={formData.workCenterId} onChange={(e) => updateField('workCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {workCenters.map((wc: any) => (<option key={wc.id} value={wc.id}>{wc.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Centro de Custo</label>
              <select value={formData.costCenterId} onChange={(e) => updateField('costCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {costCenters.map((cc: any) => (<option key={cc.id} value={cc.id}>{cc.code ? `${cc.code} - ${cc.name}` : cc.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Posição</label>
              <select value={formData.positionId} onChange={(e) => updateField('positionId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {positions.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Almoxarifado" value={formData.warehouse} onChange={(e) => updateField('warehouse', e.target.value)} placeholder="Código do almoxarifado" />
            <Input label="Turno" value={formData.shiftCode} onChange={(e) => updateField('shiftCode', e.target.value)} placeholder="Ex: M03" />
          </div>
        </Section>

        {/* === DADOS TÉCNICOS === */}
        <Section title="Dados Técnicos" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-[4px]">
              <Input label="Tipo do Contador" value={formData.counterType} onChange={(e) => updateField('counterType', e.target.value)} placeholder="Ex: Horímetro" />
              <Input label="Posição Atual" value={formData.counterPosition} onChange={(e) => updateField('counterPosition', e.target.value)} placeholder="0" type="number" />
              <Input label="Limite do Contador" value={formData.counterLimit} onChange={(e) => updateField('counterLimit', e.target.value)} placeholder="0" type="number" />
              <Input label="Variação Diária" value={formData.dailyVariation} onChange={(e) => updateField('dailyVariation', e.target.value)} placeholder="0" type="number" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vida Útil (valor)" value={formData.lifeValue} onChange={(e) => updateField('lifeValue', e.target.value)} placeholder="0" type="number" />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vida Útil (unidade)</label>
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
        </Section>

        {/* === FINANCEIRO === */}
        <Section title="Financeiro e Aquisição" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor de Compra (R$)" value={formData.purchaseValue} onChange={(e) => updateField('purchaseValue', e.target.value)} placeholder="0,00" type="number" step="0.01" />
            <Input label="Custo de Aquisição (R$)" value={formData.acquisitionCost} onChange={(e) => updateField('acquisitionCost', e.target.value)} placeholder="0,00" type="number" step="0.01" />
          </div>
          <Input label="Custo Hora (R$)" value={formData.hourlyCost} onChange={(e) => updateField('hourlyCost', e.target.value)} placeholder="0,00" type="number" step="0.01" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data de Compra" value={formData.purchaseDate} onChange={(e) => updateField('purchaseDate', e.target.value)} type="date" />
            <Input label="Data de Instalação" value={formData.installationDate} onChange={(e) => updateField('installationDate', e.target.value)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Código Fornecedor" value={formData.supplierCode} onChange={(e) => updateField('supplierCode', e.target.value)} placeholder="Código do fornecedor" />
            <Input label="Loja Fornecedor" value={formData.supplierStore} onChange={(e) => updateField('supplierStore', e.target.value)} placeholder="Loja" />
          </div>
        </Section>

        {/* === GARANTIA === */}
        <Section title="Garantia" defaultOpen={false}>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Prazo" value={formData.warrantyPeriod} onChange={(e) => updateField('warrantyPeriod', e.target.value)} placeholder="0" type="number" />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Unidade</label>
              <select value={formData.warrantyUnit} onChange={(e) => updateField('warrantyUnit', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                <option value="DIAS">Dias</option>
                <option value="MESES">Meses</option>
                <option value="ANOS">Anos</option>
              </select>
            </div>
            <Input label="Data Garantia" value={formData.warrantyDate} onChange={(e) => updateField('warrantyDate', e.target.value)} type="date" />
          </div>
        </Section>

        {/* === CRITICIDADE GUT === */}
        <Section title="Criticidade (Matriz GUT)" defaultOpen={false}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="monitoring" className="text-xl text-primary" />
            <p className="text-xs text-muted-foreground">Avalie de 1 (baixo) a 5 (alto) cada critério.</p>
          </div>
          <div className="space-y-4">
            {/* Gravidade */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Gravidade (G) - Impacto se falhar</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutGravity', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutGravity === value ? 'bg-danger text-white ring-2 ring-red-300' : 'bg-secondary hover:bg-danger-light text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutGravity === 1 && 'Sem gravidade'}{formData.gutGravity === 2 && 'Pouco grave'}{formData.gutGravity === 3 && 'Grave'}{formData.gutGravity === 4 && 'Muito grave'}{formData.gutGravity === 5 && 'Extremamente grave'}
                </span>
              </div>
            </div>
            {/* Urgência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Urgência (U) - Tempo disponível para resolver</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutUrgency', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutUrgency === value ? 'bg-orange-500 text-white ring-2 ring-orange-300' : 'bg-secondary hover:bg-orange-100 text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutUrgency === 1 && 'Pode esperar'}{formData.gutUrgency === 2 && 'Pouco urgente'}{formData.gutUrgency === 3 && 'Urgente'}{formData.gutUrgency === 4 && 'Muito urgente'}{formData.gutUrgency === 5 && 'Ação imediata'}
                </span>
              </div>
            </div>
            {/* Tendência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tendência (T) - Piora se não tratado</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => updateField('gutTendency', value)}
                    className={`w-10 h-10 rounded-[4px] font-bold transition-all ${formData.gutTendency === value ? 'bg-warning text-white ring-2 ring-yellow-300' : 'bg-secondary hover:bg-warning-light text-muted-foreground'}`}>
                    {value}
                  </button>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formData.gutTendency === 1 && 'Não piora'}{formData.gutTendency === 2 && 'Piora a longo prazo'}{formData.gutTendency === 3 && 'Piora a médio prazo'}{formData.gutTendency === 4 && 'Piora a curto prazo'}{formData.gutTendency === 5 && 'Piora rapidamente'}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-on-surface-variant/10">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Situação de Manutenção</label>
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
            <label className="block text-sm font-medium text-foreground mb-1">Foto Principal do Ativo</label>
            {mainImagePreview ? (
              <div className="relative">
                <img src={mainImagePreview} alt="Preview" className="w-full h-48 object-cover rounded-[4px]" />
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
              <label className="block text-sm font-medium text-foreground mb-1">Arquivos Existentes ({existingFiles.length}/10)</label>
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
            <label className="block text-sm font-medium text-foreground mb-1">Novos Anexos (até {10 - existingFiles.length})</label>
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
        <div className="flex gap-3 pt-4 border-t border-on-surface-variant/10">
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
