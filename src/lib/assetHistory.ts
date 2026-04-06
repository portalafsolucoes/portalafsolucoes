import { supabase, generateId } from '@/lib/supabase'

export type AssetHistoryEventType =
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_STATUS_CHANGED'
  | 'WORK_ORDER_CREATED'
  | 'WORK_ORDER_STARTED'
  | 'WORK_ORDER_COMPLETED'
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'PART_ADDED'
  | 'PART_REMOVED'
  | 'DOWNTIME_STARTED'
  | 'DOWNTIME_ENDED'
  | 'METER_READING'
  | 'CHECKLIST_COMPLETED'
  | 'MAINTENANCE_SCHEDULED'
  | 'NOTE_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  | 'TECHNICAL_INFO_ADDED'
  | 'TIP_ADDED'
  | 'CUSTOM'

export type AssetAttachmentCategory =
  | 'MANUAL'
  | 'TECHNICAL_DOCUMENT'
  | 'DATASHEET'
  | 'DRAWING'
  | 'PHOTO'
  | 'VIDEO'
  | 'CERTIFICATE'
  | 'WARRANTY'
  | 'WORK_ORDER_DOC'
  | 'MAINTENANCE_REPORT'
  | 'INSPECTION_REPORT'
  | 'TIP'
  | 'PROCEDURE'
  | 'SAFETY'
  | 'OTHER'

interface CreateHistoryEventParams {
  assetId: string
  eventType: AssetHistoryEventType
  title: string
  description?: string
  metadata?: Record<string, unknown>
  workOrderId?: string
  requestId?: string
  fileId?: string
  userId?: string
}

/**
 * Cria um evento no histórico do ativo
 */
