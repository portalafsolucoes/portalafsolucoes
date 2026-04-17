import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { normalizeTextPayload } from '@/lib/textNormalizer'

// GET - Listar mapeamentos (filtrar por familyId ou modelId)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const url = new URL(request.url)
    const familyId = url.searchParams.get('familyId')
    const modelId = url.searchParams.get('modelId')

    let query = supabase
      .from('AssetFamilyModelMapping')
      .select('*, model:AssetFamilyModel!modelId(id, name, description, protheusCode), family:AssetFamily!familyId(id, code, name)')

    if (familyId) {
      query = query.eq('familyId', familyId)
    }
    if (modelId) {
      query = query.eq('modelId', modelId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar mapeamentos' }, { status: 500 })
  }
}

// POST - Criar/atualizar mapeamentos de uma família (recebe familyId + array de modelIds)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = normalizeTextPayload(await request.json())
    const { familyId, modelIds } = body

    if (!familyId || !Array.isArray(modelIds)) {
      return NextResponse.json({ error: 'familyId e modelIds são obrigatórios' }, { status: 400 })
    }

    // Remover mapeamentos existentes da família
    const { error: deleteError } = await supabase
      .from('AssetFamilyModelMapping')
      .delete()
      .eq('familyId', familyId)

    if (deleteError) throw deleteError

    // Inserir novos mapeamentos
    if (modelIds.length > 0) {
      const mappings = modelIds.map((modelId: string) => ({
        id: generateId(),
        familyId,
        modelId,
      }))

      const { error: insertError } = await supabase
        .from('AssetFamilyModelMapping')
        .insert(mappings)

      if (insertError) throw insertError
    }

    return NextResponse.json({ message: 'Mapeamentos atualizados com sucesso' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar mapeamentos' }, { status: 500 })
  }
}
