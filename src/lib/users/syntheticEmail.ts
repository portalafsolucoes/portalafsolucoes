import crypto from 'crypto'

export const SYNTHETIC_EMAIL_DOMAIN = '@noemail.local'

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(SYNTHETIC_EMAIL_DOMAIN)
}

export function displayUserEmail(email: string | null | undefined): string {
  if (!email) return ''
  return isSyntheticEmail(email) ? '' : email
}

export function generateSyntheticEmail(): string {
  const token = crypto.randomBytes(8).toString('hex')
  return `manutentor-${token}${SYNTHETIC_EMAIL_DOMAIN}`
}

export function generateSyntheticUsername(email: string): string {
  return email.split('@')[0]
}

export function generateSyntheticPassword(): string {
  return crypto.randomBytes(32).toString('hex')
}
