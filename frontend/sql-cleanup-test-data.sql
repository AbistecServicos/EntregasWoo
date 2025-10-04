-- ===========================================
-- SQL-CLEANUP-TEST-DATA.SQL - LIMPEZA SEGURA
-- ===========================================
-- Execute estes comandos para limpar dados de teste
-- mantendo apenas ~50 pedidos recentes
-- ===========================================

-- 🔥 CORREÇÃO CRÍTICA: Limpar pedidos antigos mantendo apenas os 50 mais recentes
-- SUBSTITUA 'data_antiga' pela data que você considera "antiga"

-- 1. Primeiro verificar quantos pedidos serão afetados
SELECT 
  COUNT(*) as total_antigos
FROM pedidos 
WHERE data < '2025-09-25 00:00:00';  -- Ajuste a data conforme necessário

-- 2. Ver quantos pedidos você TEM agora por status
SELECT 
  status_transporte,
  COUNT(*) as quantidade
FROM pedidos 
GROUP BY status_transporte
ORDER BY quantidade DESC;

-- 3. VER os pedidos mais RECENTES (para manter)
SELECT 
  id,
  data,
  status_transporte,
  nome_cliente,
  total
FROM pedidos 
ORDER BY data DESC 
LIMIT 50;

-- 4. DELETAR pedidos antigos (MANTENDO os 50 mais recentes)
DELETE FROM pedidos 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id 
    FROM pedidos 
    ORDER BY data DESC 
    LIMIT 50
  ) as pedidos_recentes
);

-- 5. VERIFICAR resultado final
SELECT 
  COUNT(*) as total_pedidos,
  COUNT(CASE WHEN status_transporte = 'aguardando' THEN 1 END) as aguardando,
  COUNT(CASE WHEN status_transporte = 'entregue' THEN 1 END) as entregues,
  COUNT(CASE WHEN status_transporte = 'cancelado' THEN 1 END) as cancelados
FROM pedidos;

-- 6. OPÇÕES ALTERNATIVAS DE LIMPEZA (escolha uma):

-- OPÇÃO A: Manter apenas pedidos dos últimos 7 dias
-- DELETE FROM pedidos WHERE data < NOW() - INTERVAL '7 days';

-- OPÇÃO B: Manter apenas pedidos "entregues" + alguns "aguardando" recentes
-- DELETE FROM pedidos WHERE status_transporte = 'aguardando' AND data < '2025-09-25';

-- OPÇÃO C: Tabula rasa - DELETAR TODOS os pedidos (cuidado!)
-- DELETE FROM pedidos;


