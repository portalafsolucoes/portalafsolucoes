# Resultados dos Testes

| # | Modulo | Acao | Resultado | Severidade | Evidencia | Observacao |
|---|---|---|---|---|---|---|
| 1 | Dashboard | Abrir e carregar dados | PASSOU | BAIXA | F1_discovery/screenshots/F1_03_dashboard.png |  |
| 2 | Árvore | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_04_arvore.png | Abertura acima de 2,5s (7816ms). |
| 3 | Pessoas/Equipes | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_05_pessoas-equipes.png | Abertura acima de 2,5s (15771ms). Chamou /api/requests/pending 2x nesta navegacao. |
| 4 | Tipos de Manutenção | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_06_tipos-de-manutencao.png | Abertura acima de 2,5s (6441ms). Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 3x nesta navegacao. |
| 5 | Áreas de Manutenção | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_07_areas-de-manutencao.png | Abertura acima de 2,5s (5856ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 6 | Tipos de Serviço | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_08_tipos-de-servico.png | Abertura acima de 2,5s (7254ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 7 | Calendários | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_09_calendarios.png | Abertura acima de 2,5s (5930ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 8 | Centros de Custos | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_10_centros-de-custos.png | Abertura acima de 2,5s (6783ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 9 | Áreas | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_11_areas.png | Abertura acima de 2,5s (2681ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 10 | Centros de Trabalho | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_12_centros-de-trabalho.png | Abertura acima de 2,5s (6122ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 11 | Tipos Modelo | Abrir e carregar dados | FALHOU | MEDIA | F1_discovery/screenshots/F1_13_tipos-modelo.png | Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 12 | Famílias de Bens | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_14_familias-de-bens.png | Abertura acima de 2,5s (2597ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 13 | Posições | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_15_posicoes.png | Abertura acima de 2,5s (2528ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 14 | Recursos | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_16_recursos.png | Abertura acima de 2,5s (5701ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 15 | Tarefas Genéricas | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_17_tarefas-genericas.png | Abertura acima de 2,5s (2795ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 16 | Etapas Genéricas | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_18_etapas-genericas.png | Abertura acima de 2,5s (2875ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 17 | Características | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_19_caracteristicas.png | Abertura acima de 2,5s (2787ms). Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 18 | Ativos | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_20_ativos.png | Abertura acima de 2,5s (4085ms). Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 19 | Criticidade de Ativos | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_21_criticidade-de-ativos.png | Abertura acima de 2,5s (3151ms). Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 20 | Plano de Manutenção | Abrir e carregar dados | FALHOU | MEDIA | F1_discovery/screenshots/F1_22_plano-de-manutencao.png | Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 21 | Planejamento e Programação | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_23_planejamento-e-programacao.png | Abertura acima de 2,5s (3247ms). Chamou /api/auth/me 6x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 22 | Ordens de Serviço (OS) | Abrir e carregar dados | FALHOU | MEDIA | F1_discovery/screenshots/F1_24_ordens-de-servico-os.png | Chamou /api/auth/me 6x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 23 | Solicitações (SS) | Abrir e carregar dados | FALHOU | MEDIA | F1_discovery/screenshots/F1_25_solicitacoes-ss.png | Chamou /api/auth/me 3x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |
| 24 | Aprovações0 | Abrir e carregar dados | FALHOU | MEDIA | F1_discovery/screenshots/F1_26_aprovacoes0.png | Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 5x nesta navegacao. |
| 25 | RAF | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_27_raf.png | Abertura acima de 2,5s (6754ms). Chamou /api/auth/me 6x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 26 | Localizações | Abrir e carregar dados | FALHOU | ALTA | F1_discovery/screenshots/F1_28_localizacoes.png | Abertura acima de 2,5s (3205ms). Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 2x nesta navegacao. |
| 27 | KPI - Indicadores | Abrir e carregar dados | FALHOU | CRITICA | F1_discovery/screenshots/F1_29_kpi-indicadores.png | Abertura acima de 2,5s (5062ms). Chamou /api/auth/me 4x nesta navegacao. Chamou /api/requests/pending 1x nesta navegacao. |

## Responsividade

- tablet / Dashboard: 6663 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_dashboard.png
- tablet / Ativos: 3537 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_ativos.png
- tablet / Plano de Manutenção: 3731 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_plano-de-manutencao.png
- tablet / Planejamento e Programação: 8111 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_planejamento-e-programacao.png
- tablet / Ordens de Serviço (OS): 2812 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_ordens-de-servico-os.png
- tablet / Solicitações (SS): 2984 ms, overflow NAO, screenshot F3_ui/screenshots/tablet_solicitacoes-ss.png
- mobile / Dashboard: 3236 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_dashboard.png
- mobile / Ativos: 2848 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_ativos.png
- mobile / Plano de Manutenção: 2837 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_plano-de-manutencao.png
- mobile / Planejamento e Programação: 5613 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_planejamento-e-programacao.png
- mobile / Ordens de Serviço (OS): 2894 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_ordens-de-servico-os.png
- mobile / Solicitações (SS): 17217 ms, overflow NAO, screenshot F3_ui/screenshots/mobile_solicitacoes-ss.png
