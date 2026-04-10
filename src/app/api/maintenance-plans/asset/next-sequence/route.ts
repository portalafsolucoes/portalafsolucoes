import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

// GET - Retorna a próxima sequência para a combinação ativo + tipo de serviço
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const serviceTypeId = searchParams.get('serviceTypeId')

    if (!assetId || !serviceTypeId) {
      return NextResponse.json({ error: 'assetId e serviceTypeId são obrigatórios' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('AssetMaintenancePlan')
      .select('sequence')
      .eq('assetId', assetId)
      .eq('serviceTypeId', serviceTypeId)
      .order('sequence', { ascending: false })
      .limit(1)

    const nextSequence = (existing && existing.length > 0) ? existing[0].sequence + 1 : 1

    return NextResponse.json({ data: nextSequence })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao calcular sequência' }, { status: 500 })
  }
}
