import { compare, hash } from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 10) {
    return { valid: false, message: 'A senha deve ter pelo menos 10 caracteres' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra minuscula' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra maiuscula' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um numero' }
  }
  if (!/[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um caractere especial' }
  }
  return { valid: true }
}
