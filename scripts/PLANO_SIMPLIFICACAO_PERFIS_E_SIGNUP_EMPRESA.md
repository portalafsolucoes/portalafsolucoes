# Plano de Implantação — Simplificação de Perfis + Signup Público de Empresa

**Versão:** 1.0
**Data:** 2026-04-22
**Responsável pela análise:** Claude Code (análise) / usuário (decisões)
**Escopo:** Redução para 4 perfis canônicos (SUPER_ADMIN / ADMIN / PLANEJADOR / MANUTENTOR), signup público de empresa com aprovação pelo SUPER_ADMIN, seleção de empresa no login do SUPER_ADMIN, notificações in-app, reset manual de senha.

---

## 1. Objetivo

Reorganizar o modelo de acesso do Portal AF Soluções para:

1. Simplificar os perfis canônicos de 6 para 4 — alinhando com a matriz validada pelo usuário.
2. Permitir que uma pessoa cadastre a própria empresa a partir da Home Page, com aprovação obrigatória do SUPER_ADMIN.
3. Dar ao SUPER_ADMIN uma tela de seleção de empresa após o login, com capacidade de alternar entre empresas.
4. Preservar toda a arquitetura multi-tenant, invariantes de ADMIN e regras canônicas já documentadas.

O plano é **cauteloso**: cada fase é validável em isolamento, é reversível quando possível, e o schema legado é mantido funcional até a confirmação de estabilidade das mudanças.

---

## 2. Decisões consolidadas

### Matriz final (4 perfis)

| Feature | SUPER_ADMIN | ADMIN | PLANEJADOR | MANUTENTOR |
|---|:-:|:-:|:-:|:-:|
| Dashboard | 👁 | 👁 | 👁 | 🔒 |
| Árvore Hierárquica | 👁 | 👁 | 👁 | 🔒 |
| Pessoas e Equipes | ✅ | ✅ | ✅ | 🔒 |
| Cadastros Básicos | ✅ | ✅ | ✅ | 🔒 |
| Ativos | ✅ | ✅ | ✅ | 🔒 |
| Criticidade | ✅ | ✅ | ✅ | 🔒 |
| Planos de Manutenção | ✅ | ✅ | ✅ | 🔒 |
| Planejamento/Programação | ✅ | ✅ | ✅ | 🔒 |
| Ordens de Serviço | ✅ +aprovar +executar | ✅ +aprovar +executar | ✏️ +executar | ✏️ +executar |
| Solicitações | ✅ +aprovar | ✅ +aprovar | ➕ (sem aprovar/deletar) | ➕ (sem aprovar/deletar) |
| Aprovações | 👁 +aprovar | 👁 +aprovar | 👁 +aprovar | 🔒 |
| RAF | ✅ | ✅ | ➕ (sem deletar) | ➕ (sem deletar) |
| Localizações | ✅ | ✅ | ✅ | 🔒 |
| KPI | 👁 | 👁 | 👁 | 🔒 |
| Analytics | 👁 | 👁 | 👁 | 🔒 |
| Configurações do Portal | ✅ | 🔒 | 🔒 | 🔒 |

Legenda: ✅ total (view/create/edit/delete) · 👁 só leitura · ✏️ view+edit · ➕ view+create+edit · 🔒 sem acesso.

### Redirects pós-login

| Perfil | Destino padrão |
|---|---|
| SUPER_ADMIN | `/admin/select-company` (quando `activeCompanyId` não está setado) |
| ADMIN | `/dashboard` |
| PLANEJADOR | `/dashboard` |
| MANUTENTOR | `/work-orders` |

### Escopo operacional por perfil

| Perfil | Empresa | Unidades |
|---|---|---|
| SUPER_ADMIN | Cross-tenant (nenhuma fixa) | Todas após selecionar empresa |
| ADMIN | 1 empresa | Todas as unidades raiz da empresa (auto-vinculado via `linkAllCompanyAdminsToUnit`) |
| PLANEJADOR | 1 empresa | Somente as unidades explicitamente atribuídas via `UserUnit` (pode ser 1 ou mais; ADMIN escolhe) |
| MANUTENTOR | 1 empresa | Somente as unidades explicitamente atribuídas via `UserUnit` |

### Troca de unidade

Passa a ser disponível para **SUPER_ADMIN**, **ADMIN** e **PLANEJADOR** quando tiverem mais de uma unidade acessível. MANUTENTOR nunca troca (fluxo operacional mantido).

### Signup público — decisões-chave

| Item | Decisão |
|---|---|
| Acesso público | Tela `/register` aberta (sem auth) |
| Estado inicial da empresa | `Company.status = PENDING_APPROVAL` |
| Estado inicial do usuário | `User.status = ACTIVE` mas login bloqueado indiretamente por `Company.status ≠ ACTIVE` |
| Verificação de email | Magic link antes de aparecer na fila do SUPER_ADMIN |
| Produtos habilitados | Escolhidos pelo solicitante no próprio formulário |
| Validação de CNPJ | Dígitos verificadores + consulta opcional BrasilAPI |
| Unicidade de CNPJ | Partial unique: único entre Companies com `status ≠ REJECTED` |
| Unicidade de email do ADMIN | Partial unique similar (renomeação com sufixo `@rejected.local` no soft delete) |

### Aprovação / rejeição

| Item | Decisão |
|---|---|
| Onde aprovar | Aba na tela `/admin/portal` (listagem existente com filtro por status + ações por linha) |
| Na aprovação | Seta `Company.status = ACTIVE`, `approvedAt`, `approvedById`. Dispara job de email de boas-vindas (stub em `EmailOutbox`) |
| Na rejeição | Soft delete + log (ver abaixo) |
| Motivo | Obrigatório no momento da rejeição |

### Rejeição — soft delete + log (decisão confirmada)

