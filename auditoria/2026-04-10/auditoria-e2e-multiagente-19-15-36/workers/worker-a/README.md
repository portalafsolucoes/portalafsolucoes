# Worker A - Auth, Navegacao e Perfis

- Base URL: `http://localhost:3000`
- Executado em: `2026-04-10T22:53:09.576Z`
- Contextos testados: 12
- Categoria: autenticacao, hub, dashboard, profile, settings e menu por perfil

## Resumo
O worker fez uma varredura ampla de login, landing pages e consistencia de sidebar em multiplos perfis e empresas. O resultado confirmou aderencia em parte dos redirects esperados, mas mostrou ruido de console, erros de runtime e lacunas importantes para `VIEW_ONLY`.

## Achados principais
- `VIEW_ONLY` com menu faltante e perfil incompleto em mais de um contexto.
- `settings` ainda inconsistente para alguns perfis operacionais.
- Varios erros de console (`401`, `403`, `404`, `500`) e erros de runtime durante a navegacao.
- Logout do hub sem retorno claro ao estado anonimo em um dos cenarios auditados.

## Observacoes
- O backend ja expunha papel canonico em `/api/auth/me`.
- As evidencias visuais brutas do sweep foram removidas na curadoria desta pasta; o resumo acima preserva o resultado util da rodada.
