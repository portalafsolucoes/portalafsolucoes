# Spec Canonica do Projeto - CMM Gestor de Manutencao

## Repositorio GitHub
https://github.com/portalafsolucoes/portalafsolucoes

## Produto
Portal AF Solucoes - Gestao de Manutencao (CMMS), multiempresa e multiunidade, com foco em controle operacional, planejamento, execucao e analise da manutencao.

Localizacao oficial da spec: `CLAUDE.md` na raiz do projeto  
Este arquivo e a referencia maxima para qualquer LLM, agente, automacao ou pessoa trabalhando neste repositorio.  
Em caso de divergencia entre este arquivo e qualquer outro documento, prevalece o `CLAUDE.md` da raiz.  
Arquivos em `docs/` servem como apoio e podem existir como material complementar, mas nao substituem esta spec.  
Versao funcional atual: `1.0`  
Data da especificacao: `08/04/2026`

## Stack
- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Banco:** PostgreSQL via Supabase + Prisma ORM
- **UI:** Tailwind CSS v4 + Shadcn/UI + Recharts
- **Estado:** Zustand + React Query
- **Testes:** Playwright (E2E)
- **Deploy:** Vercel + Cloudinary (uploads)

## Comandos
- `npm run dev` - Desenvolvimento local (`http://localhost:3000`)
- `npm run build` - Build de producao (`prisma generate && next build`)
- `npm run test` - Testes E2E com Playwright
- `npm run db:push` - Atualiza schema no banco
- `npm run db:studio` - Prisma Studio
- `npm run lint` - ESLint

## Estrutura do Projeto
```txt
src/
  app/          # Rotas do App Router
  components/   # Componentes React
  hooks/        # Hooks customizados
prisma/         # Schema do banco (Prisma)
public/         # Arquivos estaticos
scripts/        # Scripts utilitarios
tests/          # Testes E2E (Playwright)
docs/           # Documentacao funcional e tecnica
```

## Regras de Produto

### Multiempresa e Multiunidade
- Cada empresa possui dados isolados.
- Usuarios de uma empresa nunca devem acessar dados de outra.
- Dentro de cada empresa, os dados sao organizados por unidade.
- A maior parte das listagens e metricas deve ser filtrada pela unidade ativa.
- Apenas `SUPER_ADMIN` e `ADMIN` podem trocar de unidade, e somente se tiverem acesso a mais de uma.

### Perfis de Usuario
O sistema possui 6 perfis:
- `SUPER_ADMIN`
- `ADMIN`
- `TECHNICIAN`
- `LIMITED_TECHNICIAN`
- `REQUESTER`
- `VIEW_ONLY`

### Resumo de Permissoes
- `SUPER_ADMIN`: controle total do sistema, empresas, usuarios, unidades e dashboard corporativo.
- `ADMIN`: gerencia a operacao da propria empresa/unidade, aprova solicitacoes, acompanha indicadores e gerencia cadastros operacionais.
- `TECHNICIAN`: executa OS atribuidas, pode abrir solicitacoes e consultar itens necessarios ao trabalho.
- `LIMITED_TECHNICIAN`: atua de forma operacional mais restrita, focado em OS atribuidas e abertura basica de solicitacoes.
- `REQUESTER`: abre solicitacoes e acompanha apenas suas demandas.
- `VIEW_ONLY`: possui acesso somente leitura aos modulos permitidos, sem criar, editar, aprovar ou excluir.

### Tabela de Acesso por Tipo de Usuario

A sidebar deve ser filtrada por perfil e tambem pelos modulos habilitados da empresa. Abaixo esta a navegacao esperada por perfil. Todos os perfis tambem devem ver `Voltar ao Portal`.

#### SUPER_ADMIN
- `Dashboard`
- `Arvore`
- `Pessoas/Equipes`
- `Cadastros Basicos`
- `Ativos`
- `Plano de Manutencao`
- `Planejamento e Programacao`
- `Ordens de Servico (OS)`
- `Solicitacoes (SS)`
- `Aprovacoes`
- `RAF`
- `Localizacoes`
- `KPI - Indicadores`
- `Configuracoes`

