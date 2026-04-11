# Auditoria

Esta pasta guarda apenas evidencias curadas de QA, Playwright e validacoes manuais.

## Regra Canonica
- Estrutura obrigatoria em `auditoria/YYYY-MM-DD/<slug-da-rodada>/`
- Cada rodada precisa ter `README.md`
- Evidencias visuais ficam em `evidencias/`
- Dados sanitizados ficam em `dados/`
- Rodadas multiagente podem usar `workers/`

## Proibicoes
- Nao salvar arquivos soltos direto em `auditoria/`
- Nao salvar `storageState.json`, cookies, tokens ou logs brutos
- Nao salvar scripts temporarios de execucao
- Nao salvar screenshots ou relatorios na raiz do repositorio

## Referencia
- Ver `docs/AUDITORIA.md`

## Rodadas atuais
- `2026-04-10/plano-e2e-completo`
- `2026-04-10/auditoria-automatizada-super-admin-polimix`
- `2026-04-10/auditoria-e2e-multiagente-19-15-36`
- `2026-04-11/responsividade-split-panel`
