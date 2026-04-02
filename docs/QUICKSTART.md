# ⚡ QUICK START - AdwTech

## 🚀 Iniciar em 3 Passos

### 1️⃣ Instalar Dependências (se ainda não instalou)

```bash
npm install
```

### 2️⃣ Configurar Banco de Dados

```bash
# Gerar Prisma Client
npm run db:generate

# Criar banco e tabelas
npm run db:push
```

### 3️⃣ Iniciar o Sistema

```bash
npm run dev
```

✅ **Pronto!** Acesse: http://localhost:3000

---

## 📝 Primeiro Uso

1. **Clique em "Registrar"**
2. Preencha:
   - Nome da Empresa
   - Seu Nome e Sobrenome
   - Email
   - Senha (mínimo 8 caracteres)
3. **Clique em "Criar conta"**
4. **Faça login** com as credenciais criadas
5. **Explore o sistema!**

---

## 🎯 Funcionalidades Disponíveis

### Dashboard
- Visualize estatísticas gerais
- Veja ordens abertas e em progresso
- Alertas de estoque baixo

### Ordens de Serviço
- Criar nova ordem
- Atribuir a técnicos
- Definir prioridade
- Acompanhar status

### Ativos
- Cadastrar equipamentos
- Visualizar status
- Histórico de manutenções

### Peças
- Controlar inventário
- Alertas de estoque
- Custos e quantidades

### Localizações
- Cadastrar locais físicos
- Organizar por hierarquia

### Equipes
- Criar equipes de trabalho
- Adicionar membros
- Atribuir tarefas

---

## 🔧 Comandos Úteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Executar produção
npm run db:studio    # Interface visual do banco
```

---

## ❓ Problemas Comuns

### Erro: "Missing DATABASE_URL"

**Solução:** Execute o script de configuração:

```bash
.\setup-env.ps1
```

### Porta 3000 já em uso

**Solução:** Mude a porta:

```bash
npm run dev -- -p 3001
```

### Erro ao conectar no banco

**Solução:** Verifique se o PostgreSQL está rodando e a URL no `.env` está correta.

---

## 📚 Mais Informações

- **README.md** - Documentação completa
- **IMPLEMENTACAO.md** - Detalhes técnicos
- **ENTREGA_FINAL.md** - Resumo executivo

---

**🎉 Divirta-se explorando o AdwTech!**
