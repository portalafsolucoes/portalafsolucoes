// MIGRADO PARA SUPABASE JS CLIENT
// Este arquivo agora exporta supabase ao invés de prisma
// Mantendo o nome 'prisma' para compatibilidade temporária

import { supabase } from './supabase'

// Re-exportar supabase como prisma para compatibilidade
// Isso permite que o código existente continue funcionando
// enquanto migramos gradualmente para Supabase

export const prisma = supabase as any

// Aviso para desenvolvedores
console.warn(
  '⚠️  AVISO: prisma.ts agora usa Supabase JS Client. ' +
  'O código Prisma antigo não funcionará. ' +
  'Use import { supabase } from "@/lib/supabase" nos novos arquivos.'
)