1. `Company.status = REJECTED`, preenche `rejectedAt`, `rejectedById`, `rejectedReason`.
2. O `User` do ADMIN inicial é anonimizado (mesmo padrão do `archive`): email vira `<shortId>.<timestamp>@rejected.local`, `status = REJECTED_USER` (valor novo no enum `UserStatus`), password limpo, PII mínima preservada para o log.
3. Criar registro em `RejectedCompanyLog` com snapshot completo: `cnpj`, `razaoSocial`, `originalEmail`, `originalFirstName`, `originalLastName`, `rejectedReason`, `rejectedById`, `rejectedAt`, `originalPayload` (JSONB).
4. O CNPJ e o email ficam naturalmente liberados para novo cadastro (porque a partial unique ignora REJECTED).

### Feedback de status via login (sem email no MVP)

| Tentativa de login durante | Mensagem exibida |
|---|---|
| `Company.status = PENDING_APPROVAL` | "Aguardando aprovação da Portal AF Soluções. Você receberá uma confirmação assim que for aprovado." |
| `Company.status = REJECTED` | "Cadastro rejeitado. Motivo: {rejectedReason}. Você pode realizar um novo cadastro." |
| `Company.status = ACTIVE` | Login normal |

### Notificações

| Item | Decisão |
|---|---|
| Canais | In-app via `Notification` (entrega imediata); `EmailOutbox` grava pendente (provedor real fica para fase futura) |
| Destinatários da notificação de novo cadastro | Todos os `User.role = SUPER_ADMIN AND companyId IS NULL AND status = ACTIVE` |
| CC fixo | `felipe_duru@hotmail.com` e `adw733@gmail.com` (configurável via env var `ADMIN_NOTIFICATION_CC`) — grava entrada separada em `EmailOutbox` |
| UI in-app | Sino no header com badge de contagem de não lidas + dropdown com últimas 10 |

### Reset de senha (MVP)

- Botão "Gerar senha temporária" no painel de usuários (acessível por SUPER_ADMIN e ADMIN).
- Gera senha aleatória, exibe **uma única vez** em modal com botão "Copiar".
- Usuário é obrigado a trocar no primeiro login (flag `User.mustChangePassword = true`).

---

## 3. Migração de dados — visão geral

Estado atual do banco (consulta de 2026-04-22):

| Role legada | Qtd | Destino |
|---|---|---|
| SUPER_ADMIN | 1 | SUPER_ADMIN (sem mudança) |
| GESTOR | 6 | mantém persistido como `GESTOR`; canônico passa a ser ADMIN (já é hoje) |
| MECANICO | 2 | MANUTENTOR |
| ELETRICISTA | 2 | MANUTENTOR |
| OPERADOR | 4 | MANUTENTOR |
| CONSTRUTOR_CIVIL | 0 | — |
| PLANEJADOR | 0 | PLANEJADOR (fica pronto para novos usuários) |

**Total migrado**: 8 usuários `MECANICO/ELETRICISTA/OPERADOR` → `MANUTENTOR`.

**Enums que serão removidos no final (fase 8)**: `MECANICO`, `ELETRICISTA`, `OPERADOR`, `CONSTRUTOR_CIVIL`. Antes da remoção, confirma-se que não há mais usuários nem código referenciando.

**Enums canônicos que somem do código**: `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY`.

---

## 4. Regras de segurança obrigatórias

- Multi-tenant: **toda** query de negócio continua com `.eq('companyId', session.companyId)` + `requireCompanyScope(session)`.
- Rotas `/api/admin/**` continuam exclusivas de SUPER_ADMIN.
- Signup público **nunca** aceita `role` no payload — é forçado a `ADMIN` no servidor (mesma regra V04 que já existe).
- Rota de signup público **nunca** cria SUPER_ADMIN — checagem explícita rejeita tentativas.
- Login com `Company.status ≠ ACTIVE` retorna a mensagem apropriada mas **não** emite token/sessão.
- Magic link de verificação usa token assinado HMAC com TTL de 24h.
- Normalização: `normalizeTextPayload` em todo POST/PUT/PATCH do signup (exceto campos preservados: email, senha, CNPJ, URLs).
- Rate limit em `POST /api/auth/register` e `POST /api/auth/verify-email`: máximo 5 tentativas por IP a cada 15 minutos.

---

## 5. Fases do plano

### Fase 0 — Preparação e auditoria (pré-requisito)

**Objetivo**: garantir rollback fácil e mapear todos os pontos afetados.

**Passos:**

1. Rodar `scripts/audit-super-admins.ts` para snapshot atual dos SUPER_ADMINs.
2. Exportar backup lógico do banco de produção (Supabase → Export → SQL).
3. Criar branch dedicada `feat/simplificar-perfis-e-signup-empresa`.
4. Rodar busca exaustiva por referências a roles que serão removidas:
   - `grep -rn "TECHNICIAN\|LIMITED_TECHNICIAN\|REQUESTER\|VIEW_ONLY" src/`
   - `grep -rn "MECANICO\|ELETRICISTA\|OPERADOR\|CONSTRUTOR_CIVIL" src/`
   - Anexar lista completa de arquivos afetados como apêndice deste plano (ver Fase 9).

**Critério de saída:** lista de arquivos afetados revisada + backup feito + branch criada.

**Rollback:** não aplicável (apenas coleta).

---

### Fase 1 — Schema: fundação de dados

**Objetivo**: criar toda a estrutura de banco necessária, sem tocar em código de aplicação ainda.

**Migrations (Prisma):**

