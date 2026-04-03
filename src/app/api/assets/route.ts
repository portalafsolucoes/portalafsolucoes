import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    // Novos campos Fase 3
    const tag = formData.get('tag') as string | null
    const unitId = formData.get('unitId') as string | null
    const areaId = formData.get('areaId') as string | null
    const workCenterId = formData.get('workCenterId') as string | null
    const costCenterId = formData.get('costCenterId') as string | null
    const positionId = formData.get('positionId') as string | null
    const familyId = formData.get('familyId') as string | null
    const familyModelId = formData.get('familyModelId') as string | null
    const manufacturer = formData.get('manufacturer') as string | null
    const modelName = formData.get('modelName') as string | null
    const serialNumber = formData.get('serialNumber') as string | null

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
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
    const insertData: Record<string, any> = {
      name,
      description: description || undefined,
      locationId: locationId || undefined,
      parentAssetId: parentAssetId || undefined,
      image: imageUrl,
      status: 'OPERATIONAL',
      companyId: session.companyId,
    }
    // Campos novos (Fase 3) — somente adicionar se fornecidos
    if (tag) insertData.tag = tag
    if (unitId) insertData.unitId = unitId
    if (areaId) insertData.areaId = areaId
    if (workCenterId) insertData.workCenterId = workCenterId
    if (costCenterId) insertData.costCenterId = costCenterId
    if (positionId) insertData.positionId = positionId
    if (familyId) insertData.familyId = familyId
    if (familyModelId) insertData.familyModelId = familyModelId
    if (manufacturer) insertData.manufacturer = manufacturer
    if (modelName) insertData.modelName = modelName
    if (serialNumber) insertData.serialNumber = serialNumber
    if (parentAssetId) insertData.hasStructure = false // filhos iniciam sem estrutura própria

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
              name: attachment.name,
              url: `/uploads/${filename}`,
              type: attachment.type,
              size: attachment.size,
              assetId: asset.id
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
        location:Location!Asset_locationId_fkey(*),
        category:Category(*),
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
