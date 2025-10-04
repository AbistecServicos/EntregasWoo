-- ===========================================
-- CHECK-ADMIN-POLICIES.SQL
-- ===========================================
-- Execute este script no Supabase SQL Editor
-- para verificar se as políticas RLS estão corretas
-- para o administrador após remoção da loja_associada
-- ===========================================

-- 🔍 1. VERIFICAR POLÍTICAS DA TABELA PEDIDOS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'pedidos'
ORDER BY policyname;

-- 🔍 2. VERIFICAR POLÍTICAS DA TABELA USUARIOS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemanave = 'public' 
  AND tablename = 'usuarios'
ORDER BY policyname;

-- 🔍 3. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND (tablename = 'usuarios' OR tablename = 'pedidos' OR tablename = 'loja_associada')
ORDER BY tablename;

-- 🔍 4. TESTAR ACESSO DO ADMIN ÀS TABELAS
-- (Execute como o usuário admin autenticado no Supabase)
SELECT 
  'usuarios' as tabela,
  COUNT(*) as registros_encontrados
FROM usuarios 
WHERE uid = 'b1f2c290-c413-4d8f-a36d-25cae86eafac'

UNION ALL

SELECT 
  'pedidos' as tabela,
  COUNT(*) as registros_encontrados
FROM pedidos 
WHERE status_transporte = 'aguardando'

UNION ALL

SELECT 
  'loja_associada' as tabela,
  COUNT(*) as registros_encontrados
FROM loja_associada 
WHERE uid_usuario = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';

-- 🔍 5. VERIFICAR LOJAS ATIVAS (admin deveria ver todas)
SELECT 
  id_loja,
  loja_nome,
  ativo,
  data_criacao
FROM lojas 
WHERE ativo = true
ORDER BY id_loja;

-- 📝 OBSERVAÇÕES IMPORTANTES:
-- ✅ Admin deve poder ver TODOS os registros da tabela pedidos
-- ❌ Admin NÃO deve aparecer na tabela loja_associada
-- ✅ Admin deve poder ver TODAS as lojas ativas
-- 🚨 Se alguma política RLS estiver bloqueando, precisa ser corrigida

