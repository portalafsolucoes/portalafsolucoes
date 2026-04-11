---
globs: tests/**,**/*.test.*
---

# Testes

## Framework e Execucao
- O projeto usa Playwright para testes E2E
- Executar com `npm run test`
- Os testes vivem principalmente em `tests/`

## Quando Testar
- Mudancas em autenticacao, sidebar, redirects ou permissoes devem ser verificadas com Playwright
- Nessas mudancas, navegar no sistema com pelo menos um login por perfil impactado
- Fluxos que afetam listas, formularios, uploads, aprovacoes ou troca de unidade devem validar tambem loading, filtros, estado vazio e comportamento responsivo

## Convencoes de Cobertura
- Verificar tanto a UI quanto a validacao real de acesso no servidor
- Confirmar que `TECHNICIAN` e `LIMITED_TECHNICIAN` entram por `Ordens de Servico`, nao por `Dashboard`
- Confirmar que `Aprovacoes`, `RAF` e `Configuracoes` respeitam as restricoes de perfil
- Confirmar que empresa e unidade ativa nao vazam entre sessoes diferentes
- Cobrir desktop, tablet e celular quando a alteracao impactar layout, modais, tabelas ou paines laterais

## Convencoes de Escrita
- Preferir cenarios E2E orientados a fluxo real do usuario
- Usar esperas deterministicas (`waitForURL`, `waitForLoadState`, asserts de visibilidade) antes de recorrer a `waitForTimeout`
- Capturar screenshots quando ajudarem a diagnosticar regressao visual, permissao ou responsividade
- Qualquer script ou teste que gere screenshots deve exigir autorizacao explicita via `ALLOW_SCREENSHOT_AUTOMATION=1` antes de criar arquivos
- Nomear testes e describes de forma explicita, citando rota, modulo ou comportamento validado

## Evidencias e Auditoria
- Toda evidencia de teste deve seguir `docs/AUDITORIA.md`
- Nunca salvar screenshots, PDFs, HTMLs, relatorios ou planos de teste na raiz do repositorio
- Estrutura canonica de uma rodada: `auditoria/YYYY-MM-DD/<slug-da-rodada>/README.md`, com evidencias em `evidencias/` e dados curados em `dados/`
- `auditoria/` nao deve armazenar `storageState.json`, cookies de sessao, tokens, scripts temporarios de execucao, `error.log` ou dumps tecnicos sem curadoria
- Se houver necessidade de reter um JSON de apoio, salvar apenas dados sanitizados em `dados/` com contexto explicito no `README.md` da rodada