#### ADMIN
- `Dashboard`
- `Arvore`
- `Pessoas/Equipes`
- `Cadastros Basicos`
- `Ativos`
- `Plano de Manutencao`
- `Planejamento e Programacao`
- `Ordens de Servico (OS)`
- `Solicitacoes (SS)`
- `Aprovacoes`
- `RAF`
- `Localizacoes`
- `KPI - Indicadores`

#### TECHNICIAN
- `Ordens de Servico (OS)`
- `Solicitacoes (SS)`
- `Ativos`

#### LIMITED_TECHNICIAN
- `Ordens de Servico (OS)`
- `Solicitacoes (SS)`

#### REQUESTER
- `Dashboard`
- `Solicitacoes (SS)`

#### VIEW_ONLY
- `Dashboard`
- `Ordens de Servico (OS)`
- `Solicitacoes (SS)`
- `Ativos`
- `Localizacoes`
- `Pessoas/Equipes`
- `KPI - Indicadores`

Regras complementares:
- `TECHNICIAN` e `LIMITED_TECHNICIAN` nao devem ver `Dashboard`; a entrada no CMMS deve levar direto para `Ordens de Servico`.
- `Aprovacoes` deve aparecer apenas para `SUPER_ADMIN` e `ADMIN`.
- `RAF` deve aparecer apenas para `SUPER_ADMIN` e `ADMIN`.
- `Configuracoes` deve aparecer apenas para `SUPER_ADMIN`.
- Mesmo quando a UI exibe um item, a API deve validar perfil, empresa e unidade ativa.

### Regras Transversais
- Menus, botoes e acoes devem respeitar perfil do usuario e tambem ser validados nas APIs.
- Todas as listas principais devem ter busca e filtros.
- A busca deve usar debounce de `500ms`.
- O sistema deve ser responsivo em desktop, tablet e celular.
- Paginas devem exibir estado de carregamento com skeletons.
- Uploads de arquivos e imagens devem usar Cloudinary.
- OS preventivas podem ser geradas automaticamente por agendamento/cron.

## Modulos do Sistema

### 1. Hub
- Pagina inicial apos login.
- Exibe modulos disponiveis por empresa.
- `CMMS` ativo; outros modulos externos ao CMMS podem aparecer como "Em breve" quando desabilitados.

### 2. Login e Autenticacao
- Login por email e senha.
- Nao existe cadastro publico.
- Apenas administradores criam usuarios.
- Usuario desativado nao pode acessar.
- Apos login, o usuario vai para `/hub`.
- Sessao dura `7 dias`.

### 3. Dashboard
- Dashboard operacional para `SUPER_ADMIN`, `ADMIN`, `REQUESTER` e `VIEW_ONLY`, respeitando o nivel de leitura de cada perfil.
- Dashboard corporativo consolidado apenas para `SUPER_ADMIN`.
- Exibe resumo de OS, ativos e solicitacoes.

### 4. Ordens de Servico (OS)
- Lista com busca, filtros por status e situacao.
- Visualizacao em cartoes ou tabela.
- Criacao, edicao, execucao, detalhe e exclusao conforme permissao.
- Numero interno automatico no formato `MAN-XXXXXX`.
- Pode existir numero externo do ERP/TOTVS.
- Status principais: `Pendente`, `Liberada`, `Em Andamento`, `Parada`, `Concluida`.
- Execucao registra checklist, anotacoes, fotos antes/depois, tempos, custos, recursos e feedback.

### 5. Solicitacoes de Servico (SS)
- Qualquer usuario logado pode abrir solicitacao.
- Status iniciais: `Pendente`.
- `SUPER_ADMIN` e `ADMIN` podem aprovar ou rejeitar.
- Rejeicao exige motivo.
- Aprovacao pode gerar OS automaticamente.
- O menu deve exibir badge de pendencias para perfis autorizados.

