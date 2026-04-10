import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Retorna a próxima sequência para a combinação família + tipo modelo + tipo serviço
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    const familyModelId = searchParams.get('familyModelId')
    const serviceTypeId = searchParams.get('serviceTypeId')

    if (!familyId || !serviceTypeId) {
      return NextResponse.json({ error: 'familyId e serviceTypeId são obrigatórios' }, { status: 400 })
    }

    let query = supabase
      .from('StandardMaintenancePlan')
      .select('sequence')
      .eq('familyId', familyId)
      .eq('serviceTypeId', serviceTypeId)
      .eq('companyId', session.companyId)
    if (familyModelId) {
      query = query.eq('familyModelId', familyModelId)
    } else {
      query = query.is('familyModelId', null)
    }
    const { data: existing } = await query
      .order('sequence', { ascending: false })
      .limit(1)

    const nextSequence = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1

    return NextResponse.json({ data: nextSequence })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao calcular sequência' }, { status: 500 })
  }
}
