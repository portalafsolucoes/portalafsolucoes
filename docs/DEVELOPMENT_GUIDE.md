# 🚀 Guia Rápido de Desenvolvimento - AdwTech

## 📋 Regras Essenciais

### 🎨 Design System
```typescript
// ❌ NUNCA
<div className="bg-blue-600 text-white">

// ✅ SEMPRE  
<div className="bg-primary text-primary-foreground">
```

- Use tokens semânticos de `globals.css`
- Cores em formato HSL apenas
- Zero classes diretas de cor

### 🏗️ Arquitetura
- Componentes < 200 linhas
- Imports com alias `@/`
- TypeScript strict, zero `any`
- Validação Zod client + server

### ⚡ Performance
- Prefira `edit` sobre reescrever arquivos
- Operações paralelas quando possível
- Dynamic imports para componentes pesados
- Server Components por padrão

### 🔒 Segurança
```typescript
// Validação dupla obrigatória
const schema = z.object({ /* ... */ })

// Client
const form = useForm({ resolver: zodResolver(schema) })

// Server
const body = schema.parse(await request.json())
```

### 💬 Comunicação
- Máximo 2 linhas de explicação
- Confirme escopo quando ambíguo
- Nunca assuma requisitos

### 🎯 Checklist Rápido
- [ ] Compila sem erros TS
- [ ] Validação client + server
- [ ] Feedback ao usuário (toast/loading)
- [ ] **🎭 TESTES PLAYWRIGHT MCP EXECUTADOS** ⚠️ OBRIGATÓRIO
- [ ] Screenshots/snapshots capturados
- [ ] Console + network verificados
- [ ] Responsivo mobile + desktop
- [ ] Tokens semânticos usados
- [ ] Error handling implementado

## 🔄 Fluxo do Sistema

```
RAF (Solicitante) 
  → Aprovação (Coordenador)
    → OS (Sistema)
      → Execução (Técnico)
        → Conclusão (Coordenador)
```

## 🛠️ Stack Técnico

- Next.js 15 + React 19 + TypeScript 5
- Tailwind CSS 4 + Lucide Icons
- Prisma 6 + PostgreSQL (Supabase)
- Zod + React Hook Form + Zustand

## 📝 Comandos Úteis

```bash
npm run dev              # Desenvolvimento
npm run build            # Build produção
npm run db:push          # Sync Prisma schema
npm run db:studio        # UI do banco
```

## ⚠️ Nunca Faça

- ❌ Cores diretas em className
- ❌ Exponha secrets no client
- ❌ Ignore validação server-side
- ❌ Use `any` em TypeScript
- ❌ Crie componentes > 300 linhas
- ❌ **Finalize tarefa sem testar com Playwright MCP** ⚠️ CRÍTICO
- ❌ Ignore erros no console
- ❌ Crie arquivos MD sem solicitação

## ✅ Sempre Faça

- ✅ Valide client E server
- ✅ Use tokens do design system
- ✅ Forneça feedback ao usuário
- ✅ **Teste com Playwright MCP antes de finalizar** ⚠️ OBRIGATÓRIO
- ✅ Capture evidências (screenshots/snapshots)
- ✅ Verifique console e network
- ✅ Teste mobile + desktop
- ✅ Error handling robusto
- ✅ Código type-safe

---

**Consulte `WINDSURF_RULES.md` para documentação completa**

**Consulte `PLAYWRIGHT_TESTING_RULES.md` para protocolo de testes**
