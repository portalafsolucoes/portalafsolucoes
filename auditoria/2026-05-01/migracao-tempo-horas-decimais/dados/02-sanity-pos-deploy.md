# Sanity check pos-deploy — migracao tempo horas decimais

Rodar **logo apos o deploy** em producao. Tempo total estimado: 10 minutos.
Marcar `[x]` em cada item conforme valida. Se algum falhar, registrar a evidencia
em `evidencias/` e decidir rollback ou hotfix.

## Pre-requisitos
- [ ] Deploy concluido em producao (Vercel verde)
- [ ] Migration aplicada no banco de producao (verificavel em `_prisma_migrations`)
- [ ] Sessao logada como SUPER_ADMIN ou ADMIN

## 1) Dashboard — KPI critico (MTTR e backlog)

KPIs que dependiam de `actualDuration / 60` foram ajustados para ler horas
direto. Se esquecemos algum ponto, MTTR vira 60x menor que antes.

- [ ] Abrir `/dashboard`
- [ ] Anotar valor de **MTTR** exibido (ex: `2.5h`)
- [ ] Anotar valor de **Backlog (semanas)** exibido
- [ ] Comparar com snapshot de antes do deploy (printar antes nao foi feito? — comparar com bom-senso operacional)
- [ ] **Criterio de aceite**: MTTR plausivel (ex: 1-10h para empresa ativa). Se aparecer `0.04h` ou `150h`, e bug.

## 2) Tela `/work-orders` — listagem e detalhe

- [ ] Abrir `/work-orders`
- [ ] Filtrar por status `Concluida` e abrir detalhe de uma OS recente
- [ ] Conferir campo **Tempo de Execucao** e **Duracao** no painel
- [ ] **Criterio de aceite**: ambos exibidos como `N.NN h`, sem `min`, sem `NaN`, sem `undefined`

## 3) Imprimir uma OS antiga

- [ ] No detalhe da OS, clicar em **Imprimir**
- [ ] Conferir que `Tempo Estimado` aparece como `N.NN h` no PDF
- [ ] Conferir que tasks com tempo aparecem como `(N.NN h)` ao lado do label
- [ ] **Criterio de aceite**: PDF nao tem `min` em nenhum lugar de duracao

## 4) Imprimir lote (batch)

- [ ] Selecionar 2-3 OSs na listagem e imprimir em lote
- [ ] Conferir que cada pagina A4 mostra horas decimais
- [ ] **Criterio de aceite**: idem item 3

## 5) Plano padrao — formulario

- [ ] Abrir `/maintenance-plan/standard`
- [ ] Editar um plano e adicionar uma task
- [ ] Conferir que o input de **Tempo Execucao** mostra label `(h)` e aceita `0.5`, `1.5`, `2.25`
- [ ] Salvar e reabrir o detalhe — valor exibido como `1.50 h` (ou similar)
- [ ] **Criterio de aceite**: valor digitado bate com valor exibido

## 6) Plano por ativo — formulario

- [ ] Abrir `/maintenance-plan/asset`
- [ ] Selecionar um plano e editar tasks
- [ ] Conferir mesmo padrao do item 5
- [ ] **Criterio de aceite**: idem

## 7) Finalizar uma OS de teste

- [ ] Criar uma OS rapida (qualquer ativo)
- [ ] Atribuir 1 recurso pessoa com 1.5h
- [ ] Finalizar
- [ ] Abrir o detalhe e conferir **Duracao** = `1.50 h`
- [ ] **Criterio de aceite**: nao aparece `90 min` nem `90.00 h`

## 8) `/api/integration/totvs/export` (transparencia para integradores)

```bash
curl -H "Cookie: <session>" 'https://<prod>/api/integration/totvs/export?entity=work-orders'
```

- [ ] Inspecionar uma OS no JSON retornado
- [ ] Conferir que `estimatedDuration` e `actualDuration` aparecem como **inteiros** (minutos)
- [ ] **Criterio de aceite**: o adapter de borda esta funcionando — integradores recebem minutos como antes

## 9) RAF / Acoes / outros modulos sem tempo

- [ ] Abrir `/rafs` e `/rafs/action-plan`
- [ ] Conferir que abrem sem erro 500
- [ ] **Criterio de aceite**: zero erros no console (`F12 > Console`)

---

## Em caso de falha

1. **MTTR fora de escala**: provavel `* 60` ou `/ 60` esquecido em algum lugar. Buscar nos commits o ultimo arquivo tocado e investigar.
2. **PDF mostra `min`**: arquivo de print view nao foi atualizado. Buscar `min` em `src/components/work-orders/*PrintView*`.
3. **Form aceita mas nao salva**: API rejeitando payload. Inspecionar `POST /api/work-orders` com payload `{ executionTime: 1.5 }` no Network tab.
4. **Valores antigos virando absurdos**: migration nao rodou ou rodou parcial. Conferir `SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5`.

## Rollback

- A migration usa `ALTER TYPE` com `USING ROUND(value::numeric / 60.0, 2)`. Para reverter precisa script inverso `ALTER TYPE INTEGER USING ROUND(value * 60)`. **Atencao**: ao reverter, valores criados pos-deploy (em horas) viram minutos como esperado, mas qualquer OS criada nos minutos pos-deploy pode ter perdido precisao no arredondamento.
- Plano de contingencia: rollback so se item 1 (MTTR fora de escala) ou item 2 (form quebrado) ocorrerem juntos. Itens isolados — preferir hotfix.
