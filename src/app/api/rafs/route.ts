import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'

// GET - Listar todos os RAFs
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

    const { searchParams } = new URL(request.url)
    const summary = searchParams.get('summary') === 'true'
    const idsParam = searchParams.get('ids')

    const fullSelect = `
      *,
      createdBy:User!createdById(id, firstName, lastName, email),
      finalizedBy:User!finalizedById(id, firstName, lastName),
      workOrder:WorkOrder!workOrderId(
        id,
        internalId,
        title,
        status,
        osType,
        type,
        maintenanceArea:MaintenanceArea(id, name, code),
        serviceType:ServiceType(id, code, name),
        asset:Asset(id, name, tag, protheusCode)
      ),
      request:Request!requestId(
        id,
        requestNumber,
        title,
        asset:Asset(id, name, tag, protheusCode),
        maintenanceArea:MaintenanceArea(id, name, code)
      )
    `

    // Modo batch para impressão em lote
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ data: [] })
      }
      if (ids.length > 50) {
        return NextResponse.json(
          { error: 'Máximo de 50 IDs por requisição' },
          { status: 400 }
        )
      }

      const { data: batchData, error: batchError } = await supabase
        .from('FailureAnalysisReport')
        .select(fullSelect)
        .in('id', ids)
        .eq('companyId', session.companyId)

      if (batchError) {
        console.error('Batch rafs error:', batchError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const byId = new Map<string, unknown>()
      for (const row of batchData || []) {
        byId.set((row as { id: string }).id, row)
      }
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean)
      return NextResponse.json({ data: ordered })
    }

    const { data: rafs, error } = await supabase
      .from('FailureAnalysisReport')
      .select(
        summary
          ? `
            id,
            rafNumber,
            occurrenceDate,
            occurrenceTime,
            panelOperator,
            failureType,
            status,
            finalizedAt,
            actionPlan,
            createdAt,
            createdBy:User!createdById(firstName, lastName),
            finalizedBy:User!finalizedById(id, firstName, lastName),
            workOrder:WorkOrder!workOrderId(
              id,
              internalId,
              osType,
              status,
              maintenanceArea:MaintenanceArea(id, name, code),
              asset:Asset(id, name, tag, protheusCode)
            ),
            request:Request!requestId(
              id,
              requestNumber,
              title,
              status,
              asset:Asset(id, name, tag, protheusCode),
              maintenanceArea:MaintenanceArea(id, name, code)
            )
          `
          : fullSelect
      )
      .eq('companyId', session.companyId)
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: rafs })
  } catch (error) {
    console.error('Error fetching RAFs:', error)
    return NextResponse.json({ error: 'Erro ao buscar RAFs' }, { status: 500 })
  }
}
