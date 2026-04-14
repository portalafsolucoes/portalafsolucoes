import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Listar todos os RAFs
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const summary = searchParams.get('summary') === 'true'

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
            createdAt,
            createdBy:User!createdById(firstName, lastName),
            workOrder:WorkOrder!workOrderId(
              id,
              internalId,
              osType,
              maintenanceArea:MaintenanceArea(id, name, code),
              asset:Asset(id, name, tag)
            )
          `
          : `
            *,
            createdBy:User!createdById(id, firstName, lastName, email),
            workOrder:WorkOrder!workOrderId(
              id,
              internalId,
              title,
              status,
              osType,
              type,
              maintenanceArea:MaintenanceArea(id, name, code),
              serviceType:ServiceType(id, code, name),
              asset:Asset(id, name, tag)
            )
          `
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
