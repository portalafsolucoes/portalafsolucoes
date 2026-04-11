import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { checkApiPermission } from '@/lib/permissions'
import { isOperationalRole } from '@/lib/user-roles'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const permError = checkApiPermission(session, 'work-orders', 'GET')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    let query = supabase
      .from('WorkOrder')
      .select(`
        *,
        asset:Asset(*),
        location:Location!locationId(*),
        createdBy:User!createdById(id, firstName, lastName, email, image),
        completedBy:User!completedById(id, firstName, lastName, email),
        tasks:Task(*),
        files:File(*),
        sourceRequest:Request(
          *,
          files:File(*),
          createdBy:User!createdById(id, firstName, lastName, email)
        )
      `)
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (isOperationalRole(session)) query = query.eq('assignedToId', session.id)

    const { data: workOrder, error } = await query.single()

    if (error || !workOrder) {
      console.error('Get work order error:', error)
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: workOrder })
  } catch (error) {
    console.error('Get work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar permissão de edição
    const permError = checkApiPermission(session, 'work-orders', 'PATCH')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    const body = await request.json()

    console.log('=== Update work order body ===')
    console.log(JSON.stringify(body, null, 2))

    // Verificar se a OS existe e pertence à empresa
    let existingQuery = supabase
      .from('WorkOrder')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
    if (isOperationalRole(session)) existingQuery = existingQuery.eq('assignedToId', session.id)
    const { data: workOrder, error: findError } = await existingQuery.single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Validar relacoes em paralelo
    const [assignedResult, assetResult, locationResult, categoryResult] = await Promise.all([
      body.assignedToId
        ? supabase.from('User').select('id').eq('id', body.assignedToId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.assetId
        ? supabase.from('Asset').select('id').eq('id', body.assetId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.locationId
        ? supabase.from('Location').select('id').eq('id', body.locationId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
      body.categoryId
        ? supabase.from('WorkOrderCategory').select('id').eq('id', body.categoryId).eq('companyId', session.companyId).single()
        : Promise.resolve({ data: null }),
    ])

    const validAssignedToId = assignedResult.data ? body.assignedToId : null
    const validAssetId = assetResult.data ? body.assetId : null
    const validLocationId = locationResult.data ? body.locationId : null
    const validCategoryId = categoryResult.data ? body.categoryId : null

    // Validar equipes se fornecido
    let validTeamIds: string[] = []
    if (body.assignedTeamIds && Array.isArray(body.assignedTeamIds)) {
      const { data: teams } = await supabase
        .from('Team')
        .select('id')
        .in('id', body.assignedTeamIds)
        .eq('companyId', session.companyId)
      validTeamIds = (teams || []).map((t: { id: string }) => t.id)
    }

    // Validar usuários se fornecido
    let validUserIds: string[] = []
    if (body.assignedUserIds && Array.isArray(body.assignedUserIds)) {
      const { data: users } = await supabase
        .from('User')
        .select('id')
        .in('id', body.assignedUserIds)
        .eq('companyId', session.companyId)
      validUserIds = (users || []).map((u: { id: string }) => u.id)
    }

    // Preparar dados de atualização
    const updateData: any = {
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      status: body.status,
      dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : null,
      completedOn: body.completedOn ? new Date(body.completedOn).toISOString() : null,
      assetId: validAssetId,
      locationId: validLocationId,
      categoryId: validCategoryId,
      assignedToId: validAssignedToId,
      maintenanceFrequency: body.maintenanceFrequency || null,
      frequencyValue: body.frequencyValue ? parseInt(body.frequencyValue) : null,
      externalId: body.externalId || null
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2))

    // Atualizar a work order
    const { data: updatedWorkOrder, error: updateError } = await supabase
      .from('WorkOrder')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        asset:Asset(*),
        location:Location!locationId(*),
        category:WorkOrderCategory(*),
        tasks:Task(*)
      `)
      .single()

    if (updateError) throw updateError

    // Processar equipes na tabela de junção
    if (body.assignedTeamIds !== undefined) {
      // Remover associações existentes
      await supabase
        .from('_WorkOrderTeams')
        .delete()
        .eq('A', id)

      // Inserir novas associações
      if (validTeamIds.length > 0) {
        const teamInserts = validTeamIds.map((teamId: string) => ({
          A: id,
          B: teamId
        }))
        await supabase.from('_WorkOrderTeams').insert(teamInserts)
      }
    }

    // Processar usuários na tabela de junção
    if (body.assignedUserIds !== undefined) {
      // Remover associações existentes
      await supabase
        .from('_WorkOrderUsers')
        .delete()
        .eq('A', id)

      // Inserir novas associações
      if (validUserIds.length > 0) {
        const userInserts = validUserIds.map((userId: string) => ({
          A: id,
          B: userId
        }))
        await supabase.from('_WorkOrderUsers').insert(userInserts)
      }
    }

    // Buscar usuários atribuídos para a resposta
    const { data: assignedUsers } = await supabase
      .from('_WorkOrderUsers')
      .select('B')
      .eq('A', id)

    let assignedUserDetails: any[] = []
    if (assignedUsers && assignedUsers.length > 0) {
      const userIds = assignedUsers.map((u: any) => u.B)
      const { data: users } = await supabase
        .from('User')
        .select('id, firstName, lastName, email')
        .in('id', userIds)
      assignedUserDetails = users || []
    }

    return NextResponse.json({
      data: { ...updatedWorkOrder, assignedUsers: assignedUserDetails },
      message: 'Work order updated successfully'
    })
  } catch (error) {
    console.error('Update work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verificar permissão de exclusão
    const permError = checkApiPermission(session, 'work-orders', 'DELETE')
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 403 })
    }

    // Verificar se a OS existe e pertence à empresa
    const { data: workOrder, error: findError } = await supabase
      .from('WorkOrder')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('WorkOrder')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      message: 'Work order deleted successfully'
    })
  } catch (error) {
    console.error('Delete work order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
