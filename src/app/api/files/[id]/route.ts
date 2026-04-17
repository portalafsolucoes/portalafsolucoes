import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { deleteFileByUrl } from '@/lib/storage'

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

    const { data: file, error: findError } = await supabase
      .from('File')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Verificar que o arquivo pertence a empresa do usuario via entidade pai
    const fileRecord = file as { assetId?: string; workOrderId?: string; requestId?: string; url: string }
    let ownershipVerified = false
    if (fileRecord.assetId) {
      const { data: parentAsset } = await supabase.from('Asset').select('id').eq('id', fileRecord.assetId).eq('companyId', session.companyId).single()
      ownershipVerified = !!parentAsset
    } else if (fileRecord.workOrderId) {
      const { data: parentWo } = await supabase.from('WorkOrder').select('id').eq('id', fileRecord.workOrderId).eq('companyId', session.companyId).single()
      ownershipVerified = !!parentWo
    } else if (fileRecord.requestId) {
      const { data: parentReq } = await supabase.from('Request').select('id').eq('id', fileRecord.requestId).eq('companyId', session.companyId).single()
      ownershipVerified = !!parentReq
    }
    if (!ownershipVerified) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Deletar arquivo do storage (ignora URLs legadas silenciosamente)
    try {
      await deleteFileByUrl(file.url)
    } catch (error) {
      console.error('Error deleting file from storage:', error)
      // Continua mesmo se falhar ao deletar o arquivo físico
    }

    // Deletar registro do banco
    const { error: deleteError } = await supabase
      .from('File')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
