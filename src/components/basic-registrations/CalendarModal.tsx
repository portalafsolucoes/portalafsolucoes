'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const WEEK_DAYS = [
  { day: 'monday', label: 'Segunda-feira' },
  { day: 'tuesday', label: 'Terça-feira' },
  { day: 'wednesday', label: 'Quarta-feira' },
  { day: 'thursday', label: 'Quinta-feira' },
  { day: 'friday', label: 'Sexta-feira' },
  { day: 'saturday', label: 'Sábado' },
  { day: 'sunday', label: 'Domingo' },
]

interface Shift {
  start: string
  end: string
}

interface DayConfig {
  day: string
  label: string
  active: boolean
  shifts: Shift[]
}

interface Holiday {
  date: string
  name: string
}

interface WorkDays {
  weekDays: DayConfig[]
  holidays: Holiday[]
}

const defaultWorkDays = (): WorkDays => ({
  weekDays: WEEK_DAYS.map(d => ({
    day: d.day,
    label: d.label,
    active: !['saturday', 'sunday'].includes(d.day),
    shifts: !['saturday', 'sunday'].includes(d.day)
      ? [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }]
      : [],
  })),
  holidays: [],
})

interface CalendarModalProps {
  editingItem: any | null
  onClose: () => void
  onSaved: () => void
}

