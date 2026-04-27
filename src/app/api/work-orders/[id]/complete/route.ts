import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { uploadFile } from '@/lib/storage'
import { recomputeScheduleStatus } from '@/lib/scheduleStatus'
import { recordAudit } from '@/lib/audit/recordAudit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar se a OS existe e pertence à empresa (capturando estado completo para auditoria)
    const { data: workOrder, error: findError } = await supabase
      .from('WorkOrder')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const observations = formData.get('observations') as string
    const beforePhoto = formData.get('beforePhoto') as File | null
    const afterPhoto = formData.get('afterPhoto') as File | null
    const beforePhotoUrl = formData.get('beforePhotoUrl') as string | null
    const afterPhotoUrl = formData.get('afterPhotoUrl') as string | null

    // Validações
    if (!startTime || !endTime || !observations) {
      return NextResponse.json(
        { error: 'Horários e observações são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar que temos fotos (novas ou existentes)
    if (!beforePhoto && !beforePhotoUrl) {
      return NextResponse.json(
        { error: 'Foto ANTES é obrigatória' },
        { status: 400 }
      )
    }

    if (!afterPhoto && !afterPhotoUrl) {
      return NextResponse.json(
        { error: 'Foto DEPOIS é obrigatória' },
        { status: 400 }
      )
    }

    // Processar foto ANTES (novo upload ou manter existente)
    let finalBeforePhotoUrl = beforePhotoUrl || ''
    if (beforePhoto) {
      const result = await uploadFile(beforePhoto, `work-orders/${id}`)
      finalBeforePhotoUrl = result.url
    }

    // Processar foto DEPOIS (novo upload ou manter existente)
    let finalAfterPhotoUrl = afterPhotoUrl || ''
    if (afterPhoto) {
      const result = await uploadFile(afterPhoto, `work-orders/${id}`)
      finalAfterPhotoUrl = result.url
    }

    // Processar anexos adicionais
    const attachmentData: { name: string; url: string; type: string; size: number }[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attachment_') && value instanceof File) {
        const file = value as File
        const result = await uploadFile(file, `work-orders/${id}/attachments`)

        attachmentData.push({
          name: file.name,
          url: result.url,
          type: file.type || 'application/octet-stream',
          size: file.size
        })
      }
    }

    // Calcular duração real em minutos
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)

    // Salvar apenas as observações do técnico (sem horários/anexos)
    const fullNotes = observations

    // Atualizar ordem de serviço
    const { data: updatedWorkOrder, error: updateError } = await supabase
      .from('WorkOrder')
      .update({
        status: 'COMPLETE',
        completedOn: end.toISOString(),
        completedById: session.id,
        actualDuration: durationMinutes,
        executionNotes: fullNotes,
        beforePhotoUrl: finalBeforePhotoUrl,
        afterPhotoUrl: finalAfterPhotoUrl
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Marcar item(ns) de programacao como EXECUTED e recomputar status da(s) programacao(oes)
    const { data: activeScheduleItems } = await supabase
      .from('WorkOrderScheduleItem')
      .select('id, scheduleId')
      .eq('workOrderId', id)
      .in('status', ['PENDING', 'RELEASED'])

    if (activeScheduleItems && activeScheduleItems.length > 0) {
      await supabase
        .from('WorkOrderScheduleItem')
        .update({ status: 'EXECUTED' })
        .in('id', activeScheduleItems.map(it => it.id))

      const affectedScheduleIds = new Set<string>()
      for (const it of activeScheduleItems) {
        if (it.scheduleId) affectedScheduleIds.add(it.scheduleId)
      }
      for (const schedId of affectedScheduleIds) {
        await recomputeScheduleStatus(schedId)
      }
    }

    // Criar novos registros de anexos (acumular)
    if (attachmentData.length > 0) {
      const fileInserts = attachmentData.map(att => ({
        id: generateId(),
        name: att.name,
        url: att.url,
        type: att.type,
        size: att.size,
        workOrderId: id
      }))
      const { error: filesError } = await supabase
        .from('File')
        .insert(fileInserts)

      if (filesError) {
        console.error('Error inserting files:', filesError)
      }
    }

    // Buscar arquivos atualizados para a resposta
    const { data: files } = await supabase
      .from('File')
      .select('*')
      .eq('workOrderId', id)

    await recordAudit({
      session,
      entity: 'WorkOrder',
      entityId: id,
      entityLabel: workOrder.internalId ?? workOrder.externalId ?? null,
      action: 'UPDATE',
      before: workOrder as Record<string, unknown>,
      after: updatedWorkOrder as Record<string, unknown>,
      companyId: workOrder.companyId ?? session.companyId,
      unitId: workOrder.unitId ?? session.unitId,
      metadata: { event: 'COMPLETED' },
    })

    return NextResponse.json({
      data: { ...updatedWorkOrder, files: files || [] },
      message: 'Ordem de serviço finalizada com sucesso'
    })
  } catch (error) {
    console.error('Complete work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
