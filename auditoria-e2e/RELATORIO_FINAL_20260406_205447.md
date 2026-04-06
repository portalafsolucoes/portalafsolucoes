# RELATORIO DE AUDITORIA E2E

**Sistema:** http://localhost:3000
**Data:** 2026-04-06T23:51:27.770Z
**Ambiente:** desenvolvimento local
**Perfil testado:** SUPER_ADMIN

## 1. Resumo Executivo

| Metrica | Valor |
|---|---:|
| Telas auditadas | 27 |
| Testes consolidados | 40 |
| Tempo medio de abertura | 4756 ms |
| Login (submit ate dashboard) | 4561 ms |
| Chamadas /api/auth/me no circuito | 14 |
| Passou / Falhou / Parcial | 18 / 22 / 0 |

### Achados principais

- **ALTA**: Transformar a navegacao lateral em layout persistente do App Router - A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas 14 chamadas para /api/auth/me durante a navegacao.
- **ALTA**: Consolidar checagem de sessao e permissoes em um provider/cache compartilhado - As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez.
- **ALTA**: Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache - As rotas mais lentas foram: Ativos (10490ms), Centros de Trabalho (10421ms), Áreas (9686ms), Criticidade de Ativos (8811ms), RAF (7093ms).
- **MEDIA**: Padronizar skeletons e transicoes de tela profissionais - Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes.
- **MEDIA**: Revisar layout responsivo do cabecalho fixo e botao do menu mobile - 0 telas apresentaram overflow horizontal em tablet/mobile.

## 2. Mapa do Sistema

| # | Tela | Rota | Tempo de abertura | APIs observadas | Screenshot |
|---|---|---|---:|---:|---|
| 1 | Dashboard | `/dashboard` | 6072 ms | 0 | F1_discovery/screenshots/F1_03_dashboard.png |
| 2 | Árvore | `/tree` | 1533 ms | 0 | F1_discovery/screenshots/F1_04_arvore.png |
| 3 | Pessoas/Equipes | `/people-teams` | 3549 ms | 0 | F1_discovery/screenshots/F1_05_pessoas-equipes.png |
| 4 | Tipos de Manutenção | `/basic-registrations/maintenance-types` | 4213 ms | 3 | F1_discovery/screenshots/F1_06_tipos-de-manutencao.png |
| 5 | Áreas de Manutenção | `/basic-registrations/maintenance-areas` | 5857 ms | 4 | F1_discovery/screenshots/F1_07_areas-de-manutencao.png |
| 6 | Tipos de Serviço | `/basic-registrations/service-types` | 4188 ms | 5 | F1_discovery/screenshots/F1_08_tipos-de-servico.png |
| 7 | Calendários | `/basic-registrations/calendars` | 2664 ms | 3 | F1_discovery/screenshots/F1_09_calendarios.png |
| 8 | Centros de Custos | `/basic-registrations/cost-centers` | 2665 ms | 3 | F1_discovery/screenshots/F1_10_centros-de-custos.png |
| 9 | Áreas | `/basic-registrations/areas` | 9686 ms | 5 | F1_discovery/screenshots/F1_11_areas.png |
| 10 | Centros de Trabalho | `/basic-registrations/work-centers` | 10421 ms | 3 | F1_discovery/screenshots/F1_12_centros-de-trabalho.png |
| 11 | Tipos Modelo | `/basic-registrations/asset-family-models` | 2754 ms | 3 | F1_discovery/screenshots/F1_13_tipos-modelo.png |
| 12 | Famílias de Bens | `/basic-registrations/asset-families` | 5657 ms | 5 | F1_discovery/screenshots/F1_14_familias-de-bens.png |
| 13 | Posições | `/basic-registrations/positions` | 6168 ms | 4 | F1_discovery/screenshots/F1_15_posicoes.png |
| 14 | Recursos | `/basic-registrations/resources` | 2965 ms | 5 | F1_discovery/screenshots/F1_16_recursos.png |
| 15 | Tarefas Genéricas | `/basic-registrations/generic-tasks` | 5689 ms | 4 | F1_discovery/screenshots/F1_17_tarefas-genericas.png |
| 16 | Etapas Genéricas | `/basic-registrations/generic-steps` | 2787 ms | 3 | F1_discovery/screenshots/F1_18_etapas-genericas.png |
| 17 | Características | `/basic-registrations/characteristics` | 2736 ms | 3 | F1_discovery/screenshots/F1_19_caracteristicas.png |
| 18 | Ativos | `/assets` | 10490 ms | 2 | F1_discovery/screenshots/F1_20_ativos.png |
| 19 | Criticidade de Ativos | `/criticality` | 8811 ms | 2 | F1_discovery/screenshots/F1_21_criticidade-de-ativos.png |
| 20 | Plano de Manutenção | `/maintenance-plan` | 2491 ms | 0 | F1_discovery/screenshots/F1_22_plano-de-manutencao.png |
| 21 | Planejamento e Programação | `/planning` | 1621 ms | 4 | F1_discovery/screenshots/F1_23_planejamento-e-programacao.png |
| 22 | Ordens de Serviço (OS) | `/work-orders` | 4841 ms | 2 | F1_discovery/screenshots/F1_24_ordens-de-servico-os.png |
| 23 | Solicitações (SS) | `/requests` | 2432 ms | 2 | F1_discovery/screenshots/F1_25_solicitacoes-ss.png |
| 24 | Aprovações0 | `/requests/approvals` | 3279 ms | 0 | F1_discovery/screenshots/F1_26_aprovacoes0.png |
| 25 | RAF | `/rafs` | 7093 ms | 2 | F1_discovery/screenshots/F1_27_raf.png |
| 26 | Localizações | `/locations` | 5317 ms | 2 | F1_discovery/screenshots/F1_28_localizacoes.png |
| 27 | KPI - Indicadores | `/kpi` | 2431 ms | 1 | F1_discovery/screenshots/F1_29_kpi-indicadores.png |

