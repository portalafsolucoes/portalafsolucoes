'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

import { formatDate } from '@/lib/utils'

interface RAF {
  id: string
  rafNumber: string
  area: string
  equipment: string
  occurrenceDate: string
  occurrenceTime: string
  panelOperator: string
  stopExtension: boolean
  failureBreakdown: boolean
  productionLost: number | null
  failureDescription: string
  observation: string
  immediateAction: string
  fiveWhys: string[]
  hypothesisTests: Array<{
    item: number
    description: string
    possible: string
    evidence: string
  }>
  failureType: string
  actionPlan: Array<{
    what: string
    who: string
    when: string
  }>
  createdAt: string
  createdBy?: {
    firstName: string
    lastName: string
  }
}

export default function ViewRAFPage() {
  const router = useRouter()
  const params = useParams()
  const [raf, setRaf] = useState<RAF | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRAF()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRAF = async () => {
    try {
      const res = await fetch(`/api/rafs/${params.id}`)
      const data = await res.json()
      if (res.ok) {
        setRaf(data.data)
      } else {
        alert(data.error || 'Erro ao carregar RAF')
        router.push('/rafs')
      }
    } catch (error) {
      console.error('Error loading RAF:', error)
      alert('Erro ao carregar RAF')
      router.push('/rafs')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este RAF?')) return

    try {
      const res = await fetch(`/api/rafs/${params.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        router.push('/rafs')
      } else {
        alert('Erro ao excluir RAF')
      }
    } catch (error) {
      console.error('Error deleting RAF:', error)
      alert('Erro ao excluir RAF')
    }
  }

  if (loading) {
    return (
      <PageContainer variant="narrow">
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-on-surface-variant border-r-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  if (!raf) {
    return null
  }

  return (
    <PageContainer variant="narrow">
        {/* Header */}
        <PageHeader
          title={raf.rafNumber}
          description="Relatório de Análise de Falha"
          actions={
            <>
              <Button variant="outline" onClick={() => router.push('/rafs')}>
                <Icon name="arrow_back" className="text-base mr-2" />
                Voltar
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/rafs/${raf.id}/edit`)}
              >
                <Icon name="edit" className="text-base mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-danger hover:bg-danger-light"
              >
                <Icon name="delete" className="text-base mr-2" />
                Excluir
              </Button>
            </>
          }
        />

        {/* Informações Básicas */}
        <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Área</label>
              <p className="text-base text-foreground">{raf.area}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Equipamento</label>
              <p className="text-base text-foreground">{raf.equipment}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Data da Ocorrência</label>
              <p className="text-base text-foreground flex items-center gap-2">
                <Icon name="calendar_today" className="text-base" />
                {formatDate(raf.occurrenceDate)} às {raf.occurrenceTime}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Operador de Painel</label>
              <p className="text-base text-foreground flex items-center gap-2">
                <Icon name="person" className="text-base" />
                {raf.panelOperator}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Falha</label>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                raf.failureType === 'REPETITIVE'
                  ? 'bg-danger-light text-foreground'
                  : 'bg-warning-light text-foreground'
              }`}>
                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'}
              </span>
            </div>
            {raf.productionLost && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Produção Perdida</label>
                <p className="text-base text-foreground">{raf.productionLost} ton</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2">
              {raf.stopExtension ? (
                <Icon name="check_circle" className="text-xl text-success" />
              ) : (
                <Icon name="warning" className="text-xl text-muted-foreground" />
              )}
              <span className={`text-sm ${raf.stopExtension ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                Prolongamento de Parada
              </span>
            </div>
            <div className="flex items-center gap-2">
              {raf.failureBreakdown ? (
                <Icon name="check_circle" className="text-xl text-success" />
              ) : (
                <Icon name="warning" className="text-xl text-muted-foreground" />
              )}
              <span className={`text-sm ${raf.failureBreakdown ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                Falha/Quebra
              </span>
            </div>
          </div>
        </div>

        {/* Descrição da Falha */}
        <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Descrição da Falha</h2>
          <p className="text-foreground whitespace-pre-wrap">{raf.failureDescription}</p>
        </div>

        {/* Observações */}
        {raf.observation && (
          <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Observações</h2>
            <p className="text-foreground whitespace-pre-wrap">{raf.observation}</p>
          </div>
        )}

        {/* Ação Imediata */}
        {raf.immediateAction && (
          <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Ação Imediata</h2>
            <p className="text-foreground whitespace-pre-wrap">{raf.immediateAction}</p>
          </div>
        )}

        {/* 5 Porquês */}
        {raf.fiveWhys && raf.fiveWhys.length > 0 && (
          <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">5 Porquês</h2>
            <div className="space-y-3">
              {raf.fiveWhys.map((why, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <p className="text-foreground flex-1">{why}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teste de Hipóteses */}
        {raf.hypothesisTests && raf.hypothesisTests.length > 0 && (
          <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Teste de Hipóteses</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Possível</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Evidência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {raf.hypothesisTests.map((test, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-foreground">{test.item}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{test.description}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{test.possible}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{test.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plano de Ação */}
        {raf.actionPlan && raf.actionPlan.length > 0 && (
          <div className="bg-card rounded-[4px] ambient-shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Plano de Ação</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">O Que</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quando</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {raf.actionPlan.map((action, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-foreground">{action.what}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{action.who}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{action.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Informações de Criação */}
        {raf.createdBy && (
          <div className="bg-secondary rounded-[4px] p-4 text-sm text-muted-foreground">
            Criado por {raf.createdBy.firstName} {raf.createdBy.lastName} em {formatDate(raf.createdAt)}
          </div>
        )}
    </PageContainer>
  )
}
