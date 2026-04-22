# CMM Gestor de Manutencao - Spec Completa

## Referencia
- Repositorio GitHub: https://github.com/portalafsolucoes/portalafsolucoes
- Produto: Portal AF Solucoes - Plataforma multiempresa e multiunidade com 3 produtos: CMMS (Gestao de Manutencao - ativo), GVP (Gestao de Variaveis de Processo - em breve), GPA (Gestao de Portaria e Acesso - em breve)
- Localizacao oficial da spec funcional: `docs/SPEC.md`
- Referencia canonica de seguranca, hardening e readiness de producao: `docs/SEGURANCA.md`
- Este arquivo e a referencia funcional para o sistema; `CLAUDE.md` na raiz ficou restrito a stack, comandos, convencoes e regras operacionais
- Versao funcional atual: `1.0`
- Data da especificacao: `09/04/2026`

## Disciplina de Implementacao e Documentacao
- Antes de implementar qualquer funcionalidade, localizar a secao relevante desta spec e usar essa secao como contrato funcional
- Preferir prompts orientados por spec, por exemplo: `Leia a secao de Localizacoes em docs/SPEC.md e implemente conforme a spec`
- Mudancas de regra de negocio, fluxo funcional, permissoes, navegacao ou comportamento de modulo devem atualizar este arquivo no mesmo ciclo da implementacao
- Ao finalizar uma entrega, registrar aqui o que ficou implementado, mudancas de comportamento relevantes e eventuais gaps conhecidos
- Mudancas de autenticacao, sessao, permissao, upload sensivel, exportacao, logs de seguranca, segredos ou criterio de liberacao devem atualizar `docs/SEGURANCA.md`
- Mudancas de UI que alterem padrao reutilizavel devem atualizar `.claude/rules/components.md`
- Mudancas de API, server action ou contrato backend devem atualizar `.claude/rules/api.md`
- Mudancas de convencao geral do projeto devem atualizar `CLAUDE.md` e, quando forem compartilhadas por agentes, tambem `CONVENTIONS.md`

## Regras de Produto

### Multiempresa e Multiunidade
- Cada empresa possui dados isolados
- Usuarios de uma empresa nunca devem acessar dados de outra
- Dentro de cada empresa, os dados sao organizados por unidade
- A maior parte das listagens e metricas deve ser filtrada pela unidade ativa
- Apenas `SUPER_ADMIN` e `ADMIN` podem trocar de unidade, e somente se tiverem acesso a mais de uma

### Perfis de Usuario
O sistema possui 6 perfis:
- `SUPER_ADMIN`
- `ADMIN`
- `TECHNICIAN`
- `LIMITED_TECHNICIAN`
- `REQUESTER`
- `VIEW_ONLY`

### Resumo de Permissoes
- `SUPER_ADMIN`: **staff Portal AF Solucoes** (fornecedor do SaaS). `companyId = NULL` no banco (`''` na sessao). Opera cross-tenant: cadastra empresas, habilita produtos/modulos, gerencia staff Portal AF, da suporte. NAO opera telas CMMS de uma empresa sem selecionar um tenant.
- `ADMIN`: **administrador da empresa cliente**. `companyId` obrigatorio; tem acesso automatico a TODAS as unidades (Location raiz) da sua empresa via `UserUnit`. Responsavel por cadastrar as demais pessoas de cada unidade da empresa. Gerencia a operacao, aprova solicitacoes, acompanha indicadores e mantem cadastros operacionais. **Nao acessa** o painel do portal (`/admin/portal`) nem pode criar/atribuir `SUPER_ADMIN`.

**Invariante de criacao de empresa**: `POST /api/admin/companies` (apenas `SUPER_ADMIN`) cria obrigatoriamente o primeiro usuario da empresa com `role = ADMIN`. Esse usuario ja nasce vinculado a unidade principal via `UserUnit` e a criacao futura de novas unidades propaga automaticamente esse vinculo para todos os ADMINs da empresa.
- `TECHNICIAN`: executa OS atribuidas, pode abrir solicitacoes e consultar itens necessarios ao trabalho
- `LIMITED_TECHNICIAN`: atua de forma operacional mais restrita, focado em OS atribuidas e abertura basica de solicitacoes
- `REQUESTER`: abre solicitacoes e acompanha apenas suas demandas
- `VIEW_ONLY`: possui acesso somente leitura aos modulos permitidos, sem criar, editar, aprovar ou excluir

