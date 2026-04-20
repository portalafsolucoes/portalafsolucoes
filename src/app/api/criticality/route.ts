import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEffectiveUnitId, getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Peso de cada fator no cálculo do score
const WEIGHTS = {
  gut: 0.35,           // Matriz GUT (G x U x T)
  openRequests: 0.20,  // Solicitações abertas
  openWorkOrders: 0.20, // OS abertas
  rafCount: 0.15,      // RAFs registradas
  assetStatus: 0.10    // Status do ativo (DOWN = crítico)
}

// Thresholds para classificação
const THRESHOLDS = {
  critical: 70,  // >= 70 = Vermelho (Crítico)
  warning: 40    // >= 40 = Amarelo (Alerta), < 40 = Verde (OK)
}

interface AssetCriticality {
  id: string
  name: string
  customId: string | null
  area: string | null
  status: string
  location: { id: string; name: string } | null
  category: { id: string; name: string } | null
  gutGravity: number
  gutUrgency: number
  gutTendency: number
  gutScore: number
  openRequestsCount: number
  openWorkOrdersCount: number
  rafCount: number
  totalScore: number
  classification: 'critical' | 'warning' | 'ok'
}

interface RelatedEntity {
  id: string
  name: string
}

type RelatedEntityValue = RelatedEntity | RelatedEntity[] | null

interface AssetRow {
  id: string
  name: string
  customId: string | null
  area: string | null
  status: string
  locationId: string | null
  parentAssetId: string | null
  gutGravity: number | null
  gutUrgency: number | null
  gutTendency: number | null
  Location: RelatedEntityValue
  Unit: RelatedEntityValue
  AssetCategory: RelatedEntityValue
}

