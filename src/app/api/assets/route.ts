import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createAssetHistoryEvent } from '@/lib/assetHistory'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/assets - Starting request')
    const session = await getSession()
    console.log('Session:', session)
    if (!session) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {
      companyId: session.companyId,
      archived: false
    }

    if (locationId) {
      where.locationId = locationId
    }

    if (status) {
      where.status = status
    }

    let query = supabase
      .from('Asset')
      .select('*', { count: 'exact' })
      .eq('companyId', session.companyId)
      .eq('archived', false)
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    if (locationId) query = query.eq('locationId', locationId)
    if (status) query = query.eq('status', status)

    const { data: assets, error, count: total } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      data: assets || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const locationId = formData.get('locationId') as string | null
    const parentAssetId = formData.get('parentAssetId') as string | null
    const mainImage = formData.get('mainImage') as File | null

    // Campos de classificação e organização
    const protheusCode = formData.get('protheusCode') as string | null
    const tag = formData.get('tag') as string | null
    const unitId = formData.get('unitId') as string | null
    const areaId = formData.get('areaId') as string | null
    const workCenterId = formData.get('workCenterId') as string | null
    const costCenterId = formData.get('costCenterId') as string | null
    const positionId = formData.get('positionId') as string | null
    const familyId = formData.get('familyId') as string | null
    const familyModelId = formData.get('familyModelId') as string | null
    const assetCategoryType = formData.get('assetCategoryType') as string | null
    const assetPriority = formData.get('assetPriority') as string | null
    const ownershipType = formData.get('ownershipType') as string | null

    // Campos técnicos
    const manufacturer = formData.get('manufacturer') as string | null
    const modelName = formData.get('modelName') as string | null
    const serialNumber = formData.get('serialNumber') as string | null
    const barCode = formData.get('barCode') as string | null
    const hasStructure = formData.get('hasStructure') as string | null
    const hasCounter = formData.get('hasCounter') as string | null
    const counterType = formData.get('counterType') as string | null
    const counterPosition = formData.get('counterPosition') as string | null
    const counterLimit = formData.get('counterLimit') as string | null
    const dailyVariation = formData.get('dailyVariation') as string | null

    // Campos financeiros e aquisição
    const purchaseValue = formData.get('purchaseValue') as string | null
    const acquisitionCost = formData.get('acquisitionCost') as string | null
    const hourlyCost = formData.get('hourlyCost') as string | null
    const purchaseDate = formData.get('purchaseDate') as string | null
    const installationDate = formData.get('installationDate') as string | null
    const supplierCode = formData.get('supplierCode') as string | null
    const supplierStore = formData.get('supplierStore') as string | null

    // Campos de garantia
    const warrantyPeriod = formData.get('warrantyPeriod') as string | null
    const warrantyUnit = formData.get('warrantyUnit') as string | null
    const warrantyDate = formData.get('warrantyDate') as string | null

    // Campos contábeis e status
    const fixedAssetCode = formData.get('fixedAssetCode') as string | null
    const assetPlate = formData.get('assetPlate') as string | null
    const maintenanceStatus = formData.get('maintenanceStatus') as string | null
    const warehouse = formData.get('warehouse') as string | null
    const shiftCode = formData.get('shiftCode') as string | null
    const deactivationDate = formData.get('deactivationDate') as string | null
    const deactivationReason = formData.get('deactivationReason') as string | null
    const lifeValue = formData.get('lifeValue') as string | null
    const lifeUnit = formData.get('lifeUnit') as string | null

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validar Código do Bem (protheusCode) — único por empresa
    if (protheusCode) {
      const { data: existingCode } = await supabase
        .from('Asset')
        .select('id')
        .eq('companyId', session.companyId)
        .eq('protheusCode', protheusCode)
        .single()
      if (existingCode) {
        return NextResponse.json({ error: 'Código do Bem já existe nesta empresa' }, { status: 409 })
      }
    }

    // Validar TAG se fornecido (padrão AGR_Tagueamento: máx 6 chars, único por unidade)
    if (tag) {
      if (tag.length > 6) {
        return NextResponse.json({ error: 'TAG deve ter no máximo 6 caracteres' }, { status: 400 })
      }
      if (unitId) {
        const { data: existing } = await supabase
          .from('Asset')
          .select('id')
          .eq('unitId', unitId)
          .eq('tag', tag)
          .single()
        if (existing) {
          return NextResponse.json({ error: 'TAG já existe nesta unidade' }, { status: 409 })
        }
      }
    }

    // Processar imagem principal
    let imageUrl: string | undefined
    if (mainImage && mainImage.size > 0) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch (error) {
        // Diretório já existe
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = mainImage.name.split('.').pop()
      const filename = `${timestamp}-${randomString}.${extension}`
      const filepath = join(uploadsDir, filename)

      const bytes = await mainImage.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)
      
      imageUrl = `/uploads/${filename}`
    }

    // Criar o ativo
    const now = new Date().toISOString()
    const insertData: Record<string, any> = {
      id: generateId(),
      name,
      description: description || undefined,
      locationId: locationId || undefined,
      parentAssetId: parentAssetId || undefined,
      image: imageUrl,
      status: 'OPERATIONAL',
      companyId: session.companyId,
      updatedAt: now,
    }

    // Identificação e classificação
    if (protheusCode) insertData.protheusCode = protheusCode
    if (tag) insertData.tag = tag
    if (unitId) insertData.unitId = unitId
    if (areaId) insertData.areaId = areaId
    if (workCenterId) insertData.workCenterId = workCenterId
    if (costCenterId) insertData.costCenterId = costCenterId
    if (positionId) insertData.positionId = positionId
    if (familyId) insertData.familyId = familyId
    if (familyModelId) insertData.familyModelId = familyModelId
    if (assetCategoryType) insertData.assetCategoryType = assetCategoryType
    if (assetPriority) insertData.assetPriority = assetPriority
    if (ownershipType) insertData.ownershipType = ownershipType

    // Dados técnicos
    if (manufacturer) insertData.manufacturer = manufacturer
    if (modelName) insertData.modelName = modelName
    if (serialNumber) insertData.serialNumber = serialNumber
    if (barCode) insertData.barCode = barCode
    if (hasStructure === 'true') insertData.hasStructure = true
    if (hasCounter === 'true') insertData.hasCounter = true
    if (counterType) insertData.counterType = counterType
    if (counterPosition) insertData.counterPosition = parseFloat(counterPosition)
    if (counterLimit) insertData.counterLimit = parseFloat(counterLimit)
    if (dailyVariation) insertData.dailyVariation = parseFloat(dailyVariation)

    // Financeiro e aquisição
    if (purchaseValue) insertData.purchaseValue = parseFloat(purchaseValue)
    if (acquisitionCost) insertData.acquisitionCost = parseFloat(acquisitionCost)
    if (hourlyCost) insertData.hourlyCost = parseFloat(hourlyCost)
    if (purchaseDate) insertData.purchaseDate = new Date(purchaseDate).toISOString()
    if (installationDate) insertData.installationDate = new Date(installationDate).toISOString()
    if (supplierCode) insertData.supplierCode = supplierCode
    if (supplierStore) insertData.supplierStore = supplierStore

    // Garantia
    if (warrantyPeriod) insertData.warrantyPeriod = parseInt(warrantyPeriod, 10)
    if (warrantyUnit) insertData.warrantyUnit = warrantyUnit
    if (warrantyDate) insertData.warrantyDate = new Date(warrantyDate).toISOString()

    // Contábil, status e outros
    if (fixedAssetCode) insertData.fixedAssetCode = fixedAssetCode
    if (assetPlate) insertData.assetPlate = assetPlate
    if (maintenanceStatus) insertData.maintenanceStatus = maintenanceStatus
    if (warehouse) insertData.warehouse = warehouse
    if (shiftCode) insertData.shiftCode = shiftCode
    if (deactivationDate) insertData.deactivationDate = new Date(deactivationDate).toISOString()
    if (deactivationReason) insertData.deactivationReason = deactivationReason
    if (lifeValue) insertData.lifeValue = parseFloat(lifeValue)
    if (lifeUnit) insertData.lifeUnit = lifeUnit

    if (parentAssetId) insertData.hasStructure = false

    const { data: asset, error: createError } = await supabase
      .from('Asset')
      .insert(insertData)
      .select('*')
      .single()

    if (createError || !asset) {
      console.error('Create asset error:', createError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Registrar evento de criação no histórico
    await createAssetHistoryEvent({
      assetId: asset.id,
      eventType: 'ASSET_CREATED',
      title: `Ativo "${name}" criado`,
      description: description || 'Novo ativo cadastrado no sistema',
      metadata: {
        locationId: locationId || null,
        parentAssetId: parentAssetId || null,
        hasImage: !!imageUrl
      },
      userId: session.id
    })

    // Processar anexos
    const attachmentPromises = []
    for (let i = 0; i < 10; i++) {
      const attachment = formData.get(`attachment_${i}`) as File | null
      if (attachment && attachment.size > 0) {
        attachmentPromises.push(
          (async () => {
            const uploadsDir = join(process.cwd(), 'public', 'uploads')
            const timestamp = Date.now()
            const randomString = Math.random().toString(36).substring(7)
            const extension = attachment.name.split('.').pop()
            const filename = `${timestamp}-${randomString}.${extension}`
            const filepath = join(uploadsDir, filename)

            const bytes = await attachment.arrayBuffer()
            const buffer = Buffer.from(bytes)
            await writeFile(filepath, buffer)

            return supabase.from('File').insert({
              id: generateId(),
              name: attachment.name,
              url: `/uploads/${filename}`,
              type: attachment.type,
              size: attachment.size,
              assetId: asset.id,
              updatedAt: new Date().toISOString()
            }).select()
          })()
        )
      }
    }

    await Promise.all(attachmentPromises)

    // Buscar asset com arquivos
    const { data: assetWithFiles } = await supabase
      .from('Asset')
      .select(`
        *,
        location:Location!locationId(*),
        category:AssetCategory(*),
        primaryUser:User(id, firstName, lastName, email),
        files:File(*)
      `)
      .eq('id', asset.id)
      .single()

    return NextResponse.json(
      { data: assetWithFiles, message: 'Asset created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
