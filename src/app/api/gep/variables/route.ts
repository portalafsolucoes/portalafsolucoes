import { NextRequest, NextResponse } from 'next/server';
import { supabase, generateId } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { normalizeTextPayload } from '@/lib/textNormalizer'

// GET - Listar variáveis de processo
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');
    const enabled = searchParams.get('enabled');

    const where: Record<string, unknown> = {
      companyId: session.companyId,
    };

    if (sector) {
      where.sector = sector;
    }

    if (enabled !== null) {
      where.enabled = enabled === 'true';
    }

    const { data: variables, error } = await supabase
      .from('ProcessVariable')
      .select('*')
      .match(where)
      .order('sector', { ascending: true })
      .order('position', { ascending: true });

    if (error) throw error;

    return NextResponse.json(variables);
  } catch (error) {
    console.error('Erro ao buscar variáveis:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar variáveis' },
      { status: 500 }
    );
  }
}

// POST - Criar nova variável
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = normalizeTextPayload(await req.json());
    const {
      sector,
      tagName,
      description,
      type,
      unit,
      position,
      minValue,
      maxValue,
      enabled,
    } = body;

    const { data: variable, error } = await supabase
      .from('ProcessVariable')
      .insert({
        id: generateId(),
        companyId: session.companyId,
        sector,
        tagName,
        description,
        type,
        unit,
        position,
        minValue,
        maxValue,
        enabled: enabled ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(variable, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar variável:', error);
    return NextResponse.json(
      { error: 'Erro ao criar variável' },
      { status: 500 }
    );
  }
}