### 6. Gestao de Ativos
- Listagem em arvore e em tabela.
- Detalhes com linha do tempo, anexos, pecas, subativos e OS relacionadas.
- Cadastro inclui tag unica por unidade, dados tecnicos, custos, GUT, contador, hierarquia e imagem.
- Criticidade GUT = `Gravidade x Urgencia x Tendencia`.
- Existe suporte a ativos padrao/template baseados em TOTVS.

### 7. Localizacoes
- Estrutura hierarquica de unidades e locais fisicos.
- Localizacoes raiz sao tratadas como unidades.
- Dados do sistema devem refletir a unidade ativa.

### 8. Pessoas e Equipes
- Gestao de usuarios por `SUPER_ADMIN` e `ADMIN`.
- Equipes agrupam tecnicos para atribuicao de OS e ativos.
- Usuarios podem ter multiplas unidades de acesso.

### 9. Planos de Manutencao
- Planos padrao por familia de ativos.
- Planos especificos por ativo.
- Planos possuem tarefas, passos e recursos.
- Planos ativos devem gerar OS automaticamente quando vencidos.

### 10. Planejamento
- Gera OS preventivas em lote por periodo e filtros.
- Programacao agenda OS em um periodo e confirma datas planejadas.

### 11. Cadastros Basicos
Cadastros auxiliares do sistema:
- Tipos de Manutencao
- Areas de Manutencao
- Tipos de Servico
- Familias de Ativo
- Modelos de Familia
- Centros de Custo
- Centros de Trabalho
- Areas
- Posicoes
- Caracteristicas
- Recursos
- Calendarios
- Tarefas Genericas
- Passos Genericos
- Tipos de Contador

Operacoes padrao:
- Listar
- Buscar
- Criar
- Editar
- Excluir

### 12. Criticidade de Ativos
- Classificacao por metodo GUT.
- Faixa de resultado de `1` a `125`.

### 13. RAF
- Modulo de analise de falha com `5 Porques`, testes de hipotese e plano de acao.
- Acesso apenas para `SUPER_ADMIN` e `ADMIN`.
- Numero do RAF deve ser unico.

### 14. KPI
Indicadores principais:
- Total de OS
- OS Concluidas
- OS Pendentes
- OS Preventivas
- OS Corretivas
- MTBF
- MTTR
- Disponibilidade
- PMC
- Custo por ativo
- Reducao de custo

Regras:
- Filtro por periodo.
- Valores monetarios formatados em `R$`.

### 15. Painel Administrativo
- Exclusivo do `SUPER_ADMIN`.
- Gestao global de empresas, modulos, unidades e usuarios.
- Criacao de empresa ja deve criar o primeiro usuario admin.
- A acao `Módulos` da Administracao do Portal deve habilitar/desabilitar os modulos por empresa e refletir na navegacao real do sistema.
- Os icones dos modulos no modal e nas APIs devem seguir o padrao `Material Symbols`, igual ao restante da interface.

### 16. Perfil do Usuario
- Tela somente leitura.
- Usuario visualiza seus dados, perfil, empresa e permissoes.

### 16.1 Configuracoes do Usuario
- O menu do usuario em `Configurações` deve exibir apenas as abas `Perfil` e `Segurança`.
- **NAO** manter abas `Preferências` ou `Empresa` nesse fluxo por enquanto.

### 17. Pecas e Estoque
- Modulo atualmente desativado.
- A pagina deve redirecionar para OS.
- Futuro: pecas sobressalentes, estoque e uso em OS.

### 18. Arvore Hierarquica
- Navegacao visual da estrutura completa de ativos.

### 19. Relatorios e Analiticos
- Modulo em desenvolvimento.
- Funcionalidades previstas: OS por status, tempo medio de conclusao, custos e ativos por status.

### 20. Integracao com TOTVS/Protheus
- Importacao e exportacao de dados.
- Campos integrados costumam usar prefixo `protheusCode`.

