import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/modules
 * Retorna os módulos habilitados para a empresa do usuário logado
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('CompanyModule')
    .select(`
      id,
      enabled,
      module:moduleId (
        id,
        name,
        slug,
        description,
        icon,
        "order"
      )
    `)
    .eq('companyId', session.companyId)
    .eq('enabled', true)
    .order('module(order)', { ascending: true } as any)

  if (error) {
    console.error('Error fetching company modules:', error)
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }

  // Flatten: retorna apenas os módulos habilitados
  const modules = (data || [])
    .map((cm: any) => cm.module)
    .filter(Boolean)
    .sort((a: any, b: any) => a.order - b.order)

  return NextResponse.json(modules)
}