### Tabela de Acesso por Tipo de Usuario
A sidebar deve ser filtrada por perfil e tambem pelos modulos habilitados da empresa. Todos os perfis tambem devem ver `Voltar ao Portal`.

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
- `TECHNICIAN` e `LIMITED_TECHNICIAN` nao devem ver `Dashboard`; a entrada no CMMS deve levar direto para `Ordens de Servico`
- `Solicitacoes (SS)` e `Aprovacoes` sao exibidos como sub-itens de um agrupador `Solicitacoes de Servico` na sidebar; o agrupador apenas expande e nao navega por conta propria
- `Aprovacoes` deve aparecer apenas para `SUPER_ADMIN` e `ADMIN`
- `RAF` deve aparecer para `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN` e `LIMITED_TECHNICIAN`; `TECHNICIAN` e `LIMITED_TECHNICIAN` podem ver, criar e editar RAFs mas nao excluir
- `Configuracoes` deve aparecer apenas para `SUPER_ADMIN`
- Mesmo quando a UI exibe um item, a API deve validar perfil, empresa e unidade ativa

### Boas Praticas de Implementacao com Impacto Funcional
- O sistema deve trabalhar com papeis canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER` e `VIEW_ONLY`
- Em telas, filtros, badges, detalhes e formularios de `Pessoas`, o campo `papel` representa exclusivamente o perfil de acesso do sistema; o campo `cargo` representa exclusivamente a funcao profissional da pessoa, por exemplo `Mecanico`, `Eletricista`, `Engenheiro` ou `Supervisor`
- Se o banco ou legado ainda possuir perfis antigos (`GESTOR`, `PLANEJADOR`, `MECANICO`, `ELETRICISTA`, `CONSTRUTOR_CIVIL`, `OPERADOR`), a aplicacao deve normalizar esses valores para os papeis canonicos antes de decidir sidebar, redirects, badges e permissoes
- A borda de compatibilidade legado->canonico esta em `src/lib/user-roles.ts`. Os helpers `isAdminRole`, `isApproverRole`, `normalizeUserRole`, `getRoleDisplayName` devem ser reutilizados em toda nova checagem; nao reimplementar logica de papel localmente
- Papeis legados armazenados no banco sao aceitos pelo sistema, porem toda decisao de acesso deve usar o papel canonico derivado da sessao (`session.canonicalRole`)
- A normalizacao de papel deve considerar contexto confiavel do usuario, como `email`, `username`, `jobTitle` e papel canonico de sessao; nao deve depender apenas do valor legado bruto
- A UI e a API devem usar a mesma regra central de permissao. Nao e permitido manter matriz de acesso diferente entre frontend e backend
- O endpoint `/api/auth/me` e a leitura de modulos da empresa devem ser tratados como dados dinamicos de sessao, sem cache compartilhado entre usuarios
- Login, logout e troca de contexto autenticado devem invalidar ou limpar cache de autenticacao e de modulos habilitados no cliente
- Chaves de cache no cliente que dependem do usuario devem considerar ao menos empresa e contexto autenticado para evitar vazamento visual de sessao anterior
- O retorno de autenticacao para a UI deve expor o papel canonico como `role`. Se necessario, o papel legado pode ser exposto apenas como apoio tecnico, por exemplo em `legacyRole`
- Redirects padrao do CMMS devem respeitar o perfil: perfis operacionais entram por `Ordens de Servico`; os demais entram por `Dashboard`
- Esconder item de menu nao substitui seguranca. Toda rota de pagina e toda API devem validar permissao de leitura ou escrita no servidor
- Quando um perfil nao tiver acesso a uma pagina, o sistema deve redirecionar para o destino padrao permitido do perfil, e nao deixar a tela quebrada ou parcialmente carregada
- Validacoes de permissao devem sempre considerar `perfil + empresa + unidade ativa`
- Mudancas em autenticacao, sidebar, redirects ou permissoes devem ser verificadas com teste navegando no sistema com Playwright, usando pelo menos um login por perfil impactado

### Regras Transversais
- Menus, botoes e acoes devem respeitar perfil do usuario e tambem ser validados nas APIs
- Todas as listas principais devem ter busca e filtros
- A busca deve usar debounce de `500ms`
- O sistema deve ser responsivo em desktop, tablet e celular (ver secao "Responsividade" abaixo)
- Paginas devem exibir estado de carregamento com skeletons
- Uploads de arquivos e imagens devem usar Cloudinary
- OS preventivas podem ser geradas automaticamente por agendamento/cron

### Padrao Visual UI (Design System aprovado)
- **Sidebar**: fundo escuro `#1e2329`, item ativo com borda esquerda laranja `border-l-4 border-accent-orange`, icone ativo em laranja, badge de notificacao em laranja
- **Logo da empresa na sidebar**: deve preservar as cores originais do arquivo configurado, sem filtros CSS que invertam ou branqueiem a imagem
- **Cor de destaque (accent)**: laranja `#f97316` — usado no botao "Adicionar", hover de linhas de tabela, icone de unidade, sort ativo
- **Botao primario**: `bg-gray-900 text-white hover:bg-gray-800` — escuro em todos os formularios e footers de painel
- **Botao Adicionar (listagens)**: `bg-accent-orange text-white font-bold shadow-md hover:bg-accent-orange/90`
- **Header/footer de paineis laterais**: `bg-gray-50 border-gray-200` — cinza suave, nunca fundo branco puro
- **Barras de secao dentro de paineis**: `bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm`, titulo `font-bold text-[12px] uppercase tracking-wider text-gray-900`
- **Hierarquia tipografica em paineis**: titulo do painel `font-black` > label de campo `font-bold uppercase text-[11px] text-gray-500` > valor `font-medium text-[13px] text-gray-900`
- **Inputs em formularios**: `border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-gray-900`
- **Tabelas**: linhas zebradas `odd:bg-gray-50 even:bg-white`, hover `hover:bg-accent-orange-light`, header `bg-secondary`
- **Close button de painel**: `flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors` — icone `close` com `text-xl`; centralizar via `flex` explicitamente, nao depender so de padding
- **Botoes de acao no painel de detalhe**: sempre empilhados verticalmente (`space-y-2`), nunca lado a lado; Editar (`bg-gray-900 text-white hover:bg-gray-800`) em cima, Excluir (`bg-danger text-white hover:bg-danger/90`) embaixo; ambos `w-full`; texto generico — nunca incluir nome da entidade; usar componente `<PanelActionButtons>` de `@/components/ui/PanelActionButtons`
- **Secoes colapsaveis em paineis**: chevron inline no cabecalho cinza (`bg-gray-100 border border-gray-200`); proibido wrapper `bg-white` em volta do chevron; referencia: `ModalSection.tsx` e `AssetEditPanel.tsx`
- Referencia canonica de implementacao de painel de detalhe: `AssetDetailPanel.tsx`

