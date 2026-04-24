import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import {
  countLinkedAssets,
  listLinkedAssetsForStandardPlan,
} from '@/lib/maintenance-plans/standardSync'

// GET - Ativos vinculados a um plano padrao
//   Alimenta o botao "Propagar aos ativos vinculados" (Fase 5) e a confirmacao
//   de exclusao de plano padrao com vinculos.
//   Retorna cada AssetMaintenancePlan com flag hasLocalOverrides e dados do ativo,
//   alem de total. Nao filtra por override — a UI separa elegiveis de alertados.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'maintenance-plan', 'GET')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    let companyId: string
    try {
      companyId = requireCompanyScope(session)
    } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { id } = await params

    const [items, total] = await Promise.all([
      listLinkedAssetsForStandardPlan(id, companyId),
      countLinkedAssets(id, companyId),
    ])

    const eligible = items.filter((item) => !item.hasLocalOverrides)
    const detached = items.filter((item) => item.hasLocalOverrides)

    return NextResponse.json({
      data: {
        items,
        eligible,
        detached,
        total,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/maintenance-plans/standard/[id]/linked-assets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
