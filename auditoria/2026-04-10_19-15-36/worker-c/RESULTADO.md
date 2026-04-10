# RESULTADO Worker C

Auditoria E2E focada em `assets`, `tree`, `locations`, `people-teams`, `people`, `teams`, `basic-registrations/areas` e `planning/plans`.

## Resumo
- Casos executados: 2
- Screenshots gerados: 8
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
- [assets-table-search.png](assets-table-search.png)
- [assets-tree-view.png](assets-tree-view.png)
- [assets-create-modal.png](assets-create-modal.png)
- [locations-table-initial.png](locations-table-initial.png)
- [locations-grid-view.png](locations-grid-view.png)
- [locations-search.png](locations-search.png)

## Observacoes
- O teste de rota com tecnico validou redirecionamento fora do contexto de cadastro.
- O ambiente de dev usa o login rapido da tela de login, o que ajudou a validar o fluxo real de autenticacao.
