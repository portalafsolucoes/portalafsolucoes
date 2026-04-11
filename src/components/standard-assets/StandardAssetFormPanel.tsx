'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'

/* ------------------------------------------------------------------ */
/*  Tipos                                                               */
/* ------------------------------------------------------------------ */

interface StandardAssetCharacteristic {
  characteristicId: string
  value: string | null
  unit: string | null
  characteristic?: { unit?: string | null } | null
}

interface StandardAsset {
  id: string
  familyId: string
  family?: { id: string; code: string; name: string }
  name: string | null
  costCenterCode: string | null
  costCenterName: string | null
  shiftCode: string | null
  workCenterCode: string | null
  workCenterName: string | null
  supplierCode: string | null
  supplierStore: string | null
  modelType: string | null
  manufacturer: string | null
  modelName: string | null
  serialNumber: string | null
  warehouse: string | null
  priority: string | null
  hourlyCost: number | null
  hasCounter: boolean
  assetMovement: string | null
  trackingPeriod: string | null
  unitOfMeasure: string | null
  imageUrl: string | null
  counterType: string | null
  coupling: string | null
  annualCoupValue: number | null
  createdAt: string
  characteristics?: StandardAssetCharacteristic[]
}

interface FamilyOption { id: string; code: string; name: string }
interface CostCenterOption { id: string; code: string; name: string }
interface CalendarOption { id: string; name: string }
interface WorkCenterOption { id: string; name: string; protheusCode?: string | null }
interface NamedOption { id: string; name: string }
interface CharacteristicOption { id: string; name: string; unit?: string | null }
interface CharacteristicRow { characteristicId: string; value: string; unit: string }

/* ------------------------------------------------------------------ */
/*  Constantes de estilo                                                */
/* ------------------------------------------------------------------ */

const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'
const selectCls = 'w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring'

