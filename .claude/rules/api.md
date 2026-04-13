---
globs: src/app/api/**,src/actions/**
---

# API Routes e Server Actions

## Contrato Geral
- Consultar `docs/SEGURANCA.md` sempre que a mudanca tocar autenticacao, sessao, autorizacao, isolamento multiempresa/unidade, upload sensivel, exportacao, logs de erro, segredos, headers ou readiness de producao
- Toda rota e toda server action devem validar permissao no servidor; esconder item de menu nao substitui seguranca
- Validacoes de permissao devem sempre considerar `perfil + empresa + unidade ativa`
- A UI e a API devem compartilhar a mesma regra central de permissao; nao manter matriz divergente
- O sistema deve trabalhar com papeis canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER` e `VIEW_ONLY`
- Se o banco ou legado ainda possuir perfis antigos, a camada de auth/API deve normalizar esses valores antes de decidir acesso, sidebar, redirects, badges e permissoes
- A normalizacao de papel deve usar exclusivamente o campo `role` persistido no banco; email, username e jobTitle NAO podem influenciar o papel efetivo (V04 — escalada de privilegio por padrao de email foi corrigida e nao deve ser reintroduzida)
- Em payloads e respostas do modulo de `Pessoas`, `role` representa o papel de acesso do sistema e `jobTitle` representa o cargo profissional; APIs nao devem misturar esses conceitos nem rotular valores legados operacionais como se fossem o papel exibido ao usuario
- Quando a UI enviar `jobTitleId`, as APIs de usuario devem validar que o cargo pertence a empresa ativa, persistir o vinculo no banco e manter o nome do cargo refletido no campo textual exibido na ficha da pessoa
- APIs devem retornar valores canonicos de enum (ex: `PENDING`, `HIGH`, `PREVENTIVE`) em ingles; traducao para PT-BR e responsabilidade exclusiva da UI via `@/lib/status-labels`

## Autenticacao e Sessao
- O endpoint `/api/auth/me` e a leitura de modulos da empresa devem ser tratados como dados dinamicos de sessao, sem cache compartilhado entre usuarios
- Login, logout e troca de contexto autenticado devem invalidar ou limpar cache de autenticacao e de modulos habilitados no cliente
- Chaves de cache no cliente que dependem do usuario devem considerar ao menos empresa e contexto autenticado para evitar vazamento visual de sessao anterior
- O retorno de autenticacao para a UI deve expor o papel canonico como `role`
- Se necessario, o papel legado pode ser exposto apenas como apoio tecnico, por exemplo em `legacyRole`
- Redirects padrao do CMMS devem respeitar o perfil: perfis operacionais entram por `Ordens de Servico`; os demais entram por `Dashboard`
- Quando um perfil nao tiver acesso a uma pagina, o sistema deve redirecionar para o destino padrao permitido do perfil, e nao deixar a tela quebrada ou parcialmente carregada

## Padrões de API Routes
- Em handlers do App Router, usar `NextRequest` e `NextResponse` quando houver leitura de corpo, query string ou resposta customizada
- Resolver a sessao logo no inicio e retornar `401` quando nao houver sessao e `403` quando a sessao nao tiver permissao
- Em consultas sensiveis, validar primeiro o escopo da empresa e da unidade ativa e so depois executar a query
- Em sucesso, preferir respostas JSON consistentes; neste repo os consumidores frequentemente esperam `{ data: ... }`
- Em falhas, retornar JSON com `error` e status HTTP coerente (`400`, `401`, `403`, `404`, `409`, `500`)
- Toda acao que altera dados deve validar payload, status permitidos e relacoes obrigatorias antes de persistir
- Campos sensiveis como `password` nunca podem retornar para a UI, nem em listagens, nem em detalhes, nem em respostas de edicao
- APIs de usuario devem normalizar email e rejeitar payloads com email sem dominio completo ou com email igual a senha
- APIs de `Pessoas` devem aceitar e persistir os campos editaveis do modal de pessoa: nome, sobrenome, email, senha opcional na edicao, telefone, cargo (`jobTitle`), papel (`role`), taxa/hora, localizacao, calendario, unidades de acesso e status

## Sincronizacao de Documentacao
- Toda mudanca de contrato, permissao, validacao ou comportamento de rota/action deve atualizar a secao funcional correspondente em `docs/SPEC.md`
- Toda mudanca que altere autenticacao, sessao, autorizacao, isolamento, upload sensivel, exportacao, logs de erro, segredos, headers ou hardening deve atualizar `docs/SEGURANCA.md`
- Quando a mudanca alterar um padrao reutilizavel de API ou server action, atualizar este arquivo no mesmo ciclo

## Tratamento de Erros e Validacao
- Formularios e APIs devem garantir validacoes de negocio e status inicial correto
- Rejeicao de solicitacao exige motivo
- Criacao de empresa deve criar o primeiro usuario admin
- Modulos habilitados por empresa devem refletir na navegacao real do sistema
- Acoes, menus e badges devem respeitar perfil e tambem ser validados na API
- Quando a API expuser dados de upload, anexos, fotos ou logo, usar somente URLs vindas da fonte configurada, sem fallback hardcoded

## Server Actions
- Aplicar as mesmas validacoes de sessao, empresa, unidade e papel usadas nas API routes
- Nao mover regra de seguranca apenas para o cliente ao migrar um fluxo para server action
- Reutilizar a logica central de permissao e normalizacao de papel em vez de reimplementar regras dentro de cada action

## Casos Especificos do Produto
- `Aprovacoes` e `RAF` sao exclusivos de `SUPER_ADMIN` e `ADMIN`
- `Configuracoes` do portal sao exclusivas de `SUPER_ADMIN`
- `TECHNICIAN` e `LIMITED_TECHNICIAN` nao devem cair no `Dashboard`; o destino inicial e `Ordens de Servico`
- A troca de unidade so pode ser oferecida a `SUPER_ADMIN` e `ADMIN`, e somente quando houver mais de uma unidade acessivel
- O menu do usuario em `Configuracoes` deve expor apenas as abas `Perfil` e `Seguranca`
- O salvamento de `Configuracoes > Perfil` nao deve sobrescrever campos tecnicos internos nao editaveis no formulario, como `username`
- Quando `Configuracoes > Perfil` receber `locationId`, a API deve validar que a localizacao pertence a empresa ativa da sessao
