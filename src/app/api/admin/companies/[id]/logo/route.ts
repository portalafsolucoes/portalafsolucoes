import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'

/**
 * PATCH /api/admin/companies/[id]/logo
 * Upload ou atualiza a logo de uma empresa.
 * Acessível por SUPER_ADMIN ou GESTOR da mesma empresa.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId } = await params

    // SUPER_ADMIN pode editar qualquer empresa; GESTOR só a própria
    if (session.role === 'GESTOR' && session.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verificar se empresa existe
    const { data: company, error: companyError } = await supabase
      .from('Company')
      .select('id, logo')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validar tipo (apenas imagens)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou SVG.' },
        { status: 400 }
      )
    }

    // Validar tamanho (máx 2MB para logos)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A logo deve ter no máximo 2MB' },
        { status: 400 }
      )
    }

    // Deletar logo anterior do Cloudinary se existir
    if (company.logo) {
      try {
        // Extrair publicId da URL do Cloudinary
        const urlParts = company.logo.split('/upload/')
        if (urlParts[1]) {
          // Remove version (v1234567890/) e extensão
          const pathAfterUpload = urlParts[1].replace(/^v\d+\//, '')
          const publicId = pathAfterUpload.replace(/\.[^.]+$/, '')
          await deleteFromCloudinary(publicId)
        }
      } catch {
        // Ignora erro ao deletar antiga (pode já ter sido removida)
      }
    }

    // Upload nova logo para Cloudinary
    const result = await uploadToCloudinary(file, 'logos')

    // Atualizar no banco
    const { error: updateError } = await supabase
      .from('Company')
      .update({ logo: result.secureUrl })
      .eq('id', companyId)

    if (updateError) {
      console.error('Error updating company logo:', updateError)
      return NextResponse.json({ error: 'Failed to update logo' }, { status: 500 })
    }

    return NextResponse.json({
      logo: result.secureUrl,
      message: 'Logo atualizada com sucesso',
    })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'Falha ao fazer upload da logo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/companies/[id]/logo
 * Remove a logo de uma empresa.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId } = await params

    if (session.role === 'GESTOR' && session.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.role !== 'SUPER_ADMIN' && session.role !== 'GESTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar logo atual
    const { data: company } = await supabase
      .from('Company')
      .select('logo')
      .eq('id', companyId)
      .single()

    if (company?.logo) {
      try {
        const urlParts = company.logo.split('/upload/')
        if (urlParts[1]) {
          const pathAfterUpload = urlParts[1].replace(/^v\d+\//, '')
          const publicId = pathAfterUpload.replace(/\.[^.]+$/, '')
          await deleteFromCloudinary(publicId)
        }
      } catch {
        // Ignora
      }
    }

    // Limpar no banco
    await supabase
      .from('Company')
      .update({ logo: null })
      .eq('id', companyId)

    return NextResponse.json({ message: 'Logo removida com sucesso' })
  } catch (error) {
    console.error('Logo delete error:', error)
    return NextResponse.json({ error: 'Falha ao remover logo' }, { status: 500 })
  }
}
