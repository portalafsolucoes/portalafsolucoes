import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { findCompatibleAssetsForStandardPlan } from '@/lib/maintenance-plans/standardSync'

// GET - Ativos compativeis com um Plano Padrao (Situacao 2)
//   Retorno filtrado: exclui ativos ja vinculados ao plano e que gerariam duplicata
//   (mesmo serviceTypeId + maintenanceTime + timeUnit + trackingType).
//   Usado pelo dialogo de vinculo em lote no fluxo de criacao/edicao de plano padrao.
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
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id invalido' }, { status: 400 })
    }

    const assets = await findCompatibleAssetsForStandardPlan(id, companyId)
    return NextResponse.json({ data: assets })
  } catch (error) {
    console.error('Error in GET /api/maintenance-plans/standard/[id]/compatible-assets:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
