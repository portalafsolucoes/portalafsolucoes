import { v2 as cloudinary } from 'cloudinary'

// Verificar se as variáveis do Cloudinary estão configuradas
const isCloudinaryConfigured = !!(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

// Configurar Cloudinary apenas se as variáveis existirem
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  })
}

export interface UploadResult {
  publicId: string
  url: string
  secureUrl: string
  format: string
  width: number
  height: number
  bytes: number
  originalFilename: string
}

/**
 * Upload de um arquivo para o Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = 'work-orders'
): Promise<UploadResult> {
  console.log('🔍 Cloudinary config check:', {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
    apiKey: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
    apiSecret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
    isConfigured: isCloudinaryConfigured
  })

  if (!isCloudinaryConfigured) {
    const missingVars = []
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) missingVars.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
    if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY')
    if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET')
    
    throw new Error(`Cloudinary não configurado. Variáveis faltando: ${missingVars.join(', ')}`)
  }

  try {
    console.log(`📤 Starting upload for: ${file.name} (${file.size} bytes)`)
    
    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`✅ Buffer created: ${buffer.length} bytes`)

    // Upload para Cloudinary usando upload_stream
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `gmm/${folder}`,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload_stream error:', error)
            reject(error)
          } else if (result) {
            console.log('✅ Cloudinary upload successful:', result.public_id)
            resolve(result)
          } else {
            reject(new Error('Upload completed but no result returned'))
          }
        }
      )

      uploadStream.end(buffer)
    })

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width || 0,
      height: result.height || 0,
      bytes: result.bytes,
      originalFilename: file.name
    }
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`)
    }
    throw new Error(`Failed to upload file: ${file.name}`)
  }
}

/**
 * Upload de múltiplos arquivos para o Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  folder: string = 'work-orders'
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadToCloudinary(file, folder))
  return Promise.all(uploadPromises)
}

/**
 * Deletar um arquivo do Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error(`Failed to delete file: ${publicId}`)
  }
}

/**
 * Gerar URL com transformações (resize, crop, etc)
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    crop?: string
    quality?: string | number
  } = {}
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width || 800,
        height: options.height,
        crop: options.crop || 'limit',
        quality: options.quality || 'auto',
        fetch_format: 'auto'
      }
    ]
  })
}

export default cloudinary

