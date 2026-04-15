import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { generateSequentialId } from '@/lib/workOrderUtils'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const nextId = await generateSequentialId()
    return NextResponse.json({ data: nextId })
  } catch (error) {
    console.error('Error generating next ID:', error)
    return NextResponse.json({ error: 'Erro ao gerar próximo ID' }, { status: 500 })
  }
}
