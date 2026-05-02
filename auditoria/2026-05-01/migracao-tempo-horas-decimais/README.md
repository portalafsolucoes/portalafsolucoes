# Migracao tempo: minutos -> horas decimais

## Contexto
Migracao da unidade canonica de duracao de `Int` (minutos) para `Decimal(10, 2)` (horas decimais) em 6 colunas:

- `WorkOrder.estimatedDuration`
- `WorkOrder.actualDuration`
- `Task.executionTime`
- `StandardMaintenanceTask.executionTime`
- `AssetMaintenanceTask.executionTime`
- `Labor.duration`

Migration: `prisma/migrations/20260501234507_time_fields_to_decimal_hours/migration.sql`.

## Artefatos desta rodada

- `dados/01-validacao-pos-migration.sql` — queries para rodar em stage apos aplicar a migration. Confirma que valores antigos viraram horas plausiveis.
- `dados/02-sanity-pos-deploy.md` — checklist passo-a-passo para conferir no Dashboard logo apos deploy em producao.
- `dados/03-comunicado-totvs.md` — draft de aviso para integradores externos consumidores de `/api/integration/totvs/export?entity=work-orders`.

## Ordem de execucao

1. **Stage** — copiar producao para stage, aplicar migration, rodar `01-validacao-pos-migration.sql`. Bloquear deploy se qualquer query retornar dados suspeitos.
2. **Producao** — aplicar migration. Imediatamente rodar `02-sanity-pos-deploy.md`.
3. **Comunicacao** — apos deploy ok, enviar `03-comunicado-totvs.md` aos integradores conhecidos.

## Decisoes tomadas

- `AssetDowntime.duration` ficou de fora (modelo dormente sem codigo dependente).
- `StandardMaintenancePlan.maintenanceTime` + `timeUnit` ficaram de fora (sao periodicidade do plano, nao duracao de execucao).
- Borda TOTVS preserva contrato externo em minutos via adapter `src/lib/integration/totvs/timeAdapter.ts`. Consumidores nao veem a mudanca interna.

## Evidencias
N/A — esta rodada e de planejamento de rollout. Evidencias visuais (screenshots) ficarao na proxima rodada apos deploy.
