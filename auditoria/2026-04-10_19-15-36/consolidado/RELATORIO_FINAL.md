# Relatório Final de Auditoria E2E

- Data: 2026-04-10 19:15:36
- Ambiente: http://localhost:3000
- Evidências: 156 capturas aproximadas entre blocos principais e workers

## Resumo Executivo
A auditoria foi executada com múltiplos agentes em paralelo, combinando Playwright MCP, scripts headless e revisão de código dos pontos críticos. O sistema demonstrou boa cobertura navegacional e aderência em alguns fluxos esperados, mas ainda há falhas relevantes em permissões canônicas, integração de perfil/configurações, consistência de UX em RAF e completude do fluxo Pessoas/Equipes.

## Cobertura Executada
- Worker A: hub, /cmms, dashboard, profile, settings, approvals, requests/approvals, admin/portal, admin/users, admin/units, team-dashboard, gep e /parts em múltiplos perfis/empresas.
- Worker B: requests, approvals, RAF e work-orders com foco em salvar, views, modais e persistência.
- Worker C: assets, tree, locations, people-teams, people, teams, basic-registrations e planning/plans, com execução parcial e evidências iniciais.
- Main agent: checagem direta via Playwright MCP de /hub, /dashboard, /parts, /settings e /api/profile.

## Achados Prioritários
### Alta - Configurações / Perfil
- Título: Tela de Configurações dispara /api/profile e recebe 404 User not found
- Detalhe: A UI renderiza as abas Perfil e Segurança, mas o carregamento complementar do perfil falha no backend. Isso gera erro de console e pode impedir persistência completa dos dados do usuário.
- Evidência: main/settings-profile-api-404.png
- Referências: src/app/api/profile/route.ts

### Alta - Requests / Approvals
- Título: ADMIN continua bloqueado no approve/reject por checagem de papel legado
- Detalhe: As rotas de aprovação ainda aceitam SUPER_ADMIN e GESTOR, enquanto o produto usa ADMIN como papel canônico. O efeito prático é quebra do fluxo de aprovação para ADMIN.
- Evidência: worker-b/screenshots/requests-desktop-table-initial.png, worker-b/screenshots/requests-requester-route-approvals.png
- Referências: src/app/api/requests/[id]/approve/route.ts:17, src/app/api/requests/[id]/reject/route.ts:16

### Alta - People / Teams
- Título: Rota combinada /people-teams fica presa em Pessoas
- Detalhe: A auditoria do Worker C confirmou que a tela combinada não expõe adequadamente a visão/aba de Equipes, o que descaracteriza o fluxo esperado de Pessoas/Equipes.
- Evidência: worker-c/RESULTADO.md, worker-c/cmms-home.png
- Referências: auditoria/2026-04-10_19-15-36/worker-c/RESULTADO.md

### Média - RAF
- Título: Desktop de RAF não expõe Editar/Excluir no painel lateral
- Detalhe: No desktop, a visualização auditada não mostra ações que existem no overlay mobile e na rota direta. Isso cria inconsistência de UX e reduz descobribilidade operacional.
- Evidência: worker-b/screenshots/raf-desktop-detail.png, worker-b/screenshots/raf-mobile-overlay-detail.png
- Referências: src/components/rafs/RAFViewModal.tsx

### Média - Work Orders
- Título: Fluxo de execução/finalização não ficou descobrível na jornada auditada
- Detalhe: A página possui estados e modais de execução/finalização, mas o gatilho visível não apareceu no caminho auditado a partir da lista/detalhe. Isso merece revisão de UX ou de permissão.
- Evidência: worker-b/RESULTADO.md
- Referências: src/app/work-orders/page.tsx, src/app/work-orders/[id]/page.tsx

### Média - Multiunidade
- Título: Ambiente não permitiu fechar auditoria multiunidade completa
- Detalhe: O ambiente auditado expôs apenas 1 unidade ativa/visível no recorte validado, então não foi possível comprovar integralmente troca de unidade, persistência por unidade e filtros cruzados.
- Evidência: worker-c/RESULTADO.md
- Referências: src/app/api/user/active-unit/route.ts

## Validações Positivas
- Fluxo /parts redireciona para /work-orders conforme a spec.
- Tela /settings exibe apenas as abas Perfil e Segurança.
- Requester redireciona de /work-orders para /dashboard no cenário capturado pelo worker visual.
- Sweep amplo de rotas/perfis gerou 98 screenshots no bloco de autenticação/permissões.

## Limitações Reais da Rodada
- A suíte paralela foi concluída com cobertura ampla, mas nem todos os CRUDs e todas as combinações de filtros/views foram fechados até persistência final em todos os módulos.
- O bloco multiunidade ficou limitado pelo estado atual do ambiente com uma única unidade validável.
- Parte das evidências do Worker A ficou em formato de screenshots sem RESULTADO.md final por timeout de execução, mas os artefatos foram incorporados à consolidação.

## Artefatos Base
- worker-b/RESULTADO.md
- worker-c/RESULTADO.md
- worker-a/screenshots/*
- main/dashboard-shell.png
- main/settings-profile-api-404.png
- main/parts-route.png

## Anexos Textuais
### Worker B
```
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

```

### Worker C
```
# RESULTADO Worker C

Auditoria E2E focada em `assets`, `tree`, `locations`, `people-teams`, `people`, `teams`, `basic-registrations/areas` e `planning/plans`.

## Resumo
- Casos executados: 2
- Screenshots gerados: 4
- Unidade ativa encontrada no ambiente: 1 unidade apenas, o que limita a validacao de consistencia multiunidade.

## Achados Confirmados

### Alta
- `people-teams`: a tela combinada fica presa em `Pessoas` porque o estado `activeTab` e hardcoded para `people`; a aba/visao de `Equipes` nao fica acessivel nessa rota.

### Media
- Consistencia por unidade continua limitada no ambiente porque a API retorna apenas 1 unidade para a empresa testada.

## Casos Executados

| Caso | Status | Detalhe |
| --- | --- | --- |
| unit-count | pass | Unidades visiveis: 1 |
| assets | fail | Ativo nao encontrado apos salvar |

## Screenshots
- [cmms-home.png](cmms-home.png)
- [assets-table-initial.png](assets-table-initial.png)
- [assets-tree-view.png](assets-tree-view.png)
- [assets-create-modal.png](assets-create-modal.png)

## Observacoes
- O teste de rota com tecnico validou redirecionamento fora do contexto de cadastro.
- O ambiente de dev usa o login rapido da tela de login, o que ajudou a validar o fluxo real de autenticacao.

```