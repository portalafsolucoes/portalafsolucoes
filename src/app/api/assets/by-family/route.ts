import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { findCompatibleAssetsForStandardPlan } from '@/lib/maintenance-plans/standardSync'

// GET - Bens compativeis com um plano padrao (Situacao 2)
//   Query: standardPlanId (obrigatorio)
//   Retorno filtrado: exclui bens ja vinculados ao plano e que teriam duplicata
//   (mesmo serviceTypeId + maintenanceTime + timeUnit + trackingType).
//   Matching de familia/modelo: plano com familyModelId=NULL casa com qualquer modelo.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    // Permissao avaliada pela feature "assets" (a acao dispara do fluxo de plano padrao
    // mas opera sobre a lista de ativos; usuarios sem view em assets nao devem listar bens)
    const permError = checkApiPermission(session, 'assets', 'GET')
    if (permError) return NextResponse.json({ error: permError }, { status: 403 })

    let companyId: string
    try {
      companyId = requireCompanyScope(session)
    } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const standardPlanId = searchParams.get('standardPlanId')

    if (!standardPlanId) {
      return NextResponse.json({ error: 'standardPlanId e obrigatorio' }, { status: 400 })
    }

    const assets = await findCompatibleAssetsForStandardPlan(standardPlanId, companyId)
    return NextResponse.json({ data: assets })
  } catch (error) {
    console.error('Error in GET /api/assets/by-family:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