### 21. Exportacao de Dados
- Exportacao para Excel (`.xlsx`) de OS, ativos, solicitacoes, usuarios e RAFs.

### 22. Upload de Arquivos
- Upload com arrastar e soltar, validacao, pre-visualizacao e limite de quantidade.
- Uso em OS, solicitacoes, ativos e fotos de execucao.

### 23. Notificacoes
- Badge de pendencias.
- Historico de notificacoes com status de leitura.

### 24. Troca de Unidade
- Seletor no cabecalho.
- Atualiza os dados da interface conforme a unidade ativa.

## Glossario Essencial
- `OS`: Ordem de Servico
- `SS`: Solicitacao de Servico
- `Ativo`: equipamento, maquina ou bem manutivel
- `Unidade`: filial, fabrica ou local fisico
- `RAF`: Relatorio de Analise de Falha
- `KPI`: Indicador de desempenho
- `MTBF`: Tempo Medio Entre Falhas
- `MTTR`: Tempo Medio de Reparo
- `GUT`: Gravidade x Urgencia x Tendencia

## Status Atual dos Modulos
- `Hub/Portal`: Funcionando
- `Login/Autenticacao`: Funcionando
- `Dashboard`: Funcionando
- `Ordens de Servico`: Funcionando
- `Solicitacoes`: Funcionando
- `Ativos`: Funcionando
- `Localizacoes`: Funcionando
- `Pessoas e Equipes`: Funcionando
- `Planos de Manutencao`: Funcionando
- `Planejamento`: Funcionando
- `Cadastros Basicos`: Funcionando
- `Criticidade`: Funcionando
- `RAF`: Funcionando
- `KPI`: Funcionando
- `Admin`: Funcionando
- `Perfil`: Funcionando
- `Pecas/Estoque`: Desativado
- `Arvore`: Funcionando
- `Relatorios`: Em desenvolvimento
- `Integracao TOTVS`: Funcionando (parcial)
- `Exportacao Excel`: Funcionando
- `Notificacoes`: Basico

## Layout de Paginas (OBRIGATORIO)

Toda tela (`page.tsx`) DEVE usar os componentes `PageContainer` e `PageHeader`. Nunca defina padding, max-width ou titulo de pagina manualmente.

### PageContainer (`src/components/layout/PageContainer.tsx`)

Escolha a variante correta:

| Variante | Quando usar | Largura |
|----------|-------------|---------|
| `default` | Listagens, dashboards, tabelas | 100% (sem max-width) |
| `narrow` | Paginas de detalhe | max-w-4xl (896px) |
| `form` | Formularios de criacao/edicao | max-w-3xl (768px) |
| `full` | Layouts full-height | 100% + flex column |

```tsx
<PageContainer>...</PageContainer>
<PageContainer variant="narrow">...</PageContainer>
<PageContainer variant="form">...</PageContainer>
<PageContainer variant="full" className="overflow-hidden">...</PageContainer>
```

### PageHeader (`src/components/layout/PageHeader.tsx`)

Padrao visual:
- Titulo: `text-3xl font-bold text-foreground tracking-tight`
- Descricao: `mt-1 text-sm text-muted-foreground`

```tsx
<PageHeader
  title="Nome da Pagina"
  description="Descricao opcional"
  actions={<Button>Acao</Button>}
/>
```

### Regras de Layout
- **NAO** use `<AppLayout>`; e legado.
- **NAO** adicione `px-*`, `py-*`, `max-w-*`, `mx-auto` nos wrappers principais.
- **NAO** crie `<h1>` manual para o titulo da pagina.
- **NAO** use icones no titulo do `PageHeader`.
- O `AppShell` fornece sidebar, header e scroll; o espacamento da pagina e responsabilidade do `PageContainer`.

### Padrao de Tela de Listagem (OBRIGATORIO)

Referencia canonica: telas de `Pessoas` e `Ativos`.

