# Agent Instructions

Este repositorio usa `CONVENTIONS.md` como fluxo compartilhado entre agentes.

## Leia Nesta Ordem
- `CONVENTIONS.md`
- `docs/SPEC.md`
- `CLAUDE.md`
- `.claude/rules/components.md` para mudancas de UI
- `.claude/rules/api.md` para mudancas de API e server actions
- `.claude/rules/database.md` para mudancas de schema, Prisma e dados
- `.claude/rules/testing.md` para validacao e cobertura

## Regras Minimas
- Implementar com base na secao relevante de `docs/SPEC.md`, nao por interpretacao livre
- Atualizar a documentacao correspondente no mesmo ciclo da mudanca
- Reutilizar a logica central de permissao e respeitar `perfil + empresa + unidade ativa`
- Nao adicionar segredos, tokens ou caminhos pessoais ao repositorio

## Tooling Compartilhado
- Skills canonicas no repositorio: `ui-ux-pro-max` e `playwright-skill`
- Inventario canonico de MCPs e setup por ferramenta: `docs/AI_SETUP.md`