export interface NormalizedTaskStep {
  stepId?: string
  stepName: string
  optionType: string
  options?: { id?: string; label: string; order: number }[]
}

interface RawStepOption {
  id?: string
  ID?: string
  label?: string
  LABEL?: string
  order?: number
  ORDER?: number
}

interface RawStep {
  stepId?: string
  STEPID?: string
  stepName?: string
  STEPNAME?: string
  optionType?: string
  OPTIONTYPE?: string
  options?: RawStepOption[]
  OPTIONS?: RawStepOption[]
}

function normalizeStep(raw: RawStep): NormalizedTaskStep {
  const stepId = raw.stepId ?? raw.STEPID
  const stepName = raw.stepName ?? raw.STEPNAME ?? ''
  const optionType = raw.optionType ?? raw.OPTIONTYPE ?? 'NONE'
  const rawOptions = raw.options ?? raw.OPTIONS
  const options = Array.isArray(rawOptions)
    ? rawOptions.map((o) => ({
        id: o.id ?? o.ID,
        label: o.label ?? o.LABEL ?? '',
        order: o.order ?? o.ORDER ?? 0,
      }))
    : undefined
  return { stepId, stepName, optionType, options }
}

export function parseTaskSteps(steps: unknown): NormalizedTaskStep[] {
  if (steps == null) return []
  let raw: unknown = steps
  if (typeof steps === 'string') {
    try {
      raw = JSON.parse(steps)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw.map((item) => normalizeStep(item as RawStep))
}
