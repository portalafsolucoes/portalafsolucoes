# CMM Gestor de Manutencao

## Repositorio GitHub
https://github.com/portalafsolucoes/portalafsolucoes

## Produto
Portal AF Solucoes - Gestao de Manutencao (CMMS), multiempresa e multiunidade, com foco em controle operacional, planejamento, execucao e analise da manutencao.

Documento funcional de referencia: `docs/spec.md`  
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
gep/            # Modulo GEP (variaveis de processo)
```

## Regras de Produto

### Multiempresa e Multiunidade
- Cada empresa possui dados isolados.
- Usuarios de uma empresa nunca devem acessar dados de outra.
- Dentro de cada empresa, os dados sao organizados por unidade.
- A maior parte das listagens e metricas deve ser filtrada pela unidade ativa.
- Apenas `Super Admin` e `Gestor` podem trocar de unidade, e somente se tiverem acesso a mais de uma.

### Perfis de Usuario
O sistema possui 7 perfis:
- `Super Admin`
- `Gestor`
- `Planejador`
- `Mecanico`
- `Eletricista`
- `Operador`
- `Construtor Civil`

### Resumo de Permissoes
- `Super Admin`: controle total do sistema, empresas, usuarios, unidades e dashboard corporativo.
- `Gestor`: gerencia operacao da propria empresa/unidade, aprova solicitacoes, acompanha KPIs, RAF e cadastros.
- `Planejador`: cria planos, programa manutencoes, gerencia ativos e OS, mas nao aprova solicitacoes.
- `Mecanico`, `Eletricista` e `Construtor Civil`: executam OS e atuam operacionalmente.
- `Operador`: abre solicitacoes e acompanha informacoes operacionais.
- Perfis operacionais nao devem ver dashboard; devem ser redirecionados para a area de OS.

### Tabela de Acesso por Tipo de Usuario

| Item do site | Super Admin | Gestor | Planejador | Mecanico | Eletricista | Operador | Construtor Civil |
|--------------|-------------|--------|------------|----------|-------------|----------|------------------|
| Hub / Portal | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Login / Logout | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Dashboard operacional | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Dashboard corporativo | Sim | Nao | Nao | Nao | Nao | Nao | Nao |
| Lista de OS | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Criar OS | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Editar OS | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Executar OS | Sim | Sim | Sim | Sim (as suas) | Sim (as suas) | Sim (as suas, se atribuida) | Sim (as suas) |
| Excluir OS | Sim | Sim | Sim | Nao definido na spec | Nao definido na spec | Nao definido na spec | Nao definido na spec |
| Detalhes da OS | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Lista de solicitacoes | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Criar solicitacao | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Aprovar / rejeitar solicitacao | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Ativos - visualizar | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Ativos - criar / editar | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Ativos - excluir | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Localizacoes | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Pessoas / usuarios | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Equipes | Sim | Sim | Nao definido na spec | Nao | Nao | Nao | Nao |
| Planos de manutencao | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Planejamento / programacao | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Cadastros basicos | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| Criticidade de ativos | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| RAF | Sim | Sim | Nao | Nao | Nao | Nao | Nao |
| KPI | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| GEP | Nao definido na spec | Sim | Sim | Nao definido na spec | Nao definido na spec | Sim | Nao definido na spec |
| Painel administrativo | Sim | Nao | Nao | Nao | Nao | Nao | Nao |
| Perfil do usuario | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Exportacao para Excel | Sim | Sim | Sim | Nao | Nao | Nao | Nao |
| Notificacoes | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Troca de unidade | Sim | Sim | Nao | Nao | Nao | Nao | Nao |

Notas:
- `Nao definido na spec` indica que a especificacao funcional atual nao detalha esse acesso de forma explicita.
- Para perfis operacionais, o comportamento padrao e acesso restrito ao fluxo operacional, com redirecionamento inicial para OS.
- Mesmo quando a UI exibe uma acao, a API deve validar perfil, empresa e unidade ativa.

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
- `CMMS` ativo; `GVP` e `GPA` aparecem como "Em breve" quando desabilitados.

### 2. Login e Autenticacao
- Login por email e senha.
- Nao existe cadastro publico.
- Apenas administradores criam usuarios.
- Usuario desativado nao pode acessar.
- Apos login, o usuario vai para `/hub`.
- Sessao dura `7 dias`.

### 3. Dashboard
- Dashboard operacional para `Super Admin`, `Gestor` e `Planejador`.
- Dashboard corporativo consolidado apenas para `Super Admin`.
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
- `Super Admin` e `Gestor` podem aprovar ou rejeitar.
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
- Gestao de usuarios por `Super Admin` e `Gestor`.
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
- Acesso apenas para `Super Admin` e `Gestor`.
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

### 15. GEP
- Monitoramento de variaveis de processo em grafico e tabela.
- Usuarios: `Gestor`, `Planejador` e `Operador`.
- Deve permitir selecao de setor, variaveis e data.
- Deve destacar turnos no grafico.

Turnos:
- `A`: 01h - 07h
- `B`: 07h - 13h
- `C`: 13h - 19h
- `D`: 19h - 01h

### 16. Painel Administrativo
- Exclusivo do `Super Admin`.
- Gestao global de empresas, modulos, unidades e usuarios.
- Criacao de empresa ja deve criar o primeiro usuario admin.

### 17. Perfil do Usuario
- Tela somente leitura.
- Usuario visualiza seus dados, perfil, empresa e permissoes.

### 18. Pecas e Estoque
- Modulo atualmente desativado.
- A pagina deve redirecionar para OS.
- Futuro: pecas sobressalentes, estoque e uso em OS.

### 19. Arvore Hierarquica
- Navegacao visual da estrutura completa de ativos.

### 20. Relatorios e Analiticos
- Modulo em desenvolvimento.
- Funcionalidades previstas: OS por status, tempo medio de conclusao, custos e ativos por status.

### 21. Integracao com TOTVS/Protheus
- Importacao e exportacao de dados.
- Campos integrados costumam usar prefixo `protheusCode`.

### 22. Exportacao de Dados
- Exportacao para Excel (`.xlsx`) de OS, ativos, solicitacoes, usuarios e RAFs.

### 23. Upload de Arquivos
- Upload com arrastar e soltar, validacao, pre-visualizacao e limite de quantidade.
- Uso em OS, solicitacoes, ativos e fotos de execucao.

### 24. Notificacoes
- Badge de pendencias.
- Historico de notificacoes com status de leitura.

### 25. Troca de Unidade
- Seletor no cabecalho.
- Atualiza os dados da interface conforme a unidade ativa.

## Glossario Essencial
- `OS`: Ordem de Servico
- `SS`: Solicitacao de Servico
- `Ativo`: equipamento, maquina ou bem manutivel
- `Unidade`: filial, fabrica ou local fisico
- `RAF`: Relatorio de Analise de Falha
- `GEP`: Gestao de Variaveis de Processo
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
- `GEP`: Funcionando
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

### Estrutura padrao de um modal

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

      <ModalSection title="Secao 2" defaultOpen={false}>
        {/* campos */}
      </ModalSection>
    </div>

    <div className="flex justify-end gap-3 px-4 py-4 border-t border-border">
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button type="submit">Salvar</Button>
    </div>
  </form>
</Modal>
```

