-- ===========================================
-- SQL-TEST-QUERIES.SQL - QUERIES OTIMIZADAS
-- ===========================================
-- Teste estas queries otimizadas no Supabase
-- para verificar melhor performance
-- ===========================================

-- 🚀 QUERY OTIMIZADA 1: Pedidos Pendentes (sem JOINs desnecessários)
EXPLAIN ANALYZE
SELECT 
  p.id,
  p.data,
  p.status_transporte,
  p.id_loja,
  p.nome_cliente,
  p.endereco_entrega,
  p.total,
  p.loja_nome
FROM pedidos p
WHERE p.status_transporte = 'aguardando'
  AND p.id_loja IN ('L1', 'L2')
  AND p.data >= NOW() - INTERVAL '3 days'
ORDER BY p.data DESC
LIMIT 30;

-- 🚀 QUERY OTIMIZADA 2: Verificar se existem pedidos pendentes
SELECT 
  COUNT(*) as total_pendentes,
  COUNT(CASE WHEN id_loja = 'L1' THEN 1 END) as pendentes_l1,
  COUNT(CASE WHEN id_loja = 'L2' THEN 1 END) as pendentes_l2
FROM pedidos 
WHERE status_transporte = 'aguardando'
  AND data >= NOW() - INTERVAL '7 days';

-- 🚀 QUERY OTIMIZADA 3: Performance loja_associada
EXPLAIN ANALYZE
SELECT 
  uid_usuario,
  id_loja,
  funcao
FROM loja_associada 
WHERE status_vinculacao = 'ativo'
  AND uid_usuario = 'b1f2c290-c413-4d8f-a36d-25cae86eafac';  -- Substitua pelo seu UID admin

-- 🚀 QUERY OTIMIZADA 4: Verificar dados reais para debug
SELECT 
  status_transporte,
  COUNT(*) as quantidade,
  MIN(data) as data_mais_antiga,
  MAX(data) as data_mais_recente
FROM pedidos 
WHERE data >= NOW() - INTERVAL '30 days'
GROUP BY status_transporte
ORDER BY quantidade DESC;


