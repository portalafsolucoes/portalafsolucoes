# HIERARQUIA DE ACESSOS - 6 TIPOS DE USUÁRIO

## 1. SUPER_ADMIN (Super Administrador)
**Descrição**: Acesso total ao sistema
**Menus visíveis**:
- ✅ Dashboard
- ✅ Ordens de Serviço (OS)
- ✅ Solicitações (SS)
- ✅ Aprovações
- ✅ Ativos
- ✅ Peças
- ✅ Localizações
- ✅ Pessoas/Equipes
- ✅ Relatórios
- ✅ Configurações

**Permissões**:
- Criar, Editar, Deletar, Aprovar: TUDO
- Gerenciar usuários e sistema

---

## 2. ADMIN (Administrador)
**Descrição**: Administrador geral sem acesso total ao sistema
**Menus visíveis**:
- ✅ Dashboard
- ✅ Ordens de Serviço (OS)
- ✅ Solicitações (SS)
- ✅ Aprovações
- ✅ Ativos
- ✅ Peças
- ✅ Localizações
- ✅ Pessoas/Equipes
- ✅ Relatórios

**Permissões**:
- Criar, Editar OS e Solicitações
- Aprovar solicitações
- Gerenciar ativos, peças, localizações
- Visualizar relatórios
- NÃO pode deletar usuários ou acessar configurações do sistema

---

## 3. TECHNICIAN (Técnico)
**Descrição**: Técnico que executa trabalhos
**Menus visíveis**:
- ✅ Ordens de Serviço (OS) - apenas as atribuídas
- ✅ Solicitações (SS)
- ✅ Ativos - visualização
- ✅ Peças - visualização

**Permissões**:
- Visualizar e EXECUTAR OS atribuídas a ele
- Criar solicitações
- Visualizar ativos e peças
- NÃO tem acesso a: Dashboard, Relatórios, Aprovações, Localizações, Pessoas/Equipes

---

## 4. LIMITED_TECHNICIAN (Técnico Limitado)
**Descrição**: Técnico com acesso ainda mais restrito
**Menus visíveis**:
- ✅ Ordens de Serviço (OS) - apenas as atribuídas
- ✅ Solicitações (SS) - apenas criar

**Permissões**:
- Apenas VISUALIZAR e EXECUTAR OS atribuídas
- Criar solicitações básicas
- NÃO pode visualizar ativos, peças ou qualquer outra coisa

---

## 5. REQUESTER (Solicitante)
**Descrição**: Usuário que apenas solicita serviços
**Menus visíveis**:
- ✅ Solicitações (SS) - apenas suas próprias
- ✅ Dashboard - visão simplificada

**Permissões**:
- Criar solicitações
- Visualizar apenas SUAS solicitações
- Ver status de suas solicitações no dashboard
- NÃO tem acesso a: OS, Ativos, Peças, Relatórios, etc

---

## 6. VIEW_ONLY (Visualizador)
**Descrição**: Apenas visualização, sem edição
**Menus visíveis**:
- ✅ Dashboard - somente leitura
- ✅ Ordens de Serviço (OS) - somente leitura
- ✅ Solicitações (SS) - somente leitura
- ✅ Ativos - somente leitura
- ✅ Peças - somente leitura
- ✅ Relatórios - somente leitura

**Permissões**:
- APENAS VISUALIZAR
- NÃO pode criar, editar ou deletar NADA
- Útil para auditoria ou supervisão

---

## RESUMO DA HIERARQUIA

| Role | Dashboard | OS | Requests | Aprovações | Ativos | Peças | Localizações | Pessoas | Relatórios | Config |
|------|-----------|----|---------|-----------| -------|-------|--------------|---------|-----------|---------|
| **SUPER_ADMIN** | ✅ Full | ✅ Full | ✅ Full | ✅ | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ | ✅ |
| **ADMIN** | ✅ Full | ✅ Full | ✅ Full | ✅ | ✅ Full | ✅ Full | ✅ Full | ✅ View | ✅ | ❌ |
| **TECHNICIAN** | ❌ | ✅ Exec | ✅ Create | ❌ | ✅ View | ✅ View | ❌ | ❌ | ❌ | ❌ |
| **LIMITED_TECH** | ❌ | ✅ Exec | ✅ Create | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **REQUESTER** | ✅ View | ❌ | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VIEW_ONLY** | ✅ View | ✅ View | ✅ View | ❌ | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ❌ |
