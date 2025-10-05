// ========================================
// PEDIDOS-PENDENTES.JS - PÁGINA CORRIGIDA ✅ CURSOR CORRIGIU BUGS IMPORTANTES
// ========================================
// ✅ CORREÇÕES CURSOR: Array.map() fix, duplicações corrigidas, admin sem loja_associada
// Descrição: Lista pedidos pendentes com real-time (Supabase channels) e role-based actions.
// Problema resolvido: Duplicações em listeners/logs via useRef + condicionais dev.
// Manutenção: Seções numeradas para navegação (ex.: busque "SEÇÃO 5"). Remova console.logs em prod.
// Dependências: Next.js, Supabase.
// ========================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import { OrderModal, WithoutCourier } from '../components/OrderModal';
// Sistema de notificações removido para performance
import usePageStatePreservation from '../hooks/usePageStatePreservation';
import { useUserProfile } from '../hooks/useUserProfile';

// ==============================================================================
// COMPONENTE PRINCIPAL - PEDIDOS PENDENTES (CORRIGIDO)
// ==============================================================================
export default function PedidosPendentes() {
  // ============================================================================
  // 1. HOOK DE PRESERVAÇÃO DE ESTADO (NOVO)
  // ============================================================================
  const { 
    pageLoading, 
    pageData, 
    setPageLoading, 
    setPageData, 
    hasValidCache 
  } = usePageStatePreservation(true, []);

  // ============================================================================
  // 2. ESTADOS DO COMPONENTE (ALINHADOS COM PRESERVAÇÃO)
  // ============================================================================
  const pedidos = pageData || [];
  const loading = pageLoading;
  const [loadingAceitar, setLoadingAceitar] = useState(false);
  const [loadingData, setLoadingData] = useState({ initial: true });
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [maisPedidos, setMaisPedidos] = useState(false); // Para indicar se há mais pedidos
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const router = useRouter();

  // ✅ CORREÇÃO: Usar hook otimizado do UserContext
  const { userRole, userProfile, loading: userLoading } = useUserProfile();

  // ✅ NOVO: Verificar e limpar parâmetros de erro da URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      console.log('🔧 LIMPANDO: Parâmetros de erro da URL detectados');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Ref para trackear subscription (evita múltiplos listeners).
  const subscriptionRef = useRef(null);
  const isDev = process.env.NODE_ENV === 'development'; // Flag para logs dev-only;

  // ============================================================================
  // 3. EFFECT PARA CARREGAMENTO INICIAL (AUTH + ROLE + PEDIDOS)
  // ============================================================================
  // Roda uma vez no mount: Auth → Role → Pedidos.
  useEffect(() => {
    const checkAuthAndGetPedidos = async (pagina = 0) => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        // ✅ CORREÇÃO: Usar userRole do hook otimizado diretamente
        if (!userLoading && userProfile?.uid) {
          await getPedidosPendentes(userRole, user.id, pagina);
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
        router.push('/login');
      }
    };

    if (!userLoading && userProfile?.uid) {
      checkAuthAndGetPedidos(0);
      
      // Tornar a função acessível globalmente para os botões de paginação
      window.checkAuthAndGetPedidos = checkAuthAndGetPedidos;
    }
  }, [router, userLoading, userRole, userProfile?.uid]); // Dependências baseadas no hook otimizado

  // ============================================================================
  // 4. USEEFFECT: ESCUTAR NOVOS PEDIDOS EM TEMPO REAL (COM CLEANUP)
  // ============================================================================
  // Setup listener após role setado; usa ref para evitar múltiplos.
  useEffect(() => {
    let mounted = true;

    const setupRealtimeListener = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || userRole === 'visitante') return;

        if (isDev) console.log('🔔 Configurando listener em tempo real...');

        // Cleanup anterior se existir.
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          if (isDev) console.log('🧹 Cleanup listener anterior');
        }

        // Buscar lojas do usuário.
        const { data: lojasUsuario } = await supabase
          .from('loja_associada')
          .select('id_loja')
          .eq('uid_usuario', user.id)
          .eq('status_vinculacao', 'ativo');

        if (!lojasUsuario || lojasUsuario.length === 0) return;

        const idsLojasUsuario = lojasUsuario.map(loja => loja.id_loja);

        // Novo subscription.
        const channel = supabase
          .channel('pedidos-pendentes-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pedidos',
              filter: `status_transporte=in.(aguardando,revertido)`
            },
            async (payload) => {
              if (!mounted) return; // Evita updates pós-unmount.

              // Filtra por loja do usuário.
              if (idsLojasUsuario.includes(payload.new.id_loja)) {
                if (isDev) console.log('🎉 NOVO PEDIDO EM TEMPO REAL:', payload.new);
                
                // Sistema de notificações removido para performance
                
                // Atualiza lista (imutável).
                setPageData(current => [payload.new, ...current]);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED' && isDev) console.log('✅ Listener subscrito!');
          });

        subscriptionRef.current = channel; // Salva ref.

      } catch (error) {
        console.error('❌ Erro no listener:', error);
      }
    };

    if (userRole !== 'visitante') {
      setupRealtimeListener();
    }

    // Cleanup no unmount.
    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        if (isDev) console.log('🧹 Cleanup listener no unmount');
      }
    };
  }, [userRole]); // Deps: só role (muda uma vez).

  // ============================================================================
  // 5. USECALLBACK: BUSCAR PEDIDOS PENDENTES (MEMOIZADO)
  // ============================================================================
  // Função memoizada para evitar re-calls desnecessários.
  // ✅ NOVO: Cache de lojas para evitar queries repetidas
  const lojasCacheRef = useRef(new Map());

  const getPedidosPendentes = useCallback(async (role, userId, pagina = 0) => {
    try {
      setPageLoading(true);
      
      // ✅ DEBUG: Log para monitorar chamadas
      console.log('🔍 getPedidosPendentes chamado com:', { role, userId, pagina });
      
      // ✅ OTIMIZADO: Cache de lojas por 5 minutos
      const cacheKey = `lojas_${userId}_${role}`; // Cache específico por role
      const cached = lojasCacheRef.current.get(cacheKey);
      
      let lojasUsuario, idsLojasUsuario;
      
      if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 min cache
        console.log('🚀 Cache hit: usando lojas em cache');
        lojasUsuario = cached.data;
        idsLojasUsuario = cached.idsLojas;
      } else {
        // ✅ CORREÇÃO: Admin tem acesso a TODAS as lojas
        if (role === 'admin') {
          // Admin não consulta loja_associada - busca todas as lojas ativas
          const { data: todasLojas, error: errorTodasLojas } = await supabase
            .from('lojas')
            .select('id_loja')
            .eq('ativa', true)
            .order('id_loja');

          if (errorTodasLojas) {
            console.error('Erro ao buscar todas as lojas:', errorTodasLojas);
            return;
          }

          lojasUsuario = todasLojas || [];
          idsLojasUsuario = (todasLojas || []).map(loja => loja.id_loja);
          
          console.log('🎯 Admin: encontradas', todasLojas?.length || 0, 'lojas:', idsLojasUsuario);
          
          // ✅ DEBUG: Log extra para admin
          if (todasLojas?.length === 0) {
            console.warn('⚠️ ADMIN: Nenhuma loja ativa encontrada no banco!');
          }
        } else {
          // Usuários não-admin: buscar apenas suas lojas associadas
          const { data, error: errorLojas } = await supabase
            .from('loja_associada')
            .select('id_loja')
            .eq('uid_usuario', userId)
            .eq('status_vinculacao', 'ativo');

          if (errorLojas) {
            console.error('Erro ao buscar lojas do usuário:', errorLojas);
            return;
          }

          if (!data || data.length === 0) {
            setPageData([]);
            return;
          }

          lojasUsuario = data;
          idsLojasUsuario = data.map(loja => loja.id_loja);
        }
        
        // Salvar no cache
        lojasCacheRef.current.set(cacheKey, {
          data: lojasUsuario,
          idsLojas: idsLojasUsuario,
          timestamp: Date.now()
        });
        console.log('💾 Cache miss: salvando lojas no cache');
      }

      // ✅ OTIMIZADO: Query com paginação para escalabilidade
      const LIMITE_POR_PAGINA = 10; // Pequeno para performance máxima
      const offset = pagina * LIMITE_POR_PAGINA;
      
      const { data, error, count } = await supabase
        .from('pedidos')
        .select(`
          id,
          id_loja_woo,
          data,
          status_transporte,
          id_loja,
          nome_cliente,
          telefone_cliente,
          email_cliente,
          endereco_entrega,
          produto,
          total,
          loja_nome,
          loja_telefone,
          forma_pagamento,
          observacao_pedido
        `, { count: 'exact' })  // COUNT para saber total
        .eq('status_transporte', 'aguardando')
        .in('id_loja', idsLojasUsuario)
        .order('data', { ascending: false })
        .range(offset, offset + LIMITE_POR_PAGINA - 1); // Paginação real

      if (error) throw error;
      
      // ✅ OTIMIZADO: Log de debug para monitoramento
      if (isDev) {
        console.log(`📊 Pedidos carregados: ${data?.length || 0}/${count || 0} para ${idsLojasUsuario.join(',')} (página ${pagina + 1})`);
      }
      
      setPageData(data || []);
      
      // ✅ SCALABILITY: Controlar paginação
      if (pagina === 0) {
        setTotalPedidos(count || 0);
      }
      
      setMaisPedidos(data?.length === LIMITE_POR_PAGINA);
      setLoadingData({ initial: false, lastUpdate: Date.now() });

      // Sistema de notificações removido para performance
      
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      alert('Erro ao carregar pedidos.');
    } finally {
      setPageLoading(false);
    }
  }, [isDev]); // Deps: só dev flag.

  // ============================================================================
  // 6. USECALLBACK: ACEITAR PEDIDO (APENAS ENTREGADORES)
  // ============================================================================
  // Memoizado para estabilidade.
  const handleAceitarPedido = useCallback(async (pedidoId) => {
    if (userRole !== 'entregador') {
      alert('❌ Apenas entregadores podem aceitar pedidos.');
      return;
    }

    try {
      setLoadingAceitar(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('Sessão expirada. Faça login novamente.');
        router.push('/login');
        return;
      }

      // Buscar dados usuário/loja (otimizado: single query se possível).
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('telefone, nome_completo')
        .eq('uid', user.id)
        .single();

      if (usuarioError) console.warn('Erro ao buscar telefone do usuário:', usuarioError);

      const { data: entregadorData, error: entregadorError } = await supabase
        .from('loja_associada')
        .select('nome_completo, loja_telefone, loja_nome')
        .eq('uid_usuario', user.id)
        .limit(1);

      if (entregadorError) console.warn('Erro ao buscar dados da loja:', entregadorError);

      const entregador = entregadorData?.[0];
      const usuario = usuarioData;

      // Update pedido.
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status_transporte: 'aceito',
          aceito_por_uid: user.id,
          aceito_por_nome: entregador?.nome_completo || usuario?.nome_completo || user.email,
          aceito_por_email: user.email,
          aceito_por_telefone: usuario?.telefone || entregador?.loja_telefone || 'Não informado',
          ultimo_status: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .eq('status_transporte', 'aguardando'); // Otim lock: só se ainda pendente.

      if (updateError) throw new Error('Erro ao atualizar pedido: ' + updateError.message);

      // Atualiza local (remove da lista) - ✅ COM VALIDAÇÃO DE SEGURANÇA
      setPageData(current => {
        // ✅ Garantir que current é um array antes do filter
        if (!Array.isArray(current)) {
          console.warn('⚠️ pageData não é array válido:', typeof current, current);
          return []; // Retorna array vazio se dados corrompidos
        }
        return current.filter(p => p.id !== pedidoId);
      });
      alert('✅ Pedido aceito com sucesso!');

    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setLoadingAceitar(false);
    }
  }, [userRole, router]); // Deps: role + router.

  // ============================================================================
  // 7. FUNÇÕES: CONTROLE DO MODAL (SIMPLE)
  // ============================================================================
  const abrirModalDetalhes = useCallback((pedido) => {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setPedidoSelecionado(null);
  }, []);

  // ============================================================================
  // 8. RENDERIZAÇÃO DO COMPONENTE (OTIMIZADA)
  // ============================================================================
  // JSX com indicador dev e role-based UI.
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-purple-800 mb-6">📋 Pedidos Pendentes</h1>
      
      {/* Indicador dev (role + count). */}
      {isDev && (
        <div className="mb-4 p-2 bg-blue-100 text-blue-800 rounded text-sm">
          🔍 Modo: <strong>{userRole}</strong> | Pedidos: {pedidos.length}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-purple-600">Carregando pedidos...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {!Array.isArray(pedidos) || pedidos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!Array.isArray(pedidos) ? 'Carregando pedidos...' : 'Nenhum pedido pendente encontrado.'}
              </p>
            </div>
          ) : (
            pedidos.map(pedido => (
              <div key={pedido.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <button
                      onClick={() => abrirModalDetalhes(pedido)}
                      className="text-blue-600 hover:underline font-bold text-lg mb-1"
                    >
                      Pedido #{pedido.id_loja_woo}
                    </button>
                    <p className="text-sm text-gray-600 font-semibold">{pedido.loja_nome}</p>
                    <p className="text-sm"><span className="font-medium">Cliente:</span> {pedido.nome_cliente}</p>
                    <p className="text-sm"><span className="font-medium">Endereço:</span> {pedido.endereco_entrega}</p>
                    {pedido.frete_oferecido && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        💰 Frete oferecido: R$ {parseFloat(pedido.frete_oferecido).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Botão aceitar só para entregadores; indicador para outros. */}
                  {userRole === 'entregador' ? (
                    <button 
                      onClick={() => handleAceitarPedido(pedido.id)}
                      disabled={loadingAceitar}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 
                               transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed
                               ml-4 min-w-[80px]"
                    >
                      {loadingAceitar ? '⏳' : '✅'} Aceitar
                    </button>
                  ) : (
                    <div className="ml-4 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded border">
                      <span className="font-medium block">
                        {userRole === 'admin' ? '👑 Admin' : '💼 Gerente'}
                      </span>
                      <span className="text-xs block mt-1">Apenas visualização</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* ✅ NOVO: Controles de Paginação */}
          {totalPedidos > 10 && (
            <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg">
              <button
                onClick={() => {
                  const novaPagina = paginaAtual - 1;
                  if (novaPagina >= 0) {
                    setPaginaAtual(novaPagina);
                    // Re-executar com a mesma query mas página diferente
                    checkAuthAndGetPedidos(novaPagina);
                  }
                }}
                disabled={paginaAtual === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ← Página Anterior
              </button>
              
              <span className="text-sm text-gray-600">
                Página {paginaAtual + 1} de {Math.ceil(totalPedidos / 10)}
                <br />
                <span className="text-xs">Mostrando {pedidos.length} de {totalPedidos} pedidos</span>
              </span>
              
              <button
                onClick={() => {
                  const novaPagina = paginaAtual + 1;
                  if (maisPedidos && window.checkAuthAndGetPedidos) {
                    setPaginaAtual(novaPagina);
                    window.checkAuthAndGetPedidos(novaPagina);
                  }
                }}
                disabled={!maisPedidos}
                className="px-4 py-2 bg-purple-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Próxima Página →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes (com WithoutCourier). */}
      <OrderModal 
        pedido={pedidoSelecionado} 
        isOpen={modalAberto} 
        onClose={fecharModal}
      >
        <WithoutCourier 
          pedido={pedidoSelecionado} 
          onClose={fecharModal} 
        />
      </OrderModal>
    </div>
  );
}