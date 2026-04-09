import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { normalizeModuleForUi, type ModuleRecord } from '@/lib/modules'

type CompanyModuleRow = {
  module: ModuleRecord | ModuleRecord[] | null
}

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

  if (error) {
    console.error('Error fetching company modules:', error)
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }

  // Flatten: retorna apenas os módulos habilitados
  const modules = ((data || []) as CompanyModuleRow[])
    .map((cm) => Array.isArray(cm.module) ? cm.module[0] : cm.module)
    .filter((module): module is ModuleRecord => Boolean(module))
    .map((module) => normalizeModuleForUi(module))
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return NextResponse.json(modules)
}
