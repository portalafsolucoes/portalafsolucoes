# 🏗️ ARQUITETURA E BANCO DE DADOS - Explicação Detalhada

## ❓ PERGUNTAS RESPONDIDAS

### 1. Onde o banco de dados está rodando?

**RESPOSTA:** O banco de dados está rodando no **SUPABASE** (PostgreSQL na nuvem).

```
┌──────────────────────────────────┐
│   SUPABASE (Cloud)               │
├──────────────────────────────────┤
│                                  │
│  ┌────────────────────────────┐  │
│  │   PostgreSQL Database      │  │
│  │   (Gerenciado)             │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
           ↕ (HTTPS)
┌──────────────────────────────────┐
│   VERCEL (Edge Network)          │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │   Next.js Application      │  │
│  │   (Full-Stack)             │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Configuração no arquivo `.env.local`:**
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.wlantssberjxaxpuipkb.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.wlantssberjxaxpuipkb.supabase.co:5432/postgres"
```

**Breakdown da URL:**
- `postgresql://` - Tipo do banco
- `postgres:[PASSWORD]` - Usuário e senha do Supabase
- `@db.wlantssberjxaxpuipkb.supabase.co` - Servidor Supabase
- `:5432` - Porta padrão do PostgreSQL
- `/postgres` - Nome do banco de dados

### 2. Frontend e Backend estão juntos?

**RESPOSTA:** **SIM!** Next.js 16 é uma arquitetura **FULL-STACK**.

Tudo roda no **mesmo servidor** Next.js:

```
┌─────────────────────────────────────────────┐
│      NEXT.JS (http://localhost:3000)        │
├─────────────────────────────────────────────┤
│                                             │
│  FRONTEND (Páginas React)                   │
│  ├─ /dashboard                              │
│  ├─ /assets                                 │
│  ├─ /work-orders                            │
│  └─ /parts                                  │
│                                             │
│  ↕ (comunicação interna)                    │
│                                             │
│  BACKEND (API Routes)                       │
│  ├─ /api/assets                             │
│  ├─ /api/work-orders                        │
│  ├─ /api/parts                              │
│  └─ /api/auth                               │
│                                             │
└─────────────────────────────────────────────┘
         ↕ (Prisma ORM)
┌─────────────────────────────────────────────┐
│    PostgreSQL (localhost:5432)              │
└─────────────────────────────────────────────┘
```

### Diferença entre arquiteturas:

**ARQUITETURA ANTIGA (Separada):**
```
Frontend (React) → Porta 3000
    ↓ HTTP
Backend (Spring Boot) → Porta 8080
    ↓ JDBC
Database (PostgreSQL) → Porta 5432
```
**Problema:** 3 servidores diferentes, configuração complexa

**ARQUITETURA NOVA (Integrada):**
```
Next.js Full-Stack → Porta 3000
    ↓ Prisma
Database (PostgreSQL) → Porta 5432
```
**Vantagem:** 1 servidor, configuração simples

---

## 🔄 COMO FUNCIONA NA PRÁTICA?

### Exemplo: Usuário cria um Ativo

```
┌──────────────────────────────────────────────────┐
│ 1. BROWSER (Cliente)                             │
│    http://localhost:3000/assets/new              │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. NEXT.JS renderiza a página                    │
│    src/app/assets/new/page.tsx                   │
│    (Componente React)                            │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Usuário preenche formulário                   │
│    Nome: "Prensa Hidráulica"                     │
│    Localização: "Fábrica Principal"              │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 4. Click em "Criar Ativo"                        │
│    fetch('/api/assets', {                        │
│      method: 'POST',                             │
│      body: JSON.stringify(formData)              │
│    })                                            │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 5. Requisição vai para API INTERNA               │
│    (AINDA NO NEXT.JS, NÃO SAIA DA APLICAÇÃO!)    │
│    src/app/api/assets/route.ts                   │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 6. API valida dados e chama Prisma               │
│    const asset = await prisma.asset.create({     │
│      data: { name, locationId, ... }             │
│    })                                            │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 7. PRISMA traduz para SQL                        │
│    INSERT INTO assets (id, name, location_id...) │
│    VALUES ('...', 'Prensa Hidráulica', '...')    │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 8. POSTGRESQL executa query                      │
│    Database: adwtech                          │
│    Table: Asset                                  │
│    Action: INSERT                                │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 9. PostgreSQL retorna: SUCCESS + ID              │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 10. Prisma retorna objeto Asset                  │
│     { id: 'cmh4...', name: 'Prensa...', ... }    │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 11. API retorna JSON para cliente                │
│     { data: asset, message: 'Created' }          │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 12. Browser recebe resposta                      │
│     router.push('/assets') → Redireciona         │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 13. Lista de ativos atualizada                   │
│     Mostra "Prensa Hidráulica" na lista!         │
└──────────────────────────────────────────────────┘
```

