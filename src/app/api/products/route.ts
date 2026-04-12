import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/session'

/**
 * GET /api/products
 * Retorna todos os produtos do portal, enriquecidos com o campo `enabled`
 * baseado na empresa do usuário logado (via CompanyProduct).
 */
export async function GET() {
  try {
    const session = await getSession()

    const { data: products, error } = await supabase
      .from('Product')
      .select('id, slug, name, description, icon, order, status')
      .order('order', { ascending: true })

    if (error) {
      console.error('[GET /api/products] fetch products:', error)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    if (!session) {
      // Sem sessão: retorna status público (enabled = produto ACTIVE)
      return NextResponse.json({
        data: (products || []).map(p => ({
          ...p,
          enabled: p.status === 'ACTIVE',
        })),
      })
    }

    // Com sessão: enriquece com habilitação por empresa
    const { data: companyProducts, error: cpError } = await supabase
      .from('CompanyProduct')
      .select('productId, enabled')
      .eq('companyId', session.companyId)

    if (cpError) {
      console.error('[GET /api/products] fetch companyProducts:', cpError)
      return NextResponse.json({ error: 'Erro ao buscar produtos da empresa' }, { status: 500 })
    }

    const enabledMap = new Map(
      (companyProducts || []).map(cp => [cp.productId, cp.enabled])
    )

    return NextResponse.json({
      data: (products || []).map(p => ({
        ...p,
        enabled: enabledMap.get(p.id) ?? false,
      })),
    })
  } catch (error) {
    console.error('[GET /api/products]', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}
