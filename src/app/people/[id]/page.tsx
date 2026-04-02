'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Users as UsersIcon, Mail, Phone, Briefcase, MapPin, Calendar } from 'lucide-react'
import { User } from '@/types'
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
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Pessoa não encontrada</h3>
            <Link href="/people" className="text-primary hover:underline">
              Voltar para a lista
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/people"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Pessoas
          </Link>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {user.image ? (
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
                <h1 className="text-3xl font-bold text-foreground">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-muted-foreground mt-1">{user.jobTitle || 'Sem cargo definido'}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link
                href={`/people/${user.id}/edit`}
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
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações de Contato</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="text-foreground">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa por Hora</p>
                  <p className="text-foreground">R$ {user.rate.toFixed(2)}/hora</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Info */}
          <div className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações de Trabalho</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Papel</p>
                  <p className="text-foreground">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              {user.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="text-foreground">{user.location.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
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
          <div className="mt-6 bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Equipes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.teamMemberships.map((membership: any) => (
                <Link
                  key={membership.team.id}
                  href={`/teams/${membership.team.id}`}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  <UsersIcon className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{membership.team.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 bg-card rounded-lg shadow-sm p-6">
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
      </div>
    </div>
  )
}
