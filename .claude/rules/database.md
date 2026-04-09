---
globs: prisma/**,src/lib/db/**,src/actions/**
---

# Banco, Schema e Supabase

## Stack de Dados
- O projeto usa PostgreSQL via Supabase com Prisma ORM
- `prisma/schema.prisma` e a referencia estrutural principal do schema
- A aplicacao precisa refletir o modelo funcional definido em `docs/SPEC.md`, mesmo quando o schema legado ainda tiver nomes antigos

## Isolamento e Escopo
- `Company` e o limite maximo de isolamento; usuarios de uma empresa nunca acessam dados de outra
- `Unit` e o recorte operacional principal; a maior parte das listagens, metricas e consultas deve ser filtrada pela unidade ativa
- Localizacoes raiz sao tratadas como unidades
- Toda query de negocio deve considerar `perfil + empresa + unidade ativa`
- Apenas `SUPER_ADMIN` e `ADMIN` podem trocar de unidade, e somente quando tiverem acesso a mais de uma

## Relacionamentos Essenciais
- `Company` se relaciona com usuarios, unidades e modulos habilitados
- `Module` e habilitado por empresa via `CompanyModule`
- `User` pode ter multiplas unidades de acesso e precisa ser normalizado para os papeis canonicos de produto
- `Team` agrupa tecnicos para atribuicao de OS e ativos
- `Asset` e hierarquico e pode ter subativos, anexos, pecas, OS relacionadas, solicitacoes relacionadas, contador, imagem e criticidade GUT
- `Location` organiza a estrutura fisica hierarquica da unidade
- `MaintenancePlan` pode ser padrao por familia de ativo ou especifico por ativo, com tarefas, passos e recursos
- `Request` pode ser aprovada ou rejeitada e pode gerar `WorkOrder`
- `WorkOrder` suporta numero interno `MAN-XXXXXX`, numero externo do ERP/TOTVS, checklist, custos, tempos, recursos e fotos antes/depois
- `RAF` deve ter numero unico

## Convencoes de Schema
- O sistema deve trabalhar com papeis canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER` e `VIEW_ONLY`
- Se enums ou registros legados ainda usarem papeis antigos, a aplicacao deve mapear esses valores antes de decidir acesso
- Ativos devem ter `tag` unica por unidade
- Criticidade GUT segue `Gravidade x Urgencia x Tendencia`, com faixa de `1` a `125`
- Campos integrados com TOTVS/Protheus tendem a usar prefixo `protheusCode`
- Uploads e imagens associados ao banco devem usar Cloudinary

## Padrões de Query
- Consultas no servidor devem aplicar filtros explicitos de empresa e unidade; nunca confiar apenas no filtro visual da UI
- Preferir selects explicitos, ordenacao explicita e filtros por igualdade para o contexto autenticado
- Qualquer contagem, indicador ou dashboard deve respeitar o mesmo recorte da unidade ativa, exceto consolidacoes corporativas exclusivas do `SUPER_ADMIN`
- Chaves de cache derivadas de consultas de usuario devem considerar contexto autenticado para evitar vazamento visual de sessao anterior

## Padrões de Supabase
- Ao consultar Supabase, usar tabelas/modelos de forma explicita com filtros por `companyId`, `unitId`, status e demais chaves de negocio
- Validar a sessao antes de executar queries privilegiadas
- Em operacoes com modulos habilitados, company modules e logo da empresa, a origem deve ser o banco e nao fallback local hardcoded
- Em fluxos de login, logout e troca de contexto, tratar respostas de auth e company modules como dinamicas e sem cache compartilhado
