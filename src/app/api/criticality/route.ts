import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classification = searchParams.get('classification') // 'critical', 'warning', 'ok'
    const locationId = searchParams.get('locationId')
    const sortBy = searchParams.get('sortBy') || 'totalScore'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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
        gutGravity,
        gutUrgency,
        gutTendency,
        Location:locationId (id, name),
        AssetCategory:categoryId (id, name)
      `)
      .eq('companyId', session.companyId)
      .eq('archived', false)

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
      
      // RAFs por equipamento (usando campo equipment que contém o nome)
      supabase
        .from('FailureAnalysisReport')
        .select('equipment')
        .eq('companyId', session.companyId)
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

    // Para RAFs, tentar encontrar matches por nome do ativo
    const assetNames = assets.map(a => a.name.toLowerCase())
    rafsResult.data?.forEach(raf => {
      const equipName = raf.equipment?.toLowerCase() || ''
      assets.forEach(asset => {
        if (equipName.includes(asset.name.toLowerCase()) || asset.name.toLowerCase().includes(equipName)) {
          rafCounts[asset.id] = (rafCounts[asset.id] || 0) + 1
        }
      })
    })

    // Calcular scores
    const maxRequests = Math.max(...Object.values(requestCounts), 1)
    const maxWorkOrders = Math.max(...Object.values(workOrderCounts), 1)
    const maxRafs = Math.max(...Object.values(rafCounts), 1)

    const criticalities: AssetCriticality[] = assets.map(asset => {
      // GUT Score (1-5 cada, máx = 125, normalizado para 0-100)
      // Usar valores default se colunas GUT não existirem
      const assetAny = asset as any
      const g = assetAny.gutGravity || 1
      const u = assetAny.gutUrgency || 1
      const t = assetAny.gutTendency || 1
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
        location: asset.Location ? { id: (asset.Location as any).id, name: (asset.Location as any).name } : null,
        category: asset.AssetCategory ? { id: (asset.AssetCategory as any).id, name: (asset.AssetCategory as any).name } : null,
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
