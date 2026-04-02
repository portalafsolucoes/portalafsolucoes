# 🚀 Guia de Deploy - Vercel + Supabase

## 📋 Pré-requisitos

- Conta no GitHub
- Conta na Vercel (https://vercel.com)
- Conta no Supabase (https://supabase.com)
- Git instalado localmente

---

## 🗄️ Parte 1: Configurar Supabase (Banco de Dados)

### 1.1 Criar Projeto no Supabase

1. Acesse https://supabase.com e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `adwtech` (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte e **SALVE EM LOCAL SEGURO**
   - **Region**: Escolha `South America (São Paulo)` para melhor performance
   - **Pricing Plan**: Free (suficiente para começar)
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos até o projeto ser criado

### 1.2 Obter Strings de Conexão

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem) → **Database**
2. Role até a seção **"Connection string"**
3. Copie as seguintes URLs:

#### **Connection Pooling (para Vercel)**
- Selecione **"Transaction"** mode
- Copie a URL que aparece (formato: `postgresql://postgres.xxx:[YOUR-PASSWORD]@xxx.pooler.supabase.com:6543/postgres`)
- **Esta será sua `DATABASE_URL`**

#### **Direct Connection (para migrações)**
- Copie a URL de conexão direta (formato: `postgresql://postgres:[YOUR-PASSWORD]@xxx.supabase.co:5432/postgres`)
- **Esta será sua `DIRECT_URL`**

⚠️ **IMPORTANTE**: Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 1.1

### 1.3 Executar Migrações do Prisma

No seu terminal local:

```bash
# 1. Configure a variável de ambiente temporariamente
$env:DATABASE_URL="sua-direct-url-aqui"

# 2. Execute o push do schema
npm run db:push

# 3. Verifique se as tabelas foram criadas
npm run db:studio
```

Você deverá ver todas as tabelas criadas no Prisma Studio.

### 1.4 Popular Banco com Dados Iniciais (Opcional)

Se você tiver um script de seed ou backup:

```bash
# Executar seed
npx prisma db seed

# OU restaurar backup
npm run db:backup:restore
```

---

## 🌐 Parte 2: Configurar Vercel (Hospedagem)

### 2.1 Preparar Repositório Git

```bash
# 1. Inicializar repositório (se ainda não tiver)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Fazer commit inicial
git commit -m "feat: preparar projeto para deploy na Vercel"

# 4. Criar repositório no GitHub
# Vá em https://github.com/new e crie um novo repositório
# Nome sugerido: adwtech

# 5. Adicionar remote e fazer push
git remote add origin https://github.com/seu-usuario/adwtech.git
git branch -M main
git push -u origin main
```

### 2.2 Importar Projeto na Vercel

1. Acesse https://vercel.com e faça login
2. Clique em **"Add New..."** → **"Project"**
3. Clique em **"Import Git Repository"**
4. Selecione o repositório `adwtech` que você criou
5. Clique em **"Import"**

### 2.3 Configurar Variáveis de Ambiente

Na tela de configuração do projeto:

1. Expanda **"Environment Variables"**
2. Adicione as seguintes variáveis:

| Nome | Valor | Onde Obter |
|------|-------|------------|
| `DATABASE_URL` | `postgresql://postgres.xxx:...@xxx.pooler.supabase.com:6543/postgres` | Supabase → Connection Pooling |
| `DIRECT_URL` | `postgresql://postgres:...@xxx.supabase.co:5432/postgres` | Supabase → Direct Connection |
| `NEXTAUTH_SECRET` | Gerar com: `openssl rand -base64 32` | Terminal local |
| `NEXTAUTH_URL` | `https://seu-projeto.vercel.app` | Será gerado após deploy |

⚠️ **IMPORTANTE**: 
- Marque todas as variáveis para **Production**, **Preview** e **Development**
- Você precisará atualizar `NEXTAUTH_URL` após o primeiro deploy

### 2.4 Configurar Build Settings

Na mesma tela:

- **Framework Preset**: Next.js (deve detectar automaticamente)
- **Build Command**: `prisma generate && next build` (já configurado no package.json)
- **Output Directory**: `.next` (padrão)
- **Install Command**: `npm install` (padrão)

### 2.5 Deploy Inicial

1. Clique em **"Deploy"**
2. Aguarde 3-5 minutos para o build completar
3. Após conclusão, você verá a URL do seu projeto: `https://seu-projeto.vercel.app`

### 2.6 Atualizar NEXTAUTH_URL

1. Copie a URL gerada (ex: `https://adwtech.vercel.app`)
2. Vá em **Settings** → **Environment Variables**
3. Edite a variável `NEXTAUTH_URL` e cole a URL real
4. Clique em **"Save"**
5. Vá em **Deployments** → clique nos 3 pontos do último deploy → **"Redeploy"**

---

## 🔐 Parte 3: Criar Usuário Administrador

### 3.1 Acessar Supabase SQL Editor

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **"New query"**

### 3.2 Criar Empresa

```sql
-- 1. Criar empresa
INSERT INTO "Company" (id, name, email, phone, "createdAt", "updatedAt")
VALUES (
  'company-id-123',
  'Minha Empresa',
  'contato@minhaempresa.com',
  '(11) 99999-9999',
  NOW(),
  NOW()
);
```

### 3.3 Criar Usuário Admin

```sql
-- 2. Criar usuário administrador
-- IMPORTANTE: Substitua 'sua-senha-aqui' por uma senha real
INSERT INTO "User" (
  id, 
  email, 
  password, 
  "firstName", 
  "lastName", 
  username, 
  role, 
  enabled, 
  "companyId",
  "createdAt", 
  "updatedAt"
)
VALUES (
  'user-admin-123',
  'admin@minhaempresa.com',
  '$2b$10$YourHashedPasswordHere', -- Ver seção 3.4 para gerar
  'Admin',
  'Sistema',
  'admin',
  'SUPER_ADMIN',
  true,
  'company-id-123',
  NOW(),
  NOW()
);
```

### 3.4 Gerar Hash de Senha

No seu terminal local:

```bash
# Instalar bcrypt globalmente (se necessário)
npm install -g bcrypt-cli

# Gerar hash da senha
node -e "console.log(require('bcryptjs').hashSync('SuaSenhaAqui', 10))"
```

Copie o hash gerado e substitua no SQL acima.

---

## ✅ Parte 4: Testar Deploy

### 4.1 Acessar Aplicação

1. Abra a URL da Vercel: `https://seu-projeto.vercel.app`
2. Você deverá ver a tela de login

### 4.2 Fazer Login

- **Email**: `admin@minhaempresa.com`
- **Senha**: A senha que você usou para gerar o hash

### 4.3 Verificar Funcionalidades

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Criar nova RAF
- [ ] Criar nova OS
- [ ] Upload de imagens (se configurado Cloudinary)
- [ ] Navegação entre páginas

---

## 🔧 Parte 5: Configurações Adicionais (Opcional)

### 5.1 Domínio Customizado

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em **"Add"**
3. Digite seu domínio (ex: `adwtech.minhaempresa.com`)
4. Siga as instruções para configurar DNS

### 5.2 Cloudinary (Upload de Imagens)

1. Crie conta em https://cloudinary.com
2. No dashboard, copie:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Na Vercel, adicione as variáveis:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Redeploy o projeto

### 5.3 Configurar CORS (se necessário)

Se você tiver problemas com CORS, adicione em `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

---

## 🐛 Troubleshooting

### Erro: "Database connection failed"

**Solução**:
1. Verifique se as URLs do Supabase estão corretas
2. Confirme que a senha está correta (sem caracteres especiais não escapados)
3. Teste a conexão localmente primeiro

### Erro: "Prisma Client not generated"

**Solução**:
1. Verifique se o build command inclui `prisma generate`
2. Na Vercel, vá em **Settings** → **General** → **Build & Development Settings**
3. Confirme: Build Command = `prisma generate && next build`

### Erro: "Module not found"

**Solução**:
1. Limpe o cache da Vercel: **Deployments** → **...** → **"Redeploy"** → marcar **"Use existing Build Cache"** como OFF
2. Verifique se todas as dependências estão em `package.json`

### Erro 500 ao fazer login

**Solução**:
1. Verifique se `NEXTAUTH_SECRET` está configurado
2. Confirme que `NEXTAUTH_URL` aponta para a URL correta da Vercel
3. Verifique logs: Vercel → **Deployments** → clique no deploy → **"Runtime Logs"**

### Imagens não carregam

**Solução**:
1. Configure Cloudinary (seção 5.2)
2. OU configure domínios permitidos em `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'seu-dominio.com'],
  },
}
```

---

## 📊 Monitoramento

### Logs da Aplicação

1. Vercel → **Deployments** → clique no deploy ativo
2. Vá em **"Runtime Logs"** para ver logs em tempo real
3. Filtre por tipo: Error, Warning, Info

### Métricas de Performance

1. Vercel → **Analytics** (disponível em planos pagos)
2. OU use Google Analytics / Sentry para monitoramento

### Banco de Dados

1. Supabase → **Database** → **"Table Editor"** para ver dados
2. Supabase → **Database** → **"Query Performance"** para métricas

---

## 🔄 Atualizações Futuras

### Deploy Automático

Após configuração inicial, todo `git push` para `main` fará deploy automático:

```bash
# 1. Fazer alterações no código
git add .
git commit -m "feat: nova funcionalidade"

# 2. Push para GitHub
git push origin main

# 3. Vercel detecta e faz deploy automaticamente
```

### Rollback

Se algo der errado:

1. Vercel → **Deployments**
2. Encontre o deploy anterior que funcionava
3. Clique nos 3 pontos → **"Promote to Production"**

---

## 📚 Recursos Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação Next.js](https://nextjs.org/docs)

---

## 🎯 Checklist Final

- [ ] Supabase configurado e banco criado
- [ ] Migrações Prisma executadas
- [ ] Repositório Git criado e enviado para GitHub
- [ ] Projeto importado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy inicial concluído com sucesso
- [ ] NEXTAUTH_URL atualizado e redeploy feito
- [ ] Usuário administrador criado no banco
- [ ] Login testado e funcionando
- [ ] Funcionalidades principais testadas
- [ ] Domínio customizado configurado (opcional)
- [ ] Cloudinary configurado (opcional)

---

**Parabéns! 🎉 Seu sistema AdwTech está no ar!**

Para suporte, consulte a documentação ou abra uma issue no repositório.
