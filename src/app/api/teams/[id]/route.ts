import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15+ requires awaiting params
    const { id } = await params

    const { data: team, error: teamError } = await supabase
      .from('Team')
      .select('*')
      .eq('id', id)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Validação de segurança: garantir que a equipe pertence à mesma empresa
    if (team.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Buscar membros com dados do usuário
    const { data: members, error: membersError } = await supabase
      .from('TeamMember')
      .select('*, user:User!userId(id, firstName, lastName, email, phone, jobTitle, image, role)')
      .eq('teamId', id)

    if (membersError) throw membersError

    // Contar work orders atribuídas à equipe (many-to-many via _TeamWorkOrders)
    const { count: assignedWorkOrdersCount } = await supabase
      .from('_TeamWorkOrders')
      .select('*', { count: 'exact', head: true })
      .eq('B', id)

    // Contar assets atribuídos à equipe (many-to-many via _TeamAssets)
    const { count: assignedAssetsCount } = await supabase
      .from('_TeamAssets')
      .select('*', { count: 'exact', head: true })
      .eq('B', id)

    const teamData = {
      ...team,
      members: members || [],
      _count: {
        assignedWorkOrders: assignedWorkOrdersCount || 0,
        assignedAssets: assignedAssetsCount || 0,
        members: (members || []).length
      }
    }

    return NextResponse.json({ data: teamData })
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = normalizeTextPayload(await request.json())
    const { name, description, memberIds } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Verificar se a equipe existe e pertence à empresa
    const { data: existingTeam, error: findError } = await supabase
      .from('Team')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Atualizar a equipe
    const { data: team, error: updateError } = await supabase
      .from('Team')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Gerenciar membros se memberIds foi fornecido
    if (memberIds !== undefined) {
      // Remover membros atuais
      const { error: deleteError } = await supabase
        .from('TeamMember')
        .delete()
        .eq('teamId', id)

      if (deleteError) throw deleteError

      // Adicionar novos membros
      if (memberIds.length > 0) {
        const newMembers = memberIds.map((userId: string) => ({
          id: generateId(),
          teamId: id,
          userId
        }))

        const { error: insertError } = await supabase
          .from('TeamMember')
          .insert(newMembers)

        if (insertError) throw insertError
      }
    }

    // Buscar membros atualizados com dados do usuário
    const { data: members, error: membersError } = await supabase
      .from('TeamMember')
      .select('*, user:User!userId(id, firstName, lastName, email)')
      .eq('teamId', id)

    if (membersError) throw membersError

    const teamData = {
      ...team,
      members: members || []
    }

    return NextResponse.json(
      { data: teamData, message: 'Team updated successfully' }
    )
  } catch (error) {
    console.error('Update team error:', error)
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

    // Verificar se a equipe existe e pertence à empresa
    const { data: team, error: findError } = await supabase
      .from('Team')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('Team')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      message: 'Team deleted successfully'
    })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
