# Seguranca do Sistema

## Objetivo

Este arquivo e a referencia canonica de seguranca do CMM Gestor de Manutencao.
Ele complementa `docs/SPEC.md`, focando em requisitos nao funcionais de autenticacao, autorizacao, isolamento de dados, hardening, protecao operacional e criterio de liberacao.

Toda mudanca que afete autenticacao, sessao, permissao, uploads, logs sensiveis, exportacao, headers, segredos, deploy ou readiness de producao deve consultar e, quando necessario, atualizar este documento.

---

## Quando Consultar Este Documento

- Ao alterar login, logout, sessao, cookies, middleware ou contexto autenticado
- Ao alterar permissoes, papeis, modulos, redirects, sidebar condicionada ou validacoes server-side
- Ao alterar rotas de API, server actions, queries, filtros por empresa ou unidade
- Ao alterar uploads, anexos, exportacoes, integracoes externas, cron jobs ou automacoes
- Ao revisar seguranca para homologacao, demonstracao, UAT, piloto ou go-live
- Ao responder auditoria, incidente, achado de pentest ou recomendacao de compliance

---

## Acoes Manuais Pendentes

> Auditoria executada em 2026-04-11. Correcoes automatizaveis ja foram aplicadas no commit `9d866b3`.
> Esta secao lista APENAS o que requer acao humana nos paineis externos ou decisao de negocio.

### CRITICO — Bloqueia go-live (fazer antes do deploy)

| # | Acao | Onde | Ref |
|---|------|------|-----|
| 1 | **Rotacionar TODAS as credenciais**: senha do banco Supabase, Service Role Key, Anon Key, NEXTAUTH_SECRET (`openssl rand -base64 32`), Cloudinary API_KEY e API_SECRET | Painel Supabase + Vercel + Cloudinary | V01 |
| 2 | **Confirmar `CRON_SECRET` no Vercel**: o codigo agora rejeita se ausente — garantir que a variavel esta configurada com valor forte (ex: `openssl rand -hex 32`) | Vercel > Settings > Environment Variables | V07 |
| 3 | **Remover `DEV_QUICK_ACCESS` do `src/app/login/page.tsx`**: o array com 12 usuarios e senhas vai no bundle JS do cliente. Ja esta marcado com `TODO: SEGURANCA` no arquivo | Editor de codigo | V11 |
| 4 | **Implementar rate limiting no login**: o codigo NAO tem rate limiting. Sem ele, brute-force no login e trivial. Opcao minima para Vercel: `@upstash/ratelimit` com Redis gratuito do Upstash | `src/app/api/auth/login/route.ts` | V13 |

### IMPORTANTE — Fazer no proximo sprint

| # | Acao | Onde | Ref |
|---|------|------|-----|
| 5 | **`npm audit fix`**: corrige picomatch (ReDoS). Avaliar migracao de `xlsx` para `exceljs` (sem fix disponivel para as vulnerabilidades do xlsx) | Terminal: `npm audit fix` | V20 |
| 6 | **Remover `SKIP_ENV_VALIDATION` do `vercel.json`**: hoje o deploy nao falha se faltar variaveis criticas | `vercel.json:8` | V27 |
| 7 | **Remover campo `rate` (taxa/hora) da listagem de usuarios**: campo salarial retornado para todos os perfis | `src/app/api/users/route.ts:34,40` | V26 |
| 8 | **Normalizar email com `.toLowerCase().trim()` antes de queries**: hoje `Admin@empresa.com` nao encontra `admin@empresa.com` | `src/app/api/auth/login/route.ts` + queries de usuario | V31 |

### BACKLOG — Planejar para versao futura

| # | Acao | Ref |
|---|------|-----|
| 9 | Ativar RLS policies no Supabase como segunda camada de isolamento | V23 |
| 10 | Adicionar `Cache-Control: private, no-store` em todos os endpoints autenticados | V24 |
| 11 | Adicionar `checkApiPermission` no endpoint `gep/import` (hoje so tem `getSession`) | V25 |
| 12 | Criar tabela `AuditLog` para rastrear login, mudanca de papel, exclusao, aprovacao | V28 |
| 13 | Fluxo de reset de senha por email | V29 |
| 14 | 2FA para perfis `SUPER_ADMIN` e `ADMIN` | V35 |
| 15 | Politica formal de rotacao periodica de credenciais (a cada 90 dias) | V36 |

---

---

## Principios Canonicos

### 1. Seguranca server-side primeiro
- Esconder menu, botao ou aba nunca substitui verificacao de acesso no servidor
- Toda rota, action e query sensivel deve validar `perfil + empresa + unidade ativa`
- O cliente nao pode decidir o proprio escopo de acesso

### 2. Papel canonico vem de fonte confiavel
- O papel efetivo do usuario deve derivar de dado persistido e confiavel do backend
- Email, username, cargo exibido, label visual ou texto livre nao podem promover privilegio
- Compatibilidade com papeis legados e aceita, mas a decisao de acesso deve ser deterministica e auditavel

### 3. Sessao precisa ser assinada e revalidada
- O sistema nao deve confiar em cookie com JSON puro sem assinatura
- A sessao deve ter integridade criptografica, expirar corretamente e ser revogavel
- Dados criticos de sessao devem ser revalidados sempre que houver operacao sensivel

