'use client'

import { useEffect } from 'react'

// Real-time variant: uppercase + strip accents, but DO NOT trim (spaces
// mid-typing must survive). Trim-on-save happens server-side via
// normalizeTextPayload.
function upperNoAccentPreserveSpaces(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

const PRESERVE_CASE_TYPES = new Set([
  'email',
  'password',
  'url',
  'tel',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
  'color',
  'file',
  'checkbox',
  'radio',
  'range',
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
])

function shouldPreserve(el: HTMLInputElement): boolean {
  if (el.dataset.preserveCase === 'true') return true
  const type = (el.type || 'text').toLowerCase()
  if (PRESERVE_CASE_TYPES.has(type)) return true
  const name = (el.name || '').toLowerCase()
  if (name.includes('password') || name.includes('email') || name === 'username') return true
  const autocomplete = (el.autocomplete || '').toLowerCase()
  if (autocomplete.includes('email') || autocomplete.includes('password') || autocomplete.includes('username')) return true
  if (el.closest('[data-preserve-case="true"]')) return true
  return false
}

export function UppercaseInputProvider() {
  useEffect(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set

    if (!valueSetter) return

    const onInput = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) return
      if (shouldPreserve(target)) return
      const current = target.value
      const normalized = upperNoAccentPreserveSpaces(current)
      if (normalized === current) return
      // Preserve caret position when the transformation keeps length
      const selectionStart = target.selectionStart
      const selectionEnd = target.selectionEnd
      valueSetter.call(target, normalized)
      if (
        typeof selectionStart === 'number' &&
        typeof selectionEnd === 'number' &&
        normalized.length === current.length
      ) {
        try {
          target.setSelectionRange(selectionStart, selectionEnd)
        } catch {
          /* ignore unsupported selection types (number, email, etc.) */
        }
      }
      // Re-dispatch so React's onChange sees the new value
      target.dispatchEvent(new Event('input', { bubbles: true }))
    }

    document.addEventListener('input', onInput, true)
    return () => document.removeEventListener('input', onInput, true)
  }, [])

  return null
}
