# Seguranca do Sistema

## Objetivo
- Este arquivo e a referencia canonica de seguranca do CMM Gestor de Manutencao
- Ele complementa `docs/SPEC.md`, focando em requisitos nao funcionais de autenticacao, autorizacao, isolamento de dados, hardening, protecao operacional e criterio de liberacao
- Toda mudanca que afete autenticacao, sessao, permissao, uploads, logs sensiveis, exportacao, headers, segredos, deploy ou readiness de producao deve consultar e, quando necessario, atualizar este documento

## Quando Consultar Este Documento
- Ao alterar login, logout, sessao, cookies, middleware ou contexto autenticado
- Ao alterar permissoes, papeis, modulos, redirects, sidebar condicionada ou validacoes server-side
- Ao alterar rotas de API, server actions, queries, filtros por empresa ou unidade
- Ao alterar uploads, anexos, exportacoes, integracoes externas, cron jobs ou automacoes
- Ao revisar seguranca para homologacao, demonstracao, UAT, piloto ou go-live
- Ao responder auditoria, incidente, achado de pentest ou recomendacao de compliance

## Principios Canonicos

### 1. Seguranca server-side primeiro
- Esconder menu, botao ou aba nunca substitui verificacao de acesso no servidor
- Toda rota, action e query sensivel deve validar `perfil + empresa + unidade ativa`
- O cliente nao pode decidir o proprio escopo de acesso

### 2. Papel canonico vem de fonte confiavel
- O papel efetivo do usuario deve derivar de dado persistido e confiavel do backend
- Email, username, cargo exibido, label visual ou texto livre nao podem promover privilegio
- Compatibilidade com papeis legados e aceita, mas a decisao de acesso deve ser deterministica e auditavel

### 3. Sessao precisa ser assinada e revalidada
- O sistema nao deve confiar em cookie com JSON puro sem assinatura
- A sessao deve ter integridade criptografica, expirar corretamente e ser revogavel
- Dados criticos de sessao devem ser revalidados sempre que houver operacao sensivel

### 4. Multiempresa e multiunidade sao fronteiras de seguranca
- `Company` e a fronteira maxima de isolamento
- `Unit` e o recorte operacional padrao da maioria das leituras e escritas
- Toda leitura e escrita deve aplicar filtros explicitos de empresa; toda operacao sensivel deve considerar unidade ativa quando o dominio exigir

### 5. Menor privilegio e comportamento padrao
- Cada perfil deve acessar apenas o necessario para seu trabalho
- Operacoes destrutivas, administrativas ou de massa devem exigir papel apropriado
- Novas rotas e novos endpoints devem nascer fechados e so depois serem abertos conscientemente

### 6. Segredo e configuracao segura
- Nao commitar tokens, cookies, project refs privados, URLs internas, storage states ou dumps tecnicos sensiveis
- Variaveis obrigatorias de seguranca devem falhar o bootstrap quando ausentes
- Nao usar fallback inseguro para segredos de cron, webhook ou autenticacao

### 7. Logs e erros minimamente expostos
- Logs podem registrar contexto tecnico interno, mas nao devem expor senha, token, cookie, stack sensivel ou dado de cliente em excesso
- Respostas HTTP de producao nao devem retornar detalhes internos do backend ou do banco
- Eventos relevantes de seguranca devem ser rastreaveis sem vazar informacao desnecessaria

## Escopo Minimo de Protecao

### Autenticacao
- Login com validacao de senha forte no servidor
- Senhas com hash forte e custo adequado
- Rate limiting, atraso progressivo ou lock temporario para mitigar brute force
- Logout precisa invalidar a sessao atual de forma confiavel
- Troca de contexto autenticado precisa invalidar cache cliente dependente de usuario

### Autorizacao
- Reutilizar um nucleo central de permissao
- Nao manter matriz de acesso diferente entre UI e backend
- Qualquer operacao de leitura privilegiada, alteracao, exclusao, aprovacao, execucao ou exportacao deve passar pela regra central

### Isolamento de Dados
- Consultas devem aplicar filtros explicitos por `companyId`
- Quando o modulo for unit-scoped, aplicar `unitId` efetivo no servidor
- IDs recebidos do cliente devem ser revalidados contra a empresa e, quando aplicavel, contra a unidade
- Listas de IDs tambem precisam ser revalidadas item a item

### Uploads, Anexos e Arquivos
- Limitar tipos de arquivo pelo risco real do negocio, nao apenas por conveniencia tecnica
- Validar tamanho, extensao, MIME e, quando possivel, assinatura real do arquivo
- Evitar publicar arquivos sensiveis em URL publica permanente
- HTML, SVG, XML, JSON bruto e arquivos compactados devem ser tratados com muito mais restricao

