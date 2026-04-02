import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/session';

// GET - Buscar dados do dashboard
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Buscar variáveis do setor
    let variablesQuery = supabase
      .from('ProcessVariable')
      .select('*')
      .eq('companyId', session.companyId)
      .eq('enabled', true);

    if (sector) {
      variablesQuery = variablesQuery.eq('sector', sector);
    }

    const { data: variables, error: varError } = await variablesQuery;
    if (varError) throw varError;

    // Buscar últimas leituras para cada variável
    const variableIds = variables?.map(v => v.id) || [];
    
    let readingsQuery = supabase
      .from('ProcessReading')
      .select('*')
      .eq('companyId', session.companyId)
      .in('variableId', variableIds)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (startDate) {
      readingsQuery = readingsQuery.gte('timestamp', startDate);
    }

    if (endDate) {
      readingsQuery = readingsQuery.lte('timestamp', endDate);
    }

    const { data: readings, error: readError } = await readingsQuery;
    if (readError) throw readError;

    // Buscar alarmes ativos
    const { data: activeAlarms, error: alarmError } = await supabase
      .from('ProcessAlarmTrigger')
      .select('*, ProcessAlarm(*, ProcessVariable(*))')
      .eq('companyId', session.companyId)
      .eq('resolved', false)
      .order('triggeredAt', { ascending: false });

    if (alarmError) throw alarmError;

    // Calcular estatísticas
    const stats = {
      totalVariables: variables?.length || 0,
      activeAlarms: activeAlarms?.length || 0,
      totalReadings: readings?.length || 0,
      sectors: [...new Set(variables?.map(v => v.sector))],
    };

    return NextResponse.json({
      stats,
      variables,
      recentReadings: readings?.slice(0, 100),
      activeAlarms,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do dashboard' },
      { status: 500 }
    );
  }
}
