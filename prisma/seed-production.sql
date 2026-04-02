-- Script SQL para criar dados iniciais em produção (Supabase)
-- Execute este script no SQL Editor do Supabase após fazer o deploy

-- ============================================
-- 1. CRIAR EMPRESA
-- ============================================
INSERT INTO "Company" (
  id, 
  name, 
  email, 
  phone, 
  address,
  "createdAt", 
  "updatedAt"
)
VALUES (
  'company-prod-001',
  'Minha Empresa LTDA',
  'contato@minhaempresa.com',
  '(11) 99999-9999',
  'Rua Exemplo, 123 - São Paulo, SP',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CRIAR USUÁRIO SUPER ADMIN
-- ============================================
-- IMPORTANTE: Substitua o hash da senha abaixo
-- Para gerar o hash, execute no terminal:
-- node -e "console.log(require('bcryptjs').hashSync('SuaSenhaAqui', 10))"

INSERT INTO "User" (
  id, 
  email, 
  password, 
  "firstName", 
  "lastName", 
  username, 
  role, 
  "jobTitle",
  enabled, 
  "companyId",
  "createdAt", 
  "updatedAt"
)
VALUES (
  'user-admin-001',
  'admin@minhaempresa.com',
  '$2b$10$YourHashedPasswordHere', -- ⚠️ SUBSTITUA PELO HASH REAL
  'Administrador',
  'Sistema',
  'admin',
  'SUPER_ADMIN',
  'Administrador do Sistema',
  true,
  'company-prod-001',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. CRIAR USUÁRIO COORDENADOR (OPCIONAL)
-- ============================================
INSERT INTO "User" (
  id, 
  email, 
  password, 
  "firstName", 
  "lastName", 
  username, 
  role, 
  "jobTitle",
  enabled, 
  "companyId",
  "createdAt", 
  "updatedAt"
)
VALUES (
  'user-coord-001',
  'coordenador@minhaempresa.com',
  '$2b$10$YourHashedPasswordHere', -- ⚠️ SUBSTITUA PELO HASH REAL
  'Coordenador',
  'Manutenção',
  'coordenador',
  'ADMIN',
  'Coordenador de Manutenção',
  true,
  'company-prod-001',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 4. CRIAR USUÁRIO TÉCNICO (OPCIONAL)
-- ============================================
INSERT INTO "User" (
  id, 
  email, 
  password, 
  "firstName", 
  "lastName", 
  username, 
  role, 
  "jobTitle",
  enabled, 
  "companyId",
  "createdAt", 
  "updatedAt"
)
VALUES (
  'user-tech-001',
  'tecnico@minhaempresa.com',
  '$2b$10$YourHashedPasswordHere', -- ⚠️ SUBSTITUA PELO HASH REAL
  'Técnico',
  'Manutenção',
  'tecnico',
  'TECHNICIAN',
  'Técnico de Manutenção',
  true,
  'company-prod-001',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 5. CRIAR LOCALIZAÇÃO PADRÃO (OPCIONAL)
-- ============================================
INSERT INTO "Location" (
  id,
  name,
  address,
  "companyId",
  "createdAt",
  "updatedAt"
)
VALUES (
  'location-001',
  'Sede Principal',
  'Rua Exemplo, 123 - São Paulo, SP',
  'company-prod-001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. CRIAR EQUIPE PADRÃO (OPCIONAL)
-- ============================================
INSERT INTO "Team" (
  id,
  name,
  description,
  "companyId",
  "leaderId",
  "createdAt",
  "updatedAt"
)
VALUES (
  'team-001',
  'Equipe de Manutenção',
  'Equipe responsável pela manutenção geral',
  'company-prod-001',
  'user-coord-001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. ADICIONAR TÉCNICO À EQUIPE (OPCIONAL)
-- ============================================
INSERT INTO "TeamMember" (
  id,
  "teamId",
  "userId",
  "createdAt"
)
VALUES (
  'team-member-001',
  'team-001',
  'user-tech-001',
  NOW()
)
ON CONFLICT ("teamId", "userId") DO NOTHING;

-- ============================================
-- 8. VERIFICAR DADOS CRIADOS
-- ============================================
-- Execute estas queries para verificar:

-- Verificar empresa
SELECT * FROM "Company" WHERE id = 'company-prod-001';

-- Verificar usuários
SELECT id, email, "firstName", "lastName", role, enabled 
FROM "User" 
WHERE "companyId" = 'company-prod-001';

-- Verificar localização
SELECT * FROM "Location" WHERE "companyId" = 'company-prod-001';

-- Verificar equipe
SELECT * FROM "Team" WHERE "companyId" = 'company-prod-001';

-- Verificar membros da equipe
SELECT tm.id, u.email, u."firstName", u."lastName", t.name as team_name
FROM "TeamMember" tm
JOIN "User" u ON tm."userId" = u.id
JOIN "Team" t ON tm."teamId" = t.id
WHERE t."companyId" = 'company-prod-001';
