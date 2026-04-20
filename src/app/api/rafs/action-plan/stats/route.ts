import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { requireCompanyScope } from '@/lib/user-roles'
import { isOverdue } from '@/lib/rafs/deadline'
import type { ActionPlanItem } from '@/types/raf'

// GET /api/rafs/action-plan/stats
// Retorna os 4 KPIs da tela "PA das RAFs":
//  - openRafs: RAFs com status = 'ABERTA'
//  - finalizedRafs: RAFs com status = 'FINALIZADA'
//  - onTimeActions: acoes (todas as RAFs do escopo) nao concluidas e nao vencidas
//  - overdueActions: acoes nao concluidas com deadline < hoje
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permError = checkApiPermission(session, 'rafs', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    let companyId: string
    try {
      companyId = requireCompanyScope(session)
    } catch {
      return NextResponse.json({ error: 'Empresa ativa obrigatoria' }, { status: 403 })
    }

    // Unidade ativa opcional — segue padrao de outras rotas de negocio.
    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unitId') || session.unitId || null

    let query = supabase
      .from('FailureAnalysisReport')
      .select('id, status, actionPlan, unitId')
      .eq('companyId', companyId)

    if (unitId) {
      query = query.eq('unitId', unitId)
    }

    const { data, error } = await query
    if (error) throw error

    const rafs = (data || []) as Array<{
      id: string
      status: 'ABERTA' | 'FINALIZADA' | null
      actionPlan: ActionPlanItem[] | null
    }>

    let openRafs = 0
    let finalizedRafs = 0
    let onTimeActions = 0
    let overdueActions = 0

    const now = new Date()

    for (const raf of rafs) {
      if (raf.status === 'FINALIZADA') finalizedRafs++
      else openRafs++

      if (Array.isArray(raf.actionPlan)) {
        for (const action of raf.actionPlan) {
          const status = String(action?.status || 'PENDING').toUpperCase()
          if (status === 'COMPLETED') continue
          if (isOverdue(action?.deadline, status, now)) {
            overdueActions++
          } else {
            // Acoes sem prazo sao contadas como "no prazo" para nao inflar urgencia.
            onTimeActions++
          }
        }
      }
    }

    return NextResponse.json({
      data: { openRafs, finalizedRafs, onTimeActions, overdueActions },
    })
  } catch (error) {
    console.error('Error computing action plan stats:', error)
    return NextResponse.json({ error: 'Erro ao calcular estatisticas' }, { status: 500 })
  }
}