1. **Enum `UserRole`**: adicionar `MANUTENTOR` (sem remover nada ainda).
2. **Enum `CompanyStatus`** (novo): `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`.
3. **Enum `UserStatus`**: adicionar valor `REJECTED_USER`.
4. **Tabela `Company`**: adicionar colunas
   - `status CompanyStatus DEFAULT 'ACTIVE'` (default preserva comportamento de empresas antigas)
   - `cnpj VARCHAR(18)` (se ainda não existe — checar schema atual primeiro)
   - `razaoSocial VARCHAR(255)`
   - `nomeFantasia VARCHAR(255)`
   - `inscricaoEstadual VARCHAR(30)`
   - `inscricaoMunicipal VARCHAR(30)`
   - `segmento VARCHAR(100)`
   - `porte VARCHAR(20)` (`MEI`, `ME`, `EPP`, `MEDIO`, `GRANDE`)
   - `faixaColaboradores VARCHAR(20)`
   - `website VARCHAR(255)`
   - `cep VARCHAR(9)`
   - `logradouro VARCHAR(255)`
   - `numero VARCHAR(20)`
   - `complemento VARCHAR(100)`
   - `bairro VARCHAR(100)`
   - `cidade VARCHAR(100)`
   - `uf VARCHAR(2)`
   - `pais VARCHAR(50) DEFAULT 'BRASIL'`
   - `emailVerifiedAt TIMESTAMP` (quando magic link foi confirmado)
   - `approvedAt TIMESTAMP`, `approvedById VARCHAR(36) REFERENCES "User"(id) ON DELETE SET NULL`
   - `rejectedAt TIMESTAMP`, `rejectedById VARCHAR(36) REFERENCES "User"(id) ON DELETE SET NULL`, `rejectedReason TEXT`
   - `signupPayload JSONB` (snapshot do form para auditoria)
5. **Tabela `Company` — constraints**:
   - Remover unique global em `cnpj` (se existir).
   - Criar partial unique index: `CREATE UNIQUE INDEX company_cnpj_unique_active ON "Company"(cnpj) WHERE status != 'REJECTED' AND cnpj IS NOT NULL;`
6. **Tabela `User` — colunas novas**:
   - `mustChangePassword BOOLEAN DEFAULT false`
   - `emailVerificationToken VARCHAR(128)` (nullable, usado só durante signup)
   - `emailVerifiedAt TIMESTAMP` (nullable)
7. **Tabela `User` — unique de email**:
   - Manter `email` unique globalmente (é o campo de login).
   - Durante rejeição, o email é renomeado com sufixo `@rejected.local` (mesmo padrão já usado em `archive`). Isso libera o email original para novo cadastro.
8. **Tabela `RejectedCompanyLog`** (nova):
   - `id`, `cnpj`, `razaoSocial`, `nomeFantasia`, `originalEmail`, `originalFirstName`, `originalLastName`, `originalPhone`, `rejectedReason`, `rejectedById`, `rejectedAt`, `originalPayload JSONB`.
   - Índices em `cnpj` e `originalEmail` para auditoria.
9. **Tabela `EmailOutbox`** (nova):
   - `id`, `to` (string), `cc` (string[]), `subject`, `body` (html), `template` (string), `payload JSONB`, `status` (`PENDING`, `SENT`, `FAILED`), `attempts INT DEFAULT 0`, `lastError TEXT`, `createdAt`, `sentAt`, `scheduledFor`.
   - Índice em `status` + `scheduledFor` para futura processamento.
10. **Backfill**:
    - `UPDATE "Company" SET status = 'ACTIVE' WHERE status IS NULL;` (garantia — todas as atuais são ativas).
    - `UPDATE "Company" SET approvedAt = createdAt WHERE approvedAt IS NULL AND status = 'ACTIVE';` (marca aprovadas com a própria data de criação — elas nasceram aprovadas).

**Arquivos:**

- `prisma/schema.prisma` — modelagem.
- `prisma/migrations/YYYYMMDDHHMMSS_company_signup_and_roles/migration.sql` — migration manual revisada.

**Critério de saída:**
- `npm run db:push` aplica sem erro em staging.
- `npx prisma generate` gera client sem warnings.
- Banco contém todas as colunas/tabelas esperadas.
- Empresas existentes continuam com `status = 'ACTIVE'`.

**Rollback:**
- Migration reversa preparada: `DROP` das tabelas/colunas novas + `ALTER TYPE DROP VALUE` dos enums (quando suportado pelo Postgres 17).
- Caso `DROP VALUE` não seja suportado, documentar que a reversão exige restauração do backup.

---

### Fase 2 — Migração de usuários legados → MANUTENTOR

**Objetivo**: migrar os 8 usuários operacionais antigos para a nova role persistida `MANUTENTOR`, sem quebrar o acesso de ninguém.

**Script**: `scripts/migrate-roles-to-manutentor.ts`

Funcionalidade:
1. Modo `--dry-run` por default — só imprime o que mudaria.
2. Modo `--apply` exige flag explícita.
3. Lista todos os usuários com `role IN ('MECANICO', 'ELETRICISTA', 'OPERADOR')`.
4. Atualiza em transação única.
5. Grava log em `auditoria/YYYY-MM-DD/migracao-roles-manutentor/README.md` com lista antes/depois.
6. Verifica invariantes pós-migração: nenhum usuário ficou sem role válida; nenhum `UserUnit` órfão.

**Execução:**

1. Dry-run em staging.
2. Apply em staging.
3. Validação manual: login de 1 usuário migrado, checa redirect para `/work-orders` e acesso a OS/SS/RAF.
4. Dry-run em produção.
5. Janela de manutenção curta (5 min) + apply em produção.

**Critério de saída:**
- Nenhum `User.role IN ('MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL')` restante.
- 8 usuários com `role = 'MANUTENTOR'`.
- Logins operacionais dos usuários migrados funcionam normalmente.

**Rollback:**
- Script reverso: `UPDATE "User" SET role = <role_original> WHERE id IN (<lista>)` com base no log da Fase 2.

---

### Fase 3 — Canonical roles no código

**Objetivo**: atualizar a camada de permissões para refletir os 4 perfis canônicos.

**Arquivos tocados:**

1. `src/lib/user-roles.ts`:
   - Remover `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY` do tipo `CanonicalUserRole`.
   - Adicionar `PLANEJADOR` e `MANUTENTOR`.
   - Atualizar `normalizeUserRole`: mapeia `GESTOR → ADMIN`, `PLANEJADOR → PLANEJADOR`, `MANUTENTOR → MANUTENTOR`, `MECANICO/ELETRICISTA/OPERADOR → MANUTENTOR` (fallback defensivo enquanto enums legados existem no DB).
   - Atualizar `toPersistedUserRole`: `ADMIN → GESTOR`, `PLANEJADOR → PLANEJADOR`, `MANUTENTOR → MANUTENTOR`.
   - Atualizar `getRoleDisplayName`: labels "Gestor" (ADMIN), "Planejador", "Manutentor".
   - Atualizar `isOperationalRole`: apenas `MANUTENTOR` retorna `true`.
   - Atualizar `isAdminRole`: `SUPER_ADMIN` e `ADMIN` (sem mudança).
   - Atualizar `getDefaultCmmsPath`:
     - SUPER_ADMIN sem `companyId` ativo → `/admin/select-company`
     - SUPER_ADMIN com `companyId` ativo → `/dashboard`
     - ADMIN → `/dashboard`
     - PLANEJADOR → `/dashboard`
     - MANUTENTOR → `/work-orders`