## Modulos do Sistema

### 1. Hub
- Pagina inicial apos login
- Exibe os produtos disponiveis por empresa com seus respectivos status
- **CMMS** (Gestao de Manutencao): `ACTIVE` — rota `/dashboard` (ou `/work-orders` para perfis operacionais)
- **GVP** (Gestao de Variaveis de Processo): `COMING_SOON` — rota futura `/gvp`
- **GPA** (Gestao de Portaria e Acesso): `COMING_SOON` — rota futura `/portaria`
- Produtos nao habilitados para a empresa aparecem como "Em breve" e nao sao acessiveis
- Spec completa de produtos em `docs/PRODUTOS.md`

### 2. Login e Autenticacao
- Login por email e senha
- Nao existe cadastro publico
- Apenas administradores criam usuarios
- Usuario desativado nao pode acessar
- O sistema nunca deve exibir senha em tabelas, detalhes, formularios de edicao, exports ou respostas de API
- Nenhum fluxo de cadastro/edicao pode aceitar senha no campo de email; email deve ser valido com dominio completo, por exemplo `nome@empresa.com`
- Email e senha nao podem ser iguais no cadastro ou na edicao de usuarios
- Apos login, o usuario vai para `/hub`
- Sessao dura `7 dias`
- A sessao deve carregar o papel canonico do usuario
- O sistema nao deve reaproveitar cache de `/api/auth/me` entre usuarios diferentes
- Login e logout devem limpar cache cliente relacionado a autenticacao e modulos da empresa
- A resposta de autenticacao para a UI deve refletir sempre o usuario atual da sessao, sem residuos do usuario anterior

### 3. Dashboard
- Dashboard operacional para `SUPER_ADMIN`, `ADMIN`, `REQUESTER` e `VIEW_ONLY`, respeitando o nivel de leitura de cada perfil
- Dashboard corporativo consolidado apenas para `SUPER_ADMIN`
- O dashboard corporativo deve reutilizar o mesmo cabecalho principal padronizado das paginas internas; apenas titulo, descricao e conteudo variam conforme o perfil
- Exibe resumo de OS, ativos e solicitacoes

### 4. Ordens de Servico (OS)
- Lista com busca, filtros por status e situacao
- Visualizacao em cartoes ou tabela
- Criacao, edicao, execucao, detalhe e exclusao conforme permissao
- Numero interno automatico no formato `MAN-XXXXXX`
- Pode existir numero externo do ERP/TOTVS
- Status principais: `Pendente`, `Liberada`, `Em Andamento`, `Parada`, `Concluida`, `Reprogramada`
- Execucao registra checklist, anotacoes, fotos antes/depois, tempos, custos, recursos e feedback
- Reprogramacao de OS atrasada via Programacao registra historico granular em `WorkOrderRescheduleHistory` (data anterior, nova data, status anterior, flag `wasOverdue`, motivo opcional, usuario, timestamp) e incrementa o contador `WorkOrder.rescheduleCount`
- A `dueDate` original e preservada como referencia do prazo planejado; a `rescheduledDate` reflete apenas a ultima nova data
- A listagem de OS exibe a coluna `Atraso Original` (mostra a `dueDate` original quando houve reprogramacao) e um badge `Reprogramada Nx` ao lado do status, sinalizando OSs que ja foram adiadas mesmo que estejam atualmente dentro do prazo
- O painel de detalhe da OS exibe a secao `Historico de Reprogramacao` com a lista cronologica das reprogramacoes registradas, sempre que `rescheduleCount > 0`

