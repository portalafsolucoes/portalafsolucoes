# Codigo Deprecado

Registro de arquivos e componentes substituidos que aguardam remocao.
Antes de remover, verificar que nenhum import ou referencia depende do item.

| Arquivo | Motivo | Substituto | Deprecado em | Condicao para remocao |
|---------|--------|------------|--------------|----------------------|
| `src/components/basic-registrations/CrudTable.tsx` | Substituido pelo split-panel (GenericCrudTable + GenericEditPanel + GenericDetailPanel) | `GenericCrudTable.tsx`, `GenericEditPanel.tsx`, `GenericDetailPanel.tsx` | 2026-04-10 | Nenhum import restante no projeto |