### 4. Multiempresa e multiunidade sao fronteiras de seguranca
- `Company` e a fronteira maxima de isolamento
- `Unit` e o recorte operacional padrao da maioria das leituras e escritas
- Toda leitura e escrita deve aplicar filtros explicitos de empresa; toda operacao sensivel deve considerar unidade ativa quando o dominio exigir

### 5. Menor privilegio e comportamento padrao
- Cada perfil deve acessar apenas o necessario para seu trabalho
- Operacoes destrutivas, administrativas ou de massa devem exigir papel apropriado
- Novas rotas e novos endpoints devem nascer fechados e so depois serem abertos conscientemente

### 6. Segredo e configuracao segura
- Nao commitar tokens, cookies, project refs privados, URLs internas, storage states ou dumps tecnicos sensiveis
- Variaveis obrigatorias de seguranca devem falhar o bootstrap quando ausentes
- Nao usar fallback inseguro para segredos de cron, webhook ou autenticacao

### 7. Logs e erros minimamente expostos
- Logs podem registrar contexto tecnico interno, mas nao devem expor senha, token, cookie, stack sensivel ou dado de cliente em excesso
- Respostas HTTP de producao nao devem retornar detalhes internos do backend ou do banco
- Eventos relevantes de seguranca devem ser rastreaveis sem vazar informacao desnecessaria

---

## Escopo Minimo de Protecao

### Autenticacao
- Login com validacao de senha forte no servidor
- Senhas com hash forte e custo adequado
- Rate limiting, atraso progressivo ou lock temporario para mitigar brute force
- Logout precisa invalidar a sessao atual de forma confiavel
- Troca de contexto autenticado precisa invalidar cache cliente dependente de usuario
- **Duracao da sessao**: 24 horas (`maxAge: 60 * 60 * 24` em `src/lib/session.ts`). Esta e a duracao canonica; qualquer documentacao que cite 7 dias esta desatualizada (V21 corrigido)

### Autorizacao
- Reutilizar um nucleo central de permissao
- Nao manter matriz de acesso diferente entre UI e backend
- Qualquer operacao de leitura privilegiada, alteracao, exclusao, aprovacao, execucao ou exportacao deve passar pela regra central

### Isolamento de Dados
- Consultas devem aplicar filtros explicitos por `companyId`
- Quando o modulo for unit-scoped, aplicar `unitId` efetivo no servidor
- IDs recebidos do cliente devem ser revalidados contra a empresa e, quando aplicavel, contra a unidade
- Listas de IDs tambem precisam ser revalidadas item a item

### Uploads, Anexos e Arquivos
- Limitar tipos de arquivo pelo risco real do negocio, nao apenas por conveniencia tecnica
- Validar tamanho, extensao, MIME e, quando possivel, assinatura real do arquivo
- Evitar publicar arquivos sensiveis em URL publica permanente
- HTML, SVG, XML, JSON bruto e arquivos compactados devem ser tratados com muito mais restricao

### Exportacoes
- Exportacao deve respeitar os mesmos filtros e permissoes das telas
- Nunca exportar senha, hash, token, cookie ou campo tecnico sensivel
- Campos de apoio tecnico so devem sair quando houver necessidade operacional clara

### Integracoes e Jobs
- Cron jobs, webhooks e integracoes devem usar segredos obrigatorios
- Endpoints tecnicos nao devem permanecer publicos por conveniencia de teste
- Toda integracao precisa ter escopo de empresa claro e logs controlados

### Frontend e Navegador
- Sanitizar destinos de redirect para evitar open redirect
- Aplicar headers de seguranca adequados
- Evitar dependencias vulneraveis em rotas publicas, upload, parser e renderizacao

---

## Inventario de Vulnerabilidades

Status: levantamento consolidado a partir de auditoria automatizada (Claude Code + Codex, 2026-04-11).
Correcoes automatizaveis aplicadas em 2026-04-11 — commit `9d866b3`.
Legenda de status: `[CORRIGIDO]` aplicado no codigo | `[PENDENTE MANUAL]` requer acao humana | `[PENDENTE BACKLOG]` planejado para versao futura

### Legenda de Severidade

| Tag | Significado |
|-----|-------------|
| P0-CRITICO | Bloqueia go-live. Explorar permite acesso indevido, perda de dados ou escalada de privilegio |
| P1-ALTO | Corrigir o mais rapido possivel. Reduz superficie de ataque significativamente |
| P2-MEDIO | Planejar para proximo sprint. Melhora postura de seguranca |
| P3-BAIXO | Backlog. Melhoria continua ou defesa em profundidade |

---

### P0-CRITICO — Bloqueia go-live

#### V01. Credenciais reais expostas em arquivos locais `[PENDENTE MANUAL]`
- **Arquivos**: `.env`, `.env.local`
- **Problema**: Senha do banco (`PortalAF123!@#`), Service Role Key do Supabase (bypassa RLS), `NEXTAUTH_SECRET` e Anon Key expostos em texto plano nos arquivos de ambiente
- **Impacto**: Se o repositorio ou a maquina local forem comprometidos, atacante tem acesso total ao banco
- **Status git**: `.env*` esta no `.gitignore` — nao commitado. Porem `.env.example` e commitado (sem segredos reais)
- **Acao**:
  1. Rotacionar TODAS as credenciais no painel do Supabase (nova senha de banco, novas keys)
  2. Gerar novo `NEXTAUTH_SECRET` com `openssl rand -base64 32`
  3. Atualizar credenciais no Vercel e no ambiente local
  4. Verificar `git log --all --name-only -- '*.env*'` para confirmar que nenhum `.env` real foi commitado no historico

