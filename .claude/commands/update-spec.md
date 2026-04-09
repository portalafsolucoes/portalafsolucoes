# /update-spec

Use este comando apos concluir uma implementacao para sincronizar documentacao e regras.

## Objetivo
- Atualizar `docs/SPEC.md` com o comportamento implementado
- Atualizar `.claude/rules/components.md` quando houver mudanca de padrao visual compartilhado
- Atualizar `.claude/rules/api.md` quando houver mudanca de API, permissao ou contrato backend
- Atualizar `CLAUDE.md` quando houver mudanca de convencao geral

## Entrada Esperada
- Arquivos alterados
- Resumo da implementacao
- Escopo funcional impactado
- Gaps conhecidos ou comportamento pendente

## Passos
1. Localize a secao relevante em `docs/SPEC.md`
2. Registre o que ficou implementado e o impacto funcional real
3. Atualize as rules compartilhadas se a mudanca criou ou alterou um padrao reutilizavel
4. Verifique se `CONVENTIONS.md` ou `docs/AI_SETUP.md` precisam ser sincronizados
5. Informe no fechamento o que foi atualizado e o que nao foi validado