2. `src/lib/permissions.ts`:
   - Reescrever `PERMISSIONS` com matriz final de 4 roles.
   - PLANEJADOR herda permissões do ADMIN exceto:
     - `work-orders`: `create=false, delete=false, approve=false, view=true, edit=true, execute=true`
     - `requests`: `delete=false, approve=false, view=true, create=true, edit=true`
     - `rafs`: `delete=false, view=true, create=true, edit=true`
     - `settings`: tudo `false`
   - MANUTENTOR idêntico ao antigo LIMITED_TECHNICIAN.
   - Atualizar `getRoleDescription` com textos para PLANEJADOR e MANUTENTOR.

3. `src/lib/admin-scope.ts`:
   - Confirmar que `ensureAdminUnitAccess` continua tratando apenas ADMIN.
   - **Não** aplicar auto-link em PLANEJADOR — essa role é escopo explícito.

4. Componentes que filtram `role`:
   - `src/app/people-teams/page.tsx`: ajustar o select de role para exibir apenas `ADMIN`, `PLANEJADOR`, `MANUTENTOR` (SUPER_ADMIN nunca é opção aqui).
   - Qualquer componente que tenha switch/map exaustivo sobre roles (ex: badges, cores, ícones) deve ser atualizado — lista produzida na Fase 0.

**Critério de saída:**
- TypeScript compila sem erro.
- `npm run lint` passa.
- Testes existentes passam.
- Login manual com cada role mostra sidebar/redirect corretos.

**Rollback:**
- Reverter commit via git. O banco não é afetado nesta fase.

---

### Fase 4 — Signup público

**Objetivo**: entregar o fluxo completo de cadastro da empresa + verificação de email + notificação para SUPER_ADMIN + aprovação/rejeição.

#### 4.1 — API de signup

**Rota**: `POST /api/auth/register`

- Abrir para público (sem `requireSession`).
- Body (validado com Zod):
  ```ts
  {
    company: {
      cnpj, razaoSocial, nomeFantasia, inscricaoEstadual?, inscricaoMunicipal?,
      segmento, porte, faixaColaboradores, website?, phone, email,
      cep, logradouro, numero, complemento?, bairro, cidade, uf, pais
    },
    admin: {
      firstName, lastName, email, phone, password, confirmPassword
    },
    products: string[] // slugs de CompanyProduct
    acceptedTermsAt: string // ISO timestamp
  }
  ```
- Validações:
  - CNPJ: dígitos verificadores.
  - CNPJ: partial unique (rejeita se já existe empresa ativa/pendente com mesmo CNPJ).
  - Email do admin: formato válido, não existe como `User` ativo.
  - Senha: mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial.
  - Senhas batem.
  - Email da empresa: formato válido.
  - Pelo menos 1 produto selecionado.
  - Termos aceitos (timestamp).
- Ação:
  1. Gera token de verificação de email (UUID + HMAC).
  2. Cria `Company` com `status = 'PENDING_APPROVAL'`, preenche todos os campos, guarda `signupPayload` no JSONB.
  3. Cria `Location` raiz da empresa (nome = nome fantasia).
  4. Cria `User` ADMIN com `emailVerificationToken` e `emailVerifiedAt = NULL`.
  5. Cria `UserUnit` vinculando admin à Location raiz.
  6. Cria `CompanyProduct` para cada produto selecionado com `status = 'PENDING'`.
  7. Grava entrada em `EmailOutbox` para o email de verificação (stub).
  8. Em ambiente de desenvolvimento/staging, **retorna o link de verificação no response** (debug).
  9. Em produção, não retorna o link (quando email provider estiver configurado).
- Retorna `{ ok: true, message: 'Cadastro enviado. Verifique seu email para confirmar.' }`.

**Rate limit**: 5 por IP / 15 min.

#### 4.2 — Verificação de email

**Rota**: `GET /api/auth/verify-email?token=xxx`

- Valida token (HMAC + TTL).
- Marca `User.emailVerifiedAt = now()`, `emailVerificationToken = NULL`.
- Marca `Company.emailVerifiedAt = now()`.
- Cria notificação in-app para **todos** os SUPER_ADMINs: `{ title: 'Nova empresa aguardando aprovação', message: 'RAZAO_SOCIAL (CNPJ) cadastrada por NOME', ... }`.
- Grava entrada em `EmailOutbox` com notificação para SUPER_ADMINs + CC para os 2 emails fixos.
- Redireciona para `/register/verified` (página de confirmação).

**Rate limit**: 10 por IP / 15 min.

#### 4.3 — Login bloqueado por status da empresa

**Arquivo**: `src/app/api/auth/login/route.ts`

- Após validar credenciais, carregar `Company` e checar `status`:
  - `PENDING_APPROVAL` + `emailVerifiedAt IS NULL` → retorna 403 `{ error: 'EMAIL_NOT_VERIFIED' }`.
  - `PENDING_APPROVAL` + email verificado → retorna 403 `{ error: 'PENDING_APPROVAL' }`.
  - `REJECTED` → retorna 403 `{ error: 'REJECTED', reason: company.rejectedReason }`.
  - `ACTIVE` → fluxo normal atual.
- SUPER_ADMIN (`companyId = NULL`) não passa por essa checagem.

**Arquivo**: `src/app/login/page.tsx`