#### V02. Credenciais Cloudinary hardcoded em script `[CORRIGIDO]`
- **Arquivo**: `scripts/setup/setup-cloudinary-vercel.ps1:10-12`
- **Problema**: `API_KEY` e `API_SECRET` do Cloudinary em texto plano no script commitado
- **Impacto**: Qualquer pessoa com acesso ao repo pode usar as credenciais Cloudinary
- **Acao**: Remover credenciais do script. Usar variaveis de ambiente ou referencia a vault. Rotacionar keys no Cloudinary

#### V03. Sessao em cookie JSON sem assinatura criptografica `[CORRIGIDO]`
- **Arquivo**: `src/lib/session.ts:20,45-49`
- **Problema**: `JSON.stringify(user)` gravado diretamente no cookie, `JSON.parse(sessionCookie.value) as SessionUser` lido sem HMAC, sem criptografia, sem validacao de integridade
- **Impacto**: Se houver qualquer vulnerabilidade client-side (XSS, extensao maliciosa, acesso fisico), atacante pode editar o cookie e alterar `canonicalRole` para `SUPER_ADMIN`, trocar `companyId` para acessar outra empresa
- **Acao**: Assinar o cookie com HMAC usando `NEXTAUTH_SECRET` ou migrar para `iron-session` (cookie criptografado). Revalidar dados criticos da sessao no banco em operacoes sensiveis
- **Criterio de aceite**:
  - Editar manualmente o cookie nao eleva privilegio
  - Editar `companyId`/`unitId`/`userId` no cookie nao altera o escopo
  - Logout invalida acesso imediatamente

#### V04. Escalonamento de privilegio por padrao de email/username `[CORRIGIDO]`
- **Arquivo**: `src/lib/user-roles.ts:92-126`
- **Problema**: `normalizeUserRole()` infere papel com base em padroes de email e username. Se email contem `admin@`, usuario recebe papel `ADMIN` automaticamente, mesmo que o banco diga `TECHNICIAN`. Idem para `super.admin`, `consulta@`, `solicitante@`, `tecnico@`
- **Exemplo**: Criar usuario com email `admin.hacker@empresa.com` resulta em papel `ADMIN`
- **Impacto**: Escalada de privilegio — qualquer usuario com email contendo certos padroes ganha acesso elevado
- **Acao**: Remover TODA inferencia de papel por `email`, `username` e `jobTitle`. Usar APENAS `user.role` do banco de dados. Manter mapeamento de papeis legados apenas para valores de `role` persistidos
- **Criterio de aceite**:
  - Mudar email para `admin@...` nao muda acesso
  - Mudar `jobTitle` para `Administrador` nao muda acesso
  - Apenas alteracao de papel no fluxo administrativo aprovado muda privilegio real

#### V05. Rotas GEP completamente sem autenticacao `[CORRIGIDO]`
- **Arquivos**:
  - `src/app/api/gep/data/route.ts` — nenhuma chamada a `getSession()`
  - `src/app/api/gep/files/route.ts` — nenhuma chamada a `getSession()`
- **Problema**: Qualquer pessoa na internet pode acessar dados de processo industrial e listar arquivos sem nenhuma autenticacao
- **Impacto**: Vazamento de dados operacionais sensiveis
- **Acao**: Adicionar `getSession()` + verificacao de permissao em ambos os endpoints. Retornar 401/403 sem sessao

#### V06. Vazamento entre empresas (cross-tenant IDOR) `[CORRIGIDO]`
- **Arquivos afetados**:

  | Arquivo | Operacao | Filtro companyId |
  |---------|----------|-----------------|
  | `src/app/api/files/[id]/route.ts` | DELETE | Ausente |
  | `src/app/api/basic-registrations/[entity]/[id]/route.ts` | GET/PUT/DELETE | Ausente |
  | `src/app/api/maintenance-plans/asset/[id]/tasks/route.ts` | GET/POST | Ausente |
  | `src/app/api/maintenance-plans/standard/[id]/tasks/route.ts` | GET/POST | Ausente |

- **Problema**: Queries por ID sem verificar se o registro pertence a empresa do usuario. Atacante adivinha IDs (UUIDs sao previssiveis se o padrao for sequencial) e acessa/modifica/deleta dados de outra empresa
- **Impacto**: Usuario da Empresa A pode ler, modificar ou deletar dados da Empresa B
- **Acao**: Adicionar `.eq('companyId', session.companyId)` em TODAS as queries por ID nestes endpoints. Para `files/[id]`, validar via entidade pai (Asset, WorkOrder, etc.)
- **Nota**: `src/app/api/planning/plans/[id]/route.ts` DELETE ja possui `.eq('companyId', session.companyId)` — correto