**IMPORTANTE:** Tudo isso acontece em **MILISSEGUNDOS** e você nem percebe!

---

## 📂 ESTRUTURA DE ARQUIVOS

```
windsurf_refatoracao/
│
├── prisma/
│   └── schema.prisma          ← Define estrutura do banco
│
├── src/
│   ├── app/
│   │   ├── api/               ← BACKEND (APIs)
│   │   │   ├── assets/
│   │   │   │   └── route.ts   ← GET/POST /api/assets
│   │   │   ├── work-orders/
│   │   │   │   └── route.ts   ← GET/POST /api/work-orders
│   │   │   └── auth/
│   │   │       └── login/
│   │   │           └── route.ts  ← POST /api/auth/login
│   │   │
│   │   ├── assets/            ← FRONTEND (Páginas)
│   │   │   ├── page.tsx       ← Lista de ativos
│   │   │   └── new/
│   │   │       └── page.tsx   ← Formulário criar ativo
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx       ← Dashboard principal
│   │   │
│   │   └── login/
│   │       └── page.tsx       ← Tela de login
│   │
│   ├── components/
│   │   ├── ui/                ← Componentes reutilizáveis
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   └── layout/
│   │       └── Navbar.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts          ← Cliente do banco
│   │   ├── auth.ts            ← Funções de autenticação
│   │   └── session.ts         ← Gerenciamento de sessão
│   │
│   └── middleware.ts          ← Proteção de rotas
│
└── .env                       ← Configuração do banco
```

---

## 🗄️ BANCO DE DADOS - TABELAS CRIADAS

Quando você rodou `npm run db:push`, o Prisma criou **27 tabelas** no PostgreSQL:

```sql
-- Principais tabelas:
Company              -- Empresas
User                 -- Usuários
Team                 -- Equipes
TeamMember          -- Membros das equipes
Location            -- Localizações físicas
Asset               -- Ativos/Equipamentos
AssetCategory       -- Categorias de ativos
WorkOrder           -- Ordens de serviço
WorkOrderCategory   -- Categorias de ordens
Task                -- Tarefas das ordens
Part                -- Peças
PartCategory        -- Categorias de peças
WorkOrderPart       -- Peças usadas nas ordens
AssetPart           -- Peças associadas aos ativos
Request             -- Solicitações
PreventiveMaintenance -- Manutenções preventivas
-- ... e mais 11 tabelas auxiliares
```

**Ver no banco:**
```bash
npx prisma studio
```

Isso abre uma interface visual em `http://localhost:5555` onde você vê todas as tabelas e dados!

---

## 📸 UPLOAD DE IMAGENS - EXPLICAÇÃO

### Por que não está implementado?

Upload de imagens requer **armazenamento externo** porque:

1. **Next.js** não armazena arquivos permanentemente
2. **Banco de dados** não deve guardar arquivos grandes (só URLs)
3. **Produção** precisa de CDN para servir imagens rápido

### Como funciona upload de imagens:

```
┌──────────────────────────────────────────────┐
│ 1. Usuário seleciona imagem no formulário   │
│    <input type="file" accept="image/*" />   │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 2. JavaScript lê o arquivo                   │
│    const file = e.target.files[0]            │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 3. Envia para API de upload                  │
│    POST /api/upload                          │
│    Body: FormData com o arquivo              │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 4. API faz upload para storage externo      │
│    - Vercel Blob Storage                     │
│    - AWS S3                                  │
│    - Cloudinary                              │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 5. Storage retorna URL pública               │
│    https://blob.vercel.com/abc123.jpg        │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 6. Salva URL no banco de dados               │
│    prisma.asset.create({                     │
│      data: { image: 'https://...' }          │
│    })                                        │
└──────────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────┐
│ 7. Exibe imagem na interface                 │
│    <img src={asset.image} />                 │
└──────────────────────────────────────────────┘
```

### Schema já preparado:

```prisma
model Asset {
  id    String @id @default(cuid())
  name  String
  image String?  ← URL da imagem aqui!
  // ...
}
```

