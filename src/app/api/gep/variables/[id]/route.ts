import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { normalizeTextPayload } from '@/lib/textNormalizer'

// GET - Buscar variável específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: variable, error } = await supabase
      .from('ProcessVariable')
      .select('*, ProcessAlarm(*)')
      .eq('id', id)
      .eq('companyId', session.companyId)
      .single();

    if (error) throw error;

    if (!variable) {
      return NextResponse.json(
        { error: 'Variável não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(variable);
  } catch (error) {
    console.error('Erro ao buscar variável:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar variável' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar variável
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = normalizeTextPayload(await req.json());

    const { data, error } = await supabase
      .from('ProcessVariable')
      .update(body)
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Variável não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar variável:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar variável' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar variável
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ProcessVariable')
      .delete()
      .eq('id', id)
      .eq('companyId', session.companyId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Variável não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar variável:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar variável' },
      { status: 500 }
    );
  }
}