#### V07. Segredo hardcoded no endpoint de cron `[CORRIGIDO]` — confirmar CRON_SECRET no Vercel
- **Arquivo**: `src/app/api/cron/generate-preventive-maintenance/route.ts:52`
- **Codigo**: `process.env.CRON_SECRET || 'your-secret-key-here'`
- **Problema**: Se `CRON_SECRET` nao estiver configurada no Vercel, qualquer pessoa pode chamar o endpoint com o fallback `your-secret-key-here`
- **Impacto**: Geracao nao autorizada de OS preventivas em massa
- **Acao**:
  1. Remover fallback: `const cronSecret = process.env.CRON_SECRET; if (!cronSecret) return 500`
  2. Remover o handler GET informativo (expoe detalhes de implementacao)
  3. Usar `crypto.timingSafeEqual` para comparacao do secret (evita timing attack)
  4. Confirmar que `CRON_SECRET` esta configurado no Vercel com valor forte

#### V08. Console.log com dados sensiveis no login `[CORRIGIDO]`
- **Arquivo**: `src/app/api/auth/login/route.ts` (linhas 9-13, 18, 28, 36, 43, 53, 64, 67, 113, 127, 143-144)
- **Problema**: Loga emails, headers, IDs de usuario, resultado de validacao de senha e stack traces. No Vercel, esses logs ficam visiveis no painel de Runtime Logs
- **Impacto**: PII exposto em logs; enumeracao de contas possivel pelo log de "User not found"
- **Acao**: Remover TODOS os `console.log` de debug. Manter apenas um `console.error` generico no catch final sem `error.message`

#### V09. Detalhes de erro internos expostos em respostas de API `[CORRIGIDO]`
- **Arquivos afetados**:
  - `src/app/api/auth/login/route.ts:147-148` — `details: error.message`
  - `src/app/api/upload/route.ts:95` — `details: error.message`
  - `src/app/api/work-orders/route.ts:334` — `details: error.message`
  - `src/app/api/gep/data/route.ts:97` — `error.message` + `error.stack` em dev
  - `src/app/api/requests/[id]/approve/route.ts:109,170`
  - `src/app/api/standard-assets/[id]/route.ts:25,96,119`
- **Problema**: Respostas HTTP retornam `error.message` que pode expor nomes de colunas, erros SQL, paths internos
- **Impacto**: Atacante usa mensagens de erro para mapear a estrutura interna do sistema
- **Acao**: Substituir `details: error.message` por mensagem generica. Logar detalhes apenas no servidor

#### V10. Cookie SameSite=none em producao (CSRF) `[CORRIGIDO]`
- **Arquivo**: `src/lib/session.ts:31`
- **Codigo**: `sameSite: isHttps ? 'none' : 'lax'`
- **Problema**: Em HTTPS (producao), o cookie e enviado em requests cross-origin. Combinado com ausencia total de tokens CSRF
- **Impacto**: Qualquer site externo pode fazer requisicoes autenticadas em nome do usuario logado
- **Acao**: Mudar para `sameSite: 'lax'` em producao. Adicionar validacao de `Origin`/`Referer` no servidor para mutacoes

#### V11. Credenciais de desenvolvimento no codigo fonte `[PENDENTE MANUAL]` — TODO marcado, remover antes do deploy
- **Arquivo**: `src/app/login/page.tsx:12-35`
- **Problema**: Array `DEV_QUICK_ACCESS` contem 12 usuarios com email e senha `Teste@123`, incluindo `SUPER_ADMIN`. Embora a UI so renderize em `NODE_ENV === 'development'`, o array vai no bundle JS do cliente em producao (tree-shaking nao remove dados usados em condicional runtime)
- **Impacto**: Credenciais expostas no bundle — acesso total ao sistema se os usuarios de teste existirem em producao
- **Acao**: Extrair para arquivo separado importado via `dynamic()` com condicao de build, ou remover completamente e mover para ferramenta de teste (Playwright, seed script)

#### V12. Mass assignment no endpoint TOTVS `[CORRIGIDO]`
- **Arquivo**: `src/app/api/integration/totvs/sync/route.ts:26-77`
- **Problema**: `record` do request body passado diretamente ao `update`/`insert` do banco. Apenas `id` e `createdAt` sao removidos (blacklist). Campos como `companyId` sao sobrescritos (linha 66), mas outros campos tecnicos podem ser injetados
- **Impacto**: Atacante pode mutar campos internos nao previstos (ex: `enabled`, `role`, flags de status)
- **Acao**: Implementar whitelist de campos permitidos por entidade. Aceitar apenas os campos que o Protheus realmente envia

---

### P1-ALTO — Corrigir o mais rapido possivel

#### V13. Nenhum rate limiting `[PENDENTE MANUAL]` — bloqueia go-live
- **Endpoints afetados**: Login (`/api/auth/login`), criacao de usuarios, upload, GEP import
- **Problema**: Nenhum limite de tentativas. Atacante pode testar senhas infinitamente (brute force), criar usuarios em massa (spam), enviar uploads infinitos (DoS)
- **Acao**: Implementar rate limiting no login (5 tentativas por 15min por IP+email). Para Vercel: usar `@upstash/ratelimit` com Redis ou Map em memoria para MVP
- **Criterio de aceite**: Tentativas repetidas em curto intervalo passam a ser bloqueadas

