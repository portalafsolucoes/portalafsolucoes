import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { requireCompanyScope } from '@/lib/user-roles'
import { checkApiPermission } from '@/lib/permissions'
import { revertToStandard } from '@/lib/maintenance-plans/standardSync'
import { recordAudit } from '@/lib/audit/recordAudit'

// POST - Reverte um AssetMaintenancePlan customizado ao estado atual do seu
//   StandardMaintenancePlan de origem. Sobrescreve campos estruturais e recria
//   tasks/steps/resources. Preserva campos operacionais do bem.
//   Erros:
//     - 400: plano sem vinculo a padrao
//     - 404: plano ou padrao nao existe mais no tenant
export async function POST(
  _request: NextRequest,
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

    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id invalido' }, { status: 400 })
    }

    const { data: prev } = await supabase
      .from('AssetMaintenancePlan')
      .select('*')
      .eq('id', id)
      .single()

    try {
      await revertToStandard(id, companyId, session.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reverter'
      // Mensagens canonicas do helper mapeiam para 400/404
      if (message.includes('sem vinculo')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      if (message.includes('nao encontrado') || message.includes('nao existe mais')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { data: next } = await supabase
      .from('AssetMaintenancePlan')
      .select('*')
      .eq('id', id)
      .single()

    if (prev && next) {
      await recordAudit({
        session,
        entity: 'AssetMaintenancePlan',
        entityId: id,
        entityLabel: prev.name ?? next.name ?? null,
        action: 'UPDATE',
        before: prev as Record<string, unknown>,
        after: next as Record<string, unknown>,
        companyId: prev.companyId ?? companyId,
        unitId: session.unitId,
        metadata: { event: 'REVERTED_TO_STANDARD' },
      })
    }

    return NextResponse.json({ data: { reverted: true }, message: 'Plano revertido ao padrao' })
  } catch (error) {
    console.error('Error in POST /api/maintenance-plans/asset/[id]/revert:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
