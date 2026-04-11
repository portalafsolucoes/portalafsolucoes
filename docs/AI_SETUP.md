# AI Tooling e MCPs

## Objetivo
- Manter Claude Code, Codex e GitHub Copilot orientados pelo mesmo conjunto de regras e pelo mesmo inventario funcional de tooling
- Evitar segredos, tokens e caminhos pessoais no repositorio
- Garantir que agentes mantenham a raiz do projeto limpa, usando `docs/` para documentacao auxiliar e `auditoria/` para evidencias e relatorios
- Garantir que qualquer evidencia gerada por IA siga a estrutura canonica de `docs/AUDITORIA.md`

## Inventario Canonico de Skills
- `ui-ux-pro-max`
- `playwright-skill`

## Onde Cada Ferramenta Le
- Claude Code: `.claude/skills/`
- Codex: `.codex/skills/`
- Copilot: usa instrucoes do repositorio e os MCPs disponibilizados pela extensao/ambiente do VS Code

## Inventario Canonico de MCPs
- `playwright`: automacao e verificacao de navegador
- `supabase`: documentacao oficial e operacoes suportadas pelo provider
- `github`: operacoes de repositorio e PR
- `vercel`: deploy e inspecao de deploys
- `stitch`: design system e geracao de telas

## Politica de Segredos
- Nao commitar tokens, project refs privados, connection strings ou caminhos absolutos de maquina
- Configurar credenciais em arquivos user-scope ou variaveis de ambiente da ferramenta
- O repositorio deve armazenar apenas nomes canonicos, papeis de cada MCP e exemplos com placeholders

## Setup Recomendado por Ferramenta

### Claude Code
- Arquivo user-scope: `%USERPROFILE%/.claude.json`
- Preferir manter MCPs autenticados no user-scope
- Usar `.claude/settings.local.json` apenas para permissoes seguras e referencias locais ao projeto

### Codex
- Arquivo user-scope: `%USERPROFILE%/.codex/config.toml`
- Manter os mesmos nomes de MCP do inventario canonico acima
- Apontar o projeto para `AGENTS.md` e para as skills em `.codex/skills/`

### GitHub Copilot
- Usar `.github/copilot-instructions.md` como ponto de entrada
- Quando o ambiente oferecer MCPs ou ferramentas externas equivalentes, usar os mesmos nomes e o mesmo inventario funcional definidos aqui

## Exemplo de Nomes Canonicos

### Claude Code
```json
{
  "mcpServers": {
    "playwright": { "type": "stdio", "command": "npx", "args": ["@playwright/mcp@latest"] },
    "supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp" },
    "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp" },
    "vercel": { "type": "http", "url": "https://mcp.vercel.com" },
    "stitch": { "type": "http", "url": "https://stitch.googleapis.com/mcp" }
  }
}
```

### Codex
```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp"

[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp"

[mcp_servers.vercel]
url = "https://mcp.vercel.com"

[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
```

## Observacoes
- Se houver um MCP local adicional para acesso direto a banco deste projeto, mante-lo como extensao user-scope e documentar a motivacao local sem commitar credenciais
- Ao mudar o inventario de MCPs ou skills, atualizar este arquivo, `CONVENTIONS.md`, `AGENTS.md` e `.github/copilot-instructions.md`
- Ao gerar documentacao, screenshots ou relatorios com apoio de IA, nunca salvar arquivos soltos na raiz do repositorio
- Ao gerar auditorias com apoio de IA, salvar somente artefatos curados em `auditoria/`; nao manter `storageState.json`, cookies, logs brutos ou scripts temporarios como evidencia final
