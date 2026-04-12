-- Migração para adicionar campo isArea à tabela Asset
-- Este campo indica se o ativo é uma ÁREA (primeiro nível da hierarquia)

-- Adicionar coluna isArea
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "isArea" BOOLEAN DEFAULT false;

-- Criar índice para consultas por áreas
CREATE INDEX IF NOT EXISTS "Asset_isArea_idx" ON "Asset" ("isArea");

-- Atualizar ativos existentes que são áreas (customId começa com "ARE")
UPDATE "Asset" SET "isArea" = true WHERE "customId" LIKE 'ARE%';

-- Comentário na coluna
COMMENT ON COLUMN "Asset"."isArea" IS 'Se true, indica que este registro é uma ÁREA (primeiro nível da hierarquia de ativos)';
