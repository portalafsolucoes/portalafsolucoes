-- Migration: Adiciona Product, CompanyProduct e Module.productId
-- Parte da migração multi-produto: separa "produto comercial" de "feature/menu"

-- Criar enums de produto
CREATE TYPE "ProductSlug" AS ENUM ('CMMS', 'GVP', 'GPA');
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'COMING_SOON', 'DISABLED');

-- Criar tabela Product (macro-módulo comercial)
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" "ProductSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'COMING_SOON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- Criar índice único em Product.slug
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- Criar tabela CompanyProduct (habilitação de produto por empresa)
CREATE TABLE "CompanyProduct" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "CompanyProduct_pkey" PRIMARY KEY ("id")
);

-- Índices e unique constraint em CompanyProduct
CREATE UNIQUE INDEX "CompanyProduct_companyId_productId_key" ON "CompanyProduct"("companyId", "productId");
CREATE INDEX "CompanyProduct_companyId_idx" ON "CompanyProduct"("companyId");
CREATE INDEX "CompanyProduct_productId_idx" ON "CompanyProduct"("productId");

-- Foreign keys de CompanyProduct
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicionar coluna productId em Module (nullable - backfill via seed)
ALTER TABLE "Module" ADD COLUMN "productId" TEXT;
ALTER TABLE "Module" ADD CONSTRAINT "Module_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
