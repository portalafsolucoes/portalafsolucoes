import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

/**
 * API de Exportação para formato TOTVS/Protheus
 *
 * GET - Exporta dados do portal no formato compatível com Protheus
 * Query params:
 *   - entity: nome da entidade a exportar
 *   - unitId: (opcional) filtrar por unidade
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    if (!['SUPER_ADMIN', 'GESTOR'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const unitId = searchParams.get('unitId')

    if (!entity) {
      return NextResponse.json({ error: 'entity é obrigatório' }, { status: 400 })
    }

    const ENTITY_MAP: Record<string, { table: string; select: string; scope: 'company' | 'unit' }> = {
      'maintenance-types': { table: 'MaintenanceType', select: '*', scope: 'company' },
      'maintenance-areas': { table: 'MaintenanceArea', select: '*', scope: 'company' },
      'service-types': { table: 'ServiceType', select: '*, maintenanceType:MaintenanceType!maintenanceTypeId(name), maintenanceArea:MaintenanceArea!maintenanceAreaId(name)', scope: 'company' },
      calendars: { table: 'Calendar', select: '*', scope: 'company' },
      'cost-centers': { table: 'CostCenter', select: '*', scope: 'company' },
      'work-centers': { table: 'WorkCenter', select: '*', scope: 'unit' },
      'asset-families': { table: 'AssetFamily', select: '*', scope: 'company' },
      positions: { table: 'Position', select: '*', scope: 'company' },
      characteristics: { table: 'Characteristic', select: '*', scope: 'company' },
      resources: { table: 'Resource', select: '*', scope: 'company' },
      'generic-tasks': { table: 'GenericTask', select: '*', scope: 'company' },
      'generic-steps': { table: 'GenericStep', select: '*', scope: 'company' },
      assets: { table: 'Asset', select: '*', scope: 'unit' },
      'work-orders': { table: 'WorkOrder', select: '*', scope: 'unit' },
      units: { table: 'Location', select: '*', scope: 'company' },
    }

    const config = ENTITY_MAP[entity]
    if (!config) {
      return NextResponse.json({ error: `Entidade não suportada: ${entity}` }, { status: 400 })
    }

    let query = supabase
      .from(config.table)
      .select(config.select)
      .eq('companyId', session.companyId)

    if (config.scope === 'unit' && unitId) {
      query = query.eq('unitId', unitId)
    }

    const { data, error } = await query.order('createdAt', { ascending: true })
    if (error) throw error

    return NextResponse.json({
      entity,
      count: data?.length || 0,
      data: data || [],
      exportedAt: new Date().toISOString(),
      format: 'portal-cmm',
    })
  } catch (error) {
    console.error('TOTVS export error:', error)
    return NextResponse.json({ error: 'Erro na exportação' }, { status: 500 })
  }
}