const emptyForm = {
  familyId: '',
  name: '',
  costCenterCode: '',
  costCenterName: '',
  shiftCode: '',
  workCenterCode: '',
  workCenterName: '',
  supplierCode: '',
  supplierStore: '',
  modelType: '',
  manufacturer: '',
  modelName: '',
  serialNumber: '',
  warehouse: '',
  priority: '',
  hourlyCost: '',
  hasCounter: false,
  assetMovement: '',
  trackingPeriod: '',
  unitOfMeasure: '',
  imageUrl: '',
  counterType: '',
  coupling: '',
  annualCoupValue: '',
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface StandardAssetFormPanelProps {
  editingItem?: StandardAsset | null
  allItems?: StandardAsset[]
  inPage?: boolean
  onClose: () => void
  onSuccess: () => void
}

/* ------------------------------------------------------------------ */
/*  Componente                                                          */
/* ------------------------------------------------------------------ */

export default function StandardAssetFormPanel({
  editingItem = null,
  allItems = [],
  inPage = false,
  onClose,
  onSuccess,
}: StandardAssetFormPanelProps) {
  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([])
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenterOption[]>([])
  const [assetFamilyModels, setAssetFamilyModels] = useState<NamedOption[]>([])
  const [counterTypes, setCounterTypes] = useState<NamedOption[]>([])
  const [characteristics, setCharacteristics] = useState<CharacteristicOption[]>([])
  const [characteristicRows, setCharacteristicRows] = useState<CharacteristicRow[]>([])
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadingDeps, setLoadingDeps] = useState(true)
  const [error, setError] = useState('')

  /* ---------------------------------------------------------------- */
  /*  Carregar dependências                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const load = async () => {
      setLoadingDeps(true)
      try {
        const [famRes, ccRes, calRes, wcRes, modRes, ctRes, charRes] = await Promise.all([
          fetch('/api/basic-registrations/asset-families'),
          fetch('/api/basic-registrations/cost-centers'),
          fetch('/api/basic-registrations/calendars'),
          fetch('/api/basic-registrations/work-centers'),
          fetch('/api/basic-registrations/asset-family-models'),
          fetch('/api/basic-registrations/counter-types'),
          fetch('/api/basic-registrations/characteristics'),
        ])
        const [famData, ccData, calData, wcData, modData, ctData, charData] = await Promise.all([
          famRes.json(), ccRes.json(), calRes.json(), wcRes.json(),
          modRes.json(), ctRes.json(), charRes.json(),
        ])
        setFamilies(famData.data || [])
        setCostCenters(ccData.data || [])
        setCalendars(calData.data || [])
        setWorkCenters(wcData.data || [])
        setAssetFamilyModels(modData.data || [])
        setCounterTypes(ctData.data || [])
        setCharacteristics(charData.data || [])
      } catch {
        setError('Erro ao carregar opções')
      }
      setLoadingDeps(false)
    }
    load()
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Preencher form ao editar                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    setError('')
    if (editingItem) {
      setFormData({
        familyId: editingItem.familyId,
        name: editingItem.name || '',
        costCenterCode: editingItem.costCenterCode || '',
        costCenterName: editingItem.costCenterName || '',
        shiftCode: editingItem.shiftCode || '',
        workCenterCode: editingItem.workCenterCode || '',
        workCenterName: editingItem.workCenterName || '',
        supplierCode: editingItem.supplierCode || '',
        supplierStore: editingItem.supplierStore || '',
        modelType: editingItem.modelType || '',
        manufacturer: editingItem.manufacturer || '',
        modelName: editingItem.modelName || '',
        serialNumber: editingItem.serialNumber || '',
        warehouse: editingItem.warehouse || '',
        priority: editingItem.priority || '',
        hourlyCost: editingItem.hourlyCost?.toString() || '',
        hasCounter: editingItem.hasCounter,
        assetMovement: editingItem.assetMovement || '',
        trackingPeriod: editingItem.trackingPeriod || '',
        unitOfMeasure: editingItem.unitOfMeasure || '',
        imageUrl: editingItem.imageUrl || '',
        counterType: editingItem.counterType || '',
        coupling: editingItem.coupling || '',
        annualCoupValue: editingItem.annualCoupValue?.toString() || '',
      })
      setCharacteristicRows(
        editingItem.characteristics?.length
          ? editingItem.characteristics.map(c => ({
              characteristicId: c.characteristicId,
              value: c.value || '',
              unit: c.unit || c.characteristic?.unit || '',
            }))
          : []
      )
    } else {
      setFormData(emptyForm)
      setCharacteristicRows([])
    }
  }, [editingItem])

  /* ---------------------------------------------------------------- */
  /*  Helpers de características                                        */
  /* ---------------------------------------------------------------- */

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
        if (char?.unit) updated[index].unit = char.unit
      }
      return updated
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Save                                                              */
  /* ---------------------------------------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.familyId) {
      setError('Selecione uma Família')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editingItem ? `/api/standard-assets/${editingItem.id}` : '/api/standard-assets'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          characteristics: characteristicRows.filter(r => r.characteristicId && r.value),
        }),
      })
      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar')
      }
    } catch {
      setError('Erro ao conectar ao servidor')
    }
    setSaving(false)
  }

  /* ---------------------------------------------------------------- */
  /*  Derived                                                           */
  /* ---------------------------------------------------------------- */

  const usedCharacteristicIds = characteristicRows.map(r => r.characteristicId)
  const usedFamilyIds = allItems.map(i => i.familyId)
  const availableFamilies = editingItem
    ? families
    : families.filter(f => !usedFamilyIds.includes(f.id))

  /* ---------------------------------------------------------------- */
  /*  Form body                                                         */
  /* ---------------------------------------------------------------- */

  const formBody = (
    <>
      {error && <div className="p-3 bg-danger/10 text-danger rounded-[4px] text-sm">{error}</div>}
      {loadingDeps && (
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant" />
          <p className="ml-3 text-muted-foreground">Carregando...</p>
        </div>
      )}

      {/* ============ FAMÍLIA ============ */}
      <ModalSection title="Família">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelCls}>Família de Bens <span className="text-danger">*</span></label>
            <select
              value={formData.familyId}
              onChange={e => setFormData(prev => ({ ...prev, familyId: e.target.value }))}
              className={selectCls}
              disabled={!!editingItem}
              required
            >
              <option value="">Selecione uma família</option>
              {availableFamilies.map(f => (
                <option key={f.id} value={f.id}>{f.code ? `${f.code} - ${f.name}` : f.name}</option>
              ))}
            </select>
            {!editingItem && availableFamilies.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Todas as famílias já possuem um Bem Padrão cadastrado.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Nome</label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome padrão do bem"
            />
          </div>
        </div>
      </ModalSection>

      {/* ============ LOCALIZAÇÃO E ORGANIZAÇÃO ============ */}
      <ModalSection title="Localização e Organização">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Centro de Custo</label>
            <select
              value={formData.costCenterCode}
              onChange={e => {
                const selected = costCenters.find(c => c.code === e.target.value)
                setFormData(prev => ({
                  ...prev,
                  costCenterCode: e.target.value,
                  costCenterName: selected?.name || '',
                }))
              }}
              className={selectCls}
            >
              <option value="">Selecione</option>
              {costCenters.map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nome C. Custo</label>
            <input
              type="text"
              value={formData.costCenterName}
              readOnly
              className="w-full px-3 py-2 border border-input rounded-[4px] text-sm bg-muted/50 text-muted-foreground"
              placeholder="Preenchido automaticamente"
            />
          </div>
          <div>
            <label className={labelCls}>Turno</label>
            <select
              value={formData.shiftCode}
              onChange={e => setFormData(prev => ({ ...prev, shiftCode: e.target.value }))}
              className={selectCls}
            >
              <option value="">Selecione</option>
              {calendars.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>C. Trabalho</label>
            <select
              value={formData.workCenterCode}
              onChange={e => {
                const selected = workCenters.find(w => (w.protheusCode || w.name) === e.target.value)
                setFormData(prev => ({
                  ...prev,
                  workCenterCode: e.target.value,
                  workCenterName: selected?.name || '',
                }))
              }}
              className={selectCls}
            >
              <option value="">Selecione</option>
              {workCenters.map(w => (
                <option key={w.id} value={w.protheusCode || w.name}>
                  {w.protheusCode ? `${w.protheusCode} - ${w.name}` : w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nome C. Trabalho</label>
            <input
              type="text"
              value={formData.workCenterName}
              readOnly
              className="w-full px-3 py-2 border border-input rounded-[4px] text-sm bg-muted/50 text-muted-foreground"
              placeholder="Preenchido automaticamente"
            />
          </div>
          <Input
            label="Estoque"
            value={formData.warehouse}
            onChange={e => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
            placeholder="Almoxarifado"
          />
        </div>
      </ModalSection>

      {/* ============ FORNECEDOR E MODELO ============ */}
      <ModalSection title="Fornecedor e Modelo">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input label="Fornecedor" value={formData.supplierCode} onChange={e => setFormData(prev => ({ ...prev, supplierCode: e.target.value }))} placeholder="Código do fornecedor" />
          <Input label="Loja" value={formData.supplierStore} onChange={e => setFormData(prev => ({ ...prev, supplierStore: e.target.value }))} placeholder="Loja" />
          <div>
            <label className={labelCls}>Tipo Modelo</label>
            <select
              value={formData.modelType}
              onChange={e => setFormData(prev => ({ ...prev, modelType: e.target.value }))}
              className={selectCls}
            >
              <option value="">Selecione</option>
              {assetFamilyModels.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input label="Fabricante" value={formData.manufacturer} onChange={e => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))} placeholder="Nome do fabricante" />
          <Input label="Modelo" value={formData.modelName} onChange={e => setFormData(prev => ({ ...prev, modelName: e.target.value }))} placeholder="Modelo do equipamento" />
          <Input label="Série" value={formData.serialNumber} onChange={e => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))} placeholder="Número de série" />
        </div>
      </ModalSection>

      {/* ============ CARACTERÍSTICAS ============ */}
      <ModalSection title="Características">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Características padrão pré-preenchidas ao criar um bem desta família.</p>
          <button type="button" onClick={addCharacteristicRow} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            <Icon name="add_circle" className="text-base" />
            Adicionar
          </button>
        </div>
        {characteristicRows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma característica adicionada.</p>
        ) : (
          <div className="space-y-2">
            {characteristicRows.map((row, index) => (
              <div key={index} className="flex items-end gap-2 p-2 bg-muted/30 rounded-[4px]">
                <div className="flex-1">
                  <label className={labelCls}>Característica</label>
                  <select
                    value={row.characteristicId}
                    onChange={e => updateCharacteristicRow(index, 'characteristicId', e.target.value)}
                    className={selectCls}
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
                  <label className={labelCls}>Valor</label>
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => updateCharacteristicRow(index, 'value', e.target.value)}
                    className={selectCls}
                    placeholder="Ex: 50"
                  />
                </div>
                <div className="w-24">
                  <label className={labelCls}>Unidade</label>
                  <input
                    type="text"
                    value={row.unit}
                    onChange={e => updateCharacteristicRow(index, 'unit', e.target.value)}
                    className={selectCls}
                    placeholder="Ex: KW"
                  />
                </div>
                <button type="button" onClick={() => removeCharacteristicRow(index)} className="p-2 text-danger hover:bg-danger/10 rounded transition-colors">
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ModalSection>

      {/* ============ OPERAÇÃO ============ */}
      <ModalSection title="Operação" defaultOpen={false}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Prioridade</label>
            <select value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))} className={selectCls}>
              <option value="">Selecione</option>
              <option value="AAA">AAA - Altíssima</option>
              <option value="AA">AA - Muito Alta</option>
              <option value="A">A - Alta</option>
              <option value="B">B - Média</option>
              <option value="C">C - Baixa</option>
              <option value="ZZZ">ZZZ - Sem prioridade</option>
            </select>
          </div>
          <Input label="Custo Hora (R$)" value={formData.hourlyCost} onChange={e => setFormData(prev => ({ ...prev, hourlyCost: e.target.value }))} placeholder="0,00" type="number" step="0.01" />
          <Input label="Movim. Bem" value={formData.assetMovement} onChange={e => setFormData(prev => ({ ...prev, assetMovement: e.target.value }))} placeholder="Movimento do bem" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input label="Per. Acomp." value={formData.trackingPeriod} onChange={e => setFormData(prev => ({ ...prev, trackingPeriod: e.target.value }))} placeholder="Período de acompanhamento" />
          <Input label="Unid. Medida" value={formData.unitOfMeasure} onChange={e => setFormData(prev => ({ ...prev, unitOfMeasure: e.target.value }))} placeholder="Unidade de medida" />
          <Input label="Acoplamento" value={formData.coupling} onChange={e => setFormData(prev => ({ ...prev, coupling: e.target.value }))} placeholder="Código de acoplamento" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Val. Ac. Ano (R$)" value={formData.annualCoupValue} onChange={e => setFormData(prev => ({ ...prev, annualCoupValue: e.target.value }))} placeholder="0,00" type="number" step="0.01" />
          <Input label="Imagem URL" value={formData.imageUrl} onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder="URL da imagem padrão" />
        </div>
      </ModalSection>

      {/* ============ CONTADOR ============ */}
      <ModalSection title="Contador" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasCounter}
            onChange={e => setFormData(prev => ({ ...prev, hasCounter: e.target.checked }))}
            className="rounded border-input"
          />
          Tem Contador
        </label>
        {formData.hasCounter && (
          <div className="mt-2">
            <label className={labelCls}>Tipo do Contador</label>
            <select
              value={formData.counterType}
              onChange={e => setFormData(prev => ({ ...prev, counterType: e.target.value }))}
              className={selectCls}
            >
              <option value="">Selecione o tipo de contador</option>
              {counterTypes.map(ct => (
                <option key={ct.id} value={ct.name}>{ct.name}</option>
              ))}
            </select>
          </div>
        )}
      </ModalSection>
    </>
  )

  const formFooter = (
    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
      <Button type="submit" disabled={saving || loadingDeps} className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Salvar'}
      </Button>
    </div>
  )

  const title = editingItem ? 'Editar Bem Padrão' : 'Novo Bem Padrão'

  if (inPage) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {formBody}
          </div>
          {formFooter}
        </form>
      </div>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="p-4 space-y-3">
          {formBody}
        </div>
        {formFooter}
      </form>
    </Modal>
  )
}
