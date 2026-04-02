# ✅ Checklist de Deploy - Vercel + Supabase

Use este checklist para garantir que todos os passos foram executados corretamente.

---

## 📋 Pré-Deploy (Local)

### Preparação do Código
- [ ] Código está commitado no Git
- [ ] Todas as dependências estão em `package.json`
- [ ] Arquivo `.env.example` existe e está atualizado
- [ ] Arquivo `vercel.json` existe
- [ ] Prisma schema tem `binaryTargets` configurado
- [ ] Build local funciona: `npm run build`
- [ ] Testes passam: `npm run test` (se aplicável)

### Arquivos Criados
- [ ] `.env.example` - Template de variáveis
- [ ] `vercel.json` - Configuração Vercel
- [ ] `docs/DEPLOY_VERCEL_SUPABASE.md` - Guia completo
- [ ] `docs/QUICKSTART_DEPLOY.md` - Guia rápido
- [ ] `docs/VERCEL_ENV_TEMPLATE.txt` - Template de env vars
- [ ] `prisma/seed-production.sql` - Script de seed
- [ ] `scripts/prepare-deploy.ps1` - Script de preparação
- [ ] `scripts/generate-password-hash.js` - Gerador de hash

### Scripts Testados
- [ ] `npm run deploy:prepare` - Executa sem erros
- [ ] `npm run deploy:hash` - Gera hash corretamente
- [ ] `npm run db:push` - Sincroniza schema (local)

---

## 🗄️ Supabase

### Criação do Projeto
- [ ] Conta Supabase criada
- [ ] Novo projeto criado
- [ ] Nome do projeto: `adwtech` (ou similar)
- [ ] Senha do banco salva em local seguro
- [ ] Região selecionada: `South America (São Paulo)`
- [ ] Projeto criado com sucesso (aguardar 2-3 min)

### Configuração do Banco
- [ ] Acessou **Settings** → **Database**
- [ ] Copiou **Connection Pooling** URL (Transaction mode)
- [ ] Copiou **Direct Connection** URL
- [ ] Substituiu `[YOUR-PASSWORD]` pela senha real
- [ ] Testou conexão local:
  ```bash
  $env:DATABASE_URL="sua-direct-url"
  npm run db:push
  ```
- [ ] Migrações executadas com sucesso
- [ ] Todas as tabelas criadas (verificar no Table Editor)

### Dados Iniciais
- [ ] Acessou **SQL Editor** no Supabase
- [ ] Abriu arquivo `prisma/seed-production.sql`
- [ ] Gerou hashes de senha com `npm run deploy:hash`
- [ ] Substituiu hashes no SQL
- [ ] Executou o SQL com sucesso
- [ ] Verificou dados criados:
  - [ ] Empresa criada
  - [ ] Usuário admin criado
  - [ ] Outros usuários criados (opcional)
  - [ ] Localização criada (opcional)
  - [ ] Equipe criada (opcional)

---

## 🐙 GitHub

### Repositório
- [ ] Conta GitHub ativa
- [ ] Novo repositório criado: `adwtech` (ou similar)
- [ ] Repositório configurado como privado (se necessário)
- [ ] README.md atualizado

### Push do Código
- [ ] Remote adicionado:
  ```bash
  git remote add origin https://github.com/seu-usuario/adwtech.git
  ```
- [ ] Branch principal renomeada (se necessário):
  ```bash
  git branch -M main
  ```
- [ ] Código commitado:
  ```bash
  git add .
  git commit -m "feat: preparar para deploy na Vercel"
  ```
- [ ] Push realizado:
  ```bash
  git push -u origin main
  ```
- [ ] Código visível no GitHub

---

## 🌐 Vercel

### Importar Projeto
- [ ] Conta Vercel criada/ativa
- [ ] Conectou GitHub à Vercel
- [ ] Clicou em **"Add New..."** → **"Project"**
- [ ] Selecionou repositório `adwtech`
- [ ] Clicou em **"Import"**