export function CalendarModal({ editingItem, onClose, onSaved }: CalendarModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('WORK')
  const [protheusCode, setProtheusCode] = useState('')
  const [workDays, setWorkDays] = useState<WorkDays>(defaultWorkDays())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '')
      setDescription(editingItem.description || '')
      setType(editingItem.type || 'WORK')
      setProtheusCode(editingItem.protheusCode || '')
      const wd = editingItem.workDays
      if (wd) {
        const parsed = typeof wd === 'string' ? JSON.parse(wd) : wd
        // Garante que todos os dias existam mesmo em registros antigos
        const mergedWeekDays = WEEK_DAYS.map(d => {
          const existing = parsed.weekDays?.find((w: DayConfig) => w.day === d.day)
          return existing ?? { day: d.day, label: d.label, active: false, shifts: [] }
        })
        setWorkDays({ weekDays: mergedWeekDays, holidays: parsed.holidays || [] })
      } else {
        setWorkDays(defaultWorkDays())
      }
    } else {
      setName('')
      setDescription('')
      setType('WORK')
      setProtheusCode('')
      setWorkDays(defaultWorkDays())
    }
    setError('')
    setNewHolidayDate('')
    setNewHolidayName('')
  }, [editingItem])

  const updateDay = (dayKey: string, updates: Partial<DayConfig>) => {
    setWorkDays(prev => ({
      ...prev,
      weekDays: prev.weekDays.map(d => d.day === dayKey ? { ...d, ...updates } : d),
    }))
  }

  const addShift = (dayKey: string) => {
    setWorkDays(prev => ({
      ...prev,
      weekDays: prev.weekDays.map(d =>
        d.day === dayKey ? { ...d, shifts: [...d.shifts, { start: '08:00', end: '17:00' }] } : d
      ),
    }))
  }

  const removeShift = (dayKey: string, index: number) => {
    setWorkDays(prev => ({
      ...prev,
      weekDays: prev.weekDays.map(d =>
        d.day === dayKey ? { ...d, shifts: d.shifts.filter((_, i) => i !== index) } : d
      ),
    }))
  }

  const updateShift = (dayKey: string, index: number, field: 'start' | 'end', value: string) => {
    setWorkDays(prev => ({
      ...prev,
      weekDays: prev.weekDays.map(d =>
        d.day === dayKey
          ? { ...d, shifts: d.shifts.map((s, i) => i === index ? { ...s, [field]: value } : s) }
          : d
      ),
    }))
  }

  const addHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) return
    setWorkDays(prev => ({
      ...prev,
      holidays: [...prev.holidays, { date: newHolidayDate, name: newHolidayName.trim() }],
    }))
    setNewHolidayDate('')
    setNewHolidayName('')
  }

  const removeHoliday = (index: number) => {
    setWorkDays(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editingItem
        ? `/api/basic-registrations/calendars/${editingItem.id}`
        : '/api/basic-registrations/calendars'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, type, protheusCode, workDays }),
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
      title={editingItem ? 'Editar Calendário' : 'Novo Calendário'}
      size="xl"
    >
      <div className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-danger-light text-danger-light-foreground rounded-[4px] text-sm">
            {error}
          </div>
        )}

        {/* Informações básicas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nome <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Calendário Operacional"
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="WORK">Mão de Obra</option>
              <option value="EQUIPMENT">Equipamento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Código Protheus</label>
            <input
              type="text"
              value={protheusCode}
              onChange={e => setProtheusCode(e.target.value)}
              placeholder="Ex: M03"
              className="w-full px-3 py-2 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Grade semanal */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-on-surface-variant/10">
            Horários por Dia da Semana
          </h3>
          <div className="space-y-2">
            {workDays.weekDays.map(dayConfig => (
              <div
                key={dayConfig.day}
                className={`border rounded-[4px] p-3 transition-colors ${dayConfig.active ? 'border-border bg-card' : 'border-border/50 bg-muted/30'}`}
              >
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dayConfig.active}
                      onChange={e => updateDay(dayConfig.day, {
                        active: e.target.checked,
                        shifts: e.target.checked && dayConfig.shifts.length === 0
                          ? [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }]
                          : dayConfig.shifts,
                      })}
                      className="rounded border-border"
                    />
                    <span className={`text-sm font-medium w-32 ${dayConfig.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {dayConfig.label}
                    </span>
                  </label>

                  {dayConfig.active ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      {dayConfig.shifts.map((shift, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-muted rounded-[4px] px-2 py-1">
                          <input
                            type="time"
                            value={shift.start}
                            onChange={e => updateShift(dayConfig.day, idx, 'start', e.target.value)}
                            className="w-24 text-sm bg-transparent focus:outline-none text-foreground"
                          />
                          <span className="text-muted-foreground text-xs">–</span>
                          <input
                            type="time"
                            value={shift.end}
                            onChange={e => updateShift(dayConfig.day, idx, 'end', e.target.value)}
                            className="w-24 text-sm bg-transparent focus:outline-none text-foreground"
                          />
                          <button
                            onClick={() => removeShift(dayConfig.day, idx)}
                            className="p-0.5 hover:bg-danger-light rounded transition-colors"
                            title="Remover turno"
                          >
                            <Icon name="delete" className="text-sm text-danger" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addShift(dayConfig.day)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground rounded-[4px] transition-colors"
                        title="Adicionar turno"
                      >
                        <Icon name="add" className="text-sm" /> Turno
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Dia não útil</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feriados */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-on-surface-variant/10">
            Feriados
          </h3>
          <div className="space-y-2">
            {workDays.holidays.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum feriado cadastrado.</p>
            )}
            {workDays.holidays.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded-[4px]">
                <span className="text-sm text-foreground font-mono">{h.date}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-sm text-foreground flex-1">{h.name}</span>
                <button
                  onClick={() => removeHoliday(idx)}
                  className="p-1 hover:bg-danger-light rounded transition-colors"
                  title="Remover feriado"
                >
                  <Icon name="delete" className="text-sm text-danger" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="date"
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                className="px-2 py-1.5 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={newHolidayName}
                onChange={e => setNewHolidayName(e.target.value)}
                placeholder="Nome do feriado"
                onKeyDown={e => { if (e.key === 'Enter') addHoliday() }}
                className="flex-1 px-2 py-1.5 text-sm rounded-[4px] bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addHoliday}
                disabled={!newHolidayDate || !newHolidayName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-[4px] bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="add" className="text-sm" /> Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 pt-2 border-t border-on-surface-variant/10">
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Salvando...' : (editingItem ? 'Salvar' : 'Criar')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
