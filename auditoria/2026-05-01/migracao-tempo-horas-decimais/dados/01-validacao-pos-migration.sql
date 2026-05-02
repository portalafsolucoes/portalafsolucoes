-- ============================================================================
-- VALIDACAO POS-MIGRATION (rodar em STAGE apos aplicar a migration)
-- 20260501234507_time_fields_to_decimal_hours
--
-- Objetivo: confirmar que valores antigos (minutos Int) viraram horas
-- decimais plausiveis (Decimal(10,2)) e que nenhuma coluna ficou corrompida.
--
-- COMO USAR:
-- 1. Restaurar copia recente de producao em stage.
-- 2. Aplicar a migration: `npm run db:push` ou prisma migrate deploy.
-- 3. Rodar este script no SQL editor do Supabase de stage.
-- 4. Conferir cada bloco contra os criterios documentados ao lado.
-- 5. Bloquear deploy se qualquer query retornar dados suspeitos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tipo das colunas — devem aparecer como `numeric(10,2)`
-- ----------------------------------------------------------------------------
-- Esperado: 6 linhas, todas com data_type='numeric', numeric_precision=10, numeric_scale=2
SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE (table_name = 'WorkOrder' AND column_name IN ('estimatedDuration', 'actualDuration'))
   OR (table_name = 'Task' AND column_name = 'executionTime')
   OR (table_name = 'StandardMaintenanceTask' AND column_name = 'executionTime')
   OR (table_name = 'AssetMaintenanceTask' AND column_name = 'executionTime')
   OR (table_name = 'Labor' AND column_name = 'duration')
ORDER BY table_name, column_name;

-- ----------------------------------------------------------------------------
-- 2) Amostra de WorkOrder com valores antigos plausivelmente convertidos
-- ----------------------------------------------------------------------------
-- Esperado: actualDuration entre 0.00 e 24.00 para a maioria (OS tipicas).
-- Suspeito: valores >100h, valores negativos, NaN.
SELECT id, "internalId", status, "estimatedDuration", "actualDuration"
FROM "WorkOrder"
WHERE "actualDuration" IS NOT NULL
ORDER BY "completedOn" DESC NULLS LAST
LIMIT 20;

-- ----------------------------------------------------------------------------
-- 3) Sanity de Task.executionTime
-- ----------------------------------------------------------------------------
-- Esperado: a grande maioria entre 0.05 (3min) e 8.00 (jornada completa).
-- Suspeito: valores acima de 24h (impossivel para uma task) ou negativos.
SELECT id, label, "executionTime"
FROM "Task"
WHERE "executionTime" IS NOT NULL
ORDER BY "executionTime" DESC
LIMIT 10;

SELECT id, label, "executionTime"
FROM "Task"
WHERE "executionTime" IS NOT NULL
ORDER BY "executionTime" ASC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- 4) Distribuicao de actualDuration — buckets para detectar deslocamento
-- ----------------------------------------------------------------------------
-- Esperado: pico entre 0.5h e 4h. Se aparecer pico em ~60h ou ~3600h
-- significa que algum valor nao foi convertido (ainda em minutos/segundos).
SELECT
  CASE
    WHEN "actualDuration" IS NULL THEN 'null'
    WHEN "actualDuration" < 0.5 THEN '< 0.5h'
    WHEN "actualDuration" < 1 THEN '0.5-1h'
    WHEN "actualDuration" < 4 THEN '1-4h'
    WHEN "actualDuration" < 8 THEN '4-8h'
    WHEN "actualDuration" < 24 THEN '8-24h'
    WHEN "actualDuration" < 100 THEN '24-100h SUSPEITO'
    ELSE '>=100h ALERTA'
  END AS bucket,
  COUNT(*) AS qtd
FROM "WorkOrder"
GROUP BY 1
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- 5) Comparar amostra com snapshot de minutos esperados
-- ----------------------------------------------------------------------------
-- Pegar 5 OSs concluidas e validar manualmente: "actualDuration * 60" deve
-- bater com o que era exibido na tela ANTES da migration.
SELECT id, "internalId", "completedOn",
       "actualDuration" AS horas_decimais,
       ROUND(("actualDuration" * 60)::numeric, 0) AS minutos_equivalentes
