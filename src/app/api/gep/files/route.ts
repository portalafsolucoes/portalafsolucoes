import { NextResponse } from 'next/server';
import { listAvailableFiles, formatDate } from '@/lib/gep-parser';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const files = listAvailableFiles();
    
    const formatted = files.map(({ date, files }) => ({
      date,
      dateFormatted: formatDate(date),
      files: files.sort(),
      fileCount: files.length
    }));

    return NextResponse.json({
      availableDates: formatted,
      totalDates: formatted.length
    });
  } catch (error: unknown) {
    console.error('Erro ao listar arquivos GEP:', error);
    return NextResponse.json(
      { error: 'Erro ao listar arquivos' },
      { status: 500 }
    );
  }
}
