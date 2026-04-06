# Funcionalidades Sugeridas

| # | Sugestao | Tipo | Prioridade | Justificativa |
|---|---|---|---|---|
| 1 | Transformar a navegacao lateral em layout persistente do App Router | Performance | ALTA | A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas 14 chamadas para /api/auth/me durante a navegacao. |
| 2 | Consolidar checagem de sessao e permissoes em um provider/cache compartilhado | Backend + UX | ALTA | As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez. |
| 3 | Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache | Performance | ALTA | As rotas mais lentas foram: Ativos (10490ms), Centros de Trabalho (10421ms), Áreas (9686ms), Criticidade de Ativos (8811ms), RAF (7093ms). |
| 4 | Padronizar skeletons e transicoes de tela profissionais | UX/UI | MEDIA | Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes. |
| 5 | Revisar layout responsivo do cabecalho fixo e botao do menu mobile | Responsividade | MEDIA | 0 telas apresentaram overflow horizontal em tablet/mobile. |