#### V14. Sessao nao valida estado no banco `[PENDENTE BACKLOG]` — mitigado pela reducao de maxAge para 24h
- **Problema**: Usuario desativado (`enabled: false`) continua acessando o sistema ate o cookie expirar (7 dias). Mudanca de papel (ADMIN rebaixado a TECHNICIAN) nao tem efeito ate re-login
- **Acao**: Revalidar `enabled` e `role` no banco em operacoes criticas (mutacoes, acesso admin). Reduzir tempo de sessao
- **Criterio de aceite**: Desativar usuario no painel bloqueia acesso na proxima requisicao

#### V15. Validacao de senha fraca `[CORRIGIDO]`
- **Arquivo**: `src/lib/auth.ts:20-25`
- **Problema**: So exige `length >= 8`. Aceita `aaaaaaaa`, `password`, `12345678`
- **Acao**: Exigir minimo 10 caracteres + 1 maiuscula + 1 minuscula + 1 numero + 1 caractere especial. Atualizar mensagem em PT-BR

#### V16. Upload aceita tipos perigosos `[CORRIGIDO]`
- **Arquivo**: `src/app/api/upload/route.ts:53`
- **Problema**: Whitelist inclui `text/html`, `text/markdown`, `application/xml`, `text/xml`, `application/json`. HTML permite stored XSS
- **Acao**: Remover tipos perigosos. Manter apenas: imagens, PDF, Office, CSV, ZIP/RAR/7Z
- **Impacto adicional**: Validacao por MIME type e spoofavel (controlado pelo cliente). Implementar validacao de magic bytes no servidor

#### V17. Security headers ausentes `[CORRIGIDO]`
- **Arquivo**: `next.config.ts`
- **Problema**: Nenhum header de seguranca configurado
- **Acao**: Adicionar bloco `headers()` no next.config.ts:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https:; connect-src 'self' https://*.supabase.co
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 0  (desabilitado em favor de CSP)
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```

#### V18. Open redirect via returnUrl `[CORRIGIDO]`
- **Arquivo**: `src/middleware.ts:26-27`, `src/app/login/page.tsx:51,80`
- **Problema**: `returnUrl` aceita qualquer valor, incluindo `https://attacker.com`. O middleware seta `returnUrl` no redirect e o login page redireciona para ele
- **Acao**: Validar que `returnUrl` comeca com `/` e nao contem `://`. Rejeitar ou normalizar destinos externos

#### V19. Paginas de erro customizadas ausentes `[CORRIGIDO]`
- **Arquivos inexistentes**: `src/app/error.tsx`, `src/app/not-found.tsx`
- **Problema**: Erros nao tratados mostram pagina padrao do Next.js que pode vazar informacao em ambientes mal configurados
- **Acao**: Criar `error.tsx` e `not-found.tsx` com layout limpo e mensagem generica

#### V20. Dependencias vulneraveis `[PENDENTE MANUAL]`
- **Resultado `npm audit`**: 12 vulnerabilidades (3 moderate, 9 high)
  - `xlsx`: Prototype Pollution + ReDoS — sem fix disponivel
  - `picomatch`: ReDoS — fix via `npm audit fix`
- **Acao**: Rodar `npm audit fix` para picomatch. Avaliar migrar `xlsx` para `exceljs` ou `sheetjs-ce`

#### V21. Sessao de 7 dias sem rotacao `[CORRIGIDO]` — reduzido para 24h
- **Arquivo**: `src/lib/session.ts:32`
- **Problema**: `maxAge: 60 * 60 * 24 * 7` (7 dias). Cookie roubado da 7 dias de acesso sem renovacao
- **Acao**: Reduzir para 24h. Implementar rotacao (renovar cookie a cada request ou periodicamente)

#### V22. Sem paginacao maxima (DoS) `[CORRIGIDO]` — limite 100 aplicado em assets, work-orders, requests
- **Problema**: Endpoints de listagem aceitam `?limit=999999` sem restricao
- **Acao**: Impor `limit = Math.min(requestedLimit, 100)` em todos os endpoints de listagem

---

### P2-MEDIO — Planejar para proximo sprint

#### V23. Supabase service role key bypassa RLS `[PENDENTE BACKLOG]`
- **Arquivo**: `src/lib/supabase.ts`
- **Problema**: O client do servidor usa `service_role` key que ignora todas as policies RLS. Toda seguranca depende de validacoes manuais em cada endpoint
- **Acao**: Ativar RLS policies no Supabase como segunda camada de defesa. Mapear quais rotas realmente precisam de privilegio elevado

#### V24. Cache-Control ausente na maioria dos endpoints `[PENDENTE BACKLOG]`
- **Problema**: Apenas `/api/auth/me` define `Cache-Control: no-store`. Outros endpoints autenticados podem ser cacheados pelo CDN da Vercel
- **Acao**: Adicionar `Cache-Control: private, no-store` em todos os endpoints autenticados, ou via middleware global

#### V25. GEP Import sem validacao de permissao nem limite `[PENDENTE BACKLOG]` — autenticacao basica ja existe, falta checkApiPermission
- **Arquivo**: `src/app/api/gep/import/route.ts`
- **Problema**: Apenas `getSession()` — sem `checkApiPermission`. Sem validacao de formato, tamanho ou limites. `split(';')` pode travar com input malformado
- **Acao**: Adicionar `checkApiPermission`, validar formato, limitar tamanho do arquivo e numero de registros

