import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createAssetHistoryEvent } from '@/lib/assetHistory'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Buscar ativo principal
    const { data: asset, error } = await supabase
      .from('Asset')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (error || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Buscar dados relacionados separadamente
    const [
      { data: childAssets },
      { data: files },
      { data: parts },
      { data: workOrders }
    ] = await Promise.all([
      supabase.from('Asset').select('*').eq('parentAssetId', id),
      supabase.from('File').select('*').eq('assetId', id),
      supabase.from('AssetPart').select('*, part:Part(*)').eq('assetId', id),
      supabase.from('WorkOrder').select('*').eq('assetId', id).order('createdAt', { ascending: false }).limit(10)
    ])

    return NextResponse.json({ 
      data: {
        ...asset,
        childAssets: childAssets || [],
        files: files || [],
        parts: parts || [],
        workOrders: workOrders || []
      }
    })
  } catch (error) {
    console.error('Get asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()

    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const locationId = formData.get('locationId') as string | null
    const mainImage = formData.get('mainImage') as File | null

    // Campos GUT (Gravidade, Urgência, Tendência)
    const gutGravityStr = formData.get('gutGravity') as string | null
    const gutUrgencyStr = formData.get('gutUrgency') as string | null
    const gutTendencyStr = formData.get('gutTendency') as string | null

    // Campos TOTVS
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
    const purchaseValue = formData.get('purchaseValue') as string | null
    const acquisitionCost = formData.get('acquisitionCost') as string | null
    const hourlyCost = formData.get('hourlyCost') as string | null
    const purchaseDate = formData.get('purchaseDate') as string | null
    const installationDate = formData.get('installationDate') as string | null
    const supplierCode = formData.get('supplierCode') as string | null
    const supplierStore = formData.get('supplierStore') as string | null
    const warrantyPeriod = formData.get('warrantyPeriod') as string | null
    const warrantyUnit = formData.get('warrantyUnit') as string | null
    const warrantyDate = formData.get('warrantyDate') as string | null
    const fixedAssetCode = formData.get('fixedAssetCode') as string | null
    const assetPlate = formData.get('assetPlate') as string | null
    const maintenanceStatus = formData.get('maintenanceStatus') as string | null
    const warehouse = formData.get('warehouse') as string | null
    const shiftCode = formData.get('shiftCode') as string | null
    const deactivationDate = formData.get('deactivationDate') as string | null
    const deactivationReason = formData.get('deactivationReason') as string | null
    const lifeValue = formData.get('lifeValue') as string | null
    const lifeUnit = formData.get('lifeUnit') as string | null
    const parentAssetId = formData.get('parentAssetId') as string | null

    // Verificar se o ativo existe
    const { data: asset, error: findError } = await supabase
      .from('Asset')
      .select('*')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Processar nova imagem principal
    let imageUrl: string | undefined = asset.image || undefined
    if (mainImage && mainImage.size > 0) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch {
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

    // Atualizar asset
    const updateData: Record<string, unknown> = {
      name,
      updatedAt: new Date().toISOString()
    }
    if (description !== null) updateData.description = description
    if (locationId !== null) updateData.locationId = locationId || null
    if (imageUrl) updateData.image = imageUrl

    // Campos GUT (valores de 1-5)
    if (gutGravityStr !== null) {
      const gutGravity = parseInt(gutGravityStr, 10)
      if (gutGravity >= 1 && gutGravity <= 5) updateData.gutGravity = gutGravity
    }
    if (gutUrgencyStr !== null) {
      const gutUrgency = parseInt(gutUrgencyStr, 10)
      if (gutUrgency >= 1 && gutUrgency <= 5) updateData.gutUrgency = gutUrgency
    }
    if (gutTendencyStr !== null) {
      const gutTendency = parseInt(gutTendencyStr, 10)
      if (gutTendency >= 1 && gutTendency <= 5) updateData.gutTendency = gutTendency
    }

    // Campos TOTVS — identificação e classificação
    if (protheusCode !== undefined) updateData.protheusCode = protheusCode || null
    if (tag !== undefined) updateData.tag = tag || null
    if (unitId !== undefined) updateData.unitId = unitId || null
    if (areaId !== undefined) updateData.areaId = areaId || null
    if (workCenterId !== undefined) updateData.workCenterId = workCenterId || null
    if (costCenterId !== undefined) updateData.costCenterId = costCenterId || null
    if (positionId !== undefined) updateData.positionId = positionId || null
    if (familyId !== undefined) updateData.familyId = familyId || null
    if (familyModelId !== undefined) updateData.familyModelId = familyModelId || null
    if (parentAssetId !== undefined) updateData.parentAssetId = parentAssetId || null
    if (assetCategoryType) updateData.assetCategoryType = assetCategoryType
    if (assetPriority !== undefined) updateData.assetPriority = assetPriority || null
    if (ownershipType) updateData.ownershipType = ownershipType

    // Dados técnicos
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer || null
    if (modelName !== undefined) updateData.modelName = modelName || null
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber || null
    if (barCode !== undefined) updateData.barCode = barCode || null
    if (hasStructure !== null) updateData.hasStructure = hasStructure === 'true'
    if (hasCounter !== null) updateData.hasCounter = hasCounter === 'true'
    if (counterType !== undefined) updateData.counterType = counterType || null
    if (counterPosition !== null) updateData.counterPosition = counterPosition ? parseFloat(counterPosition) : null
    if (counterLimit !== null) updateData.counterLimit = counterLimit ? parseFloat(counterLimit) : null
    if (dailyVariation !== null) updateData.dailyVariation = dailyVariation ? parseFloat(dailyVariation) : null

    // Financeiro
    if (purchaseValue !== null) updateData.purchaseValue = purchaseValue ? parseFloat(purchaseValue) : null
    if (acquisitionCost !== null) updateData.acquisitionCost = acquisitionCost ? parseFloat(acquisitionCost) : null
    if (hourlyCost !== null) updateData.hourlyCost = hourlyCost ? parseFloat(hourlyCost) : null
    if (purchaseDate !== null) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate).toISOString() : null
    if (installationDate !== null) updateData.installationDate = installationDate ? new Date(installationDate).toISOString() : null
    if (supplierCode !== undefined) updateData.supplierCode = supplierCode || null
    if (supplierStore !== undefined) updateData.supplierStore = supplierStore || null

    // Garantia
    if (warrantyPeriod !== null) updateData.warrantyPeriod = warrantyPeriod ? parseInt(warrantyPeriod, 10) : null
    if (warrantyUnit !== undefined) updateData.warrantyUnit = warrantyUnit || null
    if (warrantyDate !== null) updateData.warrantyDate = warrantyDate ? new Date(warrantyDate).toISOString() : null

    // Contábil e status
    if (fixedAssetCode !== undefined) updateData.fixedAssetCode = fixedAssetCode || null
    if (assetPlate !== undefined) updateData.assetPlate = assetPlate || null
    if (maintenanceStatus) updateData.maintenanceStatus = maintenanceStatus
    if (warehouse !== undefined) updateData.warehouse = warehouse || null
    if (shiftCode !== undefined) updateData.shiftCode = shiftCode || null
    if (deactivationDate !== null) updateData.deactivationDate = deactivationDate ? new Date(deactivationDate).toISOString() : null
    if (deactivationReason !== undefined) updateData.deactivationReason = deactivationReason || null
    if (lifeValue !== null) updateData.lifeValue = lifeValue ? parseFloat(lifeValue) : null
    if (lifeUnit !== undefined) updateData.lifeUnit = lifeUnit || null

    const { data: updatedAsset, error: updateError } = await supabase
      .from('Asset')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Registrar evento no histórico
    await createAssetHistoryEvent({
      assetId: id,
      eventType: 'ASSET_UPDATED',
      title: `Ativo "${name}" atualizado`,
      description: 'Informações do ativo foram atualizadas',
      metadata: {
        updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt')
      },
      userId: session.id
    })

    // Processar novos anexos
    for (let i = 0; i < 10; i++) {
      const attachment = formData.get(`attachment_${i}`) as File | null
      if (attachment && attachment.size > 0) {
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const extension = attachment.name.split('.').pop()
        const filename = `${timestamp}-${randomString}.${extension}`
        const filepath = join(uploadsDir, filename)

        const bytes = await attachment.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        const { data: insertedFile } = await supabase.from('File').insert({
          id: generateId(),
          name: attachment.name,
          url: `/uploads/${filename}`,
          type: attachment.type,
          size: attachment.size,
          assetId: id,
          updatedAt: new Date().toISOString()
        }).select().single()

        // Registrar evento de upload de arquivo
        if (insertedFile) {
          await createAssetHistoryEvent({
            assetId: id,
            eventType: 'FILE_UPLOADED',
            title: `Arquivo "${attachment.name}" anexado`,
            description: `Tipo: ${attachment.type}, Tamanho: ${Math.round(attachment.size / 1024)} KB`,
            metadata: {
              fileName: attachment.name,
              fileType: attachment.type,
              fileSize: attachment.size
            },
            fileId: insertedFile.id,
            userId: session.id
          })
        }
      }
    }

    // Buscar arquivos atualizados
    const { data: files } = await supabase
      .from('File')
      .select('*')
      .eq('assetId', id)

    return NextResponse.json({
      data: { ...updatedAsset, files: files || [] },
      message: 'Asset updated successfully'
    })
  } catch (error) {
    console.error('Update asset error:', error)
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

    // Verificar se o ativo existe
    const { data: asset, error: findError } = await supabase
      .from('Asset')
      .select('id')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (findError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Deletar ativo
    const { error: deleteError } = await supabase
      .from('Asset')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Asset deleted successfully'
    })
  } catch (error) {
    console.error('Delete asset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