### 5. Solicitacoes de Servico (SS)
- Qualquer usuario logado pode abrir solicitacao
- Status iniciais: `Pendente`
- `SUPER_ADMIN` e `ADMIN` podem aprovar ou rejeitar
- Rejeicao exige motivo
- Aprovacao pode gerar OS atraves de um formulario guiado (`WorkOrderFormModal` em modo `inPage` no painel direito de `/requests`) pre-preenchido com `description`, `assetId`, `priority`, `dueDate` e `sourceRequestId` da SS; nao existe mais geracao "1-clique" silenciosa
- O painel de detalhe da SS deve exibir todos os campos do cadastro (incluindo `Bem`/ativo) e tambem os dados de execucao quando a OS vinculada ja foi finalizada (datas de inicio/fim, anotacoes, fotos antes/depois)
- A SS exige `Area de Manutencao` (obrigatoria, selecionada a partir de `Cadastros Basicos > Areas de Manutencao`); a area eh persistida em `Request.maintenanceAreaId` e herdada automaticamente pelo numero da RAF quando a SS gerar uma RAF direta
- A SS pode gerar uma RAF diretamente, sem precisar passar por OS, atraves do botao `Abrir RAF` no painel de detalhe; o botao so fica disponivel quando a SS esta `APPROVED` e ainda nao possui RAF vinculada
- O menu deve exibir badge de pendencias para perfis autorizados

### 6. Gestao de Ativos
- Listagem em arvore e em tabela
- Detalhes com linha do tempo, anexos, pecas, subativos e OS relacionadas
- Cadastro inclui tag unica por unidade, dados tecnicos, custos, GUT, contador, hierarquia e imagem
- Criticidade GUT = `Gravidade x Urgencia x Tendencia`
- Existe suporte a ativos padrao/template baseados em TOTVS
- A tela `/assets/standard` (Bens Padrao) segue o padrao split-panel: detalhe e formulario (criar/editar) abrem no painel direito no desktop; no mobile abrem como `<Modal>` overlay
- O componente `StandardAssetFormPanel` suporta prop `inPage` para renderizacao inline (painel) ou como modal
- Criar um Bem Padrao exige selecao de familia; familias que ja possuem Bem Padrao sao ocultadas no select de criacao

#### Relatorio Impresso do Historico do Bem (PDF)
- Acessado pelo botao Imprimir na aba Historico do painel de detalhe do ativo
- Permite selecionar periodo (data inicio / data fim), filtro de origem (Ambos, Somente OSs, Somente SSs) e formato (PDF ou XLSX)
- O PDF exibe secoes fixas do ativo (Identificacao, Localizacao e Hierarquia, Dados Tecnicos, Dados Financeiros, Garantia quando presentes) seguidas do historico de eventos
- Cada evento e renderizado como um card com: data/hora, tipo, usuario e titulo
- Eventos vinculados a OS exibem bloco de detalhes completo: numero da OS (`MAN-XXXXXX`), tipo de manutencao, tipo de servico, area de manutencao, plano de manutencao, datas de criacao e finalizacao, lista de recursos aplicados (nome, quantidade, horas), observacoes de execucao e bloco de custos (mao de obra, pecas, terceiros, ferramentas e total)
- Eventos vinculados a SS exibem bloco de detalhes: numero da SS, status, solicitante, area de manutencao, data de criacao, descricao da falha, motivo de rejeicao (quando rejeitada) e RAF vinculada (quando existente)
- Os detalhes sao carregados via `GET /api/assets/[id]/history?include=details` — parametro exclusivo do PDF; o timeline interativo e a exportacao XLSX continuam sem este parametro
- `print:break-inside-avoid` garante que cada card de evento nao seja cortado entre paginas na impressao
- Componente: `src/components/assets/AssetHistoryPrintView.tsx`; tipos: `src/types/assetHistory.ts`

### 7. Localizacoes
- Estrutura hierarquica de unidades e locais fisicos
- Localizacoes raiz sao tratadas como unidades
- Dados do sistema devem refletir a unidade ativa

