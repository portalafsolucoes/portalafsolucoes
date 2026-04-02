# 🎭 Regras de Testes com Playwright MCP - OBRIGATÓRIO

## ⚠️ REGRA CRÍTICA - SEMPRE ATIVA

**VOCÊ DEVE usar o Playwright MCP para testar TODAS as alterações que fizer no sistema antes de considerar a tarefa completa.**

---

## 🎯 Quando Testar (SEMPRE)

### Alterações que EXIGEM testes imediatos:

✅ **Componentes de UI**
- Novos componentes criados
- Modificações em componentes existentes
- Alterações de layout ou estilo
- Mudanças em formulários

✅ **Funcionalidades**
- Novas features implementadas
- Fluxos de usuário modificados
- Integrações com APIs
- Lógica de negócio alterada

✅ **Modais e Diálogos**
- Abertura/fechamento de modais
- Validação de formulários em modais
- Fluxos de aprovação
- Confirmações de ação

✅ **Navegação**
- Novas rotas criadas
- Links e botões de navegação
- Redirecionamentos
- Proteção de rotas

✅ **Formulários**
- Validação de campos
- Submissão de dados
- Mensagens de erro
- Estados de loading

---

## 🛠️ Ferramentas Playwright MCP Disponíveis

### Navegação
```typescript
// Navegar para URL
browser_navigate({ url: "http://localhost:3000/work-orders" })

// Voltar página
browser_navigate_back()

// Gerenciar abas
browser_tabs({ action: "list" | "new" | "close" | "select" })
```

### Interação
```typescript
// Clicar em elemento
browser_click({ 
  element: "Botão Novo RAF",
  ref: "button[data-testid='new-raf-btn']"
})

// Preencher formulário
browser_fill_form({
  fields: [
    { name: "Título", type: "textbox", ref: "#title", value: "Nova OS" },
    { name: "Prioridade", type: "combobox", ref: "#priority", value: "HIGH" }
  ]
})

// Digitar texto
browser_type({
  element: "Campo de descrição",
  ref: "#description",
  text: "Descrição detalhada da falha"
})

// Selecionar opção
browser_select_option({
  element: "Dropdown de equipe",
  ref: "#team-select",
  values: ["team-123"]
})
```

### Validação
```typescript
// Capturar snapshot (melhor que screenshot)
browser_snapshot()

// Screenshot visual
browser_take_screenshot({
  filename: "modal-raf-aberto.png",
  fullPage: false
})

// Verificar console
browser_console_messages({ onlyErrors: true })

// Verificar network
browser_network_requests()
```

### Ações Avançadas
```typescript
// Hover sobre elemento
browser_hover({
  element: "Menu de usuário",
  ref: "#user-menu"
})

// Arrastar e soltar
browser_drag({
  startElement: "Item 1",
  startRef: "#item-1",
  endElement: "Área de destino",
  endRef: "#drop-zone"
})

// Pressionar tecla
browser_press_key({ key: "Enter" })

// Upload de arquivo
browser_file_upload({
  paths: ["C:/path/to/file.pdf"]
})

// Lidar com diálogo
browser_handle_dialog({
  accept: true,
  promptText: "Confirmar exclusão"
})
```

---

## 📋 Protocolo de Testes Obrigatório

### 1. **Antes de Testar**
```bash
# Certifique-se que o servidor está rodando
npm run dev
```

### 2. **Executar Testes**

#### Fluxo Básico de Teste:
```typescript
// 1. Navegar para a página
browser_navigate({ url: "http://localhost:3000/approvals" })

// 2. Capturar estado inicial
browser_snapshot()

// 3. Realizar ação
browser_click({ 
  element: "Botão Novo RAF",
  ref: "button:has-text('Novo RAF')"
})

// 4. Validar resultado
browser_snapshot() // Verificar modal aberto

// 5. Preencher formulário
browser_fill_form({
  fields: [
    { name: "Título", type: "textbox", ref: "#title", value: "Teste RAF" },
    { name: "Descrição", type: "textbox", ref: "#description", value: "Descrição teste" }
  ]
})

// 6. Submeter
browser_click({
  element: "Botão Salvar",
  ref: "button[type='submit']"
})

// 7. Verificar sucesso
browser_wait_for({ text: "RAF criada com sucesso" })
browser_snapshot()

// 8. Verificar erros no console
browser_console_messages({ onlyErrors: true })
```

### 3. **Após Testes**
- Documente resultados no chat
- Se houver erros, corrija antes de finalizar
- Capture screenshots de estados importantes

---

## 🎯 Cenários de Teste Obrigatórios

### Para Componentes de UI:
1. ✅ Renderização inicial
2. ✅ Estados (loading, error, success)
3. ✅ Interações (click, hover, focus)
4. ✅ Responsividade (mobile/desktop)
5. ✅ Acessibilidade (labels, aria-*)

### Para Formulários:
1. ✅ Validação de campos obrigatórios
2. ✅ Mensagens de erro
3. ✅ Submissão com dados válidos
4. ✅ Submissão com dados inválidos
5. ✅ Estados de loading durante submit

### Para Modais:
1. ✅ Abertura do modal
2. ✅ Fechamento (X, ESC, fora do modal)
3. ✅ Conteúdo renderizado corretamente
4. ✅ Ações dentro do modal
5. ✅ Backdrop e overlay

### Para Fluxos Completos:
1. ✅ Fluxo de aprovação de RAF
2. ✅ Criação de Ordem de Serviço
3. ✅ Execução de OS
4. ✅ Conclusão e aprovação final
5. ✅ Navegação entre páginas

---

## 📊 Template de Relatório de Testes

Após cada teste, forneça um relatório estruturado:

