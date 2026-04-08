import { supabase } from './supabase'
import crypto from 'crypto'

const BUCKET = 'uploads'

export interface StorageUploadResult {
  name: string
  url: string
  path: string
  size: number
  type: string
}

/**
 * Gera nome de arquivo único com timestamp + random
 */
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || 'bin'
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  const timestamp = Date.now()
  return `${timestamp}-${random}.${ext}`
}

/**
 * Upload de um arquivo para Supabase Storage
 * @param file - Arquivo (File ou Buffer com metadata)
 * @param folder - Pasta dentro do bucket (ex: 'assets/abc123')
 */
export async function uploadFile(
  file: File,
  folder: string
): Promise<StorageUploadResult> {
  const fileName = generateFileName(file.name)
  const filePath = `${folder}/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Falha ao fazer upload de ${file.name}: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return {
    name: file.name,
    url: urlData.publicUrl,
    path: data.path,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

/**
 * Upload de múltiplos arquivos em paralelo
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string
): Promise<StorageUploadResult[]> {
  const uploads = files.map((file) => uploadFile(file, folder))
  return Promise.all(uploads)
}

/**
 * Deleta arquivo do Supabase Storage pelo path interno
 */
export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error('Storage delete error:', error)
    throw new Error(`Falha ao deletar arquivo: ${error.message}`)
  }
}

/**
 * Extrai o path interno a partir de uma URL pública do Supabase Storage.
 * Retorna null se a URL não for do Supabase Storage (legado Cloudinary ou /uploads/).
 */
export function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

/**
 * Deleta arquivo a partir da URL pública.
 * URLs legadas (Cloudinary, /uploads/) são ignoradas silenciosamente.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  const path = extractStoragePath(url)
  if (!path) {
    // URL legada — não é Supabase Storage, skip silencioso
    return
  }
  await deleteFile(path)
}

/**
 * Retorna URL pública de um arquivo no bucket
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Verifica se uma URL é do Supabase Storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return extractStoragePath(url) !== null
}
