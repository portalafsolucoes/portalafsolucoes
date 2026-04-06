import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// POST - Importar arquivo GEP
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, sector, fileContent, fileDate } = body;

    if (!fileName || !sector || !fileContent) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Verificar se arquivo já foi importado
    const { data: existingFile } = await supabase
      .from('ProcessDataFile')
      .select('id')
      .eq('companyId', session.companyId)
      .eq('fileName', fileName)
      .single();

    if (existingFile) {
      return NextResponse.json(
        { error: 'Arquivo já foi importado anteriormente' },
        { status: 409 }
      );
    }

    // Buscar variáveis do setor
    const { data: variables, error: varError } = await supabase
      .from('ProcessVariable')
      .select('*')
      .eq('companyId', session.companyId)
      .eq('sector', sector)
      .order('position', { ascending: true });

    if (varError) throw varError;

    if (!variables || variables.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma variável configurada para este setor' },
        { status: 400 }
      );
    }

    // Processar linhas do arquivo
    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    const readings: any[] = [];

    for (const line of lines) {
      const values = line.split(';');
      
      if (values.length < 2) continue;

      // Primeiro valor é o timestamp (YYYYMMDDHHmm)
      const timestampStr = values[0].trim();
      const year = parseInt(timestampStr.substring(0, 4));
      const month = parseInt(timestampStr.substring(4, 6)) - 1;
      const day = parseInt(timestampStr.substring(6, 8));
      const hour = parseInt(timestampStr.substring(8, 10));
      const minute = parseInt(timestampStr.substring(10, 12));

      const timestamp = new Date(year, month, day, hour, minute);

      // Processar valores das variáveis
      for (let i = 1; i < values.length && i - 1 < variables.length; i++) {
        const variable = variables[i - 1];
        const value = parseFloat(values[i].trim());

        if (!isNaN(value)) {
          readings.push({
            id: generateId(),
            variableId: variable.id,
            timestamp: timestamp.toISOString(),
            value,
            companyId: session.companyId,
          });
        }
      }
    }

    // Inserir leituras em lotes
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('ProcessReading')
        .insert(batch)
        .select();

      if (error) {
        console.error('Erro ao inserir lote:', error);
        continue;
      }

      totalInserted += data?.length || 0;
    }

    // Registrar arquivo importado
    const { error: fileError } = await supabase
      .from('ProcessDataFile')
      .insert({
        id: generateId(),
        companyId: session.companyId,
        fileName,
        sector,
        fileDate: fileDate || new Date().toISOString(),
        recordCount: totalInserted,
        fileSize: fileContent.length,
        importedBy: session.id,
      });

    if (fileError) throw fileError;

    return NextResponse.json({
      success: true,
      message: `${totalInserted} leituras importadas com sucesso`,
      recordCount: totalInserted,
    });
  } catch (error) {
    console.error('Erro ao importar arquivo:', error);
    return NextResponse.json(
      { error: 'Erro ao importar arquivo' },
      { status: 500 }
    );
  }
}
