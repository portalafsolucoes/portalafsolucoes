import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { generateSequentialId } from '@/lib/workOrderUtils'
import { isAdminRole } from '@/lib/user-roles'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se usuário é admin
    if (!isAdminRole(session)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem aprovar solicitações' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { assignedToId, convertToWorkOrder = false, rejectionReason } = body
    const now = new Date().toISOString()

    // Se for rejeição
    if (body.approved === false) {
      const { error } = await supabase
        .from('Request')
        .update({
          status: 'REJECTED',
          teamApprovalStatus: 'REJECTED',
          approvedById: session.id,
          rejectionReason: rejectionReason || 'Sem justificativa'
        })
        .eq('id', id)
      
      if (error) {
        console.error('Reject error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
      
      return NextResponse.json({
        message: 'Solicitação rejeitada com sucesso'
      })
    }

    // Buscar a solicitação
    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from('Request')
      .select(`
        *,
        team:Team(*),
        files:File(*)
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .eq('status', 'PENDING')
      .single()
    
    if (fetchError || !maintenanceRequest) {
      console.error('Fetch request error:', fetchError)
      return NextResponse.json(
        { error: 'Solicitação não encontrada ou já processada' },
        { status: 404 }
      )
    }


    // ADMIN e SUPER_ADMIN podem aprovar qualquer solicitação da empresa

    // Se admin escolheu converter em OS
    if (convertToWorkOrder) {
      const externalId = await generateSequentialId()

      // Criar Work Order a partir da Request
      const { data: workOrder, error: woError } = await supabase
        .from('WorkOrder')
        .insert({
          id: generateId(),
          externalId,
          internalId: null,
          title: maintenanceRequest.title,
          description: maintenanceRequest.description || null,
          priority: maintenanceRequest.priority,
          status: 'PENDING',
          type: 'CORRECTIVE',
          systemStatus: 'IN_SYSTEM',
          dueDate: maintenanceRequest.dueDate || null,
          companyId: session.companyId,
          createdById: session.id,
          sourceRequestId: maintenanceRequest.id,
          assignedToId: assignedToId || null,
          archived: false,
          createdAt: now,
          updatedAt: now
        })
        .select('*')
        .single()
      
      if (woError || !workOrder) {
        console.error('Create WO error')
        return NextResponse.json({
          error: 'Erro ao criar OS'
        }, { status: 500 })
      }
      
      // Copiar arquivos se existirem
      if (maintenanceRequest.files && maintenanceRequest.files.length > 0) {
        type RequestFileRow = { name: string; url: string; type?: string | null; size?: number | null }
        const fileInserts = (maintenanceRequest.files as RequestFileRow[]).map((file) => ({
          id: generateId(),
          name: file.name,
          url: file.url,
          type: file.type || null,
          size: file.size || 0,
          workOrderId: workOrder.id,
          createdAt: now,
          updatedAt: now
        }))
        await supabase.from('File').insert(fileInserts).select()
      }

      // Atualizar Request para APPROVED com OS gerada
      await supabase
        .from('Request')
        .update({
          status: 'APPROVED',
          teamApprovalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedById: session.id,
          workOrderId: workOrder.id,
          convertToWorkOrder: true
        })
        .eq('id', id)

      return NextResponse.json({
        message: 'Solicitação aprovada e ordem de serviço criada com sucesso',
        data: {
          request: maintenanceRequest,
          workOrder
        }
      })
    } else {
      // Manter como SS aprovada (não cria OS)
      await supabase
        .from('Request')
        .update({
          status: 'APPROVED',
          teamApprovalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedById: session.id,
          assignedToId: assignedToId || null,
          convertToWorkOrder: false
        })
        .eq('id', id)

      return NextResponse.json({
        message: 'Solicitação aprovada com sucesso'
      })
    }
  } catch {
    console.error('Approve request error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
