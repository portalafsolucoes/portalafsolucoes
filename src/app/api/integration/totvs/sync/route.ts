import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/user-roles'

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

    // Apenas SUPER_ADMIN e ADMIN podem sincronizar
    if (!isAdminRole(session)) {
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

    // Whitelist de campos permitidos (protecao contra mass assignment)
    const ALLOWED_FIELDS: Record<string, string[]> = {
      MaintenanceType: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      MaintenanceArea: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      ServiceType: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      Calendar: ['name', 'description', 'protheusCode', 'workDays', 'companyId', 'updatedAt'],
      CostCenter: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      WorkCenter: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      AssetFamily: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      AssetFamilyModel: ['name', 'description', 'protheusCode', 'familyId', 'companyId', 'updatedAt'],
      Position: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      Characteristic: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      Resource: ['name', 'description', 'type', 'unit', 'unitCost', 'protheusCode', 'companyId', 'updatedAt'],
      GenericTask: ['name', 'description', 'protheusCode', 'companyId', 'updatedAt'],
      GenericStep: ['name', 'description', 'optionType', 'protheusCode', 'companyId', 'updatedAt'],
      Asset: ['name', 'tag', 'description', 'status', 'protheusCode', 'companyId', 'unitId', 'locationId', 'familyId', 'familyModelId', 'updatedAt'],
      Location: ['name', 'description', 'protheusCode', 'companyId', 'parentId', 'updatedAt'],
    }

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

        // Construir objeto sanitizado com whitelist
        const allowedFields = ALLOWED_FIELDS[entity] || Object.keys(record).filter(k => !['id', 'createdAt'].includes(k))
        const sanitized: Record<string, unknown> = { companyId: session.companyId }
        for (const key of allowedFields) {
          if (key in record && key !== 'id' && key !== 'createdAt') {
            sanitized[key] = record[key]
          }
        }

        if (existing) {
          // Atualizar
          sanitized.updatedAt = new Date().toISOString()

          const { error } = await supabase
            .from(entity)
            .update(sanitized)
            .eq('id', existing.id)

          if (error) { errors++; continue }
          updated++
        } else {
          // Criar
          sanitized.id = generateId()
          sanitized.createdAt = new Date().toISOString()
          const { error } = await supabase
            .from(entity)
            .insert(sanitized)

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
