# CMM Gestor de Manutencao - Spec Completa

## Referencia
- Repositorio GitHub: https://github.com/portalafsolucoes/portalafsolucoes
- Produto: Portal AF Solucoes - Gestao de Manutencao (CMMS), multiempresa e multiunidade, com foco em controle operacional, planejamento, execucao e analise da manutencao
- Localizacao oficial da spec funcional: `docs/SPEC.md`
- Este arquivo e a referencia funcional para o sistema; `CLAUDE.md` na raiz ficou restrito a stack, comandos, convencoes e regras operacionais
- Versao funcional atual: `1.0`
- Data da especificacao: `09/04/2026`

## Disciplina de Implementacao e Documentacao
- Antes de implementar qualquer funcionalidade, localizar a secao relevante desta spec e usar essa secao como contrato funcional
- Preferir prompts orientados por spec, por exemplo: `Leia a secao de Localizacoes em docs/SPEC.md e implemente conforme a spec`
- Mudancas de regra de negocio, fluxo funcional, permissoes, navegacao ou comportamento de modulo devem atualizar este arquivo no mesmo ciclo da implementacao
- Ao finalizar uma entrega, registrar aqui o que ficou implementado, mudancas de comportamento relevantes e eventuais gaps conhecidos
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
- `SUPER_ADMIN`: controle total do sistema, empresas, usuarios, unidades e dashboard corporativo
- `ADMIN`: gerencia a operacao da propria empresa/unidade, aprova solicitacoes, acompanha indicadores e gerencia cadastros operacionais
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
- `Aprovacoes` deve aparecer apenas para `SUPER_ADMIN` e `ADMIN`
- `RAF` deve aparecer apenas para `SUPER_ADMIN` e `ADMIN`
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
- O sistema deve ser responsivo em desktop, tablet e celular
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
- **Close button de painel**: `p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm`
- Referencia canonica de implementacao: `PersonDetailModal.tsx` e `PersonFormModal.tsx`

## Modulos do Sistema

### 1. Hub
- Pagina inicial apos login
- Exibe modulos disponiveis por empresa
- `CMMS` ativo; outros modulos externos ao CMMS podem aparecer como "Em breve" quando desabilitados

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
- Status principais: `Pendente`, `Liberada`, `Em Andamento`, `Parada`, `Concluida`
- Execucao registra checklist, anotacoes, fotos antes/depois, tempos, custos, recursos e feedback

### 5. Solicitacoes de Servico (SS)
- Qualquer usuario logado pode abrir solicitacao
- Status iniciais: `Pendente`
- `SUPER_ADMIN` e `ADMIN` podem aprovar ou rejeitar
- Rejeicao exige motivo
- Aprovacao pode gerar OS automaticamente
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

### 7. Localizacoes
- Estrutura hierarquica de unidades e locais fisicos
- Localizacoes raiz sao tratadas como unidades
- Dados do sistema devem refletir a unidade ativa

### 8. Pessoas e Equipes
- Gestao de usuarios por `SUPER_ADMIN` e `ADMIN`
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

### 13. RAF
- Modulo de analise de falha com `5 Porques`, testes de hipotese e plano de acao
- Acesso apenas para `SUPER_ADMIN` e `ADMIN`
- Numero do RAF deve ser unico
- Criacao e edicao pela tela devem persistir com sucesso no contexto da empresa ativa, sem falhar por campos tecnicos de auditoria

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
- Filtro por periodo
- Valores monetarios formatados em `R$`

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
- `Request` nasce como solicitacao, comeca em `Pendente`, pode ser aprovada ou rejeitada e, quando aprovada, pode gerar uma `WorkOrder`
- `WorkOrder` recebe numero interno `MAN-XXXXXX`, pode guardar numero externo do ERP/TOTVS e suporta checklist, tempos, custos, recursos, anexos e fotos antes/depois
- `MaintenancePlan` pode ser padrao por familia de ativos ou especifico por ativo; planos ativos geram OS automaticamente quando vencidos
- `RAF` e um registro de analise de falha com numero unico e plano de acao
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
