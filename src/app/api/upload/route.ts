import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadMultipleFiles } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Obter arquivos do form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    // Validar tamanho dos arquivos (máximo 10MB por arquivo)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo ${file.name} excede o tamanho máximo de 10MB` },
          { status: 400 }
        )
      }
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      // Imagens
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/bmp', 'image/tiff',
      // Documentos PDF
      'application/pdf',
      // Microsoft Office
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Texto
      'text/plain', 'text/csv', 'text/html', 'text/markdown',
      // Compactados
      'application/zip', 'application/x-zip-compressed',
      'application/x-rar-compressed', 'application/x-7z-compressed',
      // Outros
      'application/json', 'application/xml', 'text/xml'
    ]

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo não permitido: ${file.type}` },
          { status: 400 }
        )
      }
    }

    // Determinar pasta baseado no tipo
    const folder = formData.get('folder') as string || 'general'

    // Upload para Supabase Storage
    const results = await uploadMultipleFiles(files, folder)

    const uploadedFiles = results.map(file => ({
      name: file.name,
      url: file.url,
      size: file.size,
      type: file.type
    }))

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: 'Arquivos enviados com sucesso',
      storage: 'supabase'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: 'Falha ao fazer upload dos arquivos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