### Regras de Modais
- **NAO** crie modais com div manual (`fixed inset-0`); use sempre `<Modal>`
- **NAO** adicione `overflow-y-auto` ou `max-h-[75vh]` nos children; o Modal ja controla o scroll
- **NAO** duplique o botao de fechar (X); o header do Modal ja inclui
- **NAO** use `size="full"` com layout A4 customizado; use `size="wide"` com `ModalSection`
- **NAO** use `border-on-surface-variant/10` nos footers; use `border-border`
- Agrupe campos em `<ModalSection>` com titulos descritivos
- Labels: `text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1`
- Inputs: `w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring`
- Grid: `grid grid-cols-2 md:grid-cols-3 gap-3`
- Footer: `flex justify-end gap-3 px-4 py-4 border-t border-border`
- Botoes: Cancelar (outline) a esquerda, Salvar (primary) a direita

### Excecoes
- Ativos (Criar/Editar/Detalhe): usam modo `inPage` como painel lateral na arvore
- Modais de confirmacao (`ConfirmationModal`): usam `size="sm"` sem ModalSection

## Diretrizes de Implementacao
- Sempre alinhar novas features com `docs/spec.md`.
- Quando houver divergencia entre implementacao e spec funcional, priorizar a spec e registrar o gap.
- Antes de criar fluxo novo, verificar perfil, escopo por empresa/unidade, status envolvidos e criterio de aceite.
- Em listas, considerar sempre busca, filtros, estado vazio, loading, responsividade e permissao.
- Em formularios, garantir validacoes de negocio e status inicial correto.
