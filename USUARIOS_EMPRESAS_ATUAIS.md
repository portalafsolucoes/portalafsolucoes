# Usuarios, Senhas, Chaves e Credenciais do Sistema

Atualizado em: 2026-04-11

> **AVISO**: Este arquivo contem credenciais reais. NAO commitar no repositorio.
> Mover para local seguro (vault, gerenciador de senhas) apos uso.

---

## Credenciais Padrao de Teste

- Senha padrao de todos os usuarios de teste: `Teste@123`

---

## Empresas e Usuarios

### 1. Cimento Vale do Norte SA

- Email da empresa: `contato@valenorte.local`
- Total de ativos criados: `10`
- Usuarios:
  - SUPER_ADMIN: `super.admin@valenorte.local` | senha: `Teste@123` | nome: Carla Mendes
  - ADMIN: `admin@valenorte.local` | senha: `Teste@123` | nome: Marcos Lima
  - TECHNICIAN: `tecnico@valenorte.local` | senha: `Teste@123` | nome: Joao Ferreira
  - LIMITED_TECHNICIAN: `tecnico.limitado@valenorte.local` | senha: `Teste@123` | nome: Paula Santos
  - REQUESTER: `solicitante@valenorte.local` | senha: `Teste@123` | nome: Ana Souza
  - VIEW_ONLY: `consulta@valenorte.local` | senha: `Teste@123` | nome: Bruno Almeida

### 2. Polimix Concreto Ltda

- Email da empresa: `contato@polimix.local`
- Total de ativos criados: `10`
- Usuarios:
  - SUPER_ADMIN: `super.admin@polimix.local` | senha: `Teste@123` | nome: Carla Mendes
  - ADMIN: `admin@polimix.local` | senha: `Teste@123` | nome: Marcos Lima
  - TECHNICIAN: `tecnico@polimix.local` | senha: `Teste@123` | nome: Joao Ferreira
  - LIMITED_TECHNICIAN: `tecnico.limitado@polimix.local` | senha: `Teste@123` | nome: Paula Santos
  - REQUESTER: `solicitante@polimix.local` | senha: `Teste@123` | nome: Ana Souza
  - VIEW_ONLY: `consulta@polimix.local` | senha: `Teste@123` | nome: Bruno Almeida

---

## Chaves e Segredos do Ambiente (Producao/Dev)

### Supabase (Projeto Principal: tgfrvsierhvfijvyfhqa)

| Variavel | Valor | Onde usar |
|----------|-------|-----------|
| DATABASE_URL | `postgresql://postgres.tgfrvsierhvfijvyfhqa:PortalAF123%21%40%23@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | .env, Vercel |
| DIRECT_URL | `postgresql://postgres.tgfrvsierhvfijvyfhqa:PortalAF123%21%40%23@aws-1-sa-east-1.pooler.supabase.com:5432/postgres` | .env, Vercel |
| NEXT_PUBLIC_SUPABASE_URL | `https://tgfrvsierhvfijvyfhqa.supabase.co` | .env, Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZnJ2c2llcmh2ZmlqdnlmaHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzQ5MzksImV4cCI6MjA5MDE1MDkzOX0.QOwTpPfOFWDFy1z7eUqjAVT-N9sjCZx7O-fyeiIz0v8` | .env, Vercel |
| SUPABASE_SERVICE_ROLE_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZnJ2c2llcmh2ZmlqdnlmaHFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU3NDkzOSwiZXhwIjoyMDkwMTUwOTM5fQ._H2RhPEAp4EA-wOjWZvSCDuZ-cgUqQOWS4B1km1_6TU` | .env (server only), Vercel |
| Senha do banco (decoded) | `PortalAF123!@#` | Painel Supabase |

### Supabase (Projeto Antigo/Teste: wlantssberjxaxpuipkb)

| Variavel | Valor | Onde encontrado |
|----------|-------|-----------------|
| DATABASE_URL | `postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@db.wlantssberjxaxpuipkb.supabase.co:5432/postgres` | scripts/testing/ |
| Senha do banco (decoded) | `Mizu@2025!@#` | scripts/testing/ |
| Dashboard | `https://supabase.com/dashboard/project/wlantssberjxaxpuipkb` | scripts/testing/ |

### NextAuth

| Variavel | Valor | Onde usar |
|----------|-------|-----------|
| NEXTAUTH_SECRET | `OksMMNxWMS6rI6mkv3AGAKmGR1o80qCzff0gJxbXFaQ` | .env, Vercel |
| NEXTAUTH_URL (local) | `http://localhost:3000` | .env |
| NEXTAUTH_URL (prod) | URL do Vercel | Vercel |

### Cloudinary

| Variavel | Valor | Onde encontrado |
|----------|-------|-----------------|
| CLOUD_NAME | `dgidslzgg` | scripts/setup/setup-cloudinary-vercel.ps1:10 |
| API_KEY | `227461488686687` | scripts/setup/setup-cloudinary-vercel.ps1:11 |
| API_SECRET | `UMAv_iVpj4LSDC1sOrKQJ9Hw_8Y` | scripts/setup/setup-cloudinary-vercel.ps1:12 |

### CRON

| Variavel | Valor | Onde encontrado |
|----------|-------|-----------------|
| CRON_SECRET (fallback inseguro) | `your-secret-key-here` | src/app/api/cron/generate-preventive-maintenance/route.ts:52 |

---

## Credenciais Encontradas em Codigo Fonte (Limpar)

Estes arquivos contem credenciais reais hardcoded e devem ser limpos:

| Arquivo | Conteudo sensivel | Acao |
|---------|-------------------|------|
| `scripts/setup/setup-cloudinary-vercel.ps1` | Cloudinary API_KEY, API_SECRET, CLOUD_NAME | Remover credenciais, usar env vars |
| `scripts/setup/fix-cloudinary-vercel.ps1` | Cloudinary CLOUD_NAME | Remover credencial, usar env var |
| `scripts/testing/test-connection-v2.js` | PostgreSQL connection strings com senha | Remover ou usar env vars |
| `scripts/testing/test-urls-alternativas.js` | PostgreSQL connection strings com senha | Remover ou usar env vars |
| `scripts/testing/test-db-connection.js` | Project ref do Supabase em mensagem de erro | Remover referencia |
| `scripts/testing/run-super-admin-full-audit.mjs` | Email e senha de teste hardcoded | Mover para env vars |
| `src/app/api/cron/generate-preventive-maintenance/route.ts` | Fallback `your-secret-key-here` | Remover fallback |
| `src/app/login/page.tsx` | 12 usuarios com senha `Teste@123` | **MANTER por enquanto** (dev only), remover antes de producao |

---

## Observacoes

- **Login page (DEV_QUICK_ACCESS)**: Mantido temporariamente para facilitar testes. A UI so renderiza em `NODE_ENV === 'development'`, mas o array vai no bundle JS. **Deve ser removido antes do deploy final para cliente.**
- **Seed (prisma/seed.ts)**: Usa `Teste@123` como senha padrao. Aceitavel para ambiente de desenvolvimento.
- **Todas as credenciais acima devem ser rotacionadas** antes de disponibilizar o sistema para cliente final. Ver `docs/SEGURANCA.md` V01 e V02.