FROM "WorkOrder"
WHERE "actualDuration" IS NOT NULL AND status = 'COMPLETE'
ORDER BY "completedOn" DESC
LIMIT 5;

-- ----------------------------------------------------------------------------
-- 6) StandardMaintenanceTask + AssetMaintenanceTask
-- ----------------------------------------------------------------------------
-- Esperado: tasks padrao tipicamente 0.25-2h. Comparar com formulario antigo.
SELECT 'StandardMaintenanceTask' AS origem, COUNT(*) AS total,
       AVG("executionTime")::numeric(10,2) AS media,
       MAX("executionTime") AS maximo
FROM "StandardMaintenanceTask"
WHERE "executionTime" IS NOT NULL
UNION ALL
SELECT 'AssetMaintenanceTask', COUNT(*),
       AVG("executionTime")::numeric(10,2),
       MAX("executionTime")
FROM "AssetMaintenanceTask"
WHERE "executionTime" IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7) Labor.duration — tabela atualmente sem inserts no codigo
-- ----------------------------------------------------------------------------
-- Esperado: 0 linhas (tabela nao recebe insert no codigo atual). Se houver
-- linhas legadas, validar conversao.
SELECT COUNT(*) AS total_labors,
       COUNT(*) FILTER (WHERE duration > 24) AS duracoes_acima_24h_suspeitas
FROM "Labor";

-- ----------------------------------------------------------------------------
-- 8) Detectar valores NULL inesperados
-- ----------------------------------------------------------------------------
-- Esperado: contagem de NULL pos-migration deve bater com pre-migration
-- (a migration nao introduz NULL — apenas converte tipo).
SELECT
  'WorkOrder.actualDuration nulls' AS metrica,
  COUNT(*) FILTER (WHERE "actualDuration" IS NULL) AS qtd
FROM "WorkOrder"
UNION ALL
SELECT 'WorkOrder.estimatedDuration nulls',
  COUNT(*) FILTER (WHERE "estimatedDuration" IS NULL)
FROM "WorkOrder"
UNION ALL
SELECT 'Task.executionTime nulls',
  COUNT(*) FILTER (WHERE "executionTime" IS NULL)
FROM "Task"
UNION ALL
SELECT 'StandardMaintenanceTask.executionTime nulls',
  COUNT(*) FILTER (WHERE "executionTime" IS NULL)
FROM "StandardMaintenanceTask"
UNION ALL
SELECT 'AssetMaintenanceTask.executionTime nulls',
  COUNT(*) FILTER (WHERE "executionTime" IS NULL)
FROM "AssetMaintenanceTask";

-- ----------------------------------------------------------------------------
-- 9) Detectar valores absurdos (negativos ou > 8760h = 1 ano)
-- ----------------------------------------------------------------------------
-- Esperado: zero linhas em todas as queries.
SELECT 'WorkOrder.actualDuration absurdo' AS metrica, COUNT(*) AS qtd
FROM "WorkOrder"
WHERE "actualDuration" < 0 OR "actualDuration" > 8760
UNION ALL
SELECT 'WorkOrder.estimatedDuration absurdo',
  COUNT(*)
FROM "WorkOrder"
WHERE "estimatedDuration" < 0 OR "estimatedDuration" > 8760
UNION ALL
SELECT 'Task.executionTime absurdo',
  COUNT(*)
FROM "Task"
WHERE "executionTime" < 0 OR "executionTime" > 8760
UNION ALL
SELECT 'StandardMaintenanceTask absurdo',
  COUNT(*)
FROM "StandardMaintenanceTask"
WHERE "executionTime" < 0 OR "executionTime" > 8760
UNION ALL
SELECT 'AssetMaintenanceTask absurdo',
  COUNT(*)
FROM "AssetMaintenanceTask"
WHERE "executionTime" < 0 OR "executionTime" > 8760;
