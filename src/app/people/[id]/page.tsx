'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

import { getRoleLabel } from '@/lib/rbac'

export default function PersonDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchUser()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()
      
      if (data.data) {
        setUser(data.data)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/people')
      } else {
        const data = await response.json()
        alert(data.error || 'Erro ao excluir pessoa')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erro ao excluir pessoa')
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

  if (!user) {
    return (
      <PageContainer variant="narrow">
        <div className="bg-card rounded-[4px] ambient-shadow p-12 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Pessoa não encontrada</h3>
          <Link href="/people" className="text-primary hover:underline">
            Voltar para a lista
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="narrow">
      <Link
        href="/people"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <Icon name="arrow_back" className="text-base" />
        Voltar para Pessoas
      </Link>

      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.jobTitle || user.email}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/people/${user.id}/edit`}
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

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <div className="flex items-center gap-4 mb-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-2xl">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações de Contato</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Icon name="mail" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Icon name="phone" className="text-xl text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="text-foreground">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Icon name="work" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa por Hora</p>
                  <p className="text-foreground">R$ {user.rate.toFixed(2)}/hora</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Info */}
          <div className="bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações de Trabalho</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Icon name="group" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Papel</p>
                  <p className="text-foreground">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              {user.location && (
                <div className="flex items-center gap-3">
                  <Icon name="location_on" className="text-xl text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="text-foreground">{user.location.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Icon name="calendar_today" className="text-xl text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground">
                    {user.enabled ? (
                      <span className="text-success font-medium">Ativo</span>
                    ) : (
                      <span className="text-danger font-medium">Inativo</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams */}
        {user.teamMemberships && user.teamMemberships.length > 0 && (
          <div className="mt-6 bg-card rounded-[4px] ambient-shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Equipes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.teamMemberships.map((membership: any) => (
                <Link
                  key={membership.team.id}
                  href={`/teams/${membership.team.id}`}
                  className="flex items-center gap-3 p-4 rounded-[4px] hover:bg-secondary transition-colors"
                >
                  <Icon name="group" className="text-xl text-primary" />
                  <span className="font-medium text-foreground">{membership.team.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 bg-card rounded-[4px] ambient-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Informações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="text-foreground">{new Date(user.createdAt).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Atualizado em</p>
              <p className="text-foreground">{new Date(user.updatedAt).toLocaleString('pt-BR')}</p>
            </div>
            {user.lastLogin && (
              <div>
                <p className="text-muted-foreground">Último Login</p>
                <p className="text-foreground">{new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>
    </PageContainer>
  )
}