export async function createAssetHistoryEvent(params: CreateHistoryEventParams) {
  const {
    assetId,
    eventType,
    title,
    description,
    metadata,
    workOrderId,
    requestId,
    fileId,
    userId
  } = params

  try {
    const { data, error } = await supabase
      .from('AssetHistory')
      .insert({
        id: generateId(),
        assetId,
        eventType,
        title,
        description: description || null,
        metadata: metadata || null,
        workOrderId: workOrderId || null,
        requestId: requestId || null,
        fileId: fileId || null,
        userId: userId || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating asset history event:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating asset history event:', error)
    return null
  }
}

/**
 * Mapeia tipos de evento para ícones e cores
 */
export function getEventTypeConfig(eventType: AssetHistoryEventType) {
  const configs: Record<AssetHistoryEventType, { icon: string; color: string; bgColor: string }> = {
    ASSET_CREATED: { icon: 'Plus', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    ASSET_UPDATED: { icon: 'Edit', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    ASSET_STATUS_CHANGED: { icon: 'RefreshCw', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    WORK_ORDER_CREATED: { icon: 'ClipboardList', color: 'text-gray-700', bgColor: 'bg-gray-200' },
    WORK_ORDER_STARTED: { icon: 'Play', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    WORK_ORDER_COMPLETED: { icon: 'CheckCircle', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    REQUEST_CREATED: { icon: 'FileText', color: 'text-gray-500', bgColor: 'bg-gray-100' },
    REQUEST_APPROVED: { icon: 'ThumbsUp', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    REQUEST_REJECTED: { icon: 'ThumbsDown', color: 'text-gray-800', bgColor: 'bg-gray-200' },
    FILE_UPLOADED: { icon: 'Upload', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    FILE_DELETED: { icon: 'Trash2', color: 'text-gray-800', bgColor: 'bg-gray-200' },
    PART_ADDED: { icon: 'Package', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    PART_REMOVED: { icon: 'PackageMinus', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    DOWNTIME_STARTED: { icon: 'AlertTriangle', color: 'text-gray-800', bgColor: 'bg-gray-200' },
    DOWNTIME_ENDED: { icon: 'CheckCircle2', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    METER_READING: { icon: 'Gauge', color: 'text-gray-500', bgColor: 'bg-gray-100' },
    CHECKLIST_COMPLETED: { icon: 'ListChecks', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    MAINTENANCE_SCHEDULED: { icon: 'Calendar', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    NOTE_ADDED: { icon: 'MessageSquare', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    ATTACHMENT_ADDED: { icon: 'Paperclip', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    ATTACHMENT_REMOVED: { icon: 'Unlink', color: 'text-gray-800', bgColor: 'bg-gray-200' },
    TECHNICAL_INFO_ADDED: { icon: 'FileCode', color: 'text-gray-500', bgColor: 'bg-gray-100' },
    TIP_ADDED: { icon: 'Lightbulb', color: 'text-gray-500', bgColor: 'bg-gray-100' },
    CUSTOM: { icon: 'Star', color: 'text-gray-700', bgColor: 'bg-gray-200' }
  }

  return configs[eventType] || configs.CUSTOM
}

/**
 * Traduz tipos de evento para português
 */
export function getEventTypeLabel(eventType: AssetHistoryEventType): string {
  const labels: Record<AssetHistoryEventType, string> = {
    ASSET_CREATED: 'Ativo Criado',
    ASSET_UPDATED: 'Ativo Atualizado',
    ASSET_STATUS_CHANGED: 'Status Alterado',
    WORK_ORDER_CREATED: 'OS Criada',
    WORK_ORDER_STARTED: 'OS Iniciada',
    WORK_ORDER_COMPLETED: 'OS Concluída',
    REQUEST_CREATED: 'Solicitação Criada',
    REQUEST_APPROVED: 'Solicitação Aprovada',
    REQUEST_REJECTED: 'Solicitação Rejeitada',
    FILE_UPLOADED: 'Arquivo Anexado',
    FILE_DELETED: 'Arquivo Removido',
    PART_ADDED: 'Peça Adicionada',
    PART_REMOVED: 'Peça Removida',
    DOWNTIME_STARTED: 'Parada Iniciada',
    DOWNTIME_ENDED: 'Parada Encerrada',
    METER_READING: 'Leitura de Medidor',
    CHECKLIST_COMPLETED: 'Checklist Concluído',
    MAINTENANCE_SCHEDULED: 'Manutenção Agendada',
    NOTE_ADDED: 'Nota Adicionada',
    ATTACHMENT_ADDED: 'Anexo Adicionado',
    ATTACHMENT_REMOVED: 'Anexo Removido',
    TECHNICAL_INFO_ADDED: 'Info Técnica Adicionada',
    TIP_ADDED: 'Dica Adicionada',
    CUSTOM: 'Evento Personalizado'
  }

  return labels[eventType] || eventType
}

/**
 * Mapeia categorias de anexos para ícones e cores
 */
export function getAttachmentCategoryConfig(category: AssetAttachmentCategory) {
  const configs: Record<AssetAttachmentCategory, { icon: string; color: string; bgColor: string; label: string }> = {
    MANUAL: { icon: 'BookOpen', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Manual' },
    TECHNICAL_DOCUMENT: { icon: 'FileCode', color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Documento Técnico' },
    DATASHEET: { icon: 'FileSpreadsheet', color: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Folha de Dados' },
    DRAWING: { icon: 'PenTool', color: 'text-gray-700', bgColor: 'bg-gray-200', label: 'Desenho Técnico' },
    PHOTO: { icon: 'Camera', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Foto' },
    VIDEO: { icon: 'Video', color: 'text-gray-800', bgColor: 'bg-gray-200', label: 'Vídeo' },
    CERTIFICATE: { icon: 'Award', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Certificado' },
    WARRANTY: { icon: 'Shield', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Garantia' },
    WORK_ORDER_DOC: { icon: 'ClipboardList', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Documento de OS' },
    MAINTENANCE_REPORT: { icon: 'FileText', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Relatório de Manutenção' },
    INSPECTION_REPORT: { icon: 'ClipboardCheck', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Relatório de Inspeção' },
    TIP: { icon: 'Lightbulb', color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Dica' },
    PROCEDURE: { icon: 'ListOrdered', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Procedimento' },
    SAFETY: { icon: 'AlertTriangle', color: 'text-gray-800', bgColor: 'bg-gray-200', label: 'Segurança' },
    OTHER: { icon: 'File', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Outro' }
  }

  return configs[category] || configs.OTHER
}