function pickRelatedEntity(value: RelatedEntityValue): RelatedEntity | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classification = searchParams.get('classification') // 'critical', 'warning', 'ok'
    const locationId = searchParams.get('locationId')
    const unitIdParam = searchParams.get('unitId')
    const sortBy = searchParams.get('sortBy') || 'totalScore'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const effectiveUnitId = unitIdParam ? getEffectiveUnitId(session, unitIdParam) : null

    // Buscar todos os ativos com campos GUT
    let assetsQuery = supabase
      .from('Asset')
      .select(`
        id,
        name,
        customId,
        area,
        status,
        locationId,
        parentAssetId,
        gutGravity,
        gutUrgency,
        gutTendency,
        Location:locationId (id, name),
        Unit:unitId (id, name),
        AssetCategory:categoryId (id, name)
      `)
      .eq('companyId', session.companyId)
      .eq('archived', false)

    if (effectiveUnitId) {
      assetsQuery = assetsQuery.eq('unitId', effectiveUnitId)
    }

    if (locationId) {
      assetsQuery = assetsQuery.eq('locationId', locationId)
    }

    const { data: assets, error: assetsError } = await assetsQuery

    if (assetsError) {
      console.error('Error fetching assets:', assetsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ data: [], summary: { critical: 0, warning: 0, ok: 0, total: 0 } })
    }

    const assetIds = assets.map(a => a.id)

    // Buscar contagens em paralelo
    const [requestsResult, workOrdersResult, rafsResult] = await Promise.all([
      // Solicitações abertas por ativo
      supabase
        .from('Request')
        .select('assetId')
        .in('assetId', assetIds)
        .in('status', ['PENDING', 'APPROVED']),
      
      // OS abertas por ativo
      supabase
        .from('WorkOrder')
        .select('assetId')
        .in('assetId', assetIds)
        .in('status', ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD']),
      
      // RAFs da empresa com vínculos de ativo (FK prioritária, equipment como fallback)
      (() => {
        let query = supabase
          .from('FailureAnalysisReport')
          .select(`
            id,
            equipment,
            workOrderId,
            requestId,
            workOrder:WorkOrder!workOrderId(assetId),
            request:Request!requestId(assetId)
          `)
          .eq('companyId', session.companyId)
        if (effectiveUnitId) {
          query = query.eq('unitId', effectiveUnitId)
        }
        return query
      })()
    ])

    // Contar por ativo
    const requestCounts: Record<string, number> = {}
    const workOrderCounts: Record<string, number> = {}
    const rafCounts: Record<string, number> = {}

    requestsResult.data?.forEach(r => {
      if (r.assetId) {
        requestCounts[r.assetId] = (requestCounts[r.assetId] || 0) + 1
      }
    })

    workOrdersResult.data?.forEach(wo => {
      if (wo.assetId) {
        workOrderCounts[wo.assetId] = (workOrderCounts[wo.assetId] || 0) + 1
      }
    })

    // Match de RAFs por ativo (lógica híbrida):
    // 1) FK via WorkOrder.assetId
    // 2) FK via Request.assetId
    // 3) Fallback: match exato por nome em equipment (apenas quando ambas as FKs forem nulas)
    // Dedup por raf.id para não contar uma mesma RAF duas vezes quando vinculada a OS e SS.
    const assetsByNormalizedName = new Map<string, string[]>()
    for (const asset of assets) {
      const normalizedName = normalizeText(asset.name)
      if (!normalizedName) continue

      const existing = assetsByNormalizedName.get(normalizedName)
      if (existing) {
        existing.push(asset.id)
      } else {
        assetsByNormalizedName.set(normalizedName, [asset.id])
      }
    }

    type RafRow = {
      id: string
      equipment: string | null
      workOrderId: string | null
      requestId: string | null
      workOrder: { assetId: string | null } | { assetId: string | null }[] | null
      request: { assetId: string | null } | { assetId: string | null }[] | null
    }

    const countedRafPerAsset = new Map<string, Set<string>>()
    const addRafForAsset = (assetId: string, rafId: string) => {
      let bucket = countedRafPerAsset.get(assetId)
      if (!bucket) {
        bucket = new Set<string>()
        countedRafPerAsset.set(assetId, bucket)
      }
      bucket.add(rafId)
    }

    const pickAssetId = (
      value: { assetId: string | null } | { assetId: string | null }[] | null
    ): string | null => {
      if (!value) return null
      if (Array.isArray(value)) return value[0]?.assetId ?? null
      return value.assetId ?? null
    }

    for (const rawRaf of (rafsResult.data || []) as RafRow[]) {
      const woAssetId = pickAssetId(rawRaf.workOrder)
      const reqAssetId = pickAssetId(rawRaf.request)

      let matched = false
      if (woAssetId) {
        addRafForAsset(woAssetId, rawRaf.id)
        matched = true
      }
      if (reqAssetId) {
        addRafForAsset(reqAssetId, rawRaf.id)
        matched = true
      }
      if (matched) continue

      // Fallback legado: só quando não há FK nenhuma
      if (rawRaf.workOrderId || rawRaf.requestId) continue
      const equipmentName = normalizeText(rawRaf.equipment)
      if (!equipmentName) continue

      const exactMatchIds = assetsByNormalizedName.get(equipmentName)
      if (!exactMatchIds) continue

      for (const assetId of exactMatchIds) {
        addRafForAsset(assetId, rawRaf.id)
      }
    }

    for (const [assetId, bucket] of countedRafPerAsset.entries()) {
      rafCounts[assetId] = bucket.size
    }

    // Calcular scores
    const maxRequests = Math.max(...Object.values(requestCounts), 1)
    const maxWorkOrders = Math.max(...Object.values(workOrderCounts), 1)
    const maxRafs = Math.max(...Object.values(rafCounts), 1)

    // Resolver localização herdada de ativos pais
    const assetsTyped = assets as AssetRow[]
    const assetsById = new Map<string, AssetRow>()
    for (const asset of assetsTyped) {
      assetsById.set(asset.id, asset)
    }

    // Coletar IDs de pais que não estão na lista atual
    const missingParentIds = new Set<string>()
    for (const asset of assetsTyped) {
      if (!asset.locationId && asset.parentAssetId && !assetsById.has(asset.parentAssetId)) {
        missingParentIds.add(asset.parentAssetId)
      }
    }

    // Buscar localização dos pais ausentes (até 3 níveis de hierarquia)
    const parentLocationCache = new Map<string, RelatedEntity | null>()
    let idsToFetch = Array.from(missingParentIds)
    for (let level = 0; level < 3 && idsToFetch.length > 0; level++) {
      const { data: parentAssets } = await supabase
        .from('Asset')
        .select('id, locationId, parentAssetId, Location:locationId (id, name)')
        .in('id', idsToFetch)

      const nextIds: string[] = []
      for (const pa of parentAssets || []) {
        const loc = pickRelatedEntity(pa.Location as RelatedEntityValue)
        if (loc) {
          parentLocationCache.set(pa.id, loc)
        } else if (pa.parentAssetId && !assetsById.has(pa.parentAssetId) && !parentLocationCache.has(pa.parentAssetId)) {
          nextIds.push(pa.parentAssetId)
          // Armazenar referência para resolver depois
          parentLocationCache.set(pa.id, null)
        }
      }
      idsToFetch = nextIds
    }

    const resolveLocation = (asset: AssetRow): RelatedEntity | null => {
      const direct = pickRelatedEntity(asset.Location)
      if (direct) return direct
      // Herdar do ativo pai
      if (asset.parentAssetId) {
        const parent = assetsById.get(asset.parentAssetId)
        if (parent) {
          const parentLoc = resolveLocation(parent)
          if (parentLoc) return parentLoc
        } else {
          const cached = parentLocationCache.get(asset.parentAssetId)
          if (cached) return cached
        }
      }
      // Fallback: usar a unidade do ativo
      return pickRelatedEntity(asset.Unit)
    }

    const criticalities: AssetCriticality[] = assetsTyped.map(asset => {
      const location = resolveLocation(asset)
      const category = pickRelatedEntity(asset.AssetCategory)

      // GUT Score (1-5 cada, máx = 125, normalizado para 0-100)
      const g = asset.gutGravity || 1
      const u = asset.gutUrgency || 1
      const t = asset.gutTendency || 1
      const gutScore = (g * u * t / 125) * 100

      // Contagens
      const openRequestsCount = requestCounts[asset.id] || 0
      const openWorkOrdersCount = workOrderCounts[asset.id] || 0
      const rafCount = rafCounts[asset.id] || 0

      // Normalizar contagens (0-100)
      const requestsScore = (openRequestsCount / maxRequests) * 100
      const workOrdersScore = (openWorkOrdersCount / maxWorkOrders) * 100
      const rafsScore = (rafCount / maxRafs) * 100
      const statusScore = asset.status === 'DOWN' ? 100 : 0

      // Score total ponderado
      const totalScore = Math.round(
        gutScore * WEIGHTS.gut +
        requestsScore * WEIGHTS.openRequests +
        workOrdersScore * WEIGHTS.openWorkOrders +
        rafsScore * WEIGHTS.rafCount +
        statusScore * WEIGHTS.assetStatus
      )

      // Classificação
      let classificationResult: 'critical' | 'warning' | 'ok'
      if (totalScore >= THRESHOLDS.critical) {
        classificationResult = 'critical'
      } else if (totalScore >= THRESHOLDS.warning) {
        classificationResult = 'warning'
      } else {
        classificationResult = 'ok'
      }

      return {
        id: asset.id,
        name: asset.name,
        customId: asset.customId,
        area: asset.area,
        status: asset.status,
        location,
        category,
        gutGravity: g,
        gutUrgency: u,
        gutTendency: t,
        gutScore: Math.round(gutScore),
        openRequestsCount,
        openWorkOrdersCount,
        rafCount,
        totalScore,
        classification: classificationResult
      }
    })

    // Filtrar por classificação se solicitado
    let filtered = criticalities
    if (classification) {
      filtered = criticalities.filter(c => c.classification === classification)
    }

    // Ordenar
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof AssetCriticality] as number
      const bVal = b[sortBy as keyof AssetCriticality] as number
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })

    // Sumário
    const summary = {
      critical: criticalities.filter(c => c.classification === 'critical').length,
      warning: criticalities.filter(c => c.classification === 'warning').length,
      ok: criticalities.filter(c => c.classification === 'ok').length,
      total: criticalities.length
    }

    return NextResponse.json({ data: filtered, summary })
  } catch (error) {
    console.error('Criticality API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
