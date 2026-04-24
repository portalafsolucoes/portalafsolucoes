import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { findCompatibleStandardPlansForAsset } from '@/lib/maintenance-plans/standardSync'

// GET - Planos padrao compativeis com um ativo (Situacao 1)
//   Query: assetId (obrigatorio)
//   Retorno filtrado: exclui planos ja vinculados ao ativo e que gerariam duplicata
//   (mesmo serviceTypeId + maintenanceTime + timeUnit + trackingType).
//   Inclui tasks com steps e resources para expansao no dialogo.
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json({ error: 'assetId e obrigatorio' }, { status: 400 })
    }

    const plans = await findCompatibleStandardPlansForAsset(assetId, companyId)
    return NextResponse.json({ data: plans })
  } catch (error) {
    console.error('Error in GET /api/maintenance-plans/standard/by-family:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
