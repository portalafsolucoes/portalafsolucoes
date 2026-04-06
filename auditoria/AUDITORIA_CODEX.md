# RELATORIO DE AUDITORIA E2E

**Sistema:** http://localhost:3000
**Data:** 2026-04-06T22:03:52.668Z
**Ambiente:** desenvolvimento local
**Perfil testado:** SUPER_ADMIN

## 1. Resumo Executivo

| Metrica | Valor |
|---|---:|
| Telas auditadas | 27 |
| Testes consolidados | 40 |
| Tempo medio de abertura | 4516 ms |
| Login (submit ate dashboard) | 7887 ms |
| Chamadas /api/auth/me no circuito | 88 |
| Passou / Falhou / Parcial | 14 / 26 / 0 |

### Achados principais

- **ALTA**: Transformar a navegacao lateral em layout persistente do App Router - A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas 88 chamadas para /api/auth/me durante a navegacao.
- **ALTA**: Consolidar checagem de sessao e permissoes em um provider/cache compartilhado - As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez.
- **ALTA**: Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache - As rotas mais lentas foram: Pessoas/Equipes (15771ms), Árvore (7816ms), Tipos de Serviço (7254ms), Centros de Custos (6783ms), RAF (6754ms).
- **MEDIA**: Padronizar skeletons e transicoes de tela profissionais - Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes.
- **MEDIA**: Revisar layout responsivo do cabecalho fixo e botao do menu mobile - 0 telas apresentaram overflow horizontal em tablet/mobile.

## 2. Mapa do Sistema

| # | Tela | Rota | Tempo de abertura | APIs observadas | Screenshot |
|---|---|---|---:|---:|---|
| 1 | Dashboard | `/dashboard` | 1418 ms | 0 | F1_discovery/screenshots/F1_03_dashboard.png |
| 2 | Árvore | `/tree` | 7816 ms | 0 | F1_discovery/screenshots/F1_04_arvore.png |
| 3 | Pessoas/Equipes | `/people-teams` | 15771 ms | 3 | F1_discovery/screenshots/F1_05_pessoas-equipes.png |
| 4 | Tipos de Manutenção | `/basic-registrations/maintenance-types` | 6441 ms | 8 | F1_discovery/screenshots/F1_06_tipos-de-manutencao.png |
| 5 | Áreas de Manutenção | `/basic-registrations/maintenance-areas` | 5856 ms | 12 | F1_discovery/screenshots/F1_07_areas-de-manutencao.png |
| 6 | Tipos de Serviço | `/basic-registrations/service-types` | 7254 ms | 12 | F1_discovery/screenshots/F1_08_tipos-de-servico.png |
| 7 | Calendários | `/basic-registrations/calendars` | 5930 ms | 12 | F1_discovery/screenshots/F1_09_calendarios.png |
| 8 | Centros de Custos | `/basic-registrations/cost-centers` | 6783 ms | 12 | F1_discovery/screenshots/F1_10_centros-de-custos.png |
| 9 | Áreas | `/basic-registrations/areas` | 2681 ms | 12 | F1_discovery/screenshots/F1_11_areas.png |
| 10 | Centros de Trabalho | `/basic-registrations/work-centers` | 6122 ms | 12 | F1_discovery/screenshots/F1_12_centros-de-trabalho.png |
| 11 | Tipos Modelo | `/basic-registrations/asset-family-models` | 2495 ms | 12 | F1_discovery/screenshots/F1_13_tipos-modelo.png |
| 12 | Famílias de Bens | `/basic-registrations/asset-families` | 2597 ms | 12 | F1_discovery/screenshots/F1_14_familias-de-bens.png |
| 13 | Posições | `/basic-registrations/positions` | 2528 ms | 12 | F1_discovery/screenshots/F1_15_posicoes.png |
| 14 | Recursos | `/basic-registrations/resources` | 5701 ms | 12 | F1_discovery/screenshots/F1_16_recursos.png |
| 15 | Tarefas Genéricas | `/basic-registrations/generic-tasks` | 2795 ms | 12 | F1_discovery/screenshots/F1_17_tarefas-genericas.png |
| 16 | Etapas Genéricas | `/basic-registrations/generic-steps` | 2875 ms | 12 | F1_discovery/screenshots/F1_18_etapas-genericas.png |
| 17 | Características | `/basic-registrations/characteristics` | 2787 ms | 12 | F1_discovery/screenshots/F1_19_caracteristicas.png |
| 18 | Ativos | `/assets` | 4085 ms | 8 | F1_discovery/screenshots/F1_20_ativos.png |
| 19 | Criticidade de Ativos | `/criticality` | 3151 ms | 8 | F1_discovery/screenshots/F1_21_criticidade-de-ativos.png |
| 20 | Plano de Manutenção | `/maintenance-plan` | 2328 ms | 5 | F1_discovery/screenshots/F1_22_plano-de-manutencao.png |
| 21 | Planejamento e Programação | `/planning` | 3247 ms | 11 | F1_discovery/screenshots/F1_23_planejamento-e-programacao.png |
| 22 | Ordens de Serviço (OS) | `/work-orders` | 1810 ms | 10 | F1_discovery/screenshots/F1_24_ordens-de-servico-os.png |
| 23 | Solicitações (SS) | `/requests` | 2459 ms | 6 | F1_discovery/screenshots/F1_25_solicitacoes-ss.png |
| 24 | Aprovações0 | `/requests/approvals` | 1975 ms | 9 | F1_discovery/screenshots/F1_26_aprovacoes0.png |
| 25 | RAF | `/rafs` | 6754 ms | 10 | F1_discovery/screenshots/F1_27_raf.png |
| 26 | Localizações | `/locations` | 3205 ms | 8 | F1_discovery/screenshots/F1_28_localizacoes.png |
| 27 | KPI - Indicadores | `/kpi` | 5062 ms | 9 | F1_discovery/screenshots/F1_29_kpi-indicadores.png |

