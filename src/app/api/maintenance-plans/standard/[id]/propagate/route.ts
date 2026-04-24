import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { propagateStandardChanges } from '@/lib/maintenance-plans/standardSync'

// POST - Propaga o estado atual de um Plano Padrao para um conjunto de
//   AssetMaintenancePlan vinculados.
//   Body: { assetPlanIds: string[] }
//   Rejeita (skipped) ids com hasLocalOverrides=true (defesa em profundidade);
//   ids nao encontrados ou nao vinculados a este padrao tambem viram skipped.
//   Falhas de I/O por item viram failed, sem abortar o lote.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const permError = checkApiPermission(session, 'maintenance-plan', 'PUT')
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
    const assetPlanIds: string[] | undefined = body?.assetPlanIds

    if (!Array.isArray(assetPlanIds) || assetPlanIds.length === 0) {
      return NextResponse.json(
        { error: 'assetPlanIds deve ser um array nao vazio' },
        { status: 400 }
      )
    }

    const uniqueIds = Array.from(new Set(assetPlanIds.filter((id) => typeof id === 'string')))

    let result: Awaited<ReturnType<typeof propagateStandardChanges>>
    try {
      result = await propagateStandardChanges(standardPlanId, uniqueIds, companyId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao propagar'
      if (message.includes('nao encontrado')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const appliedCount = result.applied.length
    const skippedCount = result.skipped.length
    const failedCount = result.failed.length

    return NextResponse.json(
      {
        data: {
          applied: result.applied,
          skipped: result.skipped,
          failed: result.failed,
          appliedCount,
          skippedCount,
          failedCount,
        },
        message: `${appliedCount} plano(s) atualizado(s), ${skippedCount} pulado(s), ${failedCount} com falha`,
      },
      { status: failedCount === uniqueIds.length ? 500 : 200 }
    )
  } catch (error) {
    console.error('Error in POST /api/maintenance-plans/standard/[id]/propagate:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
