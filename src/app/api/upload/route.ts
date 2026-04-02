import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { uploadMultipleToCloudinary } from '@/lib/cloudinary'

// Verificar se Cloudinary está configurado
const isCloudinaryConfigured = !!(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

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
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      // Documentos PDF
      'application/pdf',
      // Microsoft Office
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      // Texto
      'text/plain', // .txt
      'text/csv', // .csv
      'text/html', // .html
      'text/markdown', // .md
      // Compactados
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // Outros
      'application/json',
      'application/xml',
      'text/xml'
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
    const folder = formData.get('folder') as string || 'work-orders'

    // SEMPRE usar Cloudinary quando configurado (local e produção)
    // Isso garante consistência entre ambientes
    let uploadedFiles

    if (!isCloudinaryConfigured) {
      // Cloudinary não configurado - retornar erro claro
      return NextResponse.json(
        { 
          error: 'Cloudinary não configurado',
          message: 'Configure as variáveis CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no arquivo .env (local) ou no painel da Vercel (produção)',
          hint: 'O sistema agora usa Cloudinary em TODOS os ambientes para garantir consistência'
        },
        { status: 503 }
      )
    }

    // Upload para Cloudinary (funciona em local e produção)
    console.log(`📤 Uploading ${files.length} file(s) to Cloudinary...`)
    try {
      const cloudinaryResults = await uploadMultipleToCloudinary(files, folder)
      
      // Mapear formato do Cloudinary para MIME type correto
      const formatToMimeType = (format: string): string => {
        const imageFormats: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'ico': 'image/x-icon'
        }
        
        const documentFormats: Record<string, string> = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'txt': 'text/plain',
          'csv': 'text/csv',
          'json': 'application/json',
          'xml': 'application/xml',
          'zip': 'application/zip',
          'rar': 'application/x-rar-compressed'
        }
        
        return imageFormats[format.toLowerCase()] || 
               documentFormats[format.toLowerCase()] || 
               'application/octet-stream'
      }
      
      uploadedFiles = cloudinaryResults.map(file => ({
        name: file.originalFilename,
        url: file.secureUrl,
        publicId: file.publicId,
        format: file.format,
        size: file.bytes,
        type: formatToMimeType(file.format)
      }))
      console.log(`✅ Upload to Cloudinary completed successfully (${uploadedFiles.length} files)`)
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error)
      return NextResponse.json(
        { 
          error: 'Falha no upload para Cloudinary',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Retornar URLs dos arquivos
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: 'Arquivos enviados com sucesso para o Cloudinary',
      storage: 'cloudinary'
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
