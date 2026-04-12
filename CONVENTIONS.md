# Convencoes Compartilhadas

## Nomenclatura: Produto vs Feature

- **Produto**: unidade comercial (CMMS, GVP, GPA) — habilitado por empresa via `CompanyProduct`.
- **Feature / Modulo de menu**: item navegavel dentro de um produto (ex: `work-orders`) — `Module.productId` indica o dono.
- Usar sempre o qualificador: "produto CMMS", "feature work-orders", nunca apenas "modulo".
- Ver glossario completo e regras em `.claude/rules/products.md`.

## Ordem de Leitura Obrigatoria
- Ler `docs/SPEC.md` para contrato funcional e regra de negocio
- Ler `CLAUDE.md` para stack, comandos e regras operacionais
- Ler `docs/SEGURANCA.md` quando a tarefa envolver autenticacao, sessao, permissao, hardening, go-live, upload sensivel, exportacao, logs, segredos ou readiness de producao
- Ler a rule relevante em `.claude/rules/` conforme o tipo de mudanca
- Ler `docs/AI_SETUP.md` quando a tarefa envolver MCPs, skills ou configuracao de agentes
- Ler `docs/AUDITORIA.md` quando a tarefa envolver screenshots, evidencias, relatorios de validacao, Playwright, QA ou qualquer artefato manual/automatizado de auditoria

## Fluxo Obrigatorio de Implementacao
- Antes de escrever codigo, localizar a secao funcional relevante em `docs/SPEC.md`
- Formular a tarefa a partir da spec, por exemplo: `Leia a secao de Localizacoes em docs/SPEC.md e implemente conforme a spec`
- Nao implementar regras novas a partir de prompt generico quando a spec ja cobre o comportamento esperado
- Quando houver divergencia entre implementacao e documentacao, tratar a documentacao oficial como fonte de verdade ate a sincronizacao ser feita conscientemente
- Manter a raiz do repositorio enxuta: somente arquivos estruturais, entrypoints e configuracoes do projeto podem ficar no topo
- Toda documentacao auxiliar, operacional, inventarios, guias e notas em Markdown deve ir para `docs/` em uma subpasta coerente
- Toda evidencia de auditoria, screenshots, relatorios visuais e artefatos de validacao manual devem ir para `auditoria/`
- Nunca gerar arquivos soltos na raiz para documentacao ou auditoria; antes de criar, escolher a pasta correta em `docs/` ou `auditoria/`
- Toda auditoria deve seguir a estrutura canonica descrita em `docs/AUDITORIA.md`
- Nao salvar `storageState.json`, cookies, tokens, logs de erro brutos ou scripts temporarios dentro de `auditoria/`; esses artefatos sao temporarios ou sensiveis e nao fazem parte da evidencia final

## Atualizacao de Documentacao por Tipo de Mudanca
- Mudanca funcional, modular, navegacional, de regra de negocio ou permissao: atualizar `docs/SPEC.md`
- Mudanca de autenticacao, sessao, autorizacao, isolamento multiempresa/unidade, upload sensivel, logs de erro, segredos, headers, hardening ou criterio de go-live: atualizar `docs/SEGURANCA.md`
- Mudanca de layout, componente reutilizavel, modal, padrao de listagem ou comportamento visual compartilhado: atualizar `.claude/rules/components.md`
- Mudanca de API route, server action, validacao de payload, resposta, escopo ou permissao no backend: atualizar `.claude/rules/api.md`
- Mudanca de convencao geral do projeto, stack, comandos ou fluxo operacional: atualizar `CLAUDE.md`
- Mudanca de inventario de MCPs, skills ou onboarding de agentes: atualizar `docs/AI_SETUP.md`, `AGENTS.md` e `.github/copilot-instructions.md` quando aplicavel
- Mudanca na organizacao de arquivos auxiliares ou no uso da raiz do repositorio: atualizar `README.md`, `CLAUDE.md`, `AGENTS.md` e `.github/copilot-instructions.md`
- Mudanca em processo, estrutura, retencao ou convencao de auditoria: atualizar `docs/AUDITORIA.md`, `README.md`, `CLAUDE.md`, `AGENTS.md` e `.github/copilot-instructions.md`
- Mudanca que substitui componente ou arquivo sem remove-lo: registrar em `docs/DEPRECATIONS.md`

## Fechamento de Entrega
- Ao concluir uma entrega, registrar em `docs/SPEC.md` o que ficou implementado e qualquer detalhe relevante de comportamento
- Declarar gaps, limites ou pendencias quando a implementacao nao cobrir a spec inteira
- Validar com `lint`, `test` e/ou `build` conforme o impacto

## Deprecacao e Codigo Substituido
- Todo codigo substituido mas mantido temporariamente deve ser registrado em `docs/DEPRECATIONS.md`
- O registro deve conter: arquivo, motivo da deprecacao, substituto, data e condicao para remocao
- Nenhum LLM ou desenvolvedor deve deixar codigo morto sem registro
- Ao concluir uma entrega que depreca codigo, atualizar `docs/DEPRECATIONS.md` no mesmo ciclo

## Arquivos de Entrada por Ferramenta
- Claude Code: `CLAUDE.md` + `.claude/rules/*.md`
- Codex e agentes genericos: `AGENTS.md`
- GitHub Copilot: `.github/copilot-instructions.md`
- Todos devem convergir para este arquivo, `docs/SPEC.md` e `docs/SEGURANCA.md` quando a tarefa tocar seguranca
