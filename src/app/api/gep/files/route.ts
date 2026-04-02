import { NextResponse } from 'next/server';
import { listAvailableFiles, formatDate } from '@/lib/gep-parser';

export async function GET() {
  try {
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
  } catch (error: any) {
    console.error('Erro ao listar arquivos GEP:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