- Tradução dos erros:
  - `EMAIL_NOT_VERIFIED` → "Confirme seu email antes de fazer login."
  - `PENDING_APPROVAL` → "Aguardando aprovação da Portal AF Soluções. Você receberá uma confirmação assim que for aprovado."
  - `REJECTED` → "Cadastro rejeitado. Motivo: {reason}. Você pode realizar um novo cadastro."
  - Genéricos: mantém mensagens atuais.

#### 4.4 — Aprovação / rejeição (admin)

**Rota**: `POST /api/admin/companies/[id]/approve`
- Acesso: SUPER_ADMIN apenas.
- Valida: `Company.status = 'PENDING_APPROVAL'` e `emailVerifiedAt` preenchido.
- Ação: `status = 'ACTIVE'`, `approvedAt = now()`, `approvedById = session.userId`.
- Habilita `CompanyProduct` selecionados (`status = 'ACTIVE'`).
- Cria notificação in-app para o ADMIN: "Sua empresa foi aprovada! Faça login para começar."
- Grava `EmailOutbox` com email de boas-vindas (stub).
- Retorna `{ data: { id, status: 'ACTIVE' } }`.

**Rota**: `POST /api/admin/companies/[id]/reject`
- Acesso: SUPER_ADMIN apenas.
- Body: `{ reason: string }` (obrigatório, mínimo 10 caracteres).
- Valida: `Company.status = 'PENDING_APPROVAL'`.
- Ação transacional:
  1. Copia dados relevantes para `RejectedCompanyLog`.
  2. Anonimiza User ADMIN (email → `<shortId>.<ts>@rejected.local`, status → `REJECTED_USER`, password limpo).
  3. `Company.status = 'REJECTED'`, `rejectedAt`, `rejectedById`, `rejectedReason`.
  4. Grava `EmailOutbox` com email de rejeição (stub) incluindo motivo.
- Retorna `{ data: { id, status: 'REJECTED' } }`.

#### 4.5 — UI da fila de aprovação

**Arquivo**: `src/app/admin/portal/page.tsx` (existente)

Mudanças:
- Adicionar filtro por `status` no toolbar (padrão: exibe pendentes).
- Adicionar badge ao lado do nome: `Pendente`, `Aprovada`, `Rejeitada`.
- Nova aba "Pendentes de aprovação" com contagem (usa badge no trigger).
- No painel de detalhe de Company com `status = 'PENDING_APPROVAL'`: botões "Aprovar" (primário) e "Rejeitar" (outline danger).
- Modal de rejeição: campo `reason` com textarea obrigatório + botão "Confirmar rejeição".

#### 4.6 — UI de cadastro público

**Arquivo**: `src/app/register/page.tsx` (existente, vai ser reescrito)

Formulário em seções colapsáveis (usa `ModalSection` ou componente equivalente em página):

1. **Dados da empresa**: CNPJ (com auto-fill via BrasilAPI), Razão Social, Nome Fantasia, Inscrição Estadual, Inscrição Municipal.
2. **Contato e identidade**: Email corporativo, Telefone, Website, Segmento (select), Porte (select), Faixa de colaboradores (select).
3. **Endereço**: CEP (auto-fill via ViaCEP), Logradouro, Número, Complemento, Bairro, Cidade, UF, País.
4. **Produtos**: checkboxes com os produtos disponíveis (CMMS marcado por default, GVP e GPA se já estiverem em `COMING_SOON` aparecem como opcionais).
5. **Responsável (primeiro ADMIN)**: Nome, Sobrenome, Email, Telefone, Senha, Confirmação de senha.
6. **Termos**: checkbox obrigatório com link para Termos de Uso e Política de Privacidade.

Botão "Cadastrar" submete para `POST /api/auth/register`. Após sucesso, redireciona para `/register/pending` com mensagem de "verifique seu email".

**Página `/register/pending`**: informa que email foi enviado + link "Já verifiquei, ir para login".
**Página `/register/verified`**: "Email confirmado. Aguarde aprovação da Portal AF Soluções."
**Página `/register/rejected`**: sem uso direto — mensagem vem via login.

**Link da Home Page**: adicionar botão "Cadastre sua empresa" em destaque na home `/` (se existe) ou na `/login`.

#### 4.7 — Integração BrasilAPI (opcional mas recomendada)

- Hook `useCnpjLookup(cnpj)` que chama `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` client-side.
- Auto-preenche Razão Social, Nome Fantasia, endereço.
- Falha silenciosa (se API offline, usuário preenche manualmente).

**Critério de saída:**
- Fluxo completo funciona em staging: cadastro → email de verificação → aprovação → login.
- Rejeição libera CNPJ e email para novo cadastro.
- SUPER_ADMIN recebe notificação in-app.
- `EmailOutbox` tem entradas pendentes para todos os 4 emails (verificação, notificação SA, boas-vindas, rejeição) + CC configurado.

**Rollback:**
- Bloquear rota de signup (return 503) + esconder botão na home.
- Reverter commits da fase.

---

### Fase 5 — SUPER_ADMIN: seleção e troca de empresa

**Objetivo**: dar ao SUPER_ADMIN a capacidade de selecionar e alternar entre empresas.

#### 5.1 — Sessão

**Arquivo**: `src/lib/session.ts` (ou equivalente)

- Adicionar campo `activeCompanyId` na sessão (nullable, só faz sentido para SUPER_ADMIN).
- Enquanto `activeCompanyId` é `NULL`, SUPER_ADMIN é tratado como "sem empresa selecionada" e é redirecionado para `/admin/select-company`.
- Todas as queries CMMS usam `session.companyId` efetivo = `session.activeCompanyId` (para SA) ou `session.companyId` (para demais roles).

#### 5.2 — Tela de seleção

**Arquivo**: `src/app/admin/select-company/page.tsx` (verificar se existe; criar/ajustar)

- Lista todas as empresas com `status = 'ACTIVE'` (SUPER_ADMIN também pode ver `PENDING_APPROVAL` e `REJECTED` com filtro específico para auditoria).
- Grid de cards: logo, nome fantasia, CNPJ, badge de status, nº de unidades, nº de usuários.
- Clique no card → `POST /api/admin/switch-company` → grava `activeCompanyId` na sessão → redireciona para `/dashboard`.
- Busca por razão social / nome fantasia / CNPJ.

