import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { applyStandardToAsset } from '@/lib/maintenance-plans/standardSync'

// POST - Aplicacao em lote de um Plano Padrao a varios Ativos (Situacao 2)
//   Body: { assetIds: string[] }
//   Cria um AssetMaintenancePlan por ativo, copiando tasks/steps/resources.
//   Valida permissao em maintenance-plan/POST. Erros individuais vao em `failures`,
//   sucessos em `created`. Nao aborta o lote quando um item falha (cada vinculo e
//   independente — um ativo com duplicata nao deve travar os demais).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: standardPlanId } = await params
    if (!standardPlanId || typeof standardPlanId !== 'string') {
      return NextResponse.json({ error: 'standardPlanId invalido' }, { status: 400 })
    }

    const body = await request.json()
    const assetIds: string[] | undefined = body?.assetIds

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'assetIds deve ser um array nao vazio' },
        { status: 400 }
      )
    }

    const uniqueIds = Array.from(new Set(assetIds.filter((id) => typeof id === 'string')))

    const created: Array<{ assetId: string; assetMaintenancePlanId: string }> = []
    const failures: Array<{ assetId: string; error: string }> = []

    for (const assetId of uniqueIds) {
      try {
        const result = await applyStandardToAsset(
          standardPlanId,
          assetId,
          companyId,
          session.id
        )
        created.push({ assetId, assetMaintenancePlanId: result.assetMaintenancePlanId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        failures.push({ assetId, error: message })
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
    console.error('Error in POST /api/maintenance-plans/standard/[id]/apply-to-assets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
