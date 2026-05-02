import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { applyStandardToAsset } from '@/lib/maintenance-plans/standardSync'

// POST - Incorporacao em lote de Planos Padrao a um Ativo (Situacao 1)
//   Body: { assetId: string, standardPlanIds: string[] }
//   Cria um AssetMaintenancePlan para cada plano padrao, copiando tasks/steps/resources.
//   Valida permissao em maintenance-plan/POST. Erros individuais vao em `failures`,
//   sucessos em `created`. Nao aborta o lote quando um item falha (cada vinculo e
//   independente — um duplicata nao deve travar os demais).
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'maintenance-plan', 'POST')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    let companyId: string
    try {
      companyId = requireCompanyScope(session)
    } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const body = await request.json()
    const assetId: string | undefined = body?.assetId
    const standardPlanIds: string[] | undefined = body?.standardPlanIds

    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'assetId e obrigatorio' }, { status: 400 })
    }
    if (!Array.isArray(standardPlanIds) || standardPlanIds.length === 0) {
      return NextResponse.json(
        { error: 'standardPlanIds deve ser um array nao vazio' },
        { status: 400 }
      )
    }

    const uniqueIds = Array.from(new Set(standardPlanIds.filter((id) => typeof id === 'string')))

    const created: Array<{ standardPlanId: string; assetMaintenancePlanId: string }> = []
    const failures: Array<{ standardPlanId: string; error: string }> = []

    for (const standardPlanId of uniqueIds) {
      try {
        const result = await applyStandardToAsset(
          standardPlanId,
          assetId,
          companyId,
          session.id
        )
        created.push({ standardPlanId, assetMaintenancePlanId: result.assetMaintenancePlanId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        failures.push({ standardPlanId, error: message })
      }
    }

    return NextResponse.json(
      {
        data: {
          created,
          failures,
          createdCount: created.length,
          failureCount: failures.length,
        },
      },
      { status: failures.length === uniqueIds.length ? 500 : 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/maintenance-plans/asset/batch-link:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