#### 5.3 — Rota de troca

**Rota**: `POST /api/admin/switch-company`
- Acesso: SUPER_ADMIN apenas.
- Body: `{ companyId: string }`.
- Valida: `Company` existe e `status = 'ACTIVE'` (ou permite qualquer status — a ser confirmado no review final).
- Grava `activeCompanyId` na sessão (via cookie ou token regenerado).
- Retorna `{ ok: true, redirectTo: '/dashboard' }`.

#### 5.4 — Botão "Trocar empresa" no header

**Arquivo**: `src/components/layout/AppHeader.tsx` (ou equivalente)

- Quando `session.role = 'SUPER_ADMIN' && session.activeCompanyId`:
  - Exibe badge "Visualizando: NomeDaEmpresa".
  - Botão "Trocar empresa" (ícone `swap_horiz`) que navega para `/admin/select-company`.
- Quando `session.role = 'SUPER_ADMIN' && !activeCompanyId`: nem aparece (já está na tela de seleção).
- Outros perfis: nada muda.

#### 5.5 — Rota de "sair" da empresa

**Rota**: `POST /api/admin/clear-active-company`
- Acesso: SUPER_ADMIN apenas.
- Limpa `activeCompanyId`.
- Usado pelo botão "Trocar empresa" se quisermos passar por uma "tela limpa" antes da nova seleção.

**Critério de saída:**
- SUPER_ADMIN pós-login cai em `/admin/select-company`.
- Ao escolher uma empresa, vê todos os dados apenas daquela.
- Botão "Trocar empresa" visível e funcional.
- Testes E2E com SUPER_ADMIN passando por 2 empresas diferentes sem vazamento de dados.

**Rollback:**
- Reverter commits; schema permanece compatível (o campo `activeCompanyId` na sessão é opcional).

---

### Fase 6 — UI: notificações in-app

**Objetivo**: entregar o sino de notificações no header com badge e dropdown.

#### 6.1 — APIs

**Rota**: `GET /api/notifications`
- Retorna as últimas 20 notificações do usuário + contagem de `unread`.

**Rota**: `POST /api/notifications/[id]/read`
- Marca como lida.

**Rota**: `POST /api/notifications/read-all`
- Marca todas como lidas.

#### 6.2 — Componente `NotificationBell`

**Arquivo**: `src/components/layout/NotificationBell.tsx` (novo)

- Ícone `notifications` no header.
- Badge vermelho com contagem de unread (cap em 99+).
- Polling a cada 30s (ou SSE/WebSocket em fase futura).
- Dropdown com lista.
- Clique em item → marca como lido + navega (se tiver `href`).

#### 6.3 — Integração

- Header inclui `<NotificationBell />` para qualquer usuário logado.
- Notificações já implementadas pela Fase 4: "Nova empresa aguardando aprovação" para SUPER_ADMINs.
- Mais notificações podem ser adicionadas em fases futuras (OS atribuída, SS aprovada, etc.) — fora do escopo deste plano.

**Critério de saída:**
- Sino aparece em todas as telas logadas.
- Notificação de novo cadastro chega em tempo real (próximo polling).
- Marcar como lido funciona.

**Rollback:**
- Esconder componente + reverter rotas (tabela `Notification` já existe e não sofre impacto).

---

### Fase 7 — Reset manual de senha

**Objetivo**: permitir que SUPER_ADMIN/ADMIN resete a senha de um usuário via painel.

#### 7.1 — API

**Rota**: `POST /api/users/[id]/reset-password`
- Acesso: SUPER_ADMIN (qualquer usuário) ou ADMIN (apenas usuários da própria empresa).
- Gera senha aleatória de 12 caracteres (alfanuméricos + símbolo).
- Hash com bcrypt.
- Seta `mustChangePassword = true`.
- Retorna `{ data: { temporaryPassword } }` — **única vez** que a senha em texto claro aparece.

#### 7.2 — UI

- No painel de detalhe do usuário (`/people-teams`), botão "Resetar senha" (vermelho outline).
- Modal de confirmação.
- Após sucesso, modal com senha temporária em destaque + botão "Copiar".
- Mensagem: "Repasse essa senha ao usuário com segurança. Ela só será exibida uma vez."

#### 7.3 — Forçar troca no primeiro login

**Arquivo**: `src/app/api/auth/login/route.ts`

- Se `user.mustChangePassword = true`, resposta inclui flag `forcePasswordChange = true`.
- Cliente redireciona para tela `/change-password` (nova página ou modal obrigatório).

**Rota**: `POST /api/auth/change-password`
- Body: `{ currentPassword, newPassword, confirmNewPassword }`.
- Valida senha atual.
- Atualiza hash + `mustChangePassword = false`.

**Critério de saída:**
- ADMIN consegue resetar senha de um MANUTENTOR.
- Usuário loga com a temporária e é forçado a trocar.

**Rollback:**
- Reverter commits. Campo `mustChangePassword` pode permanecer no schema sem impacto.

---

### Fase 8 — Cleanup de enums legados (opcional e cauteloso)

**Objetivo**: remover valores antigos do enum `UserRole` após confirmação de estabilidade.

**Pré-requisitos:**
- Fase 2 aplicada em produção há pelo menos 14 dias.
- Zero usuários com `role IN ('MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL')`.
- Zero referências no código (verificado por grep).

**Migration:**
- Remover valores `MECANICO`, `ELETRICISTA`, `OPERADOR`, `CONSTRUTOR_CIVIL` do enum `UserRole`.
- Postgres 17: `ALTER TYPE "UserRole" RENAME TO "UserRole_old"; CREATE TYPE "UserRole" AS ENUM('SUPER_ADMIN', 'GESTOR', 'PLANEJADOR', 'MANUTENTOR'); ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole" USING role::text::"UserRole"; DROP TYPE "UserRole_old";`

**Risco**: irreversível sem backup. Executar apenas após confirmação explícita.

**Rollback**: restauração do backup.