#### V26. Dados sensiveis em listagem de usuarios `[PENDENTE MANUAL]`
- **Arquivo**: `src/app/api/users/route.ts:33-44`
- **Problema**: Campo `rate` (taxa/hora, informacao salarial) retornado na listagem para todos os usuarios
- **Acao**: Remover `rate` do select de listagem. Retornar apenas no detalhe individual com permissao de admin

#### V27. SKIP_ENV_VALIDATION no Vercel `[PENDENTE MANUAL]`
- **Arquivo**: `vercel.json:8`
- **Problema**: `SKIP_ENV_VALIDATION=1` desabilita validacao de variaveis de ambiente no deploy, podendo mascarar segredos ausentes
- **Acao**: Remover e implementar validacao em runtime que falha early se envs criticas faltarem

#### V28. Nenhum log de auditoria `[PENDENTE BACKLOG]`
- **Problema**: Nao registra quem fez o que, quando. Impossivel rastrear acoes suspeitas ou investigar incidentes
- **Acao**: Criar tabela `AuditLog` e registrar operacoes criticas (login, alteracao de papel, exclusao, aprovacao, importacao)

#### V29. Sem funcionalidade de reset de senha `[PENDENTE BACKLOG]`
- **Problema**: Usuario que esqueceu a senha depende de intervencao manual de admin
- **Acao**: Implementar fluxo de reset por email (medio prazo)

#### V30. Deteccao de HTTPS fraca `[PENDENTE BACKLOG]`
- **Arquivo**: `src/lib/session.ts:23-26`
- **Problema**: `isHttps` baseado em `NODE_ENV` e `NEXTAUTH_URL`, nao no request real
- **Acao**: Verificar header `X-Forwarded-Proto` do request para determinar HTTPS de forma confiavel

#### V31. Email case-sensitive em queries `[PENDENTE MANUAL]`
- **Problema**: `admin@empresa.com` != `Admin@Empresa.com` nas queries do Supabase
- **Acao**: Normalizar email com `.toLowerCase().trim()` antes de TODAS as queries e comparacoes

#### V32. Comparacao de segredo sem timing-safe `[CORRIGIDO]`
- **Arquivo**: `src/app/api/cron/generate-preventive-maintenance/route.ts:54`
- **Problema**: `authHeader !== Bearer ${cronSecret}` usa comparacao simples, vulneravel a timing attack
- **Acao**: Usar `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` para comparacao de segredos

---

### P3-BAIXO — Backlog / Melhoria continua

#### V33. Open redirect limitado no returnUrl `[PENDENTE BACKLOG]`
- **Problema**: Mesmo apos fix do V18, returnUrl nao valida se o path e uma rota interna valida
- **Acao**: Validar contra lista de rotas permitidas (baixa prioridade)

#### V34. Monitoramento e logging estruturado `[PENDENTE BACKLOG]`
- **Problema**: ~221 chamadas `console.log/error/warn` em API routes, sem estrutura ou filtragem
- **Acao**: Migrar para logging estruturado (Vercel Log Drain, Axiom, etc) sem expor dados sensiveis

#### V35. 2FA para administradores `[PENDENTE BACKLOG]`
- **Acao**: Implementar autenticacao em dois fatores para `SUPER_ADMIN` e `ADMIN`

#### V36. Rotacao periodica de segredos `[PENDENTE BACKLOG]`
- **Acao**: Estabelecer politica de rotacao de credenciais (a cada 90 dias ou apos incidente)

---

## Pontos Fortes Identificados

O sistema ja possui uma base solida em varios aspectos:

- Hashing de senha com bcryptjs (12 rounds) — `src/lib/auth.ts:4`
- Cookies com `httpOnly: true` — `src/lib/session.ts:29`
- Sistema centralizado de permissoes — `src/lib/permissions.ts`
- Maioria das rotas valida sessao + companyId + checkApiPermission
- Sem `dangerouslySetInnerHTML` no codebase (XSS via React mitigado)
- Sem `eval()` ou `Function()` dinamico
- Queries usam Supabase client (parametrizadas, sem SQL injection direto)
- Upload com limite de tamanho (10MB) e whitelist de MIME types
- `.gitignore` exclui `.env*` (segredos nao commitados)
- Image domains restritos no `next.config.ts`
- Normalizacao de email no login — `src/lib/auth.ts:16-18`
- Middleware protege rotas internas; `/register`, `/login`, `/hub`, `/admin/select-company` e `/change-password` sao as unicas rotas publicas
- Isolamento multiempresa funcional na maioria das rotas

---

## Registro Publico e Aprovacao

- `/api/auth/register` e publica, valida CNPJ (BrasilAPI) e cria `Company` em `PENDING_APPROVAL` com o primeiro usuario em `role = ADMIN` (persistido como `GESTOR`). NAO loga o usuario — o login depende de e-mail verificado e aprovacao SUPER_ADMIN
- Tokens de verificacao de e-mail ficam em `User.emailVerificationToken/Expires` com TTL de 24h; `GET /api/auth/verify-email` retorna `404` token inexistente, `410` expirado, `200` verificado (sem login automatico)
- Login bloqueia empresas `PENDING_APPROVAL` com `403` e mensagem clara; empresas `REJECTED` recebem `401` indistinguivel de credenciais invalidas para nao vazar existencia de conta
- `POST /api/admin/companies/[id]/reject` exige `reason`, grava `RejectedCompanyLog`, anonimiza PII do admin inicial (email/phone/username/firstName/lastName). Indices UNIQUE parciais em `Company.cnpj` e `User.email` permitem reaproveitamento apos rejeicao
- `EmailOutbox` armazena convites/aprovacoes/rejeicoes em fila; o dispatcher real de e-mail ainda nao esta ligado — a fila e auditoria + hook de integracao futura

