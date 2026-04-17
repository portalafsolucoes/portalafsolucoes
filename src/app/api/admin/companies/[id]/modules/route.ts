import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase, generateId } from '@/lib/supabase'
import { normalizeModuleForUi, type ModuleRecord } from '@/lib/modules'
import { normalizeTextPayload } from '@/lib/textNormalizer'

type CompanyModuleStateRow = {
  moduleId: string
  enabled: boolean
}

type ModuleSlugRow = {
  id: string
  slug: string
}

/**
 * GET /api/admin/companies/[id]/modules
 * Lista todos os módulos e o estado (habilitado/desabilitado) para a empresa.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: companyId } = await params

  // Buscar todos os módulos do portal
  const { data: allModules } = await supabase
    .from('Module')
    .select('id, name, slug, description, icon, "order"')
    .order('"order"')

  // Buscar módulos habilitados para esta empresa
  const { data: companyModules } = await supabase
    .from('CompanyModule')
    .select('moduleId, enabled')
    .eq('companyId', companyId)

  const enabledMap = new Map(
    ((companyModules || []) as CompanyModuleStateRow[]).map((cm) => [cm.moduleId, cm.enabled])
  )

  // Combinar: todos os módulos com o estado de cada empresa
  const result = ((allModules || []) as ModuleRecord[]).map((mod) =>
    normalizeModuleForUi({
      ...mod,
      enabled: enabledMap.get(mod.id) ?? false,
    })
  )

  return NextResponse.json(result)
}

/**
 * PUT /api/admin/companies/[id]/modules
 * Atualiza os módulos habilitados para a empresa.
 * Body: { modules: [{ slug: string, enabled: boolean }] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: companyId } = await params
  const body = normalizeTextPayload(await request.json())
  const { modules } = body // Array de { slug: string, enabled: boolean }

  if (!Array.isArray(modules)) {
    return NextResponse.json({ error: 'modules array is required' }, { status: 400 })
  }

  // Verificar se a empresa existe
  const { data: company } = await supabase
    .from('Company')
    .select('id')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Buscar todos os módulos por slug
  const { data: allModules } = await supabase.from('Module').select('id, slug')
  const slugToId = new Map(
    ((allModules || []) as ModuleSlugRow[]).map((module) => [module.slug, module.id])
  )

  let updated = 0
  for (const mod of modules) {
    const moduleId = slugToId.get(mod.slug)
    if (!moduleId) continue

    // Upsert: criar ou atualizar o estado do módulo
    const { data: existing } = await supabase
      .from('CompanyModule')
      .select('id')
      .eq('companyId', companyId)
      .eq('moduleId', moduleId)
      .single()

    if (existing) {
      await supabase
        .from('CompanyModule')
        .update({ enabled: mod.enabled })
        .eq('id', existing.id)
    } else {
      await supabase.from('CompanyModule').insert({
        id: generateId(),
        companyId,
        moduleId,
        enabled: mod.enabled,
      })
    }
    updated++
  }

  return NextResponse.json({ success: true, updated })
}
