# 🧪 GUIA COMPLETO DE TESTES - SISTEMA DE APROVAÇÃO

## 🌐 Acesso ao Sistema
**URL:** http://localhost:3001

---

## 👥 USUÁRIOS DE TESTE
**Senha para TODOS:** `123456`

### 1️⃣ SUPER_ADMIN (Vê TODAS)
- **Email:** `admin.geral@mizu.com.br`
- **Nome:** Carlos Souza
- **Poder:** Vê e aprova TODAS as solicitações

### 2️⃣ ADMIN Equipe Elétrica (Vê só sua equipe)
- **Email:** `andrew.silva@mizu.com.br`
- **Nome:** Andrew Silva
- **Poder:** Vê e aprova APENAS SCs da Equipe Elétrica

### 3️⃣ ADMIN Equipe Mecânica (Vê só sua equipe)
- **Email:** `roberto.costa@mizu.com.br`
- **Nome:** Roberto Costa
- **Poder:** Vê e aprova APENAS SCs da Equipe Mecânica

### 4️⃣ TECHNICIAN Elétrica
- **Email:** `jose.ferreira@mizu.com.br`
- **Nome:** José Ferreira

### 5️⃣ TECHNICIAN Mecânica
- **Email:** `paulo.oliveira@mizu.com.br`
- **Nome:** Paulo Oliveira

### 6️⃣ REQUESTER (Solicitante)
- **Email:** `maria.santos@mizu.com.br`
- **Nome:** Maria Santos

---

## 🧪 ROTEIRO DE TESTES

### ✅ TESTE 1: Criar Solicitações de Teste

**Objetivo:** Criar SCs para testar aprovações

1. **Login como REQUESTER**
   - Email: `maria.santos@mizu.com.br`
   - Senha: `123456`

2. **Ir para "Solicitações"**
   - Clicar no menu "Solicitações"

3. **Criar SC para Equipe Elétrica**
   - Clicar em "Nova Solicitação"
   - Título: `Troca de lâmpadas no setor A`
   - Descrição: `Necessário trocar 10 lâmpadas queimadas`
   - Prioridade: `Alta`
   - Equipe: `Equipe Elétrica`
   - Anexar uma imagem (opcional)
   - Clicar em "Salvar"
   - ✅ **Resultado esperado:** SC criada com sucesso

4. **Criar SC para Equipe Mecânica**
   - Clicar em "Nova Solicitação"
   - Título: `Manutenção preventiva bomba 01`
   - Descrição: `Bomba apresentando ruído anormal`
   - Prioridade: `Média`
   - Equipe: `Equipe Mecânica`
   - Clicar em "Salvar"
   - ✅ **Resultado esperado:** SC criada com sucesso

5. **Criar SC sem equipe**
   - Clicar em "Nova Solicitação"
   - Título: `Limpeza geral do pátio`
   - Descrição: `Necessário limpeza urgente`
   - Prioridade: `Baixa`
   - Equipe: `(Nenhuma)`
   - Clicar em "Salvar"
   - ✅ **Resultado esperado:** SC criada com sucesso

6. **Fazer Logout**

---

### ✅ TESTE 2: SUPER_ADMIN vê TODAS as solicitações

**Objetivo:** Verificar que SUPER_ADMIN tem acesso total

1. **Login como SUPER_ADMIN**
   - Email: `admin.geral@mizu.com.br`
   - Senha: `123456`

2. **Verificar Navbar**
   - ✅ **Deve aparecer:** Link "Aprovações" no menu
   - ✅ **Deve aparecer:** Badge vermelho com número "3" (ou quantidade de SCs pendentes)

3. **Ir para "Aprovações"**
   - Clicar em "Aprovações" no menu

4. **Verificar lista de SCs**
   - ✅ **Deve mostrar:** TODAS as 3 SCs criadas
   - ✅ **Deve mostrar:** "Troca de lâmpadas no setor A" (Equipe Elétrica)
   - ✅ **Deve mostrar:** "Manutenção preventiva bomba 01" (Equipe Mecânica)
   - ✅ **Deve mostrar:** "Limpeza geral do pátio" (Sem equipe)
   - ✅ **Deve mostrar:** Informações: solicitante, equipe, data, anexos
   - ✅ **Deve mostrar:** Botões "Aprovar" (verde) e "Rejeitar" (vermelho)

5. **Não aprovar ainda - apenas verificar**

6. **Fazer Logout**

---

### ✅ TESTE 3: ADMIN Elétrica vê APENAS sua equipe

**Objetivo:** Verificar filtro de permissões por equipe

1. **Login como ADMIN Elétrica**
   - Email: `andrew.silva@mizu.com.br`
   - Senha: `123456`

2. **Verificar Navbar**
   - ✅ **Deve aparecer:** Link "Aprovações" no menu
   - ✅ **Deve aparecer:** Badge com número "1" (apenas SCs da Equipe Elétrica)

3. **Ir para "Aprovações"**
   - Clicar em "Aprovações"