### 8. Pessoas e Equipes
- Gestao de usuarios por `SUPER_ADMIN` e `ADMIN` (acesso completo: `view/create/edit/delete`)
- `PLANEJADOR` tambem cadastra pessoas, porem restrito: pode criar e editar apenas usuarios com papel `PLANEJADOR` ou `MANUTENTOR`, sem poder excluir. Nunca pode criar ou promover ninguem a `ADMIN`/`SUPER_ADMIN`; a API `/api/users` (POST/PUT) bloqueia com `403` qualquer tentativa e o modal de pessoa oculta papeis acima do proprio perfil
- Equipes agrupam tecnicos para atribuicao de OS e ativos
- Usuarios podem ter multiplas unidades de acesso
- Rotas autenticadas de listagem, detalhe e formulario devem expor o titulo principal no cabecalho padronizado da pagina, mantendo consistencia visual entre perfis e modulos
- A tela de `Pessoas` oferece apenas visualizacao em `Tabela` e `Grade`; a visualizacao em arvore nao faz parte deste modulo
- Formularios de pessoa devem exigir email valido com dominio completo e nunca reapresentar senha salva; no modo de edicao, o campo de senha deve permanecer vazio e opcional
- O modal de pessoa, em criacao e edicao, deve permitir alterar todos os campos operacionais expostos no modulo: nome, sobrenome, email, senha, telefone, cargo, papel, taxa/hora, localizacao principal, calendario, unidades de acesso e status
- O campo `Cargo` no modal de pessoa deve ser selecionado a partir do cadastro `Cadastros Basicos > Cargos`; o sistema deve salvar o vinculo estruturado do cargo no banco e refletir o nome do cargo na ficha da pessoa
- A coluna `Cargo` da listagem de pessoas deve exibir `jobTitle` e nunca o perfil de acesso; a coluna `Papel` deve exibir o papel canonico do produto, mesmo quando o registro de origem vier de valor legado

### 9. Planos de Manutencao
- Planos padrao por familia de ativos
- Planos especificos por ativo
- Planos possuem tarefas, passos e recursos
- Planos ativos devem gerar OS automaticamente quando vencidos

### 10. Planejamento
- Gera OS preventivas em lote por periodo e filtros
- Programacao agenda OS em um periodo e confirma datas planejadas

#### 10.1 Programacao (Workspace)
- Quadrante Q1 (`OSs Disponiveis`) possui barra de filtros colapsavel com:
  - Plano de Manutencao (multi), Tipo de Servico (multi), Tipo de Manutencao (multi), Area de Manutencao (multi), Centro de Trabalho (multi), Periodo (data inicio / data fim)
  - `Tipo de Manutencao` e derivado indiretamente via `WorkOrder.serviceType.maintenanceTypeId`; `Centro de Trabalho` via `WorkOrder.asset.workCenterId`
  - O filtro de `Periodo` afeta apenas a disponibilizacao do Q1 (nao altera metadados da programacao nem os quadrantes Q2/Q3/Q4)
  - Sem datas no filtro, o periodo efetivo e o da programacao em edicao
- Regra de OS atrasada:
  - OS em programacao `CONFIRMED`/`PARTIALLY_EXECUTED` cuja `scheduledDate < hoje` e que ainda nao foi executada aparece em Q1 com badge "Atrasada — Prog. #N"
  - Ao adicionar uma OS atrasada em uma nova programacao `DRAFT`, o item antigo e marcado como `MOVED` (preserva historico) e o status da programacao antiga e recomputado
  - Ao remover uma OS ainda em `DRAFT` (ou excluir o rascunho inteiro), o item antigo marcado como `MOVED` e revertido para `PENDING` e o status da programacao antiga e recomputado
- Estados da programacao (`WorkOrderSchedule.status`):
  - `DRAFT` rascunho editavel
  - `REPROGRAMMING` programacao confirmada reaberta para edicao
  - `CONFIRMED` confirmada e em execucao
  - `PARTIALLY_EXECUTED` parte dos itens foi executada ou movida, ainda restam itens ativos
  - `COMPLETED` todos os itens foram executados ou movidos
- Estados dos itens (`WorkOrderScheduleItem.status`):
  - `PENDING` em rascunho
  - `RELEASED` liberado pela confirmacao
  - `EXECUTED` OS finalizada (setado automaticamente ao finalizar a OS)
  - `MOVED` OS foi reprogramada em outra programacao (preserva historico)
- Recomputo automatico: toda finalizacao de OS marca os itens ativos correspondentes como `EXECUTED` e recomputa o status da(s) programacao(oes) afetada(s); o mesmo ocorre apos movimentacao ou reversao de itens

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
- Cargos
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

Interacao:
- Desktop: layout split-panel com tabela a esquerda e painel lateral a direita
- Clicar em linha abre painel de detalhe; do detalhe, Editar abre formulario no mesmo painel
- Adicionar abre formulario de criacao no painel lateral
- Mobile: modais overlay para detalhe, edicao e criacao
- Exclusao via dialogo de confirmacao overlay
- Tabela sem coluna de acoes; acoes ficam no painel de detalhe

