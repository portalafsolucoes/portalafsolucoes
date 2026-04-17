# CMM Gestor de Manutencao

## Projeto
- Produto: Portal AF Solucoes - Gestao de Manutencao (CMMS) multiempresa e multiunidade
- Repositorio: https://github.com/portalafsolucoes/portalafsolucoes
- Stack: Next.js 15 (App Router, React 19, TypeScript), PostgreSQL via Supabase + Prisma ORM, Tailwind CSS v4 + Shadcn/UI + Recharts, Zustand + React Query, Playwright, Vercel + Cloudinary
- Leia primeiro `CONVENTIONS.md` para o fluxo compartilhado entre Claude Code, Codex e GitHub Copilot
- Para spec completa do sistema, leia `docs/SPEC.md`
- Para autenticacao, sessao, permissao, hardening, go-live, upload sensivel, exportacao, logs e segredos, leia `docs/SEGURANCA.md`
- Para evidencias de QA, screenshots e relatorios de validacao, leia `docs/AUDITORIA.md`

## Comandos
- `npm run dev` - sobe o ambiente local em `http://localhost:3000`
- `npm run dev:turbo` - desenvolvimento local com Turbopack
- `npm run build` - `prisma generate && next build`
- `npm run start` - inicia a build de producao
- `npm run lint` - executa ESLint
- `npm run test` - executa os testes E2E com Playwright
- `npm run db:generate` - gera o client do Prisma
- `npm run db:push` - sincroniza o schema no banco
- `npm run db:studio` - abre o Prisma Studio
- `npm run deploy:hash` - gera hash de senha para deploy
- `npm run vercel:build` - build usada no deploy

## Convencoes Universais
- Usar TypeScript strict e imports absolutos com alias `@/`
- Componentes React, providers e tipos em `PascalCase`; hooks em `useCamelCase`; helpers, stores e funcoes em `camelCase`
- Preferir nomes funcionais e explicitos para rotas, modulos, actions e utilitarios
- Ordem de imports: React/Next, terceiros, alias `@/`, relativos por ultimo
- Preferir editar o arquivo seguindo o estilo local existente; neste repo o padrao dominante e aspas simples, sem ponto e virgula e indentacao de 2 espacos
- Roles canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY`
- `SUPER_ADMIN` = staff Portal AF Solucoes (cross-tenant, `companyId = NULL`). `ADMIN` = administrador da empresa cliente, com acesso automatico a TODAS as unidades daquela empresa. Criacao de empresa (`POST /api/admin/companies`) cria o usuario inicial como `ADMIN`, nunca `SUPER_ADMIN`.
- Toda regra dependente de contexto deve respeitar `perfil + empresa + unidade ativa`

## Regras Operacionais
- Fazer apenas o solicitado e preservar o comportamento atual fora do escopo
- Editar antes de reescrever; nao criar scripts, `README`s ou documentos extras sem necessidade explicita
- Manter a raiz do repositorio limpa: apenas arquivos estruturais, entrypoints e configuracoes podem ficar no topo
- Documentacao auxiliar, inventarios e notas operacionais devem ir para `docs/` em subpastas coerentes
- Screenshots, evidencias, relatorios de auditoria e artefatos de validacao devem ir para `auditoria/`
- Toda auditoria deve seguir a estrutura canonica de `docs/AUDITORIA.md`
- Nunca deixar arquivos soltos de documentacao ou auditoria na raiz
- Nunca salvar em `auditoria/` arquivos sensiveis ou temporarios como `storageState.json`, cookies de sessao, scripts temporarios, `error.log` ou dumps tecnicos sem curadoria
- Nao duplicar regra de negocio entre UI, API e banco; reutilizar a logica central de permissao
- Seguir a ordem de leitura definida em `CONVENTIONS.md` antes de implementar mudancas relevantes
- Sempre alinhar novas features com `docs/SPEC.md` e `.claude/rules/*.md`
- Toda mudanca finalizada deve atualizar a documentacao correspondente: regra funcional em `docs/SPEC.md`, padrao de UI em `.claude/rules/components.md`, contrato de API em `.claude/rules/api.md` e convencoes gerais neste `CLAUDE.md`
- Mudancas de autenticacao, sessao, autorizacao, isolamento multiempresa/unidade, uploads sensiveis, exportacoes, logs de erro, segredos, headers e readiness de producao devem atualizar `docs/SEGURANCA.md`
- Antes de criar fluxo novo, validar perfil, empresa/unidade, status envolvidos e criterio de aceite
- Em listas, sempre considerar busca, filtros, loading, estado vazio, responsividade e permissao
- Em formularios, garantir validacoes de negocio e status inicial correto
- Scripts e testes que geram screenshots ou auditorias visuais so podem rodar com autorizacao explicita via `ALLOW_SCREENSHOT_AUTOMATION=1`
- Mudancas em autenticacao, sidebar, redirects ou permissoes exigem verificacao com Playwright nos perfis impactados
- Rodar `lint`, `test` e/ou `build` conforme o impacto antes de concluir; se algo nao puder ser validado, declarar
- Em caso de divergencia, seguir `docs/SPEC.md` e `.claude/rules/*.md` e registrar o gap
- Se algum documento auxiliar estiver diferente da spec ou das rules, trata-lo como desatualizado ate ser sincronizado

## Deprecacao e Limpeza
- Quando um componente ou arquivo for substituido mas mantido temporariamente, registrar em `docs/DEPRECATIONS.md`
- Cada entrada deve conter: arquivo, motivo, substituto, data e condicao para remocao
- Antes de remover codigo deprecado, verificar que nenhum import depende dele
- Ao concluir migracoes, revisar `docs/DEPRECATIONS.md` e limpar entradas ja resolvidas
- Nao manter codigo morto sem registro; ou remove imediatamente ou documenta para remocao futura

## Tooling de IA
- `CONVENTIONS.md` e a referencia compartilhada entre agentes
- `AGENTS.md` e o ponto de entrada para Codex e agentes genericos
- `.github/copilot-instructions.md` e o ponto de entrada para GitHub Copilot
- `docs/AI_SETUP.md` define o inventario canonico de MCPs e skills sem armazenar segredos no repositorio
- `docs/AUDITORIA.md` define a estrutura, nomenclatura, retencao e proibicoes para evidencias de auditoria
- Ao gerar documentacao ou auditorias com apoio de IA, usar sempre `docs/` e `auditoria/` em vez da raiz do projeto

## Produtos do Portal

O Portal AF Solucoes e uma plataforma com 3 produtos comerciais independentes:

- **CMMS** — Gestao de Manutencao (`ACTIVE`): controle operacional de manutencao de ativos industriais
- **GVP** — Gestao de Variaveis de Processo (`COMING_SOON`): monitoramento de variaveis operacionais
- **GPA** — Gestao de Portaria e Acesso (`COMING_SOON`): controle de acesso e leitura de placas (LPR)

Cada produto e habilitado por empresa via `CompanyProduct`. A spec completa de produtos esta em `docs/PRODUTOS.md`.

## Features do CMMS (Modulos de navegacao)

Hub, Login e Autenticacao, Dashboard, Ordens de Servico (OS), Solicitacoes (SS), Gestao de Ativos, Localizacoes, Pessoas e Equipes, Planos de Manutencao, Planejamento e Programacao, Cadastros Basicos, Criticidade de Ativos, RAF, KPI - Indicadores, Painel Administrativo, Perfil do Usuario, Configuracoes do Usuario, Arvore Hierarquica, Relatorios e Analiticos (em desenvolvimento)
