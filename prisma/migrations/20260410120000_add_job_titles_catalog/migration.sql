-- Cadastro estruturado de cargos para uso em Pessoas e Cadastros Basicos

CREATE TABLE "JobTitle" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "protheusCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL,

  CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobTitle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "User"
ADD COLUMN "jobTitleId" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "JobTitle_companyId_idx" ON "JobTitle"("companyId");
CREATE INDEX "User_jobTitleId_idx" ON "User"("jobTitleId");
CREATE UNIQUE INDEX "JobTitle_companyId_name_key" ON "JobTitle"("companyId", "name");
CREATE UNIQUE INDEX "JobTitle_companyId_protheusCode_key" ON "JobTitle"("companyId", "protheusCode");

WITH distinct_job_titles AS (
  SELECT DISTINCT
    u."companyId",
    btrim(u."jobTitle") AS "name"
  FROM "User" u
  WHERE u."jobTitle" IS NOT NULL
    AND btrim(u."jobTitle") <> ''
)
INSERT INTO "JobTitle" ("id", "name", "companyId", "createdAt", "updatedAt")
SELECT
  'jobtitle_' || substr(md5(random()::text || clock_timestamp()::text || djt."companyId" || djt."name"), 1, 24),
  djt."name",
  djt."companyId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM distinct_job_titles djt
ON CONFLICT ("companyId", "name") DO NOTHING;

UPDATE "User" u
SET "jobTitleId" = jt."id"
FROM "JobTitle" jt
WHERE u."companyId" = jt."companyId"
  AND u."jobTitle" IS NOT NULL
  AND btrim(u."jobTitle") <> ''
  AND btrim(u."jobTitle") = jt."name"
  AND u."jobTitleId" IS NULL;
