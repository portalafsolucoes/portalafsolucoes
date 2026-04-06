import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'

/**
 * API de Sincronização com TOTVS/Protheus
 *
 * POST - Recebe dados do Protheus e sincroniza com o portal
 * Suporta sincronização de múltiplas entidades em um único request
 *
 * Cada entidade usa o campo `protheusCode` como chave de mapeamento.
 * Se o registro já existe (match por protheusCode + companyId), atualiza.
 * Se não existe, cria.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Apenas SUPER_ADMIN e GESTOR podem sincronizar
    if (!['SUPER_ADMIN', 'GESTOR'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const body = await request.json()
    const { entity, records } = body
    // entity: nome da tabela Supabase (ex: "MaintenanceType", "Asset", etc.)
    // records: array de objetos com os dados a sincronizar

    if (!entity || !Array.isArray(records)) {
      return NextResponse.json({ error: 'entity e records são obrigatórios' }, { status: 400 })
    }

    const ALLOWED_ENTITIES = [
      'MaintenanceType', 'MaintenanceArea', 'ServiceType', 'Calendar',
      'CostCenter', 'WorkCenter', 'AssetFamily', 'AssetFamilyModel',
      'Position', 'Characteristic', 'Resource', 'GenericTask', 'GenericStep',
      'Asset', 'Location',
    ]

    if (!ALLOWED_ENTITIES.includes(entity)) {
      return NextResponse.json({ error: `Entidade não permitida: ${entity}` }, { status: 400 })
    }

    let created = 0
    let updated = 0
    let errors = 0

    for (const record of records) {
      try {
        if (!record.protheusCode) {
          errors++
          continue
        }

        // Verificar se já existe
        const { data: existing } = await supabase
          .from(entity)
          .select('id')
          .eq('companyId', session.companyId)
          .eq('protheusCode', record.protheusCode)
          .single()

        // Garantir companyId
        record.companyId = session.companyId

        if (existing) {
          // Atualizar
          delete record.id
          delete record.createdAt
          record.updatedAt = new Date().toISOString()

          const { error } = await supabase
            .from(entity)
            .update(record)
            .eq('id', existing.id)

          if (error) { errors++; continue }
          updated++
        } else {
          // Criar
          delete record.id
          record.id = generateId()
          const { error } = await supabase
            .from(entity)
            .insert(record)

          if (error) { errors++; continue }
          created++
        }
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      message: `Sincronização concluída: ${created} criados, ${updated} atualizados, ${errors} erros`,
      data: { created, updated, errors, total: records.length },
    })
  } catch (error) {
    console.error('TOTVS sync error:', error)
    return NextResponse.json({ error: 'Erro na sincronização' }, { status: 500 })
  }
}
