import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { normalizeTextPayload } from '@/lib/textNormalizer'

// GET - Buscar leituras de variáveis
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const variableId = searchParams.get('variableId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '1000');

    let query = supabase
      .from('ProcessReading')
      .select('*, ProcessVariable(tagName, description, unit, sector)')
      .eq('companyId', session.companyId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (variableId) {
      query = query.eq('variableId', variableId);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: readings, error } = await query;

    if (error) throw error;

    return NextResponse.json(readings);
  } catch (error) {
    console.error('Erro ao buscar leituras:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar leituras' },
      { status: 500 }
    );
  }
}

// POST - Criar leituras (bulk insert)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = normalizeTextPayload(await req.json());
    const { readings } = body;

    if (!Array.isArray(readings)) {
      return NextResponse.json(
        { error: 'Formato inválido. Esperado array de leituras' },
        { status: 400 }
      );
    }

    // Adicionar companyId a todas as leituras
    const readingsWithCompany = readings.map((reading) => ({
      id: generateId(),
      ...reading,
      companyId: session.companyId,
    }));

    const { data: result, error } = await supabase
      .from('ProcessReading')
      .insert(readingsWithCompany)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { count: result?.length || 0, message: `${result?.length || 0} leituras inseridas` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar leituras:', error);
    return NextResponse.json(
      { error: 'Erro ao criar leituras' },
      { status: 500 }
    );
  }
}