### 12. Criticidade de Ativos
- Classificacao por metodo GUT
- Faixa de resultado de `1` a `125`
- A listagem mostra, por ativo, os contadores de SS abertas (`PENDING`/`APPROVED`), OS abertas (`PENDING`/`RELEASED`/`IN_PROGRESS`/`ON_HOLD`) e RAFs vinculadas; o painel de detalhe expoe drilldown navegando o mesmo recorte
- O painel de detalhe possui abas `Visao Geral`, `SS abertas`, `OS abertas` e `RAF` — as tres ultimas so aparecem para perfis com permissao de `view` na respectiva feature (`requests`, `work-orders`, `rafs`); `REQUESTER` e `VIEW_ONLY` continuam sem acesso a `/criticality`
- As listas de drilldown sao ordenadas por prazo ascendente (`dueDate` asc, NULLs ao final, depois `createdAt` asc); RAFs sao ordenadas por `occurrenceDate` desc
- Cada linha do drilldown permite impressao individual e selecao via checkbox; o toolbar do drilldown expoe `Selecionar todos` + `Imprimir selecionados (N)` para gerar PDF unico com varias paginas (uma por registro, usando `print:break-after-page`)
- A selecao de cada aba e resetada sempre que o ativo ativo muda
- A busca de RAFs do ativo combina FK (`WorkOrder.assetId` e `Request.assetId`) e fallback legado por nome exato do ativo (`FailureAnalysisReport.equipment` sem FK) — RAFs sem vinculo via nome recebem `originKind = 'legacy_name_match'` no retorno da API

### 13. RAF
- Modulo de analise de falha com `5 Porques`, testes de hipotese e plano de acao
- Acesso para `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN` e `LIMITED_TECHNICIAN`; somente `SUPER_ADMIN` e `ADMIN` podem excluir RAFs
- Numero do RAF deve ser unico
- A RAF pode nascer a partir de uma OS (vinculo via `workOrderId`) ou diretamente a partir de uma SS aprovada (vinculo via `requestId`); os dois caminhos sao mutuamente exclusivos por registro
- Quando a RAF e gerada via SS, o sistema usa a rota `POST /api/requests/[id]/generate-raf`; a SS continua com status `APPROVED` apos a geracao e o vinculo SS<->RAF e exibido no painel de detalhe da SS e na propria tela de RAFs
- O numero da RAF e gerado automaticamente no formato `RAF-{tag|protheusCode do ativo}-{code da area}-{seq}`; quando a origem e a SS, a `area` eh **herdada de `Request.maintenanceAreaId`** (obrigatorio na SS) e o `equipment` vem do ativo da SS. Quando o ativo nao possuir `tag`, o helper faz fallback para `protheusCode` para compor o numero
- A listagem de RAFs deve tolerar registros sem OS, exibindo a coluna `Origem` com badge `OS` ou `SS` conforme o vinculo, e usar o ativo e a area da SS como fallback nos campos derivados quando a OS nao existir. A coluna `Cod. Bem` exibe `asset.tag` com fallback para `asset.protheusCode`
- Criacao e edicao pela tela devem persistir com sucesso no contexto da empresa ativa, sem falhar por campos tecnicos de auditoria
- Cada item do `actionPlan` possui `responsibleUserId` e `responsibleName` persistidos; a selecao de responsavel e feita via dropdown `ResponsibleSelect` nos modais `RAFFormModal`, `RAFEditModal` e visualizacao somente-leitura no `RAFViewModal`. O dropdown lista usuarios com papel `ADMIN`, `TECHNICIAN` ou `LIMITED_TECHNICIAN` (incluindo papeis legados equivalentes) e sinaliza `(inativo)` quando o usuario nao esta com `status = ACTIVE`
- O status da RAF (`ABERTA` ou `FINALIZADA`) e **derivado no servidor** via helper `recalculateRafStatus` (em `src/lib/rafs/recalculateStatus.ts`) sempre que o `actionPlan` e alterado. A RAF passa automaticamente para `FINALIZADA` quando todos os itens do plano estao `COMPLETED` (nao-vazio) e volta para `ABERTA` se algum item deixa de estar concluido. O cliente NAO pode enviar `status`, `finalizedAt` ou `finalizedById` no payload — a API `PUT /api/rafs/[id]` remove esses campos antes do update

