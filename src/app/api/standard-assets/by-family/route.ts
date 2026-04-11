import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('StandardAsset')
      .select('*, characteristics:StandardAssetCharacteristic(*, characteristic:Characteristic!characteristicId(id, name, unit, infoType))')
      .eq('familyId', familyId)
      .eq('companyId', session.companyId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
