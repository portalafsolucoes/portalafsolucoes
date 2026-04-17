-- Tornar User.companyId opcional (NULL apenas para staff Portal AF / SUPER_ADMIN de plataforma).
-- Esta migração NÃO altera dados existentes. A revisão dos SUPER_ADMINs atuais é manual
-- (rodar `npm run audit:super-admins` para gerar o inventário).

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