### 13.1 PA das RAFs (Plano de Acao consolidado)
- Rota `/rafs/action-plan`, exclusiva dos perfis com `view` em `rafs` (`SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`)
- Acessivel no menu lateral atraves do grupo expansivel `Analise de Falhas`, que agrupa os sub-itens `RAFs` (`/rafs`) e `PA das RAFs` (`/rafs/action-plan`)
- A tela consolida **todas as acoes** de todas as RAFs do escopo empresa+unidade em uma unica tabela (uma linha por acao)
- Dashboard com 4 KPIs no topo: `RAFs abertas`, `RAFs finalizadas`, `Acoes no prazo`, `Acoes atrasadas`
- `Acoes atrasadas` = `actionPlan[i].status != COMPLETED && deadline < hoje` (parser aceita ISO e `dd/mm/yyyy`); acoes sem prazo sao contadas como `no prazo` para nao inflar urgencia visual
- Filtros disponiveis: busca livre (RAF, acao, responsavel), status da acao (`Pendente`, `Em andamento`, `Concluida`, `Atrasadas`), status da RAF (`Abertas`, `Finalizadas`), responsavel (lista derivada dos dados carregados, incluindo opcao "Sem responsavel")
- Colunas: RAF (link para o detalhe), Acao, Responsavel, Data criacao (da RAF), Data ocorrencia, Prazo, OS, SS, Status da acao, Status da RAF
- O status da acao pode ser editado **inline** pelos perfis com permissao de `edit` ou `create` em `rafs` (`SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`); a alteracao dispara `PUT /api/rafs/[id]` com o `actionPlan` atualizado e a API recalcula `status`/`finalizedAt` server-side
- O painel lateral direito abre o `RAFViewModal` inline quando o usuario clica no numero da RAF
- Mobile exibe cards empilhados (isPhone) com os campos principais e seletor de status em linha
- Exportacao para Excel (`.xlsx`) via `ExportButton` com config `action-plan-items` — uma linha por acao, colunas: RAF, Acao, Responsavel, Data criacao, Data ocorrencia, Prazo, OS, Status OS, SS, Status SS, Status da acao, Status da RAF
- Os 4 KPIs sao fornecidos pelo endpoint `GET /api/rafs/action-plan/stats` (respeita `companyId` e `unitId` via `requireCompanyScope`); a pagina usa a fonte canonica do endpoint e uma derivacao local como fallback imediato
- Paleta monocromatica: pretos, brancos e tons de cinza. `OVERDUE` recebe borda preta em negrito e simbolo `●`; `COMPLETED` recebe fundo preto com simbolo `✓`; `IN_PROGRESS` usa cinza medio com `◐`; `PENDING` usa fundo branco com `○`

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
- Taxa de Reprogramacao
- Custo por ativo
- Reducao de custo

Regras:
- Filtro por periodo
- Valores monetarios formatados em `R$`
- `Taxa de Reprogramacao` mede o percentual de OSs que foram reprogramadas pelo menos uma vez (`rescheduleCount > 0`) sobre o total de OSs no periodo; meta de referencia abaixo de 10%
- `Taxa de Reprogramacao` e independente do PMC: o PMC continua medindo cumprimento do plano sem penalizar reprogramacao, e a Taxa de Reprogramacao expoe separadamente a frequencia de adiamentos

### 15. Painel Administrativo
- Exclusivo do `SUPER_ADMIN`
- Gestao global de empresas, modulos, unidades e usuarios
- Criacao de empresa ja deve criar o primeiro usuario admin
- A acao `Modulos` da Administracao do Portal deve habilitar/desabilitar os modulos por empresa e refletir na navegacao real do sistema
- Os icones dos modulos no modal e nas APIs devem seguir o padrao `Material Symbols`, igual ao restante da interface

### 16. Perfil do Usuario
- Tela somente leitura
- Usuario visualiza seus dados, perfil, empresa e permissoes

### 16.1 Configuracoes do Usuario
- O menu do usuario em `Configuracoes` deve exibir apenas as abas `Perfil` e `Seguranca`
- **NAO** manter abas `Preferencias` ou `Empresa` nesse fluxo por enquanto
- A aba `Perfil` deve permitir salvar nome, sobrenome, email, telefone, cargo e localizacao principal sem falhar por campos tecnicos internos que nao fazem parte do formulario
- A localizacao principal salva em `Configuracoes > Perfil` deve pertencer a empresa ativa

### 17. Pecas e Estoque
- Modulo atualmente desativado
- A pagina deve redirecionar para OS
- Futuro: pecas sobressalentes, estoque e uso em OS

### 18. Arvore Hierarquica
- Navegacao visual da estrutura completa de ativos

### 19. Relatorios e Analiticos
- Modulo em desenvolvimento
- Funcionalidades previstas: OS por status, tempo medio de conclusao, custos e ativos por status

### 20. Integracao com TOTVS/Protheus
- Importacao e exportacao de dados
- Campos integrados costumam usar prefixo `protheusCode`

### 21. Exportacao de Dados
- Exportacao para Excel (`.xlsx`) de OS, ativos, solicitacoes, usuarios e RAFs

### 22. Upload de Arquivos
- Upload com arrastar e soltar, validacao, pre-visualizacao e limite de quantidade
- Uso em OS, solicitacoes, ativos e fotos de execucao

### 23. Notificacoes
- Badge de pendencias
- Historico de notificacoes com status de leitura

### 24. Troca de Unidade
- Seletor no cabecalho
- Atualiza os dados da interface conforme a unidade ativa