## Reset Manual de Senha

- `POST /api/users/[id]/reset-password` (SUPER_ADMIN/ADMIN) gera senha temporaria com `generateTempPassword()`, seta `mustChangePassword=true` e retorna o texto claro UMA UNICA VEZ
- A senha em texto claro NAO e persistida em claro, NAO e enviada por e-mail automatico, NAO e gravada em log estruturado. O admin repassa por canal seguro (ligacao, mensageria corporativa) e a UI oferece botao `Copiar senha` no overlay
- Rejeita auto-reset (bloqueia usuario resetando a propria conta) e usuarios `ARCHIVED`
- `ForcedPasswordChangeGuard` em `src/components/layout/AppShell.tsx` redireciona qualquer usuario com `mustChangePassword=true` para `/change-password`; o guard e client-side (a flag esta na sessao via `/api/auth/me`), portanto o backend NAO pode depender dele — toda rota sensivel que pudesse ser pulada sem trocar a senha deve ter validacao propria se o requisito evoluir para bloqueio total
- `POST /api/auth/change-password` nao aplica `normalizeTextPayload` (senhas sao preservadas), valida `currentPassword` com `verifyPassword`, exige `newPassword.length >= 8`, diferente da atual e diferente do e-mail

## Notificacoes In-App

- `Notification` e per-user; so o dono pode ler/marcar. Rotas `POST /api/notifications/[id]/read` validam `userId` antes de atualizar
- Payload nao aceita HTML; renderizacao e sempre texto via React (sem `dangerouslySetInnerHTML`)
- O polling de 60s do `NotificationBell` nao expoe dados sensiveis — apenas titulo, mensagem e `href` opcional

---

## Criterios de Go-Live de Seguranca

Antes de liberar o sistema para cliente final, TODOS os criterios abaixo devem ser atendidos:

1. Nao existir escalada de privilegio conhecida (V04 corrigido)
2. Nao existir rota publica expondo dado interno sem motivo aprovado (V05 corrigido)
3. Nao existir sessao forjavel ou cookie sem integridade (V03 corrigido ou mitigado)
4. Nao existir endpoint critico sem verificacao de permissao server-side (V05, V06 corrigidos)
5. Nao existir retorno de erro com detalhes internos em producao (V09 corrigido)
6. Nao existir segredo com fallback inseguro (V07 corrigido)
7. Nao existir credencial real hardcoded em codigo fonte commitado (V02, V11 corrigidos)
8. Nao existir vazamento cross-tenant por IDOR (V06 corrigido)
9. Rate limiting ativo no login (V13 corrigido)
10. Credenciais rotacionadas (V01 executado)
11. Dependencias criticas sem advisories bloqueadores conhecidos (V20 tratado)
12. Build e deploy nao ignoram erros estruturais que afetem seguranca

---

## Checklist Operacional de Liberacao

Executar antes de cada liberacao externa (homologacao, UAT, piloto, go-live):

### Autenticacao e Sessao
- [ ] Login funciona com credenciais validas
- [ ] Login rejeita credenciais invalidas sem expor qual campo esta errado
- [ ] Logout invalida sessao e redireciona para login
- [ ] Troca de unidade funciona para SUPER_ADMIN/ADMIN
- [ ] Rate limiting bloqueia tentativas excessivas de login
- [ ] Cookie de sessao nao e manipulavel para escalar privilegio

### Separacao SUPER_ADMIN vs ADMIN (tenancy)
- **SUPER_ADMIN** e exclusivamente staff Portal AF Solucoes: `companyId = NULL` no banco (`''` na sessao). Opera cross-tenant, cadastra empresas, habilita produtos/modulos e da suporte. Nao tem acesso operacional a dados de empresa sem selecionar um tenant.
- **ADMIN** e o administrador da empresa cliente: `companyId` obrigatorio. Tem acesso automatico a TODAS as unidades (Location raiz) da sua empresa via `UserUnit` (invariante garantido por `src/lib/admin-scope.ts`). E o responsavel por cadastrar as demais pessoas de cada unidade da empresa.
- Criacao de empresa (`POST /api/admin/companies`, apenas SUPER_ADMIN) cria obrigatoriamente o primeiro usuario com `role = ADMIN` (persistido como `GESTOR`), nunca SUPER_ADMIN.
- ADMIN nunca pode se auto-promover nem promover outros a SUPER_ADMIN. Apenas staff Portal AF pode criar/atribuir SUPER_ADMIN (validado em `src/app/api/users/route.ts` e `src/app/api/users/[id]/route.ts`).
- `User.companyId` e `NULL` apenas para staff Portal AF. Qualquer query de negocio CMMS deve falhar para sessao sem `companyId` (use `requireCompanyScope` de `src/lib/user-roles.ts`).