```markdown
## 🧪 Relatório de Testes - [Nome da Feature]

### ✅ Testes Executados
1. **Navegação para página** - ✅ Sucesso
2. **Abertura de modal** - ✅ Sucesso
3. **Preenchimento de formulário** - ✅ Sucesso
4. **Validação de campos** - ✅ Sucesso
5. **Submissão de dados** - ✅ Sucesso

### 📸 Evidências
- Screenshot inicial: `test-initial-state.png`
- Screenshot modal aberto: `test-modal-open.png`
- Screenshot sucesso: `test-success.png`

### 🐛 Erros Encontrados
- ❌ Nenhum erro no console
- ✅ Todas as requisições de rede bem-sucedidas

### ✅ Status Final
**APROVADO** - Feature funcionando conforme esperado
```

---

## 🚨 Regras Absolutas

### NUNCA faça:
- ❌ Considere uma tarefa completa sem testar
- ❌ Assuma que código funciona sem validação
- ❌ Ignore erros no console do navegador
- ❌ Pule testes de responsividade
- ❌ Esqueça de verificar estados de loading/error

### SEMPRE faça:
- ✅ Teste imediatamente após implementar
- ✅ Capture snapshots de estados importantes
- ✅ Verifique console e network requests
- ✅ Teste fluxo completo, não apenas partes
- ✅ Documente resultados dos testes
- ✅ Corrija erros antes de finalizar tarefa

---

## 🎯 Checklist de Testes

Antes de considerar qualquer alteração completa:

- [ ] Servidor de desenvolvimento rodando (`npm run dev`)
- [ ] Navegação para página testada com `browser_navigate`
- [ ] Snapshot inicial capturado com `browser_snapshot`
- [ ] Interações testadas (clicks, forms, etc)
- [ ] Estados validados (loading, error, success)
- [ ] Console verificado com `browser_console_messages`
- [ ] Network requests verificadas com `browser_network_requests`
- [ ] Screenshots capturados para documentação
- [ ] Responsividade testada (mobile + desktop)
- [ ] Erros corrigidos (se houver)
- [ ] Relatório de testes documentado

---

## 💡 Exemplos Práticos

### Exemplo 1: Testar Criação de RAF
```typescript
// 1. Navegar
browser_navigate({ url: "http://localhost:3000/approvals" })

// 2. Estado inicial
browser_snapshot()

// 3. Abrir modal
browser_click({ 
  element: "Botão Novo RAF",
  ref: "button:has-text('Novo RAF')"
})

// 4. Aguardar modal
browser_wait_for({ text: "Nova Requisição" })
browser_snapshot()

// 5. Preencher
browser_fill_form({
  fields: [
    { name: "Título", type: "textbox", ref: "#title", value: "Falha no Motor" },
    { name: "Equipamento", type: "textbox", ref: "#equipment", value: "Motor 01" },
    { name: "Descrição", type: "textbox", ref: "#description", value: "Motor apresentando ruído anormal" }
  ]
})

// 6. Submeter
browser_click({ element: "Botão Salvar", ref: "button[type='submit']" })

// 7. Verificar sucesso
browser_wait_for({ text: "RAF criada com sucesso" })
browser_snapshot()

// 8. Verificar erros
browser_console_messages({ onlyErrors: true })
```

### Exemplo 2: Testar Aprovação de RAF
```typescript
// 1. Login como coordenador
browser_navigate({ url: "http://localhost:3000/login" })
browser_fill_form({
  fields: [
    { name: "Email", type: "textbox", ref: "#email", value: "coordenador@adwtech.com" },
    { name: "Senha", type: "textbox", ref: "#password", value: "coord123" }
  ]
})
browser_click({ element: "Botão Login", ref: "button[type='submit']" })

// 2. Ir para aprovações
browser_navigate({ url: "http://localhost:3000/approvals" })
browser_snapshot()

// 3. Clicar em RAF pendente
browser_click({ 
  element: "Primeira RAF pendente",
  ref: "tr:has-text('PENDING'):first button"
})

// 4. Aprovar
browser_click({ element: "Botão Aprovar", ref: "button:has-text('Aprovar')" })
browser_wait_for({ text: "RAF aprovada com sucesso" })

// 5. Verificar conversão para OS
browser_navigate({ url: "http://localhost:3000/work-orders" })
browser_snapshot()
browser_wait_for({ text: "Falha no Motor" }) // Verifica se OS foi criada
```

---

## 🔄 Integração com Workflow de Desenvolvimento

### Fluxo Completo:
1. **Implementar alteração** → Código escrito
2. **Executar testes Playwright** → Validação automática
3. **Capturar evidências** → Screenshots + snapshots
4. **Verificar erros** → Console + network
5. **Corrigir problemas** → Se necessário
6. **Documentar resultados** → Relatório de testes
7. **Considerar completo** → Apenas após aprovação nos testes

---

## 📈 Métricas de Qualidade

### Cobertura de Testes Esperada:
- ✅ 100% das alterações de UI testadas
- ✅ 100% dos formulários validados
- ✅ 100% dos fluxos críticos verificados
- ✅ 0 erros no console após implementação
- ✅ 0 requisições de rede falhando

---

## 🎓 Filosofia de Testes

> **"Código não testado é código quebrado até prova em contrário"**

### Princípios:
1. **Teste primeiro, pergunte depois** - Valide antes de assumir
2. **Evidências visuais** - Screenshots provam funcionamento
3. **Console limpo** - Zero erros é o padrão
4. **Fluxo completo** - Teste do início ao fim
5. **Responsividade sempre** - Mobile e desktop obrigatórios

---

**Esta regra é OBRIGATÓRIA e não pode ser ignorada em nenhuma circunstância.**

**Testes com Playwright MCP são parte integral do processo de desenvolvimento, não uma etapa opcional.**
