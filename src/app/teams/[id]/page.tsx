'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ArrowLeft, Edit, Trash2, Users as UsersIcon, Package, Wrench } from 'lucide-react'
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
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    )
  }

  if (!team) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Equipe não encontrada</h3>
            <Link href="/teams" className="text-primary hover:underline">
              Voltar para a lista
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Equipes
        </Link>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-primary" />
              {team.name}
            </h1>
            {team.description && (
              <p className="text-muted-foreground mt-2">{team.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Link
              href={`/teams/${team.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Membros</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.members || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedWorkOrders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos Atribuídos</p>
                <p className="text-2xl font-bold text-foreground">{team._count?.assignedAssets || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Membros da Equipe</h2>
          {team.members && team.members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {team.members.map((membership: any) => (
                <Link
                  key={membership.id}
                  href={`/people/${membership.user.id}`}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
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
      </div>
    </AppLayout>
  )
}
