# Levantamento de Seguranca para Go-Live

## Resumo Executivo
- Data da analise: `2026-04-11`
- Ambiente analisado: codigo-fonte local do repositorio `cmm_gestor_manutencao`
- Tipo de avaliacao: auditoria estatica de seguranca + revisao de configuracao + auditoria de dependencias
- Resultado geral: `NO-GO` para liberar ao cliente final no estado atual

### Veredito
O sistema, do jeito que esta hoje, nao deve ser disponibilizado ao cliente final amanha sem uma rodada emergencial de correcoes. Existem vulnerabilidades estruturais de autenticacao, autorizacao e isolamento multiempresa que permitem:

- forjar sessao no cliente
- elevar privilegio para `ADMIN` e `SUPER_ADMIN`
- acessar ou alterar dados sem checagem central de permissao
- expor endpoints sem autenticacao
- operar o banco com privilegios elevados (`service_role`) em praticamente toda a aplicacao

Se for inevitavel apresentar algo amanha, a recomendacao segura e limitar a exibicao a um ambiente de homologacao restrito, com acesso controlado por IP/VPN e sem dados reais de cliente.

## Metodologia
- Leitura obrigatoria do fluxo do repositorio: `CONVENTIONS.md`, `docs/SPEC.md`, `CLAUDE.md`, `docs/AUDITORIA.md`, `.claude/rules/api.md`, `.claude/rules/database.md`, `.claude/rules/testing.md`
- Revisao de autenticacao, sessao, middleware, autorizacao e multiempresa/unidade
- Varredura de `89` route handlers em `src/app/api`
- Revisao de configuracao de build/deploy
- Revisao de dependencia com `npm audit --json`

## Achados Prioritarios

### Critico 1 - Sessao pode ser forjada no cookie
Impacto:
- qualquer pessoa que consiga montar um cookie `session` valido em JSON pode se passar por outro usuario
- como as APIs confiam no conteudo do cookie, o atacante pode forjar `id`, `companyId`, `unitId`, `role` e `canonicalRole`
- nao existe assinatura, criptografia, revogacao ou revalidacao server-side

Evidencia:
- `src/lib/session.ts:19-47` salva a sessao como `JSON.stringify(user)` e depois apenas faz `JSON.parse(sessionCookie.value)`
- `src/middleware.ts:4-28` considera autenticado qualquer request que apenas tenha o cookie `session`

Observacao:
- com `sameSite: 'none'` em HTTPS, a superficie para abuso e CSRF fica maior

### Critico 2 - Escalada de privilegio via email/username/jobTitle
Impacto:
- um usuario comum pode se tornar `ADMIN` ou `SUPER_ADMIN` sem alteracao real do papel no banco
- a decisao de acesso depende de campos mutaveis como email, username e `jobTitle`

Evidencia:
- `src/lib/user-roles.ts:92-125`
- `email.includes('super.admin')` promove para `SUPER_ADMIN`
- `email.startsWith('admin@')` ou `jobTitle.includes('administrador')` promove para `ADMIN`
- `src/app/api/profile/route.ts:88-135` permite que o proprio usuario altere `email` e `jobTitle`
- `src/app/api/profile/route.ts:194-208` recria a sessao usando `normalizeUserRole(...)`
- `src/app/api/auth/login/route.ts:73-80` tambem recalcula o papel canonico com base nesses campos

Conclusao:
- este e um bloqueador absoluto de go-live

### Critico 3 - Aplicacao usa Supabase com privilegio elevado em toda a camada de API
Impacto:
- a aplicacao opera com `service_role` na maior parte das rotas
- isso ignora RLS e transforma qualquer falha de sessao/autorizacao em acesso direto ao dado real

Evidencia:
- `src/lib/supabase.ts:19-30` cria o client principal com `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`
- dezenas de rotas importam `supabase` diretamente

Conclusao:
- hoje a seguranca depende quase 100% do codigo de API estar perfeito; ele nao esta

### Critico 4 - Grande volume de rotas sem checagem central de autorizacao
Resumo tecnico:
- rotas auditadas: `89`
- rotas com sessao ou secret: `85`
- rotas com checagem de autorizacao detectada: `39`
- rotas sem checagem central detectada: `50`

Impacto:
- muitos endpoints validam apenas "tem sessao?" e nao "tem permissao para esta acao neste modulo?"
- isso quebra a regra da spec de validar sempre `perfil + empresa + unidade ativa`

Exemplos concretos:
- `src/app/api/teams/[id]/route.ts:10-205`
  - nao usa `checkApiPermission`
  - qualquer usuario logado da mesma empresa pode consultar, editar e excluir equipes
- `src/app/api/parts/route.ts:7-110`
  - qualquer usuario logado pode listar e criar pecas
- `src/app/api/maintenance-plans/standard/route.ts:6-89`
  - qualquer usuario logado pode listar e criar planos padrao
- `src/app/api/maintenance-plans/standard/[id]/route.ts:6-117`
  - qualquer usuario logado pode detalhar, editar e excluir plano padrao
