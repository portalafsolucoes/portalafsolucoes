# Resultado da Auditoria E2E - Worker B

Data: 2026-04-10
Escopo: `work-orders`, `requests`, `requests/approvals`, `approvals`, `RAF`, execução, salvar, filtros, busca, views `tabela/grade`, modais e persistência funcional.

## Resumo Executivo

A auditoria do Worker B ficou **parcialmente concluída**, mas já há achados críticos e de interface suficientes para ação imediata.  
Os problemas mais importantes confirmados até agora são:

1. `requests/approvals` ainda valida permissão com papel legado `GESTOR` no backend, o que bloqueia `ADMIN` em aprovar/rejeitar.
2. A visualização de RAF no desktop não expõe as ações de editar/excluir no painel lateral em página, embora essas ações existam no modal mobile e na rota direta.
3. O fluxo de execução/finalização de `work-orders` aparece no estado da página, mas não encontrei gatilho visível no caminho auditado de lista/detalhe para acionar essas modais.

## Cobertura Executada

- Lista de solicitações com carregamento inicial.
- Acesso a rota de aprovações do requester.
- RAF em desktop e mobile, incluindo criação e visualização.
- Inspeção de rotas de `work-orders`, modais de execução e finalização.
- Revisão de código para confirmar regras de permissão e exposição de ações.

## Achados Críticos Confirmados

| Severidade | Módulo | Ação | Achado | Evidência | Screenshot |
|---|---|---|---|---|---|
| Alta | `Requests / Approvals` | Aprovar / Rejeitar | O backend ainda usa `GESTOR` como papel permitido em `approve` e `reject`. Isso quebra o fluxo para `ADMIN`, que deveria ser um papel canônico. | `src/app/api/requests/[id]/approve/route.ts:17` e `src/app/api/requests/[id]/reject/route.ts:16` | [requests-desktop-table-initial.png](./screenshots/requests-desktop-table-initial.png) |
| Média | `RAF` | View / Modal | O painel lateral desktop de RAF não expõe `Editar` e `Excluir`; no desktop o usuário fica sem ação direta no split-panel, enquanto o mobile overlay e a rota direta têm as ações. | `src/components/rafs/RAFViewModal.tsx:58-109` e `src/components/rafs/RAFViewModal.tsx:312-321` | [raf-desktop-detail.png](./screenshots/raf-desktop-detail.png), [debug-raf-modal.png](./screenshots/debug-raf-modal.png), [raf-mobile-overlay-detail.png](./screenshots/raf-mobile-overlay-detail.png) |
| Média | `Work Orders` | Execução / Salvar | A página mantém estados para execução e finalização, mas no caminho auditado não encontrei gatilho visível para abrir essas modais a partir da lista/detalhe. Isso deixa o fluxo de execução pouco descobrível e possivelmente inacessível para parte dos perfis. | `src/app/work-orders/page.tsx:51-60`, `src/app/work-orders/page.tsx:370-404`, `src/app/work-orders/[id]/page.tsx:120-129` | [requests-desktop-table-initial.png](./screenshots/requests-desktop-table-initial.png) |

## Observações Funcionais Relevantes

- `requests` já têm UI de busca e alternância `tabela/grade` no componente principal, então essa área ainda precisa de validação funcional completa em execução separada.
- O formulário de solicitação expõe botão `Salvar` e `Salvar Alterações`, então o fluxo de persistência está presente no front.
- O modal de aprovação exige seleção de técnico, o que precisa ser validado depois com um request real em estado pendente.
- O fluxo de `work-orders` tem modais de `execute` e `finalize` no código, mas a exposição desses gatilhos na UI ainda precisa ser confirmada com navegação completa.

## Evidências Capturadas

- [requests-desktop-table-initial.png](./screenshots/requests-desktop-table-initial.png)
- [requests-requester-route-approvals.png](./screenshots/requests-requester-route-approvals.png)
- [raf-desktop-table-initial.png](./screenshots/raf-desktop-table-initial.png)
- [raf-desktop-detail.png](./screenshots/raf-desktop-detail.png)
- [raf-desktop-after-create.png](./screenshots/raf-desktop-after-create.png)
- [raf-mobile-list.png](./screenshots/raf-mobile-list.png)
- [raf-mobile-overlay-detail.png](./screenshots/raf-mobile-overlay-detail.png)
- [debug-raf-modal.png](./screenshots/debug-raf-modal.png)

## Pendências

- Validar o fluxo completo de `requests` com criação, edição, exclusão e aprovação em usuário `ADMIN`.
- Validar `requests/approvals` em usuário `SUPER_ADMIN` e `ADMIN`, incluindo aprovação e rejeição com persistência.
- Validar filtros, busca e troca de `tabela/grade` em `requests`.
- Validar o fluxo real de `work-orders` com execução e finalização, incluindo anexos e persistência.
- Confirmar se o desktop de RAF deve mesmo ocultar ações no painel lateral ou se isso é regressão de UX.

## Conclusão Parcial

Mesmo sem encerrar 100% da suíte, este bloco já entregou achados acionáveis.  
O principal bloqueio de correção é o uso de papel legado em aprovações, seguido pela inconsistência de ações em RAF desktop e pela baixa descobribilidade do fluxo de execução de `work-orders`.
