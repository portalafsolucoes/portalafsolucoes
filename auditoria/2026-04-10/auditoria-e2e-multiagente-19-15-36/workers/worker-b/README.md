# Worker B - Requests, RAF e Work Orders

- Data: 2026-04-10
- Escopo: `work-orders`, `requests`, `requests/approvals`, `approvals`, `RAF`, execucao, salvar, filtros, busca, views `tabela/grade`, modais e persistencia funcional

## Resumo
O worker confirmou achados acionaveis em aprovacoes, RAF e fluxo de work orders, mesmo sem fechar 100% da suite. A rodada foi suficiente para apontar falhas de permissao canonica e inconsistencias relevantes de UX.

## Achados principais
- Alta: `requests/approvals` ainda validava permissao com papel legado `GESTOR`, bloqueando `ADMIN`.
- Media: painel desktop de RAF nao expunha `Editar` e `Excluir`.
- Media: fluxo de execucao/finalizacao de `work-orders` com baixa descobribilidade no caminho auditado.

## Pendencias
- Validar o fluxo completo de `requests` com criacao, edicao, exclusao e aprovacao em `ADMIN`.
- Validar `requests/approvals` em `SUPER_ADMIN` e `ADMIN`, incluindo persistencia.
- Validar o fluxo real de `work-orders` com execucao, finalizacao e anexos.

## Curadoria
- As screenshots brutas desta rodada nao foram preservadas no repositorio final.
- Este `README.md` passa a ser o registro canonico dos achados do Worker B.