---

### Fase 9 — Documentação

**Objetivo**: atualizar toda a documentação canônica para refletir as mudanças.

**Arquivos:**

1. `CLAUDE.md`:
   - Atualizar lista de "Roles canonicos de produto" para apenas `SUPER_ADMIN`, `ADMIN`, `PLANEJADOR`, `MANUTENTOR`.
   - Atualizar descrição de `SUPER_ADMIN` para incluir o fluxo de seleção de empresa.

2. `.claude/rules/api.md`:
   - Substituir todas as referências a `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY` pelos novos perfis.
   - Adicionar seção "Signup Público de Empresa" com contrato das novas rotas.
   - Atualizar a regra sobre Aprovações para incluir PLANEJADOR como aprovador.
   - Documentar as novas rotas de approve/reject/switch-company.
   - Atualizar a seção sobre `POST /api/admin/companies` explicando coexistência com `/api/auth/register`.

3. `.claude/rules/components.md`:
   - Atualizar a regra sobre "Troca de unidade" para incluir PLANEJADOR.
   - Adicionar seção sobre `NotificationBell`.
   - Atualizar mapa de telas com `/register`, `/register/pending`, `/register/verified`, `/admin/select-company`.

4. `.claude/rules/database.md`:
   - Documentar `CompanyStatus` enum.
   - Documentar tabelas `RejectedCompanyLog` e `EmailOutbox`.
   - Documentar partial unique index em `Company.cnpj`.
   - Atualizar lista de roles esperadas.

5. `docs/SPEC.md`:
   - Nova seção "Cadastro Público de Empresa".
   - Nova seção "Fila de Aprovação (SUPER_ADMIN)".
   - Atualizar seção de perfis.

6. `docs/SEGURANCA.md`:
   - Documentar rate limits de `/api/auth/register` e `/api/auth/verify-email`.
   - Documentar tratamento de tokens de verificação.
   - Documentar proibição de criar SUPER_ADMIN via signup.

7. `docs/DEPRECATIONS.md`:
   - Adicionar entradas para os canônicos removidos (`TECHNICIAN`, etc.) com data e condição de remoção.

**Critério de saída:**
- Todos os documentos citados consistentes com o novo estado do sistema.
- Nenhuma referência remanescente aos perfis antigos na documentação.

---

### Fase 10 — Testes E2E (Playwright)

**Objetivo**: cobrir os fluxos críticos automaticamente.

**Arquivos novos em `tests/`:**

1. `signup-company-happy-path.spec.ts`:
   - Preenche form, submete, verifica email (pega token do response em dev).
   - Confirma email.
   - SUPER_ADMIN aprova.
   - Admin da empresa loga com sucesso.

2. `signup-company-rejection.spec.ts`:
   - Cadastra.
   - SUPER_ADMIN rejeita com motivo.
   - Admin tenta logar — vê mensagem de rejeição.
   - Admin recadastra com mesmo CNPJ + email → aceito.

3. `role-redirects.spec.ts`:
   - Login por perfil (SUPER_ADMIN, ADMIN, PLANEJADOR, MANUTENTOR) e verificação de redirect.

4. `super-admin-switch-company.spec.ts`:
   - SUPER_ADMIN escolhe empresa A, vê dados de A.
   - Troca para empresa B, vê dados de B.
   - Assert que não há vazamento visual entre tenants.

5. `planejador-permissions.spec.ts`:
   - Login como PLANEJADOR.
   - Verifica que não vê `Configurações do Portal`.
   - Verifica que pode aprovar SS.
   - Verifica que não pode deletar OS/SS/RAF.
   - Verifica escopo de unidade (apenas unidades atribuídas).

6. `manutentor-permissions.spec.ts`:
   - Login como MANUTENTOR.
   - Verifica redirect para `/work-orders`.
   - Verifica que não vê Dashboard, Ativos, Planos, etc.
   - Verifica que pode executar OS e abrir SS.

**Evidências**: gravar screenshots apenas com `ALLOW_SCREENSHOT_AUTOMATION=1` e salvar em `auditoria/YYYY-MM-DD/simplificacao-perfis-e-signup/evidencias/`.

**Critério de saída:**
- Todos os testes acima passam localmente e no CI.
- `npm run test` sem falhas.

---

### Fase 11 — Deploy e monitoramento

**Objetivo**: rollout seguro para produção.

**Sequência:**

1. Merge da branch em `main` após review.
2. Deploy em staging com dados de produção clonados.
3. QA manual completo (ver checklist de aceitação abaixo).
4. Deploy em produção em janela de baixa atividade.
5. Executar Fase 2 (migração de roles) logo após o deploy.
6. Monitoramento ativo por 48h:
   - Taxa de erro em `/api/auth/login`.
   - Volume em `/api/auth/register` (detectar abuse).
   - Fila `EmailOutbox` crescendo (esperado, sem consumidor ainda).
7. Comunicar usuários operacionais migrados (MECANICO/ELETRICISTA/OPERADOR → MANUTENTOR) — via canal próprio (telefone/WhatsApp), já que email não está ligado.

**Plano de contingência:**

- Se algo quebrar: reverter o deploy para o commit anterior. Schema novo é aditivo — convive com código antigo.
- Se Fase 2 der problema: executar script reverso de roles.

---

## 6. Checklist de aceitação (QA manual)

### Signup público

- [ ] Home tem link visível "Cadastre sua empresa".
- [ ] Formulário de cadastro tem todas as seções (empresa, endereço, produtos, responsável, termos).
- [ ] CNPJ inválido é rejeitado com mensagem clara.
- [ ] CNPJ já usado por empresa ativa é rejeitado.
- [ ] CNPJ de empresa rejeitada é aceito em novo cadastro.
- [ ] Senha fraca é rejeitada com mensagem.
- [ ] Após submeter, usuário vê tela `/register/pending`.
- [ ] Link de verificação (do response em dev) funciona.
- [ ] Após verificar, SUPER_ADMIN recebe notificação in-app.
- [ ] `EmailOutbox` tem entradas PENDING (verificação, notificação, CCs).