#### Estrutura da pagina

```tsx
<PageContainer variant="full" className="overflow-hidden p-0">
  {/* Header */}
  <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
    <PageHeader title="..." description="..." className="mb-0" actions={...} />
  </div>

  {/* Content */}
  <div className="flex flex-1 overflow-hidden">
    <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
      {/* Left: tabela/arvore/grade */}
      <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden`}>
        ...
      </div>
      {/* Right: painel lateral */}
      {hasSidePanel && <div className="w-1/2 min-w-0">...</div>}
    </div>
  </div>
</PageContainer>
```

Regras:
- Header wrapper: `border-b border-border px-4 py-3 md:px-6 flex-shrink-0`
- PageHeader: sempre com `className="mb-0"` para espaçamento compacto
- Content wrapper: `border-t border-border bg-card` (borda cinza no topo, fundo branco)
- Sem padding no content wrapper; conteudo preenche ate as bordas
- Sem `rounded-[4px]` ou `ambient-shadow` em tabelas dentro do split-panel
- Sem footer de contagem abaixo das tabelas

#### Ordem dos controles no PageHeader

```
Busca (w-64) > Toggle de visualizacao > Filtros > Exportacao (Excel) > Acao primaria (Adicionar)
```

- Busca: `relative w-64` com icone `search` interno
- Toggle: `bg-muted rounded-[4px] p-1`, botoes com `px-3 py-1.5 rounded-[4px] text-sm font-medium`
- Toggle ativo: `bg-background text-foreground ambient-shadow`
- Toggle inativo: `text-muted-foreground hover:text-foreground`
- Ordem do toggle: **Tabela** primeiro, depois Grade, Arvore (tabela e sempre o default)
- View mode default: `useState<ViewMode>('table')`
- Filtros: `h-9 px-3 text-sm border border-input rounded-[4px] bg-background`
- Botao adicionar: usar `<Button>` component, nunca `<button>` raw

#### Tabelas de listagem

- Container: `h-full flex flex-col bg-card overflow-hidden` (sem rounded, sem shadow)
- Scroll: `flex-1 overflow-auto min-h-0`
- Table: `min-w-full divide-y divide-gray-200`
- Thead: `sticky top-0 bg-secondary z-10`
- Th: `px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`
- Tbody: `bg-card divide-y divide-gray-200`
- Tr: `hover:bg-secondary cursor-pointer transition-colors`
- Td: `px-6 py-4 whitespace-nowrap text-sm text-foreground`
- Sem footer de contagem; a tabela termina limpa
- Colunas ordenaveis: icone `unfold_more` (inativo) ou `arrow_upward`/`arrow_downward` (ativo)

#### Painel lateral (Detail/Edit)

- Container: `h-full flex flex-col bg-card border-l border-border`
- Header: `flex items-start justify-between p-4 border-b border-border`
- Titulo: `text-xl font-bold text-foreground`
- Close: `p-1 hover:bg-muted rounded transition-colors` com icone `close`
- Tabs: `TabsList className="w-full justify-start border-b rounded-none px-4"`
- Secoes: `p-4 border-b border-border`
- Section title: `text-sm font-semibold text-foreground mb-3`
- Fields grid: `grid grid-cols-2 gap-x-4 gap-y-2`
- Labels: `text-xs text-muted-foreground`
- Values: `text-sm text-foreground`
- Botoes de acao (Editar/Excluir): `w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px]`
- **NAO** use `border-on-surface-variant/10`; use sempre `border-border`

#### Painel de edicao (inPage)

- Container: `h-full flex flex-col bg-card border-l border-border`
- Header: `flex items-center justify-between p-4 border-b border-border`
- Form: `flex flex-1 min-h-0 flex-col` (NUNCA `h-full`, causa overflow)
- Content: `flex-1 overflow-y-auto p-4 space-y-3`
- Footer fixo: `flex gap-3 px-4 py-4 border-t border-border`
- Botoes: ambos com `flex-1` (mesma largura, 50/50)
- Cancelar: `<Button variant="outline" className="flex-1">Cancelar</Button>`
- Salvar: `<Button type="submit" className="flex-1"><Icon name="save" /> Salvar Alterações</Button>`

#### Loading state

```tsx
<div className="flex-1 flex items-center justify-center">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
    <p className="mt-2 text-muted-foreground">Carregando...</p>
  </div>