- `src/app/api/kpi/route.ts:5-157`
  - qualquer usuario logado pode consultar indicadores, mesmo sem permissao de KPI
- `src/app/api/work-orders/[id]/execute/route.ts:9-105`
  - nao usa permissao central e nao filtra a OS por empresa na consulta inicial

### Critico 5 - Endpoints do modulo GEP expostos sem autenticacao
Impacto:
- dados de processo industrial podem estar acessiveis sem login
- listagem de arquivos e leitura de dados do GEP ficam publicas

Evidencia:
- `src/app/api/gep/data/route.ts:4-101` nao valida sessao
- `src/app/api/gep/files/route.ts:4-26` nao valida sessao

Observacao:
- alem da exposicao, `route.ts` retorna mensagens de erro detalhadas e em desenvolvimento pode retornar stack

### Critico 6 - Secret de cron com fallback inseguro
Impacto:
- se `CRON_SECRET` nao estiver configurado corretamente, o endpoint fica protegido por um valor padrao conhecido
- o endpoint manipula ordens de servico em lote

Evidencia:
- `src/app/api/cron/generate-preventive-maintenance/route.ts:50-55`
- fallback para `'your-secret-key-here'`
- `GET` de teste ainda exposto em producao em `src/app/api/cron/generate-preventive-maintenance/route.ts:223-229`

### Alto 7 - Falta de validacao forte de escopo company/unit em varias rotas
Resumo tecnico:
- rotas com sessao analisadas: `84`
- rotas sem padrao detectavel de escopo por empresa: `21`
- rotas sem padrao detectavel de escopo por unidade: `72`

Impacto:
- varias operacoes fazem `update`/`delete` apenas por `id`
- muitas escritas aceitam FKs e listas de IDs sem validar se pertencem a empresa ativa

Exemplos:
- `src/app/api/files/[id]/route.ts:15-43`
  - deleta arquivo por `id` sem validar `companyId`
- `src/app/api/admin/users/[id]/units/route.ts:63-83`
  - recria `UserUnit` sem validar se `unitIds` pertencem a empresa ativa
- `src/app/api/teams/[id]/route.ts:121-143`
  - insere `memberIds` sem validar se os usuarios pertencem a mesma empresa
- `src/app/api/basic-registrations/[entity]/[id]/route.ts:94-109`
  - atualiza por `id` sem filtro explicito de `companyId`

### Alto 8 - Mass assignment em endpoints de update
Impacto:
- alguns handlers fazem `update(body)` quase integralmente
- isso facilita alteracao indevida de campos tecnicos e referencias nao previstas

Exemplos:
- `src/app/api/basic-registrations/[entity]/[id]/route.ts:82-109`
- `src/app/api/maintenance-plans/standard/[id]/route.ts:61-89`
- `src/app/api/maintenance-plans/asset/[id]/route.ts:65-96`
- `src/app/api/gep/variables/[id]/route.ts:47-58`

### Alto 9 - Respostas e logs com detalhes sensiveis
Impacto:
- vazamento de detalhes internos de erro
- rastros desnecessarios de login e identificadores em log

Evidencia:
- `src/app/api/auth/login/route.ts` faz `console.log` de email, headers e fluxo de login
- `src/app/api/auth/login/route.ts:143-149` devolve `details` no erro 500
- `src/app/api/requests/[id]/approve/route.ts` devolve `details`
- `src/app/api/work-orders/route.ts` devolve `details: error.message`
- `src/app/api/upload/route.ts:90-98` devolve `details`
- `src/app/api/cron/generate-preventive-maintenance/route.ts:214-218` devolve o objeto `error`

### Alto 10 - Login sem rate limiting ou bloqueio de brute force
Impacto:
- tentativa ilimitada de senha
- sem bloqueio por IP, usuario, device ou janela de tempo

Evidencia:
- nenhuma implementacao de rate limit foi encontrada nas rotas de autenticacao
- `src/app/api/auth/login/route.ts` nao possui throttling, captcha, lockout ou atraso progressivo

### Alto 11 - Upload permissivo demais
Impacto:
- qualquer usuario autenticado consegue enviar arquivos
- a lista de MIME types inclui `text/html`, `image/svg+xml`, `application/json`, `application/xml`, compactados e outros ativos potencialmente perigosos
- arquivo vai para URL publica do Supabase Storage

Evidencia:
- `src/app/api/upload/route.ts:38-75`
- `src/lib/storage.ts:45-54` gera URL publica

Conclusao:
- para producao, HTML, SVG, XML, JSON, ZIP/RAR/7z e similares devem ser removidos ou colocados em fluxo privado/assinado com validacao adicional

### Medio 12 - Open redirect no fluxo de login
Impacto:
- um atacante pode enviar link de login com `returnUrl` absoluto e redirecionar o usuario autenticado para dominio externo