### Aprovação

- [ ] `/admin/portal` mostra filtro "Pendentes" com badge de contagem.
- [ ] SUPER_ADMIN aprova → empresa fica ACTIVE.
- [ ] Admin loga e entra normalmente no dashboard.
- [ ] SUPER_ADMIN rejeita sem motivo → erro.
- [ ] SUPER_ADMIN rejeita com motivo → empresa fica REJECTED, User anonimizado, log criado.
- [ ] Admin tenta logar após rejeição → vê mensagem com motivo.

### Perfis e permissões

- [ ] SUPER_ADMIN pós-login cai em `/admin/select-company`.
- [ ] SUPER_ADMIN escolhe empresa → cai em `/dashboard` da empresa escolhida.
- [ ] Botão "Trocar empresa" visível no header.
- [ ] SUPER_ADMIN troca para outra empresa → dados trocam corretamente, sem vazamento.
- [ ] ADMIN entra em `/dashboard` e vê todas as unidades.
- [ ] PLANEJADOR entra em `/dashboard` e vê apenas unidades atribuídas.
- [ ] PLANEJADOR consegue aprovar SS via `/requests/approvals`.
- [ ] PLANEJADOR **não** consegue deletar OS/SS/RAF.
- [ ] PLANEJADOR **não** vê `Configurações do Portal`.
- [ ] MANUTENTOR entra em `/work-orders`.
- [ ] MANUTENTOR não vê `Dashboard`, `Ativos`, `Planos`, `Pessoas`, `Cadastros`, `Localizações`, `KPI`, `Analytics`.
- [ ] MANUTENTOR consegue executar OS e abrir SS/RAF.

### Notificações e reset de senha

- [ ] Sino aparece em todas as telas logadas.
- [ ] Badge mostra contagem de unread.
- [ ] Clique em notificação marca como lida.
- [ ] ADMIN reseta senha de MANUTENTOR.
- [ ] MANUTENTOR loga com senha temporária → forçado a trocar.
- [ ] Após trocar, pode logar normalmente com a nova senha.

### Migração

- [ ] Todos os ex-MECANICO/ELETRICISTA/OPERADOR agora são MANUTENTOR.
- [ ] Login deles funciona.
- [ ] Redirect vai para `/work-orders`.
- [ ] `UserUnit` preservado.

### Regressão (não pode quebrar)

- [ ] SUPER_ADMIN existente (`platform@portalafsolucoes.com`) loga normalmente.
- [ ] Fluxos de OS, SS, RAF continuam funcionando.
- [ ] Criação de empresa via `/api/admin/companies` (rota antiga) continua funcionando para SUPER_ADMIN.
- [ ] Printviews, batch prints, Criticidade drilldown continuam OK.

---

## 7. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Quebra de login para os 8 usuários migrados | Média | Alto | Dry-run obrigatório + janela curta de manutenção + script reverso pronto |
| Spam de cadastros públicos | Alta | Médio | Rate limit + magic link + aprovação manual obrigatória |
| CNPJ duplicado entre empresa ACTIVE e PENDING | Baixa | Médio | Partial unique index cobre ACTIVE e PENDING |
| Esquecimento de atualizar um caller de role antigo | Média | Médio | Grep exaustivo na Fase 0 + lint/TS errors forçam correção |
| SUPER_ADMIN rejeita por engano | Baixa | Alto | Motivo obrigatório + log permanente + possível feature futura de "revogar rejeição" |
| Vazamento de tenant no modo SUPER_ADMIN | Baixa | Crítico | Teste E2E dedicado + revisão de todas as queries para usar `activeCompanyId` |
| Email de verificação não chega (fase sem provedor) | Certa | Alto | Em dev/staging, link volta no response. Em produção, SUPER_ADMIN valida manualmente via email cadastrado |
| Senha temporária exposta em logs | Baixa | Crítico | Nunca logar resposta de `/reset-password`; redação explícita no header HTTP |

---

## 8. Fora do escopo (deliberado)

- Integração real com provedor de email (fica em `EmailOutbox` para fase futura).
- Fluxo completo de "esqueci minha senha" self-service (fica manual via admin).
- Billing/subscription por empresa.
- Multi-idioma.
- Aprovação condicional (ex: só aprova após pagamento).
- Feature flags ou toggles de rollout gradual.

---

## 9. Estimativa grosseira de esforço

| Fase | Complexidade | Esforço relativo |
|---|---|---|
| 0 — Preparação | Baixa | 0.5 |
| 1 — Schema | Média | 2 |
| 2 — Migração de dados | Baixa | 1 |
| 3 — Canonical roles no código | Média-Alta | 3 |
| 4 — Signup público | Alta | 5 |
| 5 — Seleção de empresa | Média | 2 |
| 6 — Sino de notificações | Baixa-Média | 1.5 |
| 7 — Reset de senha | Baixa | 1 |
| 8 — Cleanup de enums | Baixa (mas adia 2 semanas) | 0.5 |
| 9 — Documentação | Média | 2 |
| 10 — Testes E2E | Média | 2 |
| 11 — Deploy e monitoramento | Baixa | 1 |
| **Total** | — | **≈ 21.5** unidades relativas |

Escala em unidades relativas (cada unidade ≈ 2-4h de foco produtivo dependendo de interrupções). Um desenvolvedor dedicado deve completar as Fases 0-11 (exceto Fase 8) em aproximadamente 2-3 semanas de trabalho focado. Fase 8 fica no backlog para 2 semanas após o go-live.

---

## 10. Ordem de aprovação antes de começar

Antes de iniciar qualquer código, confirmar:

- [ ] Usuário aprovou este plano como um todo.
- [ ] Branch `feat/simplificar-perfis-e-signup-empresa` criada.
- [ ] Backup do banco feito.
- [ ] Janela de manutenção planejada para Fase 2 (5 min estimados).
- [ ] Canal de comunicação pronto para avisar os 8 usuários operacionais sobre a migração.

Após essa checklist, executar Fase 0 → Fase 1 → Fase 2 (com dry-run) → revisar → seguir para Fase 3 e diante.