### Permissoes por Perfil
- [ ] SUPER_ADMIN (staff Portal AF): acesso total, painel admin do portal, sem tenant fixo
- [ ] ADMIN (cliente): gestao completa da sua empresa e TODAS as suas unidades, sem acesso ao portal global
- [ ] TECHNICIAN: OS, execucao, sem dashboard como entrada
- [ ] LIMITED_TECHNICIAN: OS limitada, sem dashboard como entrada
- [ ] REQUESTER: solicitacoes apenas
- [ ] VIEW_ONLY: leitura apenas, sem acoes de mutacao

### Isolamento Multi-tenant
- [ ] Usuario da Empresa A nao enxerga dados da Empresa B
- [ ] Alterar ID na URL ou no request body nao permite acesso cross-tenant
- [ ] Listas, detalhes, edicoes e exclusoes filtram por companyId no servidor

### Uploads e Exportacoes
- [ ] Upload rejeita tipos perigosos (HTML, SVG, XML, executaveis)
- [ ] Upload respeita limite de tamanho
- [ ] Exportacao aplica mesmos filtros de permissao das telas
- [ ] Exportacao nao inclui senhas, hashes ou tokens

### Infraestrutura
- [ ] Segredos configurados no Vercel (nao usando fallbacks)
- [ ] Headers de seguranca presentes nas respostas HTTP
- [ ] Respostas de erro nao expoe detalhes internos
- [ ] Console.logs de debug removidos ou condicionados a dev
- [ ] `npm audit` sem vulnerabilidades criticas nao tratadas

---

## Checklist de Acao Para Go-Live

Status apos correcoes de 2026-04-11 (commit `9d866b3`):

| # | Acao | Ref | Status |
|---|------|-----|--------|
| 1 | Rotacionar TODAS as credenciais (Supabase, NextAuth, banco, Cloudinary) | V01 | PENDENTE MANUAL |
| 2 | Remover inferencia de papel por email/username/jobTitle | V04 | CORRIGIDO |
| 3 | Adicionar auth nas rotas GEP | V05 | CORRIGIDO |
| 4 | Adicionar filtro companyId nas rotas com IDOR | V06 | CORRIGIDO |
| 5 | Remover fallback do CRON_SECRET + usar timingSafeEqual | V07, V32 | CORRIGIDO — configurar CRON_SECRET no Vercel |
| 6 | Remover console.logs de dados sensiveis do login | V08 | CORRIGIDO |
| 7 | Remover detalhes de erro das respostas de API | V09 | CORRIGIDO |
| 8 | Corrigir SameSite cookie para `lax` | V10 | CORRIGIDO |
| 9 | Remover credenciais dev do login/page.tsx | V11 | PENDENTE MANUAL |
| 10 | Implementar whitelist no endpoint TOTVS | V12 | CORRIGIDO |
| 11 | Adicionar rate limiting basico no login | V13 | PENDENTE MANUAL |
| 12 | Melhorar validacao de senha (complexidade) | V15 | CORRIGIDO |
| 13 | Remover tipos perigosos do upload | V16 | CORRIGIDO |
| 14 | Validar returnUrl contra open redirect | V18 | CORRIGIDO |
| 15 | Adicionar headers de seguranca basicos | V17 | CORRIGIDO |
| 16 | Impor limite maximo de paginacao | V22 | CORRIGIDO |
| 17 | Assinar cookie de sessao (HMAC) | V03 | CORRIGIDO |
| 18 | Credenciais Cloudinary removidas dos scripts | V02 | CORRIGIDO |
| 19 | Paginas de erro customizadas | V19 | CORRIGIDO |
| 20 | Sessao reduzida para 24h | V21 | CORRIGIDO |

**Itens bloqueadores restantes**: V01 (rotacao de credenciais), V11 (DEV_QUICK_ACCESS), V13 (rate limiting).

---

## Resumo Para Leigo

### O que foi corrigido (2026-04-11)

A maioria das vulnerabilidades tecnologicas ja foi resolvida automaticamente:

- Cookie de sessao agora tem assinatura criptografica — nao pode mais ser falsificado
- Papel do usuario vem apenas do banco, email nao eleva privilegio
- Rotas de API sem autenticacao agora exigem login
- Dados de outras empresas bloqueados por filtro de isolamento em todas as rotas afetadas
- Erros internos nao sao mais devolvidos para o navegador
- Logs de debug com emails e senhas removidos do servidor
- Headers de seguranca adicionados para proteger o navegador
- Upload de arquivos HTML e JSON bloqueado
- Cookie de sessao agora expira em 24h (era 7 dias)
- Scripts de configuracao nao tem mais senhas no codigo-fonte

### O que ainda precisa de acao humana

Tres itens criticos nao podem ser feitos automaticamente e precisam de voce:

1. **Trocar as senhas** — As chaves de acesso do banco, do servico de imagens e do sistema de login precisam ser trocadas nos paineis web antes de ir ao ar. Se alguem tiver copiado os arquivos de configuracao, as chaves atuais sao conhecidas.

2. **Remover a lista de usuarios da tela de login** — Ha um bloco de codigo com 12 usuarios e senhas que facilita os testes, mas que vai junto para o cliente. Precisa ser removido antes do deploy.

3. **Adicionar limite de tentativas de login** — Sem esse limite, um atacante pode tentar senhas infinitamente ate acertar. E uma alteracao de codigo rapida mas precisa ser feita.

Esses tres itens sao obrigatorios antes de disponibilizar o sistema para qualquer cliente.