### Configurar Variáveis de Ambiente
- [ ] Expandiu **"Environment Variables"**
- [ ] Adicionou `DATABASE_URL` (Connection Pooling)
- [ ] Adicionou `DIRECT_URL` (Direct Connection)
- [ ] Gerou `NEXTAUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Adicionou `NEXTAUTH_SECRET`
- [ ] Adicionou `NEXTAUTH_URL` (temporário: `https://seu-projeto.vercel.app`)
- [ ] Marcou todas as variáveis para **Production**, **Preview** e **Development**
- [ ] (Opcional) Adicionou variáveis Cloudinary:
  - [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  - [ ] `CLOUDINARY_API_KEY`
  - [ ] `CLOUDINARY_API_SECRET`

### Build Settings
- [ ] Framework Preset: **Next.js** (detectado automaticamente)
- [ ] Build Command: `prisma generate && next build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

### Deploy Inicial
- [ ] Clicou em **"Deploy"**
- [ ] Aguardou build completar (3-5 min)
- [ ] Build concluído com sucesso ✅
- [ ] URL gerada: `https://seu-projeto.vercel.app`
- [ ] Copiou URL gerada

### Atualizar NEXTAUTH_URL
- [ ] Acessou **Settings** → **Environment Variables**
- [ ] Editou variável `NEXTAUTH_URL`
- [ ] Colou URL real da Vercel
- [ ] Salvou alteração
- [ ] Acessou **Deployments**
- [ ] Clicou nos 3 pontos do último deploy
- [ ] Selecionou **"Redeploy"**
- [ ] Aguardou redeploy completar

---

## ✅ Testes Pós-Deploy

### Acesso à Aplicação
- [ ] Acessou URL da Vercel: `https://seu-projeto.vercel.app`
- [ ] Página de login carregou corretamente
- [ ] Sem erros no console do navegador (F12)

### Login
- [ ] Fez login com credenciais admin:
  - Email: `admin@minhaempresa.com`
  - Senha: A senha usada no seed
- [ ] Login bem-sucedido
- [ ] Redirecionado para dashboard

### Funcionalidades Básicas
- [ ] Dashboard carrega com dados
- [ ] Menu de navegação funciona
- [ ] Pode acessar página de RAFs
- [ ] Pode acessar página de Ordens de Serviço
- [ ] Pode acessar página de Ativos
- [ ] Pode acessar página de Pessoas/Equipes

### Criação de Dados
- [ ] Consegue criar nova RAF
- [ ] Consegue criar nova OS
- [ ] Consegue criar novo ativo
- [ ] Consegue criar nova pessoa
- [ ] Consegue criar nova equipe

### Upload de Imagens (se Cloudinary configurado)
- [ ] Upload de foto funciona
- [ ] Imagem é exibida corretamente
- [ ] URL da imagem está correta

### Performance
- [ ] Páginas carregam rapidamente (< 3s)
- [ ] Navegação é fluida
- [ ] Sem erros 500 ou 404

---

## 🔍 Verificação de Logs

### Vercel Logs
- [ ] Acessou **Deployments** → último deploy
- [ ] Clicou em **"Runtime Logs"**
- [ ] Sem erros críticos nos logs
- [ ] Requisições de API funcionando

### Supabase Logs
- [ ] Acessou **Logs** no Supabase
- [ ] Verificou queries executadas
- [ ] Sem erros de conexão
- [ ] Queries otimizadas

### Browser Console
- [ ] Abriu DevTools (F12)
- [ ] Aba **Console**: sem erros
- [ ] Aba **Network**: requisições 200 OK
- [ ] Aba **Application**: cookies/storage corretos

---

## 🎯 Configurações Opcionais

### Domínio Customizado
- [ ] Domínio adquirido
- [ ] Acessou **Settings** → **Domains** na Vercel
- [ ] Adicionou domínio customizado
- [ ] Configurou DNS conforme instruções
- [ ] Aguardou propagação (até 48h)
- [ ] Domínio funcionando

### Cloudinary
- [ ] Conta Cloudinary criada
- [ ] Copiou credenciais do dashboard
- [ ] Adicionou variáveis na Vercel
- [ ] Redeploy realizado
- [ ] Upload de imagens testado

### Analytics
- [ ] Habilitou Vercel Analytics (se disponível)
- [ ] Configurou Google Analytics (opcional)
- [ ] Configurou Sentry para error tracking (opcional)

### Notificações
- [ ] Configurou notificações de deploy na Vercel
- [ ] Configurou webhooks (se necessário)

---

## 📊 Monitoramento Contínuo

### Diário
- [ ] Verificar logs de erro na Vercel
- [ ] Verificar performance no Supabase
- [ ] Verificar uso de recursos

### Semanal
- [ ] Revisar métricas de uso
- [ ] Verificar backups do banco
- [ ] Atualizar dependências (se necessário)

### Mensal
- [ ] Revisar custos Vercel/Supabase
- [ ] Otimizar queries lentas
- [ ] Atualizar documentação

---

## 🚨 Troubleshooting

### Se algo der errado:

#### Build falhou
- [ ] Verificar logs de build na Vercel
- [ ] Testar build local: `npm run build`
- [ ] Verificar se todas as dependências estão instaladas
- [ ] Limpar cache e tentar novamente

#### Erro 500 ao acessar
- [ ] Verificar Runtime Logs na Vercel
- [ ] Verificar se variáveis de ambiente estão corretas
- [ ] Verificar conexão com Supabase
- [ ] Verificar se migrações foram executadas

#### Login não funciona
- [ ] Verificar se `NEXTAUTH_SECRET` está configurado
- [ ] Verificar se `NEXTAUTH_URL` está correto
- [ ] Verificar se usuário existe no banco
- [ ] Verificar hash da senha

#### Imagens não carregam
- [ ] Verificar configuração Cloudinary
- [ ] Verificar domínios permitidos em `next.config.ts`
- [ ] Verificar logs de upload

---

## 📝 Documentação Final

- [ ] README.md atualizado com URL de produção
- [ ] Documentação de API atualizada (se houver)
- [ ] Credenciais salvas em local seguro
- [ ] Backup das variáveis de ambiente
- [ ] Guia de uso para usuários finais

---

## 🎉 Deploy Completo!

Se todos os itens acima estão marcados, parabéns! 🎊

Seu sistema AdwTech está no ar e funcionando!

### Próximos Passos:
1. Compartilhar URL com usuários
2. Treinar equipe no uso do sistema
3. Monitorar uso e performance
4. Coletar feedback
5. Planejar melhorias futuras

---

**Data do Deploy**: ___/___/______  
**URL de Produção**: _______________________  
**Responsável**: _______________________

---

## 📞 Suporte

Em caso de problemas:
1. Consulte `docs/DEPLOY_VERCEL_SUPABASE.md`
2. Verifique logs na Vercel e Supabase
3. Revise este checklist
4. Entre em contato com o suporte técnico
