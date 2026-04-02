import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { unlink } from 'fs/promises'
import { join } from 'path'

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

    // Deletar arquivo físico
    try {
      const filepath = join(process.cwd(), 'public', file.url)
      await unlink(filepath)
    } catch (error) {
      console.error('Error deleting physical file:', error)
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