Evidencia:
- `src/middleware.ts:25-27` usa `new URL(returnUrl || '/cmms', request.url)` sem validar se o destino e interno
- `src/app/login/page.tsx:79-80` faz `router.replace(returnUrl || '/cmms')` sem sanitizacao

### Medio 13 - Headers de seguranca ausentes
Impacto:
- faltam camadas defensivas basicas contra clickjacking, mixed content, injeção e exposicao de contexto

Evidencia:
- nao foi encontrada configuracao de:
  - `Content-Security-Policy`
  - `X-Frame-Options` / `frame-ancestors`
  - `Referrer-Policy`
  - `Strict-Transport-Security`
  - `Permissions-Policy`

Arquivos revisados:
- `next.config.ts`
- `src/app/layout.tsx`
- `src/middleware.ts`

### Medio 14 - Dependencias com vulnerabilidades conhecidas
Resultado de `npm audit --json` em `2026-04-11`:
- `12` vulnerabilidades conhecidas
- `9` altas
- `3` moderadas

Diretas relevantes:
- `next@15.5.7`
- `prisma@6.18.0`
- `xlsx@0.18.5`

Pontos observados:
- `next@15.5.7` apareceu com advisories de DoS e outros problemas corrigidos em versoes posteriores
- `xlsx@0.18.5` segue com advisories de `prototype pollution` e `ReDoS`

### Medio 15 - Guardrails de build/deploy enfraquecidos
Impacto:
- erros de TypeScript e ESLint podem passar para producao
- validacao de ambiente pode ser pulada

Evidencia:
- `next.config.ts:4-9`
  - `ignoreDuringBuilds: true`
  - `ignoreBuildErrors: true`
- `vercel.json:7-8`
  - `SKIP_ENV_VALIDATION=1`

## O Que Precisa Ser Corrigido Antes de Liberar

### Bloqueadores obrigatorios para amanha
1. Trocar a sessao atual por sessao assinada/criptografada e validada no servidor.
2. Remover completamente heuristicas de privilegio por email, username e `jobTitle`.
3. Revalidar usuario ativo, papel, empresa e unidades a cada request sensivel.
4. Adicionar checagem central de autorizacao nas rotas que hoje validam apenas sessao.
5. Fechar imediatamente os endpoints publicos do GEP.
6. Remover fallback do `CRON_SECRET` e falhar bootstrap se a env nao existir.
7. Corrigir rotas criticas de escrita que hoje nao validam empresa/unidade ou FKs relacionadas.
8. Corrigir open redirect do login.
9. Parar de retornar `details` internos nas respostas de erro.
10. Atualizar `next` e `prisma` para versoes sem os advisories listados e decidir mitigacao para `xlsx`.

### Recomendado fortemente para a mesma janela de go-live
1. Adicionar rate limiting em `/api/auth/login`.
2. Endurecer upload: remover HTML, SVG, XML, JSON, ZIP/RAR/7z e validar assinatura/magic bytes.
3. Tornar bucket e links de arquivo privados ou assinados quando o conteudo for sensivel.
4. Adicionar headers de seguranca globais.
5. Desligar `ignoreBuildErrors`, `ignoreDuringBuilds` e `SKIP_ENV_VALIDATION`.
6. Criar testes automatizados de seguranca para cookie forjado, escalada de papel e cross-company.

## Plano Minimo de Acao Para Viabilizar Go-Live

### Fase 0 - Hoje, antes de qualquer exposicao externa
1. Suspender go-live publico.
2. Corrigir sessao, normalizacao de papel e endpoints publicos.
3. Corrigir autorizacao das rotas mais sensiveis: `users`, `teams`, `parts`, `maintenance-plans`, `kpi`, `files`, `upload`, `work-orders`, `requests`, `GEP`.
4. Remover detalhes de erro e logs sensiveis.
5. Validar `companyId` e `unitId` em todas as escritas e leituras sensiveis.

### Fase 1 - Ainda para a entrega ao cliente
1. Atualizar dependencias bloqueadoras.
2. Aplicar headers de seguranca.
3. Adicionar rate limiting de login.
4. Rodar teste por perfil: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY`.

### Fase 2 - Hardening pos-go-live
1. Revisar RLS no Supabase e reduzir uso de `service_role`.
2. Migrar uploads sensiveis para acesso privado/assinado.
3. Adicionar auditoria de seguranca recorrente no pipeline.
4. Criar trilha de logs/auditoria funcional para acoes sensiveis.

## Recomendacao Final
- `Nao liberar amanha` no estado atual.
- `Liberar somente apos corrigir os bloqueadores obrigatorios` e revalidar os fluxos por perfil.
- Se houver pressao de prazo, usar ambiente de demonstracao ou homologacao, nunca producao aberta ao cliente final.

## Limites desta Auditoria
- Nao houve pentest externo com exploracao automatizada
- Nao houve validacao completa em ambiente deployado com credenciais reais
- Nao houve revisao da configuracao real do Supabase, Vercel, DNS, WAF, TLS e buckets fora do codigo
- O foco foi seguranca do codigo e prontidao de go-live