</div>
```

- **NAO** use `border-blue-600`; use `border-on-surface-variant`

### Logo da Empresa na Sidebar (OBRIGATORIO)

- A logo no topo esquerdo da sidebar deve vir **exclusivamente** de `user.company.logo` retornado por `/api/auth/me`.
- **NAO** hardcode logos em `public/`, `imagens/` ou qualquer arquivo local para uso na sidebar principal.
- A logo deve ficar na mesma linha do botao hamburguer quando a sidebar estiver expandida.
- A imagem deve aparecer **inteira**, sem corte, respeitando a proporcao original.
- Use `object-contain` com alinhamento a esquerda para encaixar marcas horizontais.
- Durante a hidratacao/carregamento inicial, **NAO** exibir o texto fallback `Portal AF Solucoes` no lugar da logo; use placeholder neutro ate os dados do usuario carregarem.
- O fallback textual com nome da empresa ou app so pode aparecer quando realmente nao existir logo configurada no banco.

### Header Superior Limpo (OBRIGATORIO)

- O lado esquerdo do header superior de todas as telas internas deve permanecer vazio.
- **NAO** exibir o texto fixo `CMMS` no header principal.
- **NAO** exibir o nome da empresa logada nessa area do topo.
- O header deve manter apenas os controles funcionais do lado direito.

## Modais e Popups (OBRIGATORIO)

Todo modal do sistema DEVE seguir o padrao abaixo. Referencia visual: modal "Adicionar Pessoa".

### Componentes

| Componente | Arquivo | Funcao |
|------------|---------|--------|
| `Modal` | `src/components/ui/Modal.tsx` | Container do modal com overlay, header, scroll e centralização |
| `ModalSection` | `src/components/ui/ModalSection.tsx` | Secao colapsavel com fundo cinza e chevron |

### Modal (`src/components/ui/Modal.tsx`)

Props:
- `isOpen`, `onClose`, `title` (obrigatorios)
- `size`: `sm`, `md`, `lg`, `xl`, `xxl`, `full`, `wide` (default: `wide`)
- `hideHeader`, `noPadding`, `inPage`

O size `wide` calcula a largura descontando a sidebar: `calc(100vw - sidebarWidth - 200px)` com max 1400px. O modal detecta automaticamente se a sidebar esta aberta (256px) ou fechada (64px) via `useSidebar()` e centraliza na area util.

### ModalSection (`src/components/ui/ModalSection.tsx`)

Secao colapsavel usada dentro de todo modal:
```tsx
<ModalSection title="Identificação">
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {/* campos */}
  </div>
</ModalSection>
```

Props: `title` (string), `defaultOpen` (boolean, default: true), `children`.

### Estrutura padrao de um modal overlay

```tsx
<Modal isOpen={open} onClose={onClose} title="Titulo do Modal">
  <form onSubmit={handleSubmit}>
    <div className="p-4 space-y-3">
      <ModalSection title="Secao 1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Campo</label>
            <input className="w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </ModalSection>
    </div>

    <div className="flex gap-3 px-4 py-4 border-t border-border">
      <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
      <Button type="submit" className="flex-1">
        <Icon name="save" className="text-base mr-2" />
        Salvar Alterações
      </Button>
    </div>
  </form>