### Como implementar (exemplo Vercel Blob):

**1. Instalar:**
```bash
npm install @vercel/blob
```

**2. Criar API `/api/upload/route.ts`:**
```typescript
import { put } from '@vercel/blob'

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file') as File
  
  const blob = await put(file.name, file, {
    access: 'public',
  })
  
  return Response.json({ url: blob.url })
}
```

**3. No formulário:**
```typescript
const handleImageUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  
  const { url } = await res.json()
  setFormData({ ...formData, image: url })
}
```

**Tempo para implementar:** 2-3 horas

**Custo:**
- Vercel Blob: Grátis até 1GB
- AWS S3: ~$0.023 por GB/mês
- Cloudinary: Grátis até 25GB

---

## 🔐 AUTENTICAÇÃO - COMO FUNCIONA

```
┌────────────────────────────────────────────────┐
│ 1. Usuário faz login                           │
│    POST /api/auth/login                        │
│    { email, password }                         │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 2. API busca usuário no banco                  │
│    const user = await prisma.user.findUnique({ │
│      where: { email }                          │
│    })                                          │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 3. Compara senha hasheada                      │
│    const valid = await verifyPassword(         │
│      password, user.password                   │
│    )                                           │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 4. Cria sessão (cookie)                        │
│    await createSession({                       │
│      id, email, role, companyId                │
│    })                                          │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 5. Cookie enviado ao browser                   │
│    Set-Cookie: session=eyJ...                  │
│    HttpOnly, Secure, SameSite                  │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 6. Browser guarda cookie                       │
│    Todas as requisições futuras enviam cookie  │
└────────────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────┐
│ 7. Middleware valida cada requisição           │
│    const session = await getSession()          │
│    if (!session) redirect('/login')            │
└────────────────────────────────────────────────┘
```

**Segurança:**
- Senha NUNCA é guardada em texto plano
- Hash bcrypt com 12 rounds (muito seguro)
- Cookie HttpOnly (JavaScript não acessa)
- Cookie Secure (apenas HTTPS em produção)
- Sessão expira em 7 dias

---

## 🚀 DEPLOY - COMO FUNCIONA

### Desenvolvimento (Local):
```
npm run dev → http://localhost:3000
```

### Produção (Vercel):

**1. Fazer push para GitHub**
```bash
git push origin main
```

**2. Conectar na Vercel**
- vercel.com
- Import repository
- Deploy automático!

**3. Configurar variáveis de ambiente na Vercel:**
```
DATABASE_URL=postgresql://user:pass@seu-postgres.com/db
NEXTAUTH_SECRET=chave-aleatoria-segura
```

**4. Pronto!**
```
https://seu-app.vercel.app
```

**Deploy leva:** ~2 minutos  
**Atualizações:** Automáticas a cada push

---

## 📊 RESUMO VISUAL

```
┌─────────────────────────────────────────────────────┐
│           ADWTECH - ARQUITETURA                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👤 Usuário                                         │
│   ↓ http://localhost:3000                          │
│                                                     │
│  🌐 Browser                                         │
│   ↕ Requisições HTTP                               │
│                                                     │
│  ⚛️ Next.js 16 (Full-Stack)                         │
│   ├─ Frontend (React Pages)                        │
│   ├─ Backend (API Routes)                          │
│   └─ Middleware (Auth)                             │
│   ↕ Prisma ORM                                     │
│                                                     │
│  🗄️ PostgreSQL (localhost:5432)                    │
│   └─ Database: adwtech                          │
│      ├─ 27 tabelas                                 │
│      └─ Dados persistentes                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CONCLUSÃO

### Você tem agora:

1. ✅ **Um servidor Next.js** rodando em `localhost:3000`
2. ✅ **Um banco PostgreSQL** rodando em `localhost:5432`
3. ✅ **Frontend e Backend** na mesma aplicação
4. ✅ **27 tabelas** criadas no banco
5. ✅ **Sistema completo** funcional

### Não há:

- ❌ Servidores separados
- ❌ Configuração complexa
- ❌ 3 portas diferentes
- ❌ CORS issues
- ❌ Deploy complicado

### Para adicionar imagens:

1. Escolher storage (Vercel Blob recomendado)
2. Instalar SDK
3. Criar API `/api/upload`
4. Adicionar input file nos formulários
5. **Tempo: 2-3 horas**

---

**🎯 Arquitetura moderna = Simples, rápida e poderosa!**
