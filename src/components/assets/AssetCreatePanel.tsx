'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AssetCreatePanelProps {
  onClose: () => void
  onSuccess: () => void
  parentAsset?: { id: string; name: string }
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

export function AssetCreatePanel({ onClose, onSuccess, parentAsset }: AssetCreatePanelProps) {
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
  const [mainImagePreview, setMainImagePreview] = useState<string>('')
  const [attachments, setAttachments] = useState<File[]>([])

  const [formData, setFormData] = useState({
    // Identificação
    protheusCode: '',
    tag: '',
    name: '',
    description: '',
    barCode: '',
    fixedAssetCode: '',
    assetPlate: '',
    // Classificação
    parentAssetId: parentAsset?.id || '',
    familyId: '',
    familyModelId: '',
    assetCategoryType: 'BEM',
    assetPriority: '',
    ownershipType: 'PROPRIO',
    // Localização
    unitId: '',
    locationId: '',
    areaId: '',
    workCenterId: '',
    costCenterId: '',
    positionId: '',
    warehouse: '',
    shiftCode: '',
    // Técnico
    manufacturer: '',
    modelName: '',
    serialNumber: '',
    hasStructure: false,
    hasCounter: false,
    counterType: '',
    counterPosition: '',
    counterLimit: '',
    dailyVariation: '',
    // Financeiro
    purchaseValue: '',
    acquisitionCost: '',
    hourlyCost: '',
    purchaseDate: '',
    installationDate: '',
    supplierCode: '',
    supplierStore: '',
    // Garantia
    warrantyPeriod: '',
    warrantyUnit: '',
    warrantyDate: '',
    // Status
    maintenanceStatus: 'ACTIVE',
    deactivationDate: '',
    deactivationReason: '',
    lifeValue: '',
    lifeUnit: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (parentAsset) {
      setFormData(prev => ({ ...prev, parentAssetId: parentAsset.id }))
    }
  }, [parentAsset])

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
        locationsRes.json(),
        assetsRes.json(),
        familiesRes.json(),
        familyModelsRes.json(),
        costCentersRes.json(),
        workCentersRes.json(),
        positionsRes.json(),
        areasRes.json(),
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
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (attachments.length + files.length <= 10) {
      setAttachments([...attachments, ...files])
    } else {
      alert('Máximo de 10 arquivos anexos permitido')
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Filtrar modelos pela família selecionada
  const filteredModels = formData.familyId
    ? familyModels.filter((m: any) => {
        const family = families.find((f: any) => f.id === formData.familyId)
        if (!family?.modelMappings || family.modelMappings.length === 0) return true
        return family.modelMappings.some((mm: any) => mm.modelId === m.id)
      })
    : familyModels

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fd = new FormData()

      // Campos obrigatórios
      fd.append('name', formData.name)

      // Todos os campos string — só envia se preenchido
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
        if (typeof value === 'string' && value.trim()) {
          fd.append(field, value.trim())
        }
      }

      // Campos boolean
      fd.append('hasStructure', String(formData.hasStructure))
      fd.append('hasCounter', String(formData.hasCounter))

      // Imagem principal
      if (mainImage) {
        fd.append('mainImage', mainImage)
      }

      // Anexos
      attachments.forEach((file, index) => {
        fd.append(`attachment_${index}`, file)
      })

      const res = await fetch('/api/assets', {
        method: 'POST',
        body: fd
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao criar ativo')
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
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-on-surface-variant/10">
        <h2 className="text-xl font-bold text-foreground">
          {parentAsset ? `Novo Subativo de ${parentAsset.name}` : 'Cadastrar novo Ativo'}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
          <Icon name="close" className="text-xl text-muted-foreground" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* === SEÇÃO 1: IDENTIFICAÇÃO === */}
        <Section title="Identificação" defaultOpen={true}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                label="Código do Bem *"
                value={formData.protheusCode}
                onChange={(e) => updateField('protheusCode', e.target.value)}
                placeholder="Ex: A1J01"
                required
              />
            </div>
            <Input
              label="Tag"
              value={formData.tag}
              onChange={(e) => updateField('tag', e.target.value.slice(0, 6).toUpperCase())}
              maxLength={6}
              placeholder="Máx 6 caracteres"
            />
            <Input
              label="Chapa Imobilizado"
              value={formData.assetPlate}
              onChange={(e) => updateField('assetPlate', e.target.value)}
              placeholder="Chapa do imobilizado"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                label="Nome do Ativo *"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value.slice(0, 40))}
                maxLength={40}
                required
                placeholder="Digite o nome do Ativo"
              />
            </div>
            <Input
              label="Cód. Imobilizado"
              value={formData.fixedAssetCode}
              onChange={(e) => updateField('fixedAssetCode', e.target.value)}
              placeholder="Código contábil"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className={selectClass}
                placeholder="Adicione mais informações"
              />
            </div>
            <Input
              label="Código de Barras"
              value={formData.barCode}
              onChange={(e) => updateField('barCode', e.target.value)}
              placeholder="Código de barras"
            />
          </div>
        </Section>

        {/* === SEÇÃO 2: CLASSIFICAÇÃO === */}
        <Section title="Classificação" defaultOpen={true}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ativo Pai {parentAsset && <span className="text-xs text-muted-foreground">(via menu contexto)</span>}
            </label>
            <select
              value={formData.parentAssetId}
              onChange={(e) => updateField('parentAssetId', e.target.value)}
              className={selectClass}
              disabled={!!parentAsset}
            >
              <option value="">Nenhum (Ativo Raiz)</option>
              {assets.filter(a => !a.parentAssetId).map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
            {!formData.parentAssetId && (
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para criar um ativo raiz</p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Família</label>
              <select value={formData.familyId} onChange={(e) => { updateField('familyId', e.target.value); updateField('familyModelId', '') }} className={selectClass}>
                <option value="">Selecione</option>
                {families.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.code ? `${f.code} - ${f.name}` : f.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
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

        {/* === SEÇÃO 3: LOCALIZAÇÃO E ORGANIZAÇÃO === */}
        <Section title="Localização e Organização" defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Área</label>
              <select value={formData.areaId} onChange={(e) => updateField('areaId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {areas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Centro de Trabalho</label>
              <select value={formData.workCenterId} onChange={(e) => updateField('workCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {workCenters.map((wc: any) => (
                  <option key={wc.id} value={wc.id}>{wc.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Centro de Custo</label>
              <select value={formData.costCenterId} onChange={(e) => updateField('costCenterId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {costCenters.map((cc: any) => (
                  <option key={cc.id} value={cc.id}>{cc.code ? `${cc.code} - ${cc.name}` : cc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Posição</label>
              <select value={formData.positionId} onChange={(e) => updateField('positionId', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                {positions.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Almoxarifado"
              value={formData.warehouse}
              onChange={(e) => updateField('warehouse', e.target.value)}
              placeholder="Código do almoxarifado"
            />
            <Input
              label="Turno"
              value={formData.shiftCode}
              onChange={(e) => updateField('shiftCode', e.target.value)}
              placeholder="Ex: M03"
            />
          </div>
        </Section>

        {/* === SEÇÃO 4: DADOS TÉCNICOS === */}
        <Section title="Dados Técnicos" defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Input
              label="Fabricante"
              value={formData.manufacturer}
              onChange={(e) => updateField('manufacturer', e.target.value)}
              placeholder="Nome do fabricante"
            />
            <Input
              label="Modelo"
              value={formData.modelName}
              onChange={(e) => updateField('modelName', e.target.value)}
              placeholder="Modelo do equipamento"
            />
            <Input
              label="Número de Série"
              value={formData.serialNumber}
              onChange={(e) => updateField('serialNumber', e.target.value)}
              placeholder="Número de série"
            />
          </div>
          <div className="flex gap-6 py-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasStructure}
                onChange={(e) => updateField('hasStructure', e.target.checked)}
                className="rounded border-input"
              />
              Tem Estrutura
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasCounter}
                onChange={(e) => updateField('hasCounter', e.target.checked)}
                className="rounded border-input"
              />
              Controlado por Contador
            </label>
          </div>
          {formData.hasCounter && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-[4px]">
              <Input
                label="Tipo do Contador"
                value={formData.counterType}
                onChange={(e) => updateField('counterType', e.target.value)}
                placeholder="Ex: Horímetro"
              />
              <Input
                label="Posição Atual"
                value={formData.counterPosition}
                onChange={(e) => updateField('counterPosition', e.target.value)}
                placeholder="0"
                type="number"
              />
              <Input
                label="Limite do Contador"
                value={formData.counterLimit}
                onChange={(e) => updateField('counterLimit', e.target.value)}
                placeholder="0"
                type="number"
              />
              <Input
                label="Variação Diária"
                value={formData.dailyVariation}
                onChange={(e) => updateField('dailyVariation', e.target.value)}
                placeholder="0"
                type="number"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vida Útil (valor)"
              value={formData.lifeValue}
              onChange={(e) => updateField('lifeValue', e.target.value)}
              placeholder="0"
              type="number"
            />
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

        {/* === SEÇÃO 5: FINANCEIRO E AQUISIÇÃO === */}
        <Section title="Financeiro e Aquisição" defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Input
              label="Valor de Compra (R$)"
              value={formData.purchaseValue}
              onChange={(e) => updateField('purchaseValue', e.target.value)}
              placeholder="0,00"
              type="number"
              step="0.01"
            />
            <Input
              label="Custo de Aquisição (R$)"
              value={formData.acquisitionCost}
              onChange={(e) => updateField('acquisitionCost', e.target.value)}
              placeholder="0,00"
              type="number"
              step="0.01"
            />
            <Input
              label="Custo Hora (R$)"
              value={formData.hourlyCost}
              onChange={(e) => updateField('hourlyCost', e.target.value)}
              placeholder="0,00"
              type="number"
              step="0.01"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              label="Data de Compra"
              value={formData.purchaseDate}
              onChange={(e) => updateField('purchaseDate', e.target.value)}
              type="date"
            />
            <Input
              label="Data de Instalação"
              value={formData.installationDate}
              onChange={(e) => updateField('installationDate', e.target.value)}
              type="date"
            />
            <Input
              label="Código Fornecedor"
              value={formData.supplierCode}
              onChange={(e) => updateField('supplierCode', e.target.value)}
              placeholder="Código do fornecedor"
            />
            <Input
              label="Loja Fornecedor"
              value={formData.supplierStore}
              onChange={(e) => updateField('supplierStore', e.target.value)}
              placeholder="Loja"
            />
          </div>
        </Section>

        {/* === SEÇÃO 6: GARANTIA === */}
        <Section title="Garantia" defaultOpen={false}>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Prazo"
              value={formData.warrantyPeriod}
              onChange={(e) => updateField('warrantyPeriod', e.target.value)}
              placeholder="0"
              type="number"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Unidade</label>
              <select value={formData.warrantyUnit} onChange={(e) => updateField('warrantyUnit', e.target.value)} className={selectClass}>
                <option value="">Selecione</option>
                <option value="DIAS">Dias</option>
                <option value="MESES">Meses</option>
                <option value="ANOS">Anos</option>
              </select>
            </div>
            <Input
              label="Data Garantia"
              value={formData.warrantyDate}
              onChange={(e) => updateField('warrantyDate', e.target.value)}
              type="date"
            />
          </div>
        </Section>

        {/* === SEÇÃO 7: STATUS === */}
        <Section title="Status" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Situação de Manutenção</label>
              <select value={formData.maintenanceStatus} onChange={(e) => updateField('maintenanceStatus', e.target.value)} className={selectClass}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
            <Input
              label="Data de Baixa"
              value={formData.deactivationDate}
              onChange={(e) => updateField('deactivationDate', e.target.value)}
              type="date"
            />
          </div>
          <Input
            label="Motivo da Baixa"
            value={formData.deactivationReason}
            onChange={(e) => updateField('deactivationReason', e.target.value)}
            placeholder="Motivo da baixa do ativo"
          />
        </Section>

        {/* === SEÇÃO 8: IMAGENS E ANEXOS === */}
        <Section title="Imagens e Anexos" defaultOpen={false}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Foto Principal do Ativo</label>
            {mainImagePreview ? (
              <div className="relative">
                <img src={mainImagePreview} alt="Preview" className="w-full h-48 object-cover rounded-[4px]" />
                <button
                  type="button"
                  onClick={() => { setMainImage(null); setMainImagePreview('') }}
                  className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full hover:bg-red-700"
                >
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Arquivos Anexos (até 10)</label>
            <input ref={attachmentsInputRef} type="file" multiple onChange={handleAttachmentsChange} className="hidden" disabled={attachments.length >= 10} />
            <div onClick={() => attachmentsInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-[4px] cursor-pointer hover:bg-secondary">
              <Icon name="upload" className="text-2xl text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Adicionar PDFs, fotos, etc.</p>
              <p className="text-xs text-muted-foreground">{attachments.length}/10 arquivos</p>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <div className="flex items-center gap-2">
                      <Icon name="description" className="text-base text-muted-foreground" />
                      <span className="text-sm text-foreground truncate">{file.name}</span>
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
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Icon name="save" className="text-base mr-2" />
            {loading ? 'Criando...' : 'Criar Ativo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
