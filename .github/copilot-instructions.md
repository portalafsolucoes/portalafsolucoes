# GitHub Copilot Instructions

Leia primeiro `CONVENTIONS.md`.

## Sequencia Obrigatoria
- `docs/SPEC.md` para contrato funcional
- `CLAUDE.md` para stack, comandos e operacao
- `.claude/rules/components.md` quando a mudanca tocar UI ou padrao visual
- `.claude/rules/api.md` quando a mudanca tocar API route, server action ou permissao backend
- `.claude/rules/database.md` quando a mudanca tocar Prisma, schema ou consultas
- `.claude/rules/testing.md` quando a mudanca exigir validacao

## Regras de Trabalho
- Implementar sempre a partir da secao funcional relevante da spec
- Atualizar a documentacao correspondente no mesmo ciclo da entrega
- Nao duplicar regra de negocio entre frontend e backend
- Respeitar o recorte `perfil + empresa + unidade ativa`
- Usar `docs/AI_SETUP.md` como inventario canonico de MCPs e skills
- Manter a raiz do repositorio limpa: documentacao auxiliar em `docs/` e auditorias/evidencias em `auditoria/`
- Nunca criar arquivos soltos de Markdown, screenshot ou relatorio na raiz
