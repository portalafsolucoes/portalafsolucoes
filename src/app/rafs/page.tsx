'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

import { formatDate } from '@/lib/utils'
import { RAFFormModal } from '@/components/rafs/RAFFormModal'
import { RAFViewModal } from '@/components/rafs/RAFViewModal'
import { RAFEditModal } from '@/components/rafs/RAFEditModal'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { useDebounce } from '@/hooks/useDebounce'
import { ExportButton } from '@/components/ui/ExportButton'
import { hasPermission } from '@/lib/permissions'
import { getDefaultCmmsPath } from '@/lib/user-roles'

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

export default function RAFsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [rafs, setRafs] = useState<RAF[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [filterArea, setFilterArea] = useState('Contaminar')
  const [enableAreaFilter, setEnableAreaFilter] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [rafToDelete, setRafToDelete] = useState<string | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedRAF, setSelectedRAF] = useState<RAF | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [rafToEdit, setRafToEdit] = useState<string | null>(null)

  const hasAccess = !!user && hasPermission(user, 'rafs', 'view')

  useEffect(() => {
    if (authLoading || !user) return
    if (!hasPermission(user, 'rafs', 'view')) {
      router.push(getDefaultCmmsPath(user))
      return
    }
    loadRAFs()
  }, [authLoading, router, user])

  const loadRAFs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rafs?summary=true')
      const data = await res.json()
      setRafs(data.data || [])
    } catch (error) {
      console.error('Error loading RAFs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/rafs/${id}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedRAF(data.data)
        setShowViewModal(true)
      } else {
        alert(data.error || 'Erro ao carregar RAF')
      }
    } catch (error) {
      console.error('Error loading RAF:', error)
      alert('Erro ao carregar RAF')
    }
  }

  const handleEdit = (id: string) => {
    setRafToEdit(id)
    setShowEditModal(true)
  }

  const handleDelete = (id: string) => {
    setRafToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!rafToDelete) return

    try {
      const res = await fetch(`/api/rafs/${rafToDelete}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadRAFs()
      } else {
        alert('Erro ao excluir RAF')
      }
    } catch (error) {
      console.error('Error deleting RAF:', error)
      alert('Erro ao excluir RAF')
    } finally {
      setShowDeleteModal(false)
      setRafToDelete(null)
    }
  }

  const filteredRAFs = rafs.filter(raf => {
    // Filtrar por área Contaminar (apenas se habilitado)
    const matchesArea = !enableAreaFilter || raf.area.toLowerCase().includes(filterArea.toLowerCase())
    
    // Filtrar por termo de busca
    const matchesSearch = debouncedSearchTerm === '' ||
      raf.rafNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      raf.equipment.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      raf.area.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    return matchesArea && matchesSearch
  })

  if (authLoading || !hasAccess) {
    return null
  }

  return (
    <PageContainer variant="full" className="overflow-hidden p-0">
        {/* Se modal de visualização está aberto, mostrar apenas ele */}
        {showViewModal && selectedRAF ? (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 backdrop-blur-md bg-background/40 z-40 overflow-y-auto lg:left-64"
            onClick={() => {
              setShowViewModal(false)
              setSelectedRAF(null)
            }}
          >
            <div className="w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
              <RAFViewModal
                isOpen={true}
                onClose={() => {
                  setShowViewModal(false)
                  setSelectedRAF(null)
                }}
                raf={selectedRAF}
                inPage={true}
              />
            </div>
          </div>
        ) : showEditModal && rafToEdit ? (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 backdrop-blur-md bg-background/40 z-40 overflow-y-auto lg:left-64"
            onClick={() => {
              setShowEditModal(false)
              setRafToEdit(null)
            }}
          >
            <div className="w-full max-w-6xl mx-auto p-4" onClick={(e) => e.stopPropagation()}>
              <RAFEditModal
                isOpen={true}
                onClose={() => {
                  setShowEditModal(false)
                  setRafToEdit(null)
                }}
                rafId={rafToEdit}
                onSuccess={() => {
                  setShowEditModal(false)
                  setRafToEdit(null)
                  loadRAFs()
                }}
                inPage={true}
              />
            </div>
          </div>
        ) : (
          <>
        <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
          <PageHeader
            title="Relatórios de Análise de Falha (RAF)"
            description="Gerencie os relatórios de análise de falha do sistema"
            className="mb-0"
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 transform text-base text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por número, equipamento ou área..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <label className="flex items-center gap-2 px-3 py-2 text-sm bg-card rounded-[4px] cursor-pointer hover:bg-accent/5">
                  <input
                    type="checkbox"
                    checked={enableAreaFilter}
                    onChange={(e) => setEnableAreaFilter(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm font-medium whitespace-nowrap">Filtrar Área</span>
                </label>

                <div className="hidden md:flex items-center bg-muted rounded-[4px] p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-background text-foreground ambient-shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Visualização em Tabela"
                  >
                    <Icon name="table" className="text-base" />
                    <span className="hidden md:inline">Tabela</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-all ${
                      viewMode === 'cards'
                        ? 'bg-background text-foreground ambient-shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Visualização em Cartões"
                  >
                    <Icon name="grid_view" className="text-base" />
                    <span className="hidden md:inline">Grade</span>
                  </button>
                </div>

                <ExportButton data={filteredRAFs} entity="rafs" />
                <Button
                  onClick={() => setShowModal(true)}
                  className="flex-shrink-0"
                >
                  <Icon name="add" className="mr-2 text-base" />
                  Novo RAF
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
            <div className="w-full transition-all overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
                    <p className="mt-2 text-muted-foreground">Carregando...</p>
                  </div>
                </div>
              ) : filteredRAFs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-12 text-center">
                  <div>
                    <Icon name="description" className="text-6xl text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum RAF encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando um novo RAF'}
                    </p>
                  </div>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="overflow-auto flex-1 p-4 md:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredRAFs.map((raf) => (
                      <div
                        key={raf.id}
                        className="bg-card rounded-[4px] ambient-shadow p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Icon name="description" className="text-base text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-foreground truncate">
                                  {raf.rafNumber}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                  {raf.area}
                                </p>
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                              raf.failureType === 'REPETITIVE'
                                ? 'bg-danger-light text-foreground'
                                : 'bg-warning-light text-foreground'
                            }`}>
                              {raf.failureType === 'REPETITIVE' ? 'Rep' : 'Alea'}
                            </span>
                          </div>

                          <p className="text-xs text-foreground line-clamp-2">
                            {raf.equipment}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Icon name="calendar_today" className="text-sm" />
                              <span>{formatDate(raf.occurrenceDate)}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <Icon name="person" className="text-sm" />
                              <span className="truncate">{raf.panelOperator}</span>
                            </div>
                          </div>

                          <div className="flex gap-1 pt-1 border-t border-border">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(raf.id)}
                              className="flex-1 text-[10px] px-2 py-1 h-7"
                            >
                              <Icon name="visibility" className="text-sm mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(raf.id)}
                              className="flex-1 text-[10px] px-2 py-1 h-7"
                            >
                              <Icon name="edit" className="text-sm mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(raf.id)}
                              className="flex-1 text-[10px] px-2 py-1 h-7 text-danger hover:bg-danger-light"
                            >
                              <Icon name="delete" className="text-sm" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col bg-card overflow-hidden">
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 bg-secondary z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            RAF
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Área
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Equipamento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Operador
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200">
                        {filteredRAFs.map((raf) => (
                          <tr key={raf.id} className="hover:bg-secondary cursor-pointer transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Icon name="description" className="text-base text-primary" />
                                <span className="text-sm font-semibold text-foreground">{raf.rafNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">{raf.area}</span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="text-sm text-foreground truncate">{raf.equipment}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">{formatDate(raf.occurrenceDate)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">{raf.panelOperator}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                raf.failureType === 'REPETITIVE'
                                  ? 'bg-danger-light text-foreground'
                                  : 'bg-warning-light text-foreground'
                              }`}>
                                {raf.failureType === 'REPETITIVE' ? 'Repetitiva' : 'Aleatória'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleView(raf.id)}
                                  className="p-1.5 text-primary hover:bg-primary/5 rounded transition-colors"
                                  title="Visualizar"
                                >
                                  <Icon name="visibility" className="text-base" />
                                </button>
                                <button
                                  onClick={() => handleEdit(raf.id)}
                                  className="p-1.5 text-muted-foreground hover:bg-secondary rounded transition-colors"
                                  title="Editar"
                                >
                                  <Icon name="edit" className="text-base" />
                                </button>
                                <button
                                  onClick={() => handleDelete(raf.id)}
                                  className="p-1.5 text-danger hover:bg-danger-light rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Icon name="delete" className="text-base" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}

      {/* Modal de Criação (sempre disponível) */}
      <RAFFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          loadRAFs()
        }}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este RAF? Esta ação não pode ser desfeita."
      />
    </PageContainer>
  )
}