</Modal>
```

### Regras de Modais
- **NAO** crie modais com div manual (`fixed inset-0`); use sempre `<Modal>`
- **NAO** adicione `overflow-y-auto` ou `max-h-[75vh]` nos children; o Modal ja controla o scroll
- **NAO** duplique o botao de fechar (X); o header do Modal ja inclui
- **NAO** use `size="full"` com layout A4 customizado; use `size="wide"` com `ModalSection`
- **NAO** use `border-on-surface-variant/10`; use sempre `border-border`
- **NAO** use `border-blue-600` em spinners; use `border-on-surface-variant`
- Agrupe campos em `<ModalSection>` com titulos descritivos
- Labels: `text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1`
- Inputs: `w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring`
- Grid: `grid grid-cols-2 md:grid-cols-3 gap-3`
- Footer: `flex gap-3 px-4 py-4 border-t border-border`
- Botoes: ambos com `flex-1` (mesma largura), Cancelar (outline) a esquerda, Salvar (primary) a direita
- Texto do botao salvar: "Salvar Alterações" (edicao) ou "Salvar" (criacao), com icone `save`
- O modal `Analisar Solicitação` em Aprovações deve usar `title` no `Modal`, `size="wide"` e `ModalSection`

### Excecoes
- Ativos e Pessoas (Criar/Editar/Detalhe em desktop): usam modo `inPage` como painel lateral
- Modais de confirmacao (`ConfirmationModal`): usam `size="sm"` sem ModalSection

## Mapa de Telas e Modais

| Rota | Titulo | Tipo | Modais/Paineis |
|------|--------|------|----------------|
| `/hub` | Hub | Portal | - |
| `/login` | Login | Form | - |
| `/dashboard` | Dashboard | Stats | - |
| `/people-teams` | Pessoas | Listagem split-panel | PersonDetailModal, PersonFormModal |
| `/assets` | Ativos | Listagem split-panel | AssetDetailPanel, AssetEditPanel, AssetCreateModal |
| `/work-orders` | Ordens de Servico | Listagem | WorkOrderDetailModal, WorkOrderEditModal, ExecutionModal, FinalizeWorkOrderModal |
| `/requests` | Solicitacoes | Listagem | RequestFormModal, RequestDetailModal |
| `/requests/approvals` | Aprovacoes | Listagem | ApprovalModal |
| `/rafs` | RAF | Listagem | RAFFormModal, RAFViewModal, RAFEditModal |
| `/locations` | Localizacoes | Listagem | - |
| `/basic-registrations/[entity]` | Cadastros Basicos | Listagem | CalendarModal, AssetFamilyModal, ResourceModal, GenericStepModal |
| `/criticality` | Criticidade | Listagem | - |
| `/maintenance-plan/standard` | Plano Padrao | Listagem | - |
| `/maintenance-plan/asset` | Plano por Ativo | Listagem | - |
| `/planning/plans` | Planejamento | Listagem | - |
| `/planning/schedules` | Programacao | Listagem | - |
| `/kpi` | KPI | Dashboard | - |
| `/gep` | GEP | Dashboard | - |
| `/tree` | Arvore | Visualizacao | AssetDetailPanel |
| `/admin/portal` | Configuracoes | Admin | - |
| `/admin/users` | Usuarios | Admin | Modal (form/delete) |
| `/admin/units` | Unidades | Admin | Modal (form/delete) |
| `/profile` | Perfil | Detalhe | - |
| `/settings` | Configuracoes Usuario | Form | - |
| `/technician/my-tasks` | Minhas Tarefas | Listagem | - |

## Diretrizes de Implementacao
- Sempre alinhar novas features com este `CLAUDE.md`.
- Quando houver divergencia entre implementacao e qualquer outro documento, priorizar este `CLAUDE.md` e registrar o gap.
- Se algum documento em `docs/` estiver diferente desta spec, ele deve ser tratado como desatualizado ate ser sincronizado.
- Antes de criar fluxo novo, verificar perfil, escopo por empresa/unidade, status envolvidos e criterio de aceite.
- Em listas, considerar sempre busca, filtros, estado vazio, loading, responsividade e permissao.
- Em formularios, garantir validacoes de negocio e status inicial correto.
