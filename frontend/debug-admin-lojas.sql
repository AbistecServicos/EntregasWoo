-- ===========================================
-- DEBUG-ADMIN-LOJAS.SQL
-- ===========================================
-- Execute este script no Supabase SQL Editor
-- para verificar por que admin não vê pedidos pendentes
-- ===========================================

-- 🔍 1. VERIFICAR LOJAS ATIVAS (admin deveria ver TODAS)
SELECT 
  id_loja,
  loja_nome,
  ativa,
  data_criacao
FROM lojas 
WHERE ativa = true
ORDER BY id_loja;

-- 🔍 2. VERIFICAR TODAS AS LOJAS (mesmo inativas)
SELECT 
  id_loja,
  loja_nome,
  ativa,
  data_criacao
FROM lojas 
ORDER BY id_loja;

-- 🔍 3. VERIFICAR PEDIDOS PENDENTES POR LOJA
SELECT 
  id_loja,
  COUNT(*) as pedidos_pendentes,
  MIN(data) as primeiro_pedido,
  MAX(data) as ultimo_pedido
FROM pedidos 
WHERE status_transporte = 'aguardando'
GROUP BY id_loja
ORDER BY id_loja;

-- 🔍 4. VERIFICAR SE EXISTEM PEDIDOS PENDENTES GERAL
SELECT 
  COUNT(*) as total_pendentes,
  COUNT(CASE WHEN status_transporte = 'aguardando' THEN 1 END) as aguardando,
  COUNT(CASE WHEN status_transporte = 'pendente' THEN 1 END) as pendente,
  COUNT(CASE WHEN status_transporte = 'aceito' THEN 1 END) as aceito
FROM pedidos 
WHERE status_transporte IN ('aguardando', 'pendente', 'aceito');

-- 🔍 5. VERIFICAR STATUS COMPLETO DE TRANSPORTE
SELECT 
  status_transporte,
  COUNT(*) as quantidade
FROM pedidos 
GROUP BY status_transporte
ORDER BY quantidade DESC;

-- 📝 POSSÍVEIS CAUSAS DO PROBLEMAR:
-- ❌ Não há lojas com ativa=true
-- ❌ Não há pedidos com status_transporte='aguardando'  
-- ✅ Campo ativa existe na tabela lojas (CORRIGIDO!)
-- ❌ Tipos de status_transporte são diferentes
