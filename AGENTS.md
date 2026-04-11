# Agent Instructions

Este repositorio usa `CONVENTIONS.md` como fluxo compartilhado entre agentes.

## Leia Nesta Ordem
- `CONVENTIONS.md`
- `docs/SPEC.md`
- `CLAUDE.md`
- `docs/SEGURANCA.md` para autenticacao, sessao, permissao, hardening, go-live, uploads sensiveis, exportacao, logs e segredos
- `docs/AUDITORIA.md` para mudancas que gerem evidencias, screenshots ou relatorios de auditoria
- `.claude/rules/components.md` para mudancas de UI
- `.claude/rules/api.md` para mudancas de API e server actions
- `.claude/rules/database.md` para mudancas de schema, Prisma e dados
- `.claude/rules/testing.md` para validacao e cobertura

## Regras Minimas
- Implementar com base na secao relevante de `docs/SPEC.md`, nao por interpretacao livre
- Atualizar a documentacao correspondente no mesmo ciclo da mudanca
- Reutilizar a logica central de permissao e respeitar `perfil + empresa + unidade ativa`
- Nao adicionar segredos, tokens ou caminhos pessoais ao repositorio
- Seguir `docs/SEGURANCA.md` em toda mudanca que altere autenticacao, sessao, permissao, upload, exportacao, logs sensiveis, segredos ou readiness de producao
- Manter a raiz limpa: documentacao auxiliar vai para `docs/` e evidencias de auditoria para `auditoria/`
- Nunca criar arquivos soltos de Markdown, screenshot ou relatorio na raiz do projeto
- Seguir obrigatoriamente `docs/AUDITORIA.md` para qualquer screenshot, relatorio, plano de teste ou evidencia de QA; nunca salvar `storageState.json`, scripts temporarios ou logs brutos como evidencia final
- Ao substituir codigo sem remove-lo, registrar em `docs/DEPRECATIONS.md` com arquivo, motivo, substituto, data e condicao de remocao

## Tooling Compartilhado
- Skills canonicas no repositorio: `ui-ux-pro-max` e `playwright-skill`
- Inventario canonico de MCPs e setup por ferramenta: `docs/AI_SETUP.md`