## 3. Resultados dos Testes

| # | Modulo | Funcionalidade | Resultado | Severidade | Observacao |
|---|---|---|---|---|---|
| 1 | Dashboard | Navegacao e carregamento | PASSOU | BAIXA | Abertura 1418 ms | Sem API capturada |
| 2 | Árvore | Navegacao e carregamento | FALHOU | CRITICA | Abertura 7816 ms | Sem API capturada | Abertura acima de 2,5s (7816ms). |
| 3 | Pessoas/Equipes | Navegacao e carregamento | FALHOU | CRITICA | Abertura 15771 ms | API mais lenta /api/requests/pending (7122 ms) | Abertura acima de 2,5s (15771ms). | Chamou /api/requests/pending 2x nesta navegacao. |
| 4 | Tipos de Manutenção | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6441 ms | API mais lenta /api/auth/me (588 ms) | Abertura acima de 2,5s (6441ms). | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 3x nesta navegacao. |
| 5 | Áreas de Manutenção | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5856 ms | API mais lenta /api/basic-registrations/maintenance-areas (1628 ms) | Abertura acima de 2,5s (5856ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 6 | Tipos de Serviço | Navegacao e carregamento | FALHOU | CRITICA | Abertura 7254 ms | API mais lenta /api/basic-registrations/service-types (1786 ms) | Abertura acima de 2,5s (7254ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 7 | Calendários | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5930 ms | API mais lenta /api/auth/me (536 ms) | Abertura acima de 2,5s (5930ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 8 | Centros de Custos | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6783 ms | API mais lenta /api/auth/me (3170 ms) | Abertura acima de 2,5s (6783ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 9 | Áreas | Navegacao e carregamento | FALHOU | ALTA | Abertura 2681 ms | API mais lenta /api/basic-registrations/areas (334 ms) | Abertura acima de 2,5s (2681ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 10 | Centros de Trabalho | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6122 ms | API mais lenta /api/basic-registrations/work-centers (353 ms) | Abertura acima de 2,5s (6122ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 11 | Tipos Modelo | Navegacao e carregamento | FALHOU | MEDIA | Abertura 2495 ms | API mais lenta /api/basic-registrations/asset-family-models (251 ms) | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 12 | Famílias de Bens | Navegacao e carregamento | FALHOU | ALTA | Abertura 2597 ms | API mais lenta /api/basic-registrations/asset-families (233 ms) | Abertura acima de 2,5s (2597ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 13 | Posições | Navegacao e carregamento | FALHOU | ALTA | Abertura 2528 ms | API mais lenta /api/auth/me (229 ms) | Abertura acima de 2,5s (2528ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 14 | Recursos | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5701 ms | API mais lenta /api/auth/me (2364 ms) | Abertura acima de 2,5s (5701ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 15 | Tarefas Genéricas | Navegacao e carregamento | FALHOU | ALTA | Abertura 2795 ms | API mais lenta /api/basic-registrations/generic-tasks (324 ms) | Abertura acima de 2,5s (2795ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 16 | Etapas Genéricas | Navegacao e carregamento | FALHOU | ALTA | Abertura 2875 ms | API mais lenta /api/basic-registrations/generic-steps (331 ms) | Abertura acima de 2,5s (2875ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 17 | Características | Navegacao e carregamento | FALHOU | ALTA | Abertura 2787 ms | API mais lenta /api/basic-registrations/characteristics (319 ms) | Abertura acima de 2,5s (2787ms). | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 18 | Ativos | Navegacao e carregamento | FALHOU | ALTA | Abertura 4085 ms | API mais lenta /api/auth/me (310 ms) | Abertura acima de 2,5s (4085ms). | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 19 | Criticidade de Ativos | Navegacao e carregamento | FALHOU | ALTA | Abertura 3151 ms | API mais lenta /api/criticality?sortBy=totalScore&sortOrder=desc (1485 ms) | Abertura acima de 2,5s (3151ms). | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 20 | Plano de Manutenção | Navegacao e carregamento | FALHOU | MEDIA | Abertura 2328 ms | API mais lenta /api/auth/me (337 ms) | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 21 | Planejamento e Programação | Navegacao e carregamento | FALHOU | ALTA | Abertura 3247 ms | API mais lenta /api/auth/me (1947 ms) | Abertura acima de 2,5s (3247ms). | Chamou /api/auth/me 6x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 22 | Ordens de Serviço (OS) | Navegacao e carregamento | FALHOU | MEDIA | Abertura 1810 ms | API mais lenta /api/auth/me (477 ms) | Chamou /api/auth/me 6x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 23 | Solicitações (SS) | Navegacao e carregamento | FALHOU | MEDIA | Abertura 2459 ms | API mais lenta /api/auth/me (1146 ms) | Chamou /api/auth/me 3x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |
| 24 | Aprovações0 | Navegacao e carregamento | FALHOU | MEDIA | Abertura 1975 ms | API mais lenta /api/auth/me (576 ms) | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 5x nesta navegacao. |
| 25 | RAF | Navegacao e carregamento | FALHOU | CRITICA | Abertura 6754 ms | API mais lenta /api/auth/me (1888 ms) | Abertura acima de 2,5s (6754ms). | Chamou /api/auth/me 6x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 26 | Localizações | Navegacao e carregamento | FALHOU | ALTA | Abertura 3205 ms | API mais lenta /api/auth/me (474 ms) | Abertura acima de 2,5s (3205ms). | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 2x nesta navegacao. |
| 27 | KPI - Indicadores | Navegacao e carregamento | FALHOU | CRITICA | Abertura 5062 ms | API mais lenta /api/auth/me (2413 ms) | Abertura acima de 2,5s (5062ms). | Chamou /api/auth/me 4x nesta navegacao. | Chamou /api/requests/pending 1x nesta navegacao. |

## 4. Responsividade

| Perfil | Tela | Tempo | Overflow horizontal | Menu mobile | Screenshot |
|---|---|---:|---|---|---|
| tablet | Dashboard | 6663 ms | NAO | SIM | F3_ui/screenshots/tablet_dashboard.png |
| tablet | Ativos | 3537 ms | NAO | SIM | F3_ui/screenshots/tablet_ativos.png |
| tablet | Plano de Manutenção | 3731 ms | NAO | SIM | F3_ui/screenshots/tablet_plano-de-manutencao.png |
| tablet | Planejamento e Programação | 8111 ms | NAO | SIM | F3_ui/screenshots/tablet_planejamento-e-programacao.png |
| tablet | Ordens de Serviço (OS) | 2812 ms | NAO | SIM | F3_ui/screenshots/tablet_ordens-de-servico-os.png |
| tablet | Solicitações (SS) | 2984 ms | NAO | SIM | F3_ui/screenshots/tablet_solicitacoes-ss.png |
| mobile | Dashboard | 3236 ms | NAO | SIM | F3_ui/screenshots/mobile_dashboard.png |
| mobile | Ativos | 2848 ms | NAO | SIM | F3_ui/screenshots/mobile_ativos.png |
| mobile | Plano de Manutenção | 2837 ms | NAO | SIM | F3_ui/screenshots/mobile_plano-de-manutencao.png |
| mobile | Planejamento e Programação | 5613 ms | NAO | SIM | F3_ui/screenshots/mobile_planejamento-e-programacao.png |
| mobile | Ordens de Serviço (OS) | 2894 ms | NAO | SIM | F3_ui/screenshots/mobile_ordens-de-servico-os.png |
| mobile | Solicitações (SS) | 17217 ms | NAO | SIM | F3_ui/screenshots/mobile_solicitacoes-ss.png |

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

1. Transformar a navegacao lateral em layout persistente do App Router - A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas 88 chamadas para /api/auth/me durante a navegacao.
2. Consolidar checagem de sessao e permissoes em um provider/cache compartilhado - As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez.
3. Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache - As rotas mais lentas foram: Pessoas/Equipes (15771ms), Árvore (7816ms), Tipos de Serviço (7254ms), Centros de Custos (6783ms), RAF (6754ms).
4. Padronizar skeletons e transicoes de tela profissionais - Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes.
5. Revisar layout responsivo do cabecalho fixo e botao do menu mobile - 0 telas apresentaram overflow horizontal em tablet/mobile.

## 8. Limitacoes da auditoria

- Ambiente local, sem acesso ao APM do servidor nem ao tempo interno de banco.
- A medicao de backend foi inferida pelas requisicoes de rede do navegador.
- O circuito foi executado com o perfil SUPER_ADMIN; outros papeis podem ter comportamento diferente.