4. **Verificar lista de SCs**
   - ✅ **Deve mostrar:** APENAS "Troca de lâmpadas no setor A"
   - ❌ **NÃO deve mostrar:** "Manutenção preventiva bomba 01" (é da Equipe Mecânica)
   - ❌ **NÃO deve mostrar:** "Limpeza geral do pátio" (não tem equipe)
   - ✅ **Mensagem no topo:** "Você pode ver e aprovar solicitações atribuídas à sua equipe"

5. **Fazer Logout**

---

### ✅ TESTE 4: ADMIN Mecânica vê APENAS sua equipe

**Objetivo:** Verificar filtro de permissões por equipe

1. **Login como ADMIN Mecânica**
   - Email: `roberto.costa@mizu.com.br`
   - Senha: `123456`

2. **Verificar Navbar**
   - ✅ **Deve aparecer:** Link "Aprovações" no menu
   - ✅ **Deve aparecer:** Badge com número "1"

3. **Ir para "Aprovações"**
   - Clicar em "Aprovações"

4. **Verificar lista de SCs**
   - ✅ **Deve mostrar:** APENAS "Manutenção preventiva bomba 01"
   - ❌ **NÃO deve mostrar:** "Troca de lâmpadas no setor A" (é da Equipe Elétrica)
   - ❌ **NÃO deve mostrar:** "Limpeza geral do pátio" (não tem equipe)

5. **Fazer Logout**

---

### ✅ TESTE 5: TECHNICIAN NÃO vê Aprovações

**Objetivo:** Verificar que técnicos não têm acesso

1. **Login como TECHNICIAN**
   - Email: `jose.ferreira@mizu.com.br`
   - Senha: `123456`

2. **Verificar Navbar**
   - ❌ **NÃO deve aparecer:** Link "Aprovações" no menu
   - ✅ **Deve aparecer:** Apenas links normais (Ordens de Serviço, Ativos, etc.)

3. **Tentar acessar diretamente**
   - Digitar na URL: `http://localhost:3001/approvals`
   - ✅ **Resultado esperado:** Erro 403 ou redirecionamento

4. **Fazer Logout**

---

### ✅ TESTE 6: Aprovar SC e criar OT automaticamente

**Objetivo:** Testar conversão SC → OT

1. **Login como SUPER_ADMIN**
   - Email: `admin.geral@mizu.com.br`
   - Senha: `123456`

2. **Ir para "Aprovações"**

3. **Aprovar "Troca de lâmpadas no setor A"**
   - Clicar no botão "Aprovar" (verde)
   - ✅ **Deve aparecer:** Confirmação "Deseja aprovar...?"
   - Confirmar
   - ✅ **Deve aparecer:** Mensagem "✅ Solicitação aprovada! Ordem de Serviço criada com sucesso."
   - ✅ **Resultado:** SC some da lista de aprovações

4. **Verificar contador na Navbar**
   - ✅ **Badge deve atualizar:** Número diminui de 3 para 2

5. **Ir para "Ordens de Serviço"**
   - Clicar em "Ordens de Serviço" no menu

6. **Verificar OT criada**
   - ✅ **Deve aparecer:** Nova OT "Troca de lâmpadas no setor A"
   - ✅ **Deve ter:** Mesma descrição da SC
   - ✅ **Deve ter:** Mesma prioridade (Alta)
   - ✅ **Deve ter:** Status "OPEN"
   - ✅ **Deve ter:** Equipe "Equipe Elétrica" atribuída
   - ✅ **Deve ter:** Arquivos anexados (se houver)

7. **Voltar para "Solicitações"**
   - Clicar em "Solicitações"
   - Buscar "Troca de lâmpadas no setor A"
   - ✅ **Status deve ser:** "APPROVED"
   - ✅ **Deve mostrar:** Quem aprovou e quando

---

### ✅ TESTE 7: Rejeitar SC com motivo

**Objetivo:** Testar rejeição de SC

1. **Ainda logado como SUPER_ADMIN**

2. **Ir para "Aprovações"**

3. **Rejeitar "Limpeza geral do pátio"**
   - Clicar no botão "Rejeitar" (vermelho)
   - ✅ **Deve abrir:** Modal "Rejeitar Solicitação"
   - ✅ **Deve mostrar:** Campo "Motivo da rejeição"

4. **Preencher motivo**
   - Digitar: `Falta de recursos disponíveis no momento`
   - Clicar em "Confirmar Rejeição"
   - ✅ **Deve aparecer:** Mensagem "✅ Solicitação rejeitada com sucesso."
   - ✅ **Resultado:** SC some da lista de aprovações

5. **Verificar contador**
   - ✅ **Badge deve atualizar:** Número diminui de 2 para 1

6. **Ir para "Solicitações"**
   - Buscar "Limpeza geral do pátio"
   - ✅ **Status deve ser:** "REJECTED"
   - ✅ **Deve mostrar:** Motivo da rejeição
   - ✅ **Deve mostrar:** Quem rejeitou e quando

