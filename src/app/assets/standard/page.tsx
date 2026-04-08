'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'

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
  characteristics?: any[]
}

interface CharacteristicOption {
  id: string
  name: string
  unit?: string | null
  infoType?: string
}

interface CharacteristicRow {
  characteristicId: string
  value: string
  unit: string
}

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

export default function StandardAssetsPage() {
  const [items, setItems] = useState<StandardAsset[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [workCenters, setWorkCenters] = useState<any[]>([])
  const [assetFamilyModels, setAssetFamilyModels] = useState<any[]>([])
  const [counterTypes, setCounterTypes] = useState<any[]>([])
  const [characteristics, setCharacteristics] = useState<CharacteristicOption[]>([])
  const [characteristicRows, setCharacteristicRows] = useState<CharacteristicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StandardAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [itemsRes, familiesRes, costCentersRes, calendarsRes, workCentersRes, modelsRes, counterTypesRes, characteristicsRes] = await Promise.all([
        fetch('/api/standard-assets'),
        fetch('/api/basic-registrations/asset-families'),
        fetch('/api/basic-registrations/cost-centers'),
        fetch('/api/basic-registrations/calendars'),
        fetch('/api/basic-registrations/work-centers'),
        fetch('/api/basic-registrations/asset-family-models'),
        fetch('/api/basic-registrations/counter-types'),
        fetch('/api/basic-registrations/characteristics'),
      ])
      const [itemsData, familiesData, costCentersData, calendarsData, workCentersData, modelsData, counterTypesData, characteristicsData] = await Promise.all([
        itemsRes.json(),
        familiesRes.json(),
        costCentersRes.json(),
        calendarsRes.json(),
        workCentersRes.json(),
        modelsRes.json(),
        counterTypesRes.json(),
        characteristicsRes.json(),
      ])
      setItems(itemsData.data || [])
      setFamilies(familiesData.data || [])
      setCostCenters(costCentersData.data || [])
      setCalendars(calendarsData.data || [])
      setWorkCenters(workCentersData.data || [])
      setAssetFamilyModels(modelsData.data || [])
      setCounterTypes(counterTypesData.data || [])
      setCharacteristics(characteristicsData.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditing(null)
    setFormData(emptyForm)
    setCharacteristicRows([])
    setModalOpen(true)
  }

  const handleEdit = (item: StandardAsset) => {
    setEditing(item)
    setFormData({
      familyId: item.familyId,
      name: item.name || '',
      costCenterCode: item.costCenterCode || '',
      costCenterName: item.costCenterName || '',
      shiftCode: item.shiftCode || '',
      workCenterCode: item.workCenterCode || '',
      workCenterName: item.workCenterName || '',
      supplierCode: item.supplierCode || '',
      supplierStore: item.supplierStore || '',
      modelType: item.modelType || '',
      manufacturer: item.manufacturer || '',
      modelName: item.modelName || '',
      serialNumber: item.serialNumber || '',
      warehouse: item.warehouse || '',
      priority: item.priority || '',
      hourlyCost: item.hourlyCost?.toString() || '',
      hasCounter: item.hasCounter,
      assetMovement: item.assetMovement || '',
      trackingPeriod: item.trackingPeriod || '',
      unitOfMeasure: item.unitOfMeasure || '',
      imageUrl: item.imageUrl || '',
      counterType: item.counterType || '',
      coupling: item.coupling || '',
      annualCoupValue: item.annualCoupValue?.toString() || '',
    })
    // Carregar características existentes
    if (item.characteristics && item.characteristics.length > 0) {
      setCharacteristicRows(item.characteristics.map((c: any) => ({
        characteristicId: c.characteristicId,
        value: c.value || '',
        unit: c.unit || c.characteristic?.unit || '',
      })))
    } else {
      setCharacteristicRows([])
    }
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Bem Padrão?')) return
    try {
      const res = await fetch(`/api/standard-assets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    }
  }

  // Características helpers
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.familyId) {
      alert('Selecione uma Família')
      return
    }

    setSaving(true)
    try {
      const url = editing ? `/api/standard-assets/${editing.id}` : '/api/standard-assets'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          characteristics: characteristicRows.filter(r => r.characteristicId && r.value),
        }),
      })

      if (res.ok) {
        setModalOpen(false)
        loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao salvar')
      }
    } catch {
      alert('Erro ao conectar ao servidor')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectClass = "w-full px-3 py-2 border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring text-sm"

  // Famílias que ainda não possuem Bem Padrão (para o select de criação)
  const usedFamilyIds = items.map(i => i.familyId)
  const availableFamilies = editing
    ? families
    : families.filter(f => !usedFamilyIds.includes(f.id))

  const filteredItems = items.filter(item => {
    const familyName = item.family ? `${item.family.code} - ${item.family.name}` : ''
    return (
      familyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <PageContainer>
        {/* Header */}
        <div className="border-b border-border bg-card px-4 md:px-6 py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <h1 className="text-lg md:text-xl font-bold text-foreground">Bens Padrão</h1>
              <div className="flex-1 max-w-md relative">
                <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por família, nome, fabricante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <Button onClick={handleNew} className="whitespace-nowrap">
              <Icon name="add" className="mr-2 text-base" />
              Novo Bem Padrão
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Icon name="inventory_2" className="text-5xl mb-3" />
              <p className="text-lg font-medium">Nenhum Bem Padrão cadastrado</p>
              <p className="text-sm">Cadastre um bem padrão para pré-preencher automaticamente os bens individuais.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Família</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Fabricante</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Modelo</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Prioridade</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Turno</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.family ? `${item.family.code} - ${item.family.name}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.manufacturer || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.modelName || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.priority || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.shiftCode || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-muted rounded-[4px] transition-colors" title="Editar">
                          <Icon name="edit" className="text-base text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded-[4px] transition-colors" title="Excluir">
                          <Icon name="delete" className="text-base text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      {/* Modal de Criação/Edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 overflow-y-auto">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl mx-4 mb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? 'Editar Bem Padrão' : 'Novo Bem Padrão'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-muted rounded transition-colors">
                <Icon name="close" className="text-xl text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
              {/* Família */}
              <Section title="Família" defaultOpen={true}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Família de Bens *</label>
                  <select
                    value={formData.familyId}
                    onChange={(e) => updateField('familyId', e.target.value)}
                    className={selectClass}
                    disabled={!!editing}
                    required
                  >
                    <option value="">Selecione uma família</option>
                    {availableFamilies.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.code ? `${f.code} - ${f.name}` : f.name}</option>
                    ))}
                  </select>
                  {!editing && availableFamilies.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Todas as famílias já possuem um Bem Padrão cadastrado.</p>
                  )}
                </div>
                <Input
                  label="Nome"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Nome padrão do bem"
                />
              </Section>

              {/* Localização e Organização */}
              <Section title="Localização e Organização" defaultOpen={true}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Centro Custo</label>
                    <select
                      value={formData.costCenterCode}
                      onChange={(e) => {
                        const selected = costCenters.find((c: any) => c.code === e.target.value)
                        setFormData(prev => ({
                          ...prev,
                          costCenterCode: e.target.value,
                          costCenterName: selected?.name || '',
                        }))
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecione</option>
                      {costCenters.map((c: any) => (
                        <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nome C. Custo</label>
                    <input
                      type="text"
                      value={formData.costCenterName}
                      readOnly
                      className="w-full px-3 py-2 border border-input rounded-[4px] text-sm bg-muted/50 text-muted-foreground"
                      placeholder="Preenchido automaticamente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Turno</label>
                    <select
                      value={formData.shiftCode}
                      onChange={(e) => updateField('shiftCode', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Selecione</option>
                      {calendars.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">C. Trabalho</label>
                    <select
                      value={formData.workCenterCode}
                      onChange={(e) => {
                        const selected = workCenters.find((w: any) => (w.protheusCode || w.name) === e.target.value)
                        setFormData(prev => ({
                          ...prev,
                          workCenterCode: e.target.value,
                          workCenterName: selected?.name || '',
                        }))
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecione</option>
                      {workCenters.map((w: any) => (
                        <option key={w.id} value={w.protheusCode || w.name}>
                          {w.protheusCode ? `${w.protheusCode} - ${w.name}` : w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nome C. Trabalho</label>
                    <input
                      type="text"
                      value={formData.workCenterName}
                      readOnly
                      className="w-full px-3 py-2 border border-input rounded-[4px] text-sm bg-muted/50 text-muted-foreground"
                      placeholder="Preenchido automaticamente"
                    />
                  </div>
                  <Input label="Estoque" value={formData.warehouse} onChange={(e) => updateField('warehouse', e.target.value)} placeholder="Almoxarifado" />
                </div>
              </Section>

              {/* Fornecedor */}
              <Section title="Fornecedor e Modelo" defaultOpen={true}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Input label="Fornecedor" value={formData.supplierCode} onChange={(e) => updateField('supplierCode', e.target.value)} placeholder="Código do fornecedor" />
                  <Input label="Loja" value={formData.supplierStore} onChange={(e) => updateField('supplierStore', e.target.value)} placeholder="Loja" />
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo Modelo</label>
                    <select
                      value={formData.modelType}
                      onChange={(e) => updateField('modelType', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Selecione</option>
                      {assetFamilyModels.map((m: any) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Input label="Fabricante" value={formData.manufacturer} onChange={(e) => updateField('manufacturer', e.target.value)} placeholder="Nome do fabricante" />
                  <Input label="Modelo" value={formData.modelName} onChange={(e) => updateField('modelName', e.target.value)} placeholder="Modelo do equipamento" />
                  <Input label="Série" value={formData.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} placeholder="Número de série" />
                </div>
              </Section>

              {/* Características */}
              <Section title="Características" defaultOpen={true}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Defina as características padrão que serão pré-preenchidas ao criar um bem desta família.</p>
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
              </Section>

              {/* Operação */}
              <Section title="Operação" defaultOpen={false}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Prioridade</label>
                    <select value={formData.priority} onChange={(e) => updateField('priority', e.target.value)} className={selectClass}>
                      <option value="">Selecione</option>
                      <option value="AAA">AAA - Altíssima</option>
                      <option value="AA">AA - Muito Alta</option>
                      <option value="A">A - Alta</option>
                      <option value="B">B - Média</option>
                      <option value="C">C - Baixa</option>
                      <option value="ZZZ">ZZZ - Sem prioridade</option>
                    </select>
                  </div>
                  <Input label="Custo Hora (R$)" value={formData.hourlyCost} onChange={(e) => updateField('hourlyCost', e.target.value)} placeholder="0,00" type="number" step="0.01" />
                  <Input label="Movim. Bem" value={formData.assetMovement} onChange={(e) => updateField('assetMovement', e.target.value)} placeholder="Movimento do bem" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Input label="Per. Acomp." value={formData.trackingPeriod} onChange={(e) => updateField('trackingPeriod', e.target.value)} placeholder="Período de acompanhamento" />
                  <Input label="Unid. Medida" value={formData.unitOfMeasure} onChange={(e) => updateField('unitOfMeasure', e.target.value)} placeholder="Unidade de medida" />
                  <Input label="Acoplamento" value={formData.coupling} onChange={(e) => updateField('coupling', e.target.value)} placeholder="Código de acoplamento" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Val. Ac. Ano (R$)" value={formData.annualCoupValue} onChange={(e) => updateField('annualCoupValue', e.target.value)} placeholder="0,00" type="number" step="0.01" />
                  <Input label="Imagem URL" value={formData.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} placeholder="URL da imagem padrão" />
                </div>
              </Section>

              {/* Contador */}
              <Section title="Contador" defaultOpen={false}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasCounter}
                    onChange={(e) => updateField('hasCounter', e.target.checked)}
                    className="rounded border-input"
                  />
                  Tem Contador
                </label>
                {formData.hasCounter && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo do Contador</label>
                    <select
                      value={formData.counterType}
                      onChange={(e) => updateField('counterType', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Selecione o tipo de contador</option>
                      {counterTypes.map((ct: any) => (
                        <option key={ct.id} value={ct.name}>{ct.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </Section>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  <Icon name="save" className="text-base mr-2" />
                  {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
