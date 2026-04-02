import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    if (locationId !== null) updateData.locationId = locationId
    if (imageUrl) updateData.image = imageUrl
    
    // Atualizar campos GUT se fornecidos (valores de 1-5)
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
          name: attachment.name,
          url: `/uploads/${filename}`,
          type: attachment.type,
          size: attachment.size,
          assetId: id
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
