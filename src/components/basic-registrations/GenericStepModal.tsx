'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalSection } from '@/components/ui/ModalSection'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface GenericStepModalProps {
  editingItem: any | null
  onClose: () => void
  onSaved: () => void
}

interface StepOption {
  label: string
  order: number
}

export function GenericStepModal({ editingItem, onClose, onSaved }: GenericStepModalProps) {
  const [name, setName] = useState('')
  const [optionType, setOptionType] = useState('NONE')
  const [protheusCode, setProtheusCode] = useState('')
  const [options, setOptions] = useState<StepOption[]>([])
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '')
      setOptionType(editingItem.optionType || 'NONE')
      setProtheusCode(editingItem.protheusCode || '')
      setOptions(
        (editingItem.options || [])
          .sort((a: StepOption, b: StepOption) => a.order - b.order)
          .map((o: any) => ({ label: o.label, order: o.order }))
      )
    } else {
      setName('')
      setOptionType('NONE')
      setProtheusCode('')
      setOptions([])
    }
    setNewOptionLabel('')
    setError('')
  }, [editingItem])

  const addOption = () => {
    const label = newOptionLabel.trim()
    if (!label) return
    if (options.some(o => o.label.toLowerCase() === label.toLowerCase())) {
      setError('Opção já existe')
      return
    }
    setOptions([...options, { label, order: options.length }])
    setNewOptionLabel('')
    setError('')
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i })))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Descrição é obrigatória')
      return
    }
    if (optionType === 'OPTION' && options.length < 2) {
      setError('Adicione pelo menos 2 opções')
      return
    }

    setSaving(true)
    setError('')
    try {
      const url = editingItem
        ? `/api/basic-registrations/generic-steps/${editingItem.id}`
        : `/api/basic-registrations/generic-steps`
      const method = editingItem ? 'PUT' : 'POST'

      const body: any = {
        name: name.trim(),
        optionType,
        protheusCode: protheusCode.trim() || null,
      }

      // Enviar options apenas se for OPTION, senão limpar
      if (optionType === 'OPTION') {
        body.options = options
      } else {
        body.options = []
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Erro ao salvar')
        setSaving(false)
        return
      }

      onSaved()
      onClose()
    } catch {
      setError('Erro de conexão')
    }
    setSaving(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Editar Etapas Genéricas' : 'Novo Etapas Genéricas'}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
            {error}
          </div>
        )}

        <ModalSection title="Etapa">
          <div className="grid grid-cols-2 gap-3">
            {/* Descrição */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Descrição <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Abastecer redutor com óleo novo"
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Tipo de Opção */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de Opção
              </label>
              <select
                value={optionType}
                onChange={e => setOptionType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="NONE">Nenhuma</option>
                <option value="RESPONSE">Resposta</option>
                <option value="OPTION">Opção</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {optionType === 'NONE' && 'Etapa simples — apenas confirma conclusão'}
                {optionType === 'RESPONSE' && 'O executante deverá digitar um valor (texto/número) ao executar esta etapa'}
                {optionType === 'OPTION' && 'O executante deverá escolher entre as opções cadastradas abaixo'}
              </p>
            </div>

            {/* Código Protheus */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Código Protheus
              </label>
              <input
                type="text"
                value={protheusCode}
                onChange={e => setProtheusCode(e.target.value)}
                placeholder="Ex: ABA001"
                className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </ModalSection>

        {/* Gerenciamento de Opções — só aparece quando OPTION */}
        {optionType !== 'NONE' && (
          <ModalSection title="Opções" defaultOpen={true}>
            {optionType === 'OPTION' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Opções Disponíveis <span className="text-danger">*</span>
                </label>

                {/* Lista de opções existentes */}
                {options.length > 0 && (
                  <div className="space-y-1">
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-[4px]">
                        <Icon name="drag_indicator" className="text-sm text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground">{opt.label}</span>
                        <button
                          onClick={() => removeOption(i)}
                          className="p-1 hover:bg-danger-light rounded transition-colors"
                          title="Remover opção"
                        >
                          <Icon name="delete" className="text-sm text-danger" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar nova opção */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionLabel}
                    onChange={e => setNewOptionLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    placeholder="Ex: OK, NOK, Normal, Baixo..."
                    className="flex-1 px-3 py-1.5 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="sm" variant="outline" onClick={addOption} disabled={!newOptionLabel.trim()}>
                    <Icon name="add" className="text-sm mr-1" /> Adicionar
                  </Button>
                </div>

                {options.length < 2 && (
                  <p className="text-xs text-amber-600">
                    Adicione pelo menos 2 opções para que o executante possa escolher.
                  </p>
                )}
              </div>
            )}

            {optionType === 'RESPONSE' && (
              <p className="text-sm text-muted-foreground">
                O executante deverá digitar um valor ao executar esta etapa. Nenhuma configuração adicional necessária.
              </p>
            )}
          </ModalSection>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Salvando...' : (editingItem ? 'Salvar' : 'Criar')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
