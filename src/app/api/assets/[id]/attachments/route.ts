import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateId } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { createAssetHistoryEvent } from '@/lib/assetHistory'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Valid attachment categories
const VALID_CATEGORIES = [
  'MANUAL',
  'TECHNICAL_DOCUMENT',
  'DATASHEET',
  'DRAWING',
  'PHOTO',
  'VIDEO',
  'CERTIFICATE',
  'WARRANTY',
  'WORK_ORDER_DOC',
  'MAINTENANCE_REPORT',
  'INSPECTION_REPORT',
  'TIP',
  'PROCEDURE',
  'SAFETY',
  'OTHER'
] as const

type AttachmentCategory = typeof VALID_CATEGORIES[number]

// GET - List attachments for an asset
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
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify asset exists and belongs to company
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id, name')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('AssetAttachment')
      .select('*', { count: 'exact' })
      .eq('assetId', id)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category && VALID_CATEGORIES.includes(category as AttachmentCategory)) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: attachments, error, count } = await query

    if (error) {
      console.error('Fetch attachments error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Group attachments by category for easier frontend handling
    const byCategory: Record<string, typeof attachments> = {}
    attachments?.forEach(attachment => {
      if (!byCategory[attachment.category]) {
        byCategory[attachment.category] = []
      }
      byCategory[attachment.category].push(attachment)
    })

    return NextResponse.json({
      data: attachments || [],
      byCategory,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify asset exists and belongs to company
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id, name')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const category = formData.get('category') as AttachmentCategory
    const version = formData.get('version') as string | null
    const tagsString = formData.get('tags') as string | null
    const expiresAt = formData.get('expiresAt') as string | null
    const isPublic = formData.get('isPublic') === 'true'
    const file = formData.get('file') as File | null

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }

    // Process file upload
    let fileUrl: string | undefined
    let mimeType: string | undefined
    let fileSize: number | undefined

    if (file && file.size > 0) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'attachments')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch {
        // Directory already exists
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}-${randomString}.${extension}`
      const filepath = join(uploadsDir, filename)

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      fileUrl = `/uploads/attachments/${filename}`
      mimeType = file.type
      fileSize = file.size
    }

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : []

    // Create attachment
    const { data: attachment, error: createError } = await supabase
      .from('AssetAttachment')
      .insert({
        id: generateId(),
        name,
        description: description || null,
        category,
        url: fileUrl || '',
        mimeType: mimeType || null,
        size: fileSize || null,
        version: version || null,
        tags,
        isPublic,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        assetId: id,
        uploadedById: session.id,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()

    if (createError || !attachment) {
      console.error('Create attachment error:', createError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Create history event
    const categoryLabels: Record<string, string> = {
      MANUAL: 'Manual',
      TECHNICAL_DOCUMENT: 'Documento Técnico',
      DATASHEET: 'Folha de Dados',
      DRAWING: 'Desenho Técnico',
      PHOTO: 'Foto',
      VIDEO: 'Vídeo',
      CERTIFICATE: 'Certificado',
      WARRANTY: 'Garantia',
      WORK_ORDER_DOC: 'Documento de OS',
      MAINTENANCE_REPORT: 'Relatório de Manutenção',
      INSPECTION_REPORT: 'Relatório de Inspeção',
      TIP: 'Dica',
      PROCEDURE: 'Procedimento',
      SAFETY: 'Documento de Segurança',
      OTHER: 'Outro'
    }

    await createAssetHistoryEvent({
      assetId: id,
      eventType: 'ATTACHMENT_ADDED',
      title: `${categoryLabels[category] || 'Anexo'} adicionado: ${name}`,
      description: description || `Novo ${categoryLabels[category]?.toLowerCase() || 'anexo'} adicionado ao ativo`,
      metadata: {
        attachmentId: attachment.id,
        category,
        fileName: file?.name || null,
        fileSize: fileSize || null,
        version: version || null,
        tags
      },
      userId: session.id
    })

    return NextResponse.json({
      data: attachment,
      message: 'Attachment created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete an attachment
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
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }

    // Verify asset exists and belongs to company
    const { data: asset, error: assetError } = await supabase
      .from('Asset')
      .select('id, name')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Get attachment details before deleting
    const { data: attachment, error: fetchError } = await supabase
      .from('AssetAttachment')
      .select('*')
      .eq('id', attachmentId)
      .eq('assetId', id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete attachment
    const { error: deleteError } = await supabase
      .from('AssetAttachment')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('Delete attachment error:', deleteError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Create history event
    await createAssetHistoryEvent({
      assetId: id,
      eventType: 'ATTACHMENT_REMOVED',
      title: `Anexo removido: ${attachment.name}`,
      description: `O anexo "${attachment.name}" foi removido do ativo`,
      metadata: {
        attachmentId: attachment.id,
        category: attachment.category,
        fileName: attachment.name
      },
      userId: session.id
    })

    return NextResponse.json({
      message: 'Attachment deleted successfully'
    })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