### Exportacoes
- Exportacao deve respeitar os mesmos filtros e permissoes das telas
- Nunca exportar senha, hash, token, cookie ou campo tecnico sensivel
- Campos de apoio tecnico so devem sair quando houver necessidade operacional clara

### Integracoes e Jobs
- Cron jobs, webhooks e integracoes devem usar segredos obrigatorios
- Endpoints tecnicos nao devem permanecer publicos por conveniencia de teste
- Toda integracao precisa ter escopo de empresa claro e logs controlados

### Frontend e Navegador
- Sanitizar destinos de redirect para evitar open redirect
- Aplicar headers de seguranca adequados
- Evitar dependencias vulneraveis em rotas publicas, upload, parser e renderizacao

## Criterios de Go-Live de Seguranca
- Nao existir escalada de privilegio conhecida
- Nao existir rota publica expondo dado interno sem motivo aprovado
- Nao existir sessao forjavel ou cookie sem integridade
- Nao existir endpoint critico sem verificacao de permissao server-side
- Nao existir retorno de erro com detalhes internos em producao
- Nao existir segredo com fallback inseguro
- Dependencias criticas devem estar em versoes sem advisories bloqueadores conhecidos
- Build e deploy nao devem ignorar erros estruturais que afetem seguranca

## Checklist Operacional de Liberacao
- Validar login, logout, troca de unidade e persistencia de sessao
- Validar acesso por cada perfil canonico: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER`, `VIEW_ONLY`
- Validar que usuario de empresa A nao enxerga nem altera dados da empresa B
- Validar que usuario sem permissao nao consegue executar a operacao chamando a API diretamente
- Validar uploads permitidos e bloqueio dos proibidos
- Validar exportacoes com filtros corretos e sem campos sensiveis
- Validar cron, integracoes e webhooks com segredos reais e sem fallback
- Validar headers, cache e comportamento de producao

## Recomendacoes Codex

### 1. Corrigir a arquitetura de sessao antes de qualquer liberacao externa
- O sistema deve abandonar sessao baseada em cookie com JSON puro
- A sessao precisa ser assinada ou criptografada, com integridade verificavel no servidor
- O backend nao deve confiar em `role`, `companyId`, `unitId` ou `userId` vindos diretamente do cookie sem revalidacao
- Operacoes sensiveis devem recarregar o usuario atual do banco e recalcular o contexto efetivo a partir de fonte confiavel
- A implementacao precisa suportar expiracao, rotacao e invalidacao de sessao
- Criterio de aceite:
  - editar manualmente o cookie nao pode elevar privilegio
  - editar manualmente `companyId`, `unitId` ou `userId` nao pode alterar o escopo
  - logout deve invalidar o acesso imediatamente

### 2. Eliminar heuristicas de privilegio por email, username e cargo
- Papel canonico nao pode depender de `email`, `username`, `jobTitle` ou qualquer campo que o proprio usuario possa alterar
- Compatibilidade com papeis legados deve existir apenas como mapeamento controlado do valor legado persistido
- `normalizeUserRole` deve priorizar fonte confiavel do backend e nunca promover privilegio por texto livre
- Criterio de aceite:
  - mudar email para algo como `admin@...` nao muda acesso
  - mudar `jobTitle` para `Administrador` nao muda acesso
  - apenas alteracao de papel no fluxo administrativo aprovado muda privilegio real

### 3. Consolidar autorizacao obrigatoria em todas as rotas e actions
- Toda route handler e toda server action deve passar por uma verificacao central de permissao
- O projeto ja tem a direcao correta de reutilizar logica central; isso precisa ser aplicado em 100% das rotas sensiveis
- Endpoints que hoje validam apenas sessao devem ser fechados imediatamente
- Criterio de aceite:
  - nao existir rota critica que opere apenas com `getSession()`
  - todo endpoint de leitura, escrita, execucao, aprovacao, delete, importacao ou exportacao deve validar permissao

### 4. Tratar `perfil + empresa + unidade ativa` como contrato obrigatorio
- Toda leitura deve ter filtro explicito por `companyId`
- Toda escrita deve validar que o recurso alvo pertence a empresa ativa
- Quando houver `unitId`, o backend deve decidir a unidade efetiva e revalidar qualquer override
- Listas de IDs recebidas do cliente devem ser validadas item a item
- Criterio de aceite:
  - nenhum usuario altera recurso de outra empresa por trocar ID na requisicao
  - nenhum tecnico consulta ou altera recurso fora da sua unidade efetiva quando o modulo for unit-scoped

### 5. Fechar imediatamente endpoints expostos sem autenticacao
- APIs tecnicas, de GEP, debug, listagem de arquivos e similares nao podem ficar abertas por conveniencia
- Se um endpoint precisar ser publico, isso deve ser documentado, justificado e protegido por desenho especifico
- Criterio de aceite:
  - qualquer endpoint interno ou operacional responde `401` ou `403` sem sessao ou secret valido

### 6. Reduzir dependencia de `service_role` e fortalecer RLS
- O uso amplo de `service_role` coloca todo o isolamento da aplicacao nas costas do codigo
- Sempre que possivel, leituras e operacoes do app devem usar credencial que respeite politicas de acesso
- Onde `service_role` for realmente necessario, a superficie deve ser minima, isolada e auditada
- Criterio de aceite:
  - mapear quais rotas realmente precisam de privilegio elevado
  - restringir o restante a client/configuracao segura

### 7. Endurecer uploads e links de arquivo
- Remover tipos perigosos da whitelist padrao, especialmente HTML, SVG, XML, JSON bruto e compactados, salvo caso de negocio explicitamente aprovado
- Validar assinatura real do arquivo quando viavel
- Preferir acesso privado ou URL assinada para arquivos internos do cliente
- Vincular cada upload ao contexto de empresa e entidade de negocio
- Criterio de aceite:
  - arquivos proibidos nao sobem
  - arquivo de uma empresa nao pode ser gerenciado por usuario de outra
  - arquivos sensiveis nao ficam expostos em URL publica permanente sem justificativa

### 8. Remover mass assignment e validar payload por allowlist
- `update(body)` sem allowlist e uma porta classica para alteracao indevida de campos tecnicos
- Cada endpoint deve montar um payload permitido explicitamente
- Campos como `companyId`, `createdAt`, `createdById`, `approvedById`, flags tecnicas e referencias criticas nao devem ser aceitos do cliente sem fluxo controlado
- Criterio de aceite:
  - alterar payload no DevTools nao permite mutar campos fora da allowlist

### 9. Implementar protecao contra brute force e abuso
- Login precisa de rate limiting por IP e, idealmente, por combinacao de IP + email
- Operacoes pesadas de importacao, leitura massiva, exportacao e cron manual tambem devem ter protecao
- Falhas repetidas de autenticacao devem ser monitoradas
- Criterio de aceite:
  - tentativas repetidas em curto intervalo passam a ser bloqueadas ou desaceleradas

### 10. Endurecer erros, logs e observabilidade
- Remover `details`, objetos de erro crus e stack traces das respostas de producao
- Reduzir logs verbosos de autenticacao, dados de usuario, headers e ids sensiveis
- Manter logs suficientes para auditoria, mas com curadoria
- Criterio de aceite:
  - resposta 500 nao revela internals do banco ou do framework
  - logs de login nao expoem informacao desnecessaria

### 11. Adicionar headers de seguranca e proteger redirects
- Aplicar `Content-Security-Policy`, `Referrer-Policy`, `X-Frame-Options` ou `frame-ancestors`, `Strict-Transport-Security` e `Permissions-Policy`
- Validar `returnUrl` e qualquer redirect vindo de query string para impedir open redirect
- Criterio de aceite:
  - links de login com destino externo sao rejeitados ou normalizados para rota interna segura

### 12. Atualizar dependencias e remover bypass de qualidade no deploy
- `next`, `prisma` e demais pacotes com advisories criticos devem ser atualizados antes do go-live
- `ignoreBuildErrors`, `ignoreDuringBuilds` e `SKIP_ENV_VALIDATION` so devem existir com justificativa temporaria e prazo de remocao
- Criterio de aceite:
  - pipeline falha quando houver erro estrutural relevante
  - dependencias bloqueadoras estao atualizadas

### 13. Criar um gate formal de seguranca para homologacao e producao
- Antes de liberar para cliente, a equipe deve passar por um checklist formal de seguranca
- Esse gate precisa incluir verificacao por perfil, empresa e unidade
- Deve haver registro do que foi validado, por quem, quando e com quais limites conhecidos
- Criterio de aceite:
  - nenhuma liberacao externa acontece apenas por "a tela carregou"

### 14. Prioridade recomendada de execucao
- Prioridade P0:
  - sessao assinada e revalidada
  - remocao de heuristica de papel por email/jobTitle
  - fechamento dos endpoints publicos
  - autorizacao central nas rotas criticas
  - remocao de fallback inseguro de segredos
- Prioridade P1:
  - hardening de upload
  - sanitizacao de erros e logs
  - open redirect
  - headers de seguranca
  - rate limiting
- Prioridade P2:
  - reducao do uso de `service_role`
  - reforco de RLS
  - automacao recorrente de auditoria

## Resumo Breve Para um Leigo
- O sistema hoje precisa confirmar melhor quem o usuario e de verdade; do jeito errado, alguem pode se passar por outro usuario ou ganhar acesso maior do que deveria
- Tambem e preciso fechar portas tecnicas que hoje estao mais abertas do que o ideal, especialmente em APIs internas, uploads e automacoes
- Antes de entregar para cliente real, o sistema precisa de uma rodada de travas extras para impedir acesso indevido, proteger arquivos e evitar que erros internos vazem para fora