7. **Verificar que NÃO criou OT**
   - Ir para "Ordens de Serviço"
   - ❌ **NÃO deve existir:** OT "Limpeza geral do pátio"

---

### ✅ TESTE 8: ADMIN tenta aprovar SC de outra equipe

**Objetivo:** Verificar segurança de permissões

1. **Login como ADMIN Elétrica**
   - Email: `andrew.silva@mizu.com.br`
   - Senha: `123456`

2. **Tentar acessar API diretamente**
   - Abrir Console do navegador (F12)
   - Executar:
   ```javascript
   fetch('/api/requests/pending').then(r => r.json()).then(console.log)
   ```
   - ✅ **Deve retornar:** APENAS SCs da Equipe Elétrica

3. **Tentar aprovar SC de outra equipe via API**
   - Pegar ID de uma SC da Equipe Mecânica
   - Executar:
   ```javascript
   fetch('/api/requests/[ID]/approve', {method: 'POST'}).then(r => r.json()).then(console.log)
   ```
   - ✅ **Deve retornar:** Erro 403 "Você só pode aprovar solicitações atribuídas à sua equipe"

---

### ✅ TESTE 9: Visualização de imagens em SCs

**Objetivo:** Verificar anexos de imagens

1. **Login como REQUESTER**
   - Email: `maria.santos@mizu.com.br`
   - Senha: `123456`

2. **Criar SC com imagem**
   - Ir para "Solicitações"
   - Clicar em "Nova Solicitação"
   - Título: `Vazamento no telhado`
   - Anexar uma foto (arrastar ou clicar)
   - ✅ **Deve mostrar:** Preview da imagem
   - Equipe: `Equipe Elétrica`
   - Salvar

3. **Fazer Logout e Login como ADMIN**
   - Email: `andrew.silva@mizu.com.br`
   - Senha: `123456`

4. **Ir para "Aprovações"**
   - Localizar "Vazamento no telhado"
   - ✅ **Deve mostrar:** Ícone de anexo com "1 arquivo(s)"

5. **Clicar em "Ver" (se tiver botão) ou Aprovar**
   - ✅ **Imagem deve aparecer:** Visualmente na visualização
   - ✅ **NÃO apenas nome do arquivo**

---

### ✅ TESTE 10: Fluxo completo end-to-end

**Objetivo:** Testar todo o ciclo

1. **REQUESTER cria SC**
   - Login: `maria.santos@mizu.com.br`
   - Criar SC para Equipe Mecânica
   - Logout

2. **ADMIN Mecânica vê e aprova**
   - Login: `roberto.costa@mizu.com.br`
   - Ir em "Aprovações"
   - Ver SC na lista
   - Aprovar
   - Logout

3. **TECHNICIAN Mecânica executa OT**
   - Login: `paulo.oliveira@mizu.com.br`
   - Ir em "Ordens de Serviço"
   - Ver OT criada
   - Abrir OT
   - ✅ **Deve mostrar:** Link ou referência à SC original

---

## 📊 CHECKLIST FINAL

### Funcionalidades Básicas
- [ ] Login funciona para todos os usuários
- [ ] Navbar mostra "Aprovações" apenas para ADMIN/SUPER_ADMIN
- [ ] Badge de contador aparece e atualiza
- [ ] Página de Aprovações carrega corretamente

### Permissões
- [ ] SUPER_ADMIN vê TODAS as SCs
- [ ] ADMIN vê APENAS SCs da sua equipe
- [ ] TECHNICIAN NÃO vê aba Aprovações
- [ ] REQUESTER NÃO vê aba Aprovações

### Aprovação
- [ ] Botão "Aprovar" funciona
- [ ] Cria OT automaticamente
- [ ] OT tem todos os dados da SC
- [ ] OT tem equipe atribuída
- [ ] Arquivos são copiados para OT
- [ ] SC muda status para APPROVED
- [ ] Registra quem aprovou e quando

### Rejeição
- [ ] Botão "Rejeitar" abre modal
- [ ] Modal exige motivo
- [ ] SC muda status para REJECTED
- [ ] Registra motivo da rejeição
- [ ] NÃO cria OT

### Interface
- [ ] Design limpo e profissional
- [ ] Botões com cores adequadas (verde/vermelho)
- [ ] Informações claras e visíveis
- [ ] Responsivo (funciona em mobile)
- [ ] Imagens aparecem visualmente

### Segurança
- [ ] ADMIN não consegue aprovar SC de outra equipe
- [ ] APIs retornam erro 403 quando sem permissão
- [ ] Filtros funcionam corretamente

---

## 🎯 RESULTADO ESPERADO

✅ **TODOS os testes devem passar**
✅ **Sistema 100% funcional**
✅ **Pronto para produção**

---

## 🐛 Problemas Encontrados

_(Anotar aqui qualquer bug ou comportamento inesperado)_

---

## ✅ Testes Concluídos

Data: ___/___/___
Testador: _______________
Status: [ ] APROVADO [ ] REPROVADO

Observações:
_______________________________________
_______________________________________
_______________________________________
