'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function AnalyticsPage() {
  return (
    <PageContainer>
        <PageHeader
          title="Relatórios e Análises"
          description="Visualize métricas e relatórios do sistema"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Serviço por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gráfico de distribuição de ordens por status (em desenvolvimento)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Análise de tempo médio para completar ordens (em desenvolvimento)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos de Manutenção</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Análise de custos por período (em desenvolvimento)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ativos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Distribuição de ativos operacionais vs inativos (em desenvolvimento)
              </p>
            </CardContent>
          </Card>
        </div>
    </PageContainer>
  )
}
