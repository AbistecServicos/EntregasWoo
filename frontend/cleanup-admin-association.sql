-- ===========================================
-- CLEANUP-ADMIN-ASSOCIATION.SQL
-- ===========================================
-- Execute este script no Supabase SQL Editor
-- para corrigir a inconsistência do administrador
-- ===========================================

-- 🧹 PASSO 1: Verificar se existe registro do admin na loja_associada
SELECT 
  uid_usuario,
  nome_completo,
  funcao,
  id_loja,
  loja_nome,
  status_vinculacao
FROM loja_associada 
WHERE uid_usuario = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';

-- 🗑️ PASSO 2: REMOVER registro do admin da loja_associada
-- ATENÇÃO: Substitua pelo seu UID real antes de executar!
DELETE FROM loja_associada 
WHERE uid_usuario = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';

-- ✅ PASSO 3: Verificar se foi removido com sucesso
SELECT 
  COUNT(*) as registros_restantes
FROM loja_associada 
WHERE uid_usuario = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';

-- ✅ PASSO 4: Confirmar que usuário continua como admin
SELECT 
  uid,
  nome_completo,
  email,
  is_admin
FROM usuarios 
WHERE uid = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';

-- 📝 OBSERVAÇÕES:
-- ✅ Admin deve ter is_admin = true na tabela usuarios
-- ✅ Admin NÃO deve ter registros na tabela loja_associada
-- ✅ Com esta correção, o sistema será mais rápido e consistente

