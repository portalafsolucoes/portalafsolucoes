'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'

import { Team } from '@/types'

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchTeam()
    }
  }, [params.id])

  const fetchTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${params.id}`)
      const data = await response.json()
      
      if (data.data) {
        setTeam(data.data)
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/teams/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/teams')
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir equipe')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Erro ao excluir equipe')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <PageContainer variant="narrow">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </PageContainer>
    )
  }

  if (!team) {
    return (
      <PageContainer variant="narrow">
          <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Equipe não encontrada</h3>
            <Link href="/teams" className="text-primary hover:underline">
              Voltar para a lista
            </Link>
          </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <Icon name="arrow_back" className="text-base" />
          Voltar para Equipes
        </Link>

        <PageHeader
          title={team.name}
          description={team.description}
          actions={
            <div className="flex gap-2">
              <Link
                href={`/teams/${team.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[4px] hover:bg-blue-700 transition-colors"
              >
                <Icon name="edit" className="text-base" />
                Editar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-[4px] hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Icon name="delete" className="text-base" />
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex items-center gap-3">
              <Icon name="group" className="text-3xl text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Membros</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.members || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex items-center gap-3">
              <Icon name="construction" className="text-3xl text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedWorkOrders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex items-center gap-3">
              <Icon name="inventory_2" className="text-3xl text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos Atribuídos</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedAssets || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-[4px] ambient-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Membros da Equipe</h2>
          {team.members && team.members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {team.members.map((membership: any) => (
                <Link
                  key={membership.id}
                  href={`/people/${membership.user.id}`}
                  className="flex items-center gap-3 p-4 rounded-[4px] hover:bg-secondary transition-colors"
                >
                  {membership.user.image ? (
                    <img
                      src={membership.user.image}
                      alt={`${membership.user.firstName} ${membership.user.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {membership.user.firstName[0]}{membership.user.lastName[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {membership.user.firstName} {membership.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                    {membership.user.jobTitle && (
                      <p className="text-sm text-muted-foreground">{membership.user.jobTitle}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum membro nesta equipe ainda.</p>
          )}
        </div>
    </PageContainer>
  )
}
