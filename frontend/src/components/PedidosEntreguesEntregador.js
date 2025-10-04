// components/PedidosEntreguesEntregador.js
// ✅ CURSOR CORRIGIU: Loops infinitos - dependências otimizadas e memoização implementada
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { OrderModal, WithCourier } from './OrderModal';

// ============================================================================
// COMPONENTE OTIMIZADO: PEDIDOS ENTREGUES - ENTREGADOR
// ============================================================================
export default function PedidosEntreguesEntregador({ userProfile }) {
  // ==========================================================================
  // 1. ESTADOS DO COMPONENTE (MANTIDOS)
  // ==========================================================================
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [lojas, setLojas] = useState([]);
  const [error, setError] = useState(null);

  // ==========================================================================
  // 2. REFS PARA CONTROLE DE PERFORMANCE (NOVO)
  // ==========================================================================
  const isMountedRef = useRef(true);
  const lastUserUidRef = useRef(null);
  const lastFiltrosRef = useRef({ loja: '', status: '' });

  // ==========================================================================
  // 3. CARREGAR LOJAS ASSOCIADAS (OTIMIZADO)
  // ==========================================================================
  const carregarLojas = useCallback(async (uidDoUsuario) => {
    if (!uidDoUsuario) {
      setError('Usuário não autenticado.');
      return;
    }

    // ✅ OTIMIZAÇÃO: Evitar carregar lojas se usuário não mudou
    if (uidDoUsuario === lastUserUidRef.current && lojas.length > 0) {
      return;
    }

    try {
      console.log('🔍 Carregando lojas para UID:', uidDoUsuario);
      
      const { data, error } = await supabase
        .from('loja_associada')
        .select('id_loja, loja_nome')
        .eq('uid_usuario', uidDoUsuario);

      if (error) throw error;
      
      // ✅ OTIMIZAÇÃO: Processar uniquess mais eficientemente
      const uniqueLojas = data ? [...new Map(data.map(item => [item.id_loja, item])).values()] : [];
      
      if (isMountedRef.current) {
        setLojas(uniqueLojas);
        lastUserUidRef.current = uidDoUsuario; // ✅ Guardar referência
      }
      
      console.log('✅ Lojas carregadas:', uniqueLojas.length);
    } catch (err) {
      console.error('Erro ao carregar lojas do entregador:', err.message);
      if (isMountedRef.current) {
        setError('Falha ao carregar lojas associadas.');
      }
    }
  }, []); // ✅ CORRIGIDO: Sem dependências para evitar loop infinito

  // ==========================================================================
  // 4. CARREGAR PEDIDOS (OTIMIZADO COM useCallback)
  // ==========================================================================
  const carregarPedidos = useCallback(async () => {
    // ✅ OTIMIZAÇÃO: Prevenir chamadas desnecessárias
    if (!userProfile?.uid) {
      setError('Usuário não autenticado.');
      return;
    }

    // ✅ OTIMIZAÇÃO: Verificar se filtros realmente mudaram
    const filtrosAtuais = { loja: filtroLoja, status: filtroStatus };
    const filtrosMudaram = JSON.stringify(filtrosAtuais) !== JSON.stringify(lastFiltrosRef.current);
    
    if (!filtrosMudaram && pedidos.length > 0 && !isLoading) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔍 Carregando pedidos para UID:', userProfile.uid);
      
      let query = supabase
        .from('pedidos')
        .select('*')
        .eq('status_transporte', 'entregue')
        .eq('aceito_por_uid', userProfile.uid);

      if (filtroLoja) {
        query = query.eq('id_loja', filtroLoja);
      }
      if (filtroStatus) {
        query = query.eq('status_pagamento', filtroStatus === 'true');
      }

      const { data, error } = await query;
      if (error) throw error;

      if (isMountedRef.current) {
        setPedidos(data || []);
        setError(null);
        lastFiltrosRef.current = filtrosAtuais; // ✅ Guardar estado dos filtros
      }
      
      console.log('✅ Pedidos carregados:', data?.length || 0);
    } catch (err) {
      console.error('Erro ao carregar pedidos do entregador:', err.message);
      if (isMountedRef.current) {
        setError('Falha ao carregar pedidos.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filtroLoja, filtroStatus]); // ✅ CORRIGIDO: Removido userProfile que causava loop infinito

  // ==========================================================================
  // 5. ABRIR MODAL (OTIMIZADO COM useCallback)
  // ==========================================================================
  const abrirModalDetalhes = useCallback((pedido) => {
    if (pedido && isMountedRef.current) {
      setPedidoSelecionado(pedido);
      setModalAberto(true);
    }
  }, []);

  // ==========================================================================
  // 6. FECHAR MODAL (OTIMIZADO)
  // ==========================================================================
  const fecharModal = useCallback(() => {
    if (isMountedRef.current) {
      setModalAberto(false);
      setPedidoSelecionado(null);
    }
  }, []);

  // ==========================================================================
  // 6. MEMOIZAÇÃO PARA PERFORMANCE
  // ==========================================================================
  // Lista de pedidos memoizada para evitar re-renderizações desnecessárias
  const pedidosMemo = useMemo(() => {
    return pedidos.map(pedido => ({
      ...pedido,
      // Campos computados podem ser memoizados aqui
      dataFormatada: new Date(pedido.data_pedido).toLocaleDateString('pt-BR')
    }));
  }, [pedidos]);

  // Lojas filtradas memoizadas
  const lojasMemo = useMemo(() => {
    return lojas.map(loja => ({
      ...loja,
      nomeFormatado: loja.loja_nome || `Loja ${loja.id_loja}`
    }));
  }, [lojas]);

  // ==========================================================================
  // 7. EFFECTS OTIMIZADOS
  // ==========================================================================
  useEffect(() => {
    isMountedRef.current = true;
    
    // ✅ CARREGAR LOJAS APENAS UMA VEZ
    if (userProfile?.uid) {
      carregarLojas(userProfile.uid);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []); // ✅ CORRIGIDO: Removido userProfile que causava loop infinito

  useEffect(() => {
    // ✅ CARREGAR PEDIDOS QUANDO FILTROS MUDAREM
    if (userProfile?.uid && isMountedRef.current) {
      carregarPedidos();
    }
  }, [filtroLoja, filtroStatus]); // ✅ CORRIGIDO: Removido userProfile que causava loop infinito

  // ==========================================================================
  // 8. HANDLERS DE FILTRO (OTIMIZADOS)
  // ==========================================================================
  const handleFiltroLoja = useCallback((e) => {
    if (isMountedRef.current) {
      setFiltroLoja(e.target.value);
    }
  }, []);

  const handleFiltroStatus = useCallback((e) => {
    if (isMountedRef.current) {
      setFiltroStatus(e.target.value);
    }
  }, []);

  // ==========================================================================
  // 9. RENDERIZAÇÃO OTIMIZADA
  // ==========================================================================
  return (
    <div className="bg-gray-50 min-h-screen p-4">
      {/* Cabeçalho do entregador */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 sticky top-4 z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-purple-800">Meus Pedidos Entregues</h1>
            <p className="text-sm text-gray-600">
              Entregador: {userProfile?.nome_completo || 'Não informado'}
            </p>
          </div>
        </div>

        {/* Filtros → Loja + Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <select
            value={filtroLoja}
            onChange={handleFiltroLoja}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Todas Lojas</option>
            {lojasMemo.map((loja) => (
              <option key={loja.id_loja} value={loja.id_loja}>
                {loja.nomeFormatado}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={handleFiltroStatus}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Todos Status</option>
            <option value="true">Pago</option>
            <option value="false">Pendente</option>
          </select>
        </div>
        
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
        
        {/* ✅ FEEDBACK DE CARREGAMENTO OTIMIZADO */}
        {isLoading && (
          <p className="text-purple-600 text-sm mt-2">Carregando pedidos...</p>
        )}
      </div>

      {/* Lista de pedidos (apenas visualização) */}
      <div className="container mx-auto px-2">
        {isLoading && pedidosMemo.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-purple-600">Carregando seus pedidos...</p>
          </div>
        ) : pedidosMemo.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-purple-600">Nenhum pedido entregue encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pedidosMemo.map((pedido) => (
              <PedidoCard 
                key={pedido.id} 
                pedido={pedido} 
                onAbrirDetalhes={abrirModalDetalhes} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      <OrderModal
        pedido={pedidoSelecionado}
        isOpen={modalAberto}
        onClose={fecharModal}
      >
        <WithCourier
          pedido={pedidoSelecionado}
          onClose={fecharModal}
        />
      </OrderModal>
    </div>
  );
}

// ============================================================================
// 10. COMPONENTE SEPARADO PARA PEDIDO CARD (OTIMIZAÇÃO EXTRA)
// ============================================================================
const PedidoCard = React.memo(({ pedido, onAbrirDetalhes }) => {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <button
        onClick={() => onAbrirDetalhes(pedido)}
        className="text-base font-bold text-purple-800 hover:text-purple-600 hover:underline w-full text-left"
      >
        Pedido #{pedido.id_loja_woo}
      </button>
      <p className="text-sm font-semibold text-blue-800">{pedido.loja_nome}</p>
      <div className="mt-2 text-sm">
        <p>
          <strong>Data Entrega:</strong>{' '}
          {pedido.ultimo_status ? new Date(pedido.ultimo_status).toLocaleDateString('pt-BR') : '-'}
        </p>
        <p>
          <strong>Status Pagamento:</strong>{' '}
          {pedido.status_pagamento ? '✅ Pago' : '❌ Pendente'}
        </p>
        
        {pedido.frete_oferecido && (
          <p>
            <strong>Frete Oferecido:</strong> R${' '}
            {parseFloat(pedido.frete_oferecido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
        
        <p>
          <strong>Frete Pago:</strong> R${' '}
          {parseFloat(pedido.frete_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
});

PedidoCard.displayName = 'PedidoCard';