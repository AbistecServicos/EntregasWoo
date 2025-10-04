-- ===========================================
-- SQL-OPTIMIZATION.SQL - ÍNDICES CRÍTICOS
-- ===========================================
-- Execute estes comandos no Supabase SQL Editor
-- para melhorar drasticamente a performance
-- ===========================================

-- 🔥 ÍNDICE CRÍTICO 1: loja_associada - queries mais frequentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loja_associada_uid_status_funcao 
ON loja_associada (uid_usuario, status_vinculacao, funcao);

-- 🔥 ÍNDICE CRÍTICO 2: loja_associada - filtro por loja
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loja_associada_id_loja_status 
ON loja_associada (id_loja, status_vinculacao);

-- 🔥 ÍNDICE CRÍTICO 3: pedidos - status + data (para Pedidos Pendentes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_status_data_desc 
ON pedidos (status_transporte, data DESC) 
WHERE status_transporte IN ('aguardando', 'pendente', 'aceito', 'revertido');

-- 🔥 ÍNDICE CRÍTICO 4: pedidos - por loja e data (para relatórios)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_id_loja_data_status 
ON pedidos (id_loja, data DESC, status_transporte);

-- 🔥 ÍNDICE CRÍTICO 5: usuarios - admin check (otimiza RLS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_uid_admin 
ON usuarios (uid, is_admin) WHERE is_admin = true;

-- 🔥 ÍNDICE CRÍTICO 6: user_tokens - performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tokens_user_id_created 
ON user_tokens (user_id, created_at DESC);

-- ===========================================
-- VERIFICAÇÃO DOS ÍNDICES CRIADOS
-- ===========================================
-- Execute após criar os índices para verificar:
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


