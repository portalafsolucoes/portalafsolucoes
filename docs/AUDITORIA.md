# Padrao de Auditoria

## Objetivo
- Padronizar onde e como evidencias de QA, Playwright, validacao manual e auditorias de agentes sao salvas
- Impedir que screenshots, relatorios e arquivos temporarios fiquem espalhados na raiz ou em pastas sem contexto
- Separar evidencia curada de artefato tecnico temporario ou sensivel

## Regra Base
- Toda auditoria deve ficar dentro de `auditoria/`
- Nenhum screenshot, PDF, HTML, relatorio ou plano de teste pode ser salvo solto na raiz do repositorio
- Toda rodada precisa ter contexto suficiente para outra pessoa entender o que foi executado sem abrir o historico do chat

## Estrutura Canonica
```txt
auditoria/
  README.md
  YYYY-MM-DD/
    slug-da-rodada/
      README.md
      evidencias/
      dados/
      workers/           # opcional, apenas para auditorias multiagente
```

## O que cada pasta guarda

### `README.md` da rodada
- resumo executivo
- data e ambiente
- escopo validado
- resultado geral
- achados principais
- lista das evidencias relevantes

### `evidencias/`
- screenshots finais
- PDFs finais
- HTML exportado apenas quando fizer sentido como entrega
- anexos visuais ou arquivos finais citados no `README.md`

### `dados/`
- JSON, CSV ou TXT curados e seguros
- somente arquivos necessarios para reproduzir ou sustentar o relatorio
- todo arquivo aqui deve ser citado no `README.md`

### `workers/`
- usar apenas em auditoria multiagente
- cada worker deve ter sua propria pasta com `README.md`
- guardar apenas resultado consolidado do worker e evidencias necessarias

## Nomenclatura
- Pasta da data: `YYYY-MM-DD`
- Pasta da rodada: slug curto e descritivo, por exemplo `responsividade-split-panel`
- Arquivos de evidencia: prefixar com ordem ou fluxo, por exemplo `01-dashboard.png`, `02-people-panel.png`
- Evitar nomes genericos como `final.png`, `teste.png`, `image.png`

## Itens Proibidos no Repositorio
- `storageState.json` ou qualquer estado autenticado do navegador
- cookies, tokens, secrets ou credenciais
- scripts temporarios de execucao como `run-audit.js`, `run-worker-*.mjs` e equivalentes
- logs brutos como `error.log`, `*.error.txt` ou dumps tecnicos sem curadoria
- screenshots e relatorios soltos na raiz
- pastas de auditoria com nome timestamp na raiz de `auditoria/` sem agrupamento por data

## Curadoria Minima
- antes de commitar, remover duplicatas, exports desnecessarios e artefatos temporarios
- se um PDF e um HTML forem apenas exportacoes do mesmo Markdown, manter no minimo o Markdown canonico e preservar os derivados somente se houver necessidade real
- se uma evidencia nao for citada no `README.md` da rodada, ela provavelmente nao deveria ficar no repositorio

## Fluxo Recomendado
1. Criar `auditoria/YYYY-MM-DD/<slug-da-rodada>/`
2. Salvar `README.md` com objetivo, ambiente e escopo
3. Salvar imagens e anexos finais em `evidencias/`
4. Salvar apenas dados sanitizados em `dados/`
5. Revisar e apagar lixo tecnico antes do commit
6. Rodar `npm run repo:guard`

## Integracao com Agentes e Ferramentas
- `CONVENTIONS.md`, `CLAUDE.md`, `AGENTS.md` e `.github/copilot-instructions.md` devem apontar para este arquivo
- `.claude/rules/testing.md` deve reforcar este padrao em qualquer execucao de QA
- `npm run repo:guard` deve falhar quando encontrar evidencias soltas na raiz ou estrutura irregular em `auditoria/`
