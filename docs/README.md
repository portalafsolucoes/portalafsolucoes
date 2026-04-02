# Documentação do Projeto

Este diretório concentra a documentação viva do sistema. A ideia é manter `docs/` como fonte única, evitando duplicidade com outras pastas de documentação e arquivos soltos na raiz.

## Estrutura

- `README.md`: índice principal.
- `setup-guides/`: configuração local, Vercel e Cloudinary.
- `troubleshooting/`: correções, diagnósticos e incidentes anteriores.
- `migration-reports/`: histórico da migração Prisma/Supabase.
- `database-scripts/`: scripts SQL auxiliares.
- Arquivos na raiz de `docs/`: visão funcional, arquitetura, deploy, fluxo e guias rápidos.

## Arquivos-raiz ainda relevantes

Alguns arquivos continuam temporariamente na raiz do repositório por conveniência operacional:

- `DESCRICAO_SISTEMA.md`
- `INSTRUCOES_IMPORTACAO_GEP.md`
- `LEIA-ME_GEP.txt`
- `USUARIOS_EMPRESAS_ATUAIS.md` (local e operacional, não versionado)

Quando esses materiais forem estabilizados, o ideal é migrá-los para subpastas de `docs/`.

## Organização do repositório

Estrutura recomendada de alto nível:

```text
src/         aplicacao Next.js
prisma/      schema, seed e artefatos do banco
public/      assets estaticos versionados
scripts/     automacoes operacionais e setup
tests/       testes E2E e arquivos de apoio
docs/        documentacao versionada
python/      utilitarios locais
dados/       insumos de importacao e massa auxiliar
gep/         arquivos fonte do modulo GEP
```

## Regras práticas

- Não versionar artefatos gerados (`.next/`, `test-results/`, `.playwright-mcp/`, uploads locais).
- Não criar nova pasta de documentação paralela a `docs/`.
- Preferir agrupar scripts por objetivo (`development/`, `setup/`, `testing/`).
- Manter a raiz apenas com arquivos de configuração e pontos de entrada realmente úteis.