## 3. Resultados dos Testes

| # | Modulo | Funcionalidade | Resultado | Severidade | Observacao |
|---|---|---|---|---|---|
| 1 | Dashboard | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6072 ms | Sem API capturada | Abertura acima de 2,5s (6072ms). |
| 2 | Árvore | Navegacao e carregamento | PASSOU | MEDIA | Abertura 1533 ms | Sem API capturada |
| 3 | Pessoas/Equipes | Navegacao e carregamento | FALHOU | ALTA | Abertura 3549 ms | Sem API capturada | Abertura acima de 2,5s (3549ms). |
| 4 | Tipos de Manutenção | Navegacao e carregamento | FALHOU | ALTA | Abertura 4213 ms | API mais lenta /api/users? (3067 ms) | Abertura acima de 2,5s (4213ms). |
| 5 | Áreas de Manutenção | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5857 ms | API mais lenta /api/basic-registrations/maintenance-areas (221 ms) | Abertura acima de 2,5s (5857ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 6 | Tipos de Serviço | Navegacao e carregamento | FALHOU | ALTA | Abertura 4188 ms | API mais lenta /api/basic-registrations/maintenance-areas (1232 ms) | Abertura acima de 2,5s (4188ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 7 | Calendários | Navegacao e carregamento | FALHOU | ALTA | Abertura 2664 ms | API mais lenta /api/basic-registrations/calendars (185 ms) | Abertura acima de 2,5s (2664ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 8 | Centros de Custos | Navegacao e carregamento | FALHOU | ALTA | Abertura 2665 ms | API mais lenta /api/basic-registrations/cost-centers (170 ms) | Abertura acima de 2,5s (2665ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 9 | Áreas | Navegacao e carregamento | FALHOU | CRITICA | Abertura 9686 ms | API mais lenta /api/basic-registrations/areas (1421 ms) | Abertura acima de 2,5s (9686ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 10 | Centros de Trabalho | Navegacao e carregamento | FALHOU | CRITICA | Abertura 10421 ms | API mais lenta /api/units (496 ms) | Abertura acima de 2,5s (10421ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 11 | Tipos Modelo | Navegacao e carregamento | FALHOU | ALTA | Abertura 2754 ms | API mais lenta /api/basic-registrations/asset-family-models (179 ms) | Abertura acima de 2,5s (2754ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 12 | Famílias de Bens | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5657 ms | API mais lenta /api/basic-registrations/asset-family-models (255 ms) | Abertura acima de 2,5s (5657ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 13 | Posições | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6168 ms | API mais lenta /api/auth/me (218 ms) | Abertura acima de 2,5s (6168ms). | Chamou /api/auth/me 2x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 14 | Recursos | Navegacao e carregamento | FALHOU | ALTA | Abertura 2965 ms | API mais lenta /api/basic-registrations/resources?types=MATERIAL,TOOL (271 ms) | Abertura acima de 2,5s (2965ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 15 | Tarefas Genéricas | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5689 ms | API mais lenta /api/basic-registrations/generic-tasks (193 ms) | Abertura acima de 2,5s (5689ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 16 | Etapas Genéricas | Navegacao e carregamento | FALHOU | ALTA | Abertura 2787 ms | API mais lenta /api/basic-registrations/generic-steps (172 ms) | Abertura acima de 2,5s (2787ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 17 | Características | Navegacao e carregamento | FALHOU | ALTA | Abertura 2736 ms | API mais lenta /api/basic-registrations/characteristics (153 ms) | Abertura acima de 2,5s (2736ms). | Chamou /api/auth/me 1x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 18 | Ativos | Navegacao e carregamento | FALHOU | CRITICA | Abertura 10490 ms | API mais lenta /api/assets (2597 ms) | Abertura acima de 2,5s (10490ms). |
| 19 | Criticidade de Ativos | Navegacao e carregamento | FALHOU | CRITICA | Abertura 8811 ms | API mais lenta /api/criticality?sortBy=totalScore&sortOrder=desc (4790 ms) | Abertura acima de 2,5s (8811ms). |
| 20 | Plano de Manutenção | Navegacao e carregamento | PASSOU | MEDIA | Abertura 2491 ms | Sem API capturada |
| 21 | Planejamento e Programação | Navegacao e carregamento | PASSOU | MEDIA | Abertura 1621 ms | API mais lenta /api/planning/plans (365 ms) |
| 22 | Ordens de Serviço (OS) | Navegacao e carregamento | FALHOU | CRITICA | Abertura 4841 ms | API mais lenta /api/work-orders?summary=true (1260 ms) | Abertura acima de 2,5s (4841ms). |
| 23 | Solicitações (SS) | Navegacao e carregamento | PASSOU | MEDIA | Abertura 2432 ms | API mais lenta /api/requests?summary=true (1007 ms) |
| 24 | Aprovações0 | Navegacao e carregamento | FALHOU | ALTA | Abertura 3279 ms | Sem API capturada | Abertura acima de 2,5s (3279ms). |
| 25 | RAF | Navegacao e carregamento | FALHOU | CRITICA | Abertura 7093 ms | API mais lenta /api/rafs (1301 ms) | Abertura acima de 2,5s (7093ms). |
| 26 | Localizações | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5317 ms | API mais lenta /api/locations?summary=true (3056 ms) | Abertura acima de 2,5s (5317ms). |
| 27 | KPI - Indicadores | Navegacao e carregamento | PASSOU | MEDIA | Abertura 2431 ms | API mais lenta /api/units (303 ms) |

## 4. Responsividade

| Perfil | Tela | Tempo | Overflow horizontal | Menu mobile | Screenshot |
|---|---|---:|---|---|---|
| tablet | Dashboard | 9702 ms | NAO | SIM | F3_ui/screenshots/tablet_dashboard.png |
| tablet | Ativos | 2450 ms | NAO | SIM | F3_ui/screenshots/tablet_ativos.png |
| tablet | Plano de Manutenção | 2935 ms | NAO | SIM | F3_ui/screenshots/tablet_plano-de-manutencao.png |
| tablet | Planejamento e Programação | 3606 ms | NAO | SIM | F3_ui/screenshots/tablet_planejamento-e-programacao.png |
| tablet | Ordens de Serviço (OS) | 6128 ms | NAO | SIM | F3_ui/screenshots/tablet_ordens-de-servico-os.png |
| tablet | Solicitações (SS) | 2793 ms | NAO | SIM | F3_ui/screenshots/tablet_solicitacoes-ss.png |
| mobile | Dashboard | 3198 ms | NAO | SIM | F3_ui/screenshots/mobile_dashboard.png |
| mobile | Ativos | 4267 ms | NAO | SIM | F3_ui/screenshots/mobile_ativos.png |
| mobile | Plano de Manutenção | 2369 ms | NAO | SIM | F3_ui/screenshots/mobile_plano-de-manutencao.png |
| mobile | Planejamento e Programação | 2642 ms | NAO | SIM | F3_ui/screenshots/mobile_planejamento-e-programacao.png |
| mobile | Ordens de Serviço (OS) | 2539 ms | NAO | SIM | F3_ui/screenshots/mobile_ordens-de-servico-os.png |
| mobile | Solicitações (SS) | 5312 ms | NAO | SIM | F3_ui/screenshots/mobile_solicitacoes-ss.png |

## 5. Analise Tecnica

- **Layout nao persistente entre rotas**: As paginas instanciam `AppLayout` dentro de cada `page.tsx`, o que remonta sidebar e header em toda navegacao. Evidencia em `src/components/layout/AppLayout.tsx` e `src/app/dashboard/page.tsx`.
- **Sessao e permissoes buscadas varias vezes**: A sidebar faz fetch de `/api/auth/me` no mount e varias paginas repetem a mesma chamada antes de carregar dados. Isso amplia o tempo de abertura e causa sensacao de recarregamento.
- **Dashboard com waterfall de requests**: A dashboard consulta sessao primeiro e so depois dispara `/api/dashboard/stats`, criando serializacao evitavel.

## 6. Top 5 correcoes urgentes

1. Mover `AppLayout` para um `layout.tsx` persistente do App Router, evitando remontagem completa em cada rota.
2. Centralizar sessao/permissoes em cache compartilhado e remover chamadas repetidas de `/api/auth/me`.
3. Quebrar fetches sequenciais do dashboard e demais telas em carregamento paralelo com cache.
4. Criar skeletons e placeholders para sidebar, header e listagens durante a troca de tela.
5. Revisar rotas mais lentas e otimizar endpoints com payload menor e menos round-trips.

## 7. Top 5 melhorias de maior impacto

1. Transformar a navegacao lateral em layout persistente do App Router - A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas 14 chamadas para /api/auth/me durante a navegacao.
2. Consolidar checagem de sessao e permissoes em um provider/cache compartilhado - As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez.
3. Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache - As rotas mais lentas foram: Ativos (10490ms), Centros de Trabalho (10421ms), Áreas (9686ms), Criticidade de Ativos (8811ms), RAF (7093ms).
4. Padronizar skeletons e transicoes de tela profissionais - Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes.
5. Revisar layout responsivo do cabecalho fixo e botao do menu mobile - 0 telas apresentaram overflow horizontal em tablet/mobile.

## 8. Limitacoes da auditoria

- Ambiente local, sem acesso ao APM do servidor nem ao tempo interno de banco.
- A medicao de backend foi inferida pelas requisicoes de rede do navegador.
- O circuito foi executado com o perfil SUPER_ADMIN; outros papeis podem ter comportamento diferente.