## Estrutura de Dados e Relacionamentos
- `Company` e o limite maximo de isolamento; nenhuma consulta ou navegacao pode atravessar empresas
- `Unit` e o contexto operacional ativo da empresa; a maior parte das telas, listas e metricas deve ser filtrada pela unidade ativa
- `User` pertence a uma empresa, pode acessar multiplas unidades e sempre opera com um papel canonico de produto
- `Module` e habilitado por empresa via relacao `CompanyModule`; a navegacao real depende de `perfil + modulos habilitados`
- `Location` e hierarquica; localizacoes raiz representam unidades e os demais locais ficam abaixo delas
- `Asset` e hierarquico, pode ter subativos, anexos, pecas, OS relacionadas, solicitacoes relacionadas, contador, criticidade GUT e imagem
- `Team` agrupa tecnicos para atribuicao de ativos e ordens de servico
- `Request` nasce como solicitacao, comeca em `Pendente`, pode ser aprovada ou rejeitada e, quando aprovada, pode gerar uma `WorkOrder` ou uma `FailureAnalysisReport` (RAF) diretamente
- `WorkOrder` recebe numero interno `MAN-XXXXXX`, pode guardar numero externo do ERP/TOTVS e suporta checklist, tempos, custos, recursos, anexos e fotos antes/depois
- `MaintenancePlan` pode ser padrao por familia de ativos ou especifico por ativo; planos ativos geram OS automaticamente quando vencidos
- `RAF` (`FailureAnalysisReport`) e um registro de analise de falha com numero unico e plano de acao; pode estar vinculada a uma `WorkOrder` (`workOrderId`) ou diretamente a uma `Request` (`requestId`), sendo os dois vinculos mutuamente exclusivos por registro
- `Notification` precisa suportar badge de pendencias e historico de leitura
- Uploads de arquivos e imagens devem ser armazenados via Cloudinary e associados a OS, solicitacoes, ativos e execucao
- Campos de integracao com TOTVS/Protheus tendem a usar prefixo `protheusCode`
- Ativos devem ter `tag` unica por unidade

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

## Responsividade

Implementado em 2026-04-11. O sistema suporta tres faixas de viewport com comportamentos distintos.

### Breakpoints

| Faixa | Viewport | Sidebar | Detalhe / Paineis | Tabelas |
|-------|----------|---------|-------------------|---------|
| Phone (< 768px) | Celular | Drawer temporario (abre por hamburguer no header) | Overlay fullscreen | Scroll horizontal |
| Compact (768–1279px) | Tablet / Desktop compacto | Drawer temporario | Overlay sheet lateral (slide-in direita, max-w-2xl) | Colunas reduzidas |
| Wide (>= 1280px) | Desktop amplo | Permanente, colapsavel (64px / 256px) | InPage split-panel 50/50 | Todas as colunas |

### Componentes e Hooks

- **`useResponsiveLayout()`** em `src/hooks/useMediaQuery.ts`: hook unificado que retorna `{ isPhone, isCompact, isWide }`. Substitui os hooks deprecados `useIsMobile`, `useIsDesktop`, `useIsTablet`.
- **`AdaptiveSplitPanel`** em `src/components/layout/AdaptiveSplitPanel.tsx`: encapsula a logica de split-panel x overlay. Todas as 17 paginas de listagem usam este componente.
- **`Modal`** em `src/components/ui/Modal.tsx`: renderiza em 3 modos automaticamente conforme o viewport (fullscreen / sheet lateral / modal centralizado).
- **`SidebarContext`**: expoe `mobileMenuOpen` / `setMobileMenuOpen` para o `Header` controlar o hamburguer em < 1280px.

### Regras de Comportamento

- Split-panel (50/50) e exclusivo de `isWide` (>= 1280px). Abaixo disso, o painel de detalhe/edicao/criacao sempre abre como overlay Modal.
- Sidebar so e permanente em `>= 1280px`. Em faixas menores, o botao hamburguer no `Header` abre o drawer.
- Formularios usam `grid grid-cols-1 sm:grid-cols-2`; nunca `grid-cols-2` sem fallback mobile.
- Campos de busca usam `w-full sm:w-48 xl:w-64`.
- Botoes de acao em paineis tem `min-h-[44px]` para touch targets industriais.
- Texto de botoes primarios usa `hidden sm:inline` para mostrar apenas icone no phone.

### Paginas Especificas

- `/tree`: usa `AdaptiveSplitPanel`; no compact/phone a arvore ocupa a tela inteira e o painel de detalhe do ativo abre como overlay.
- `/kpi`: graficos Recharts redimensionam via `ResponsiveContainer`; filtros de data usam `w-full sm:w-auto`.
- `/dashboard`, `/hub`, `/login`, `/profile`: ja eram responsivos; nenhuma mudanca.

## Estrutura do Projeto (Contexto Tecnico Herdado)
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
