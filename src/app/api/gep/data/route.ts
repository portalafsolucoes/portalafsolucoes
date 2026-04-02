import { NextRequest, NextResponse } from 'next/server';
import { loadGEPData, isValidDateFormat } from '@/lib/gep-parser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');
    const sector = searchParams.get('sector') || 'ALL';
    const variablesParam = searchParams.get('variables');

    // Se não houver startDateTime/endDateTime, usar formato antigo para compatibilidade
    if (!startDateTime || !endDateTime) {
      const date = searchParams.get('date') || '02112025';
      const startHour = parseInt(searchParams.get('startHour') || '0');
      const endHour = parseInt(searchParams.get('endHour') || '23');

      if (!isValidDateFormat(date)) {
        return NextResponse.json(
          { error: 'Formato de data inválido. Use DDMMYYYY (ex: 02112025)' },
          { status: 400 }
        );
      }

      const variables = variablesParam ? variablesParam.split(',') : undefined;
      const result = loadGEPData({ date, startHour, endHour, sector: sector === 'ALL' ? undefined : sector, variables });

      return NextResponse.json({ data: result, totalVariables: 443, cached: result.length > 0, date, startHour, endHour, sector });
    }

    // Processar novo formato de período
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Formato de data/hora inválido' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Data de início deve ser anterior à data de fim' }, { status: 400 });
    }

    // Parsear variáveis específicas
    const variables = variablesParam ? variablesParam.split(',') : undefined;

    // Carregar dados para cada dia no período
    const allData: any[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Resetar para início do dia

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const gepDateFormat = `${day}${month}${year}`;

      // Carregar dados completos do dia (00h-23h)
      const dayData = loadGEPData({
        date: gepDateFormat,
        startHour: 0,
        endHour: 23,
        sector: sector === 'ALL' ? undefined : sector,
        variables
      });

      // Filtrar e adicionar data a cada registro
      const filteredData = dayData
        .filter(row => {
          const [hour, minute] = row.time.split(':').map(Number);
          const rowDateTime = new Date(dateStr);
          rowDateTime.setHours(hour, minute || 0, 0, 0);
          
          return rowDateTime >= startDate && rowDateTime < endDate;
        })
        .map(row => ({
          ...row,
          date: dateStr,
          dateTime: `${dateStr}T${row.time}` // Adicionar timestamp completo para ordenação
        }));

      allData.push(...filteredData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Ordenar por data e hora
    allData.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

    return NextResponse.json({
      data: allData,
      totalVariables: 443,
      startDateTime,
      endDateTime,
      sector
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados GEP:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
