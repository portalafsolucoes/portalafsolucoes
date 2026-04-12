# Produtos e Features

## Glossário Canônico

- **Produto** (`Product`): unidade comercial habilitada por empresa. Valores: `CMMS`, `GVP`, `GPA`.
- **Feature / Módulo de menu** (`Module`): item navegável dentro de um produto. Pertence a um `Product` via `Module.productId`.
- Ao escrever ou falar sobre "módulo", qualificar sempre como **"produto"** (ex: "produto GVP") ou **"feature"** (ex: "feature work-orders"). O termo "módulo" sem qualificador é ambíguo neste projeto.

## Regras para Implementação

- Toda nova feature pertence a exatamente um produto. Identificar o produto antes de criar rotas, componentes ou APIs.
- Nunca criar rotas órfãs sem vínculo a um produto (ex: `/gep` foi criado sem produto — não repetir).
- Novas rotas de GVP ficam em `src/app/gvp/`. Novas rotas de GPA ficam em `src/app/portaria/`.
- Features CMMS seguem a estrutura flat atual (`src/app/work-orders/`, `src/app/assets/`, etc.).
- Ao criar um novo `Module` no banco/seed, sempre incluir o `productId` correspondente.
- Permissões seguem a cadeia: produto habilitado → feature habilitada → permissão de role.

## Estrutura de Pastas por Produto

```
src/app/
  # CMMS (estrutura flat, sem prefixo)
  dashboard/
  work-orders/
  assets/
  ...

  # GVP (prefixo gvp/)
  gvp/
    page.tsx          (dashboard GVP)
    variables/
    alarms/
    readings/
  gep/                (redirect 301 → /gvp)

  # GPA (prefixo portaria/)
  portaria/
    page.tsx          (dashboard GPA)
    gates/
    visitors/
    access-logs/

  # Compartilhadas (sem produto)
  hub/
  login/
  admin/
  profile/
  settings/
```

## Verificação de Coerência

- Ao adicionar feature a um produto existente, verificar se `docs/PRODUTOS.md` está atualizado.
- Ao adicionar novo produto, criar seção em `docs/PRODUTOS.md` e registrar todas as features.
- Ao implementar GVP ou GPA, criar seção em `docs/spec.md` com contrato funcional completo.
