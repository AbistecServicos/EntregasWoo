// components/PedidosEntreguesGerente.js
// ============================================================================
// IMPORTAÇÕES
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { OrderModal, WithCourier } from './OrderModal';
import { gerarRecibosPDF } from '../utils/pdfUtils';

// ============================================================================
// COMPONENTE MODAL DE CONFIRMAÇÃO (INTERNO)
// ============================================================================
const ModalConfirmacaoPagamento = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  pedidosResumo, 
  dataPagamento,
  totalGeral 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-purple-600 text-white p-4">
          <h2 className="text-lg font-bold">Confirmar Pagamento</h2>
          <p className="text-sm opacity-90">Confira os valores antes de processar</p>
        </div>
        
        {/* Corpo */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Data de pagamento:</strong> {new Date(dataPagamento).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Total de pedidos:</strong> {pedidosResumo.length}
            </p>
          </div>

          <h3 className="font-semibold text-gray-700 mb-2">Resumo dos Pagamentos:</h3>
          
          {pedidosResumo.map((pedido, index) => (
            <div key={pedido.id} className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  Pedido #{pedido.id_loja_woo}
                </p>
                <p className="text-xs text-gray-600">
                  {pedido.aceito_por_nome}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600">
                  R$ {parseFloat(pedido.frete_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}

          {/* Total Geral */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">TOTAL GERAL:</span>
              <span className="text-lg font-bold text-green-600">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com botões */}
        <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
          >
            ✅ Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: PEDIDOS ENTREGUES - GERENTE (VERSÃO ATUALIZADA)
// ============================================================================
export default function PedidosEntreguesGerente({ userProfile }) {
  // ==========================================================================
  // 1. ESTADOS DO COMPONENTE (ATUALIZADO)
  // ==========================================================================
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataPagamento, setDataPagamento] = useState('');
  const [pedidosSelecionados, setPedidosSelecionados] = useState(new Set());
  const [totalSelecionados, setTotalSelecionados] = useState(0.0);
  const [filtroEntregador, setFiltroEntregador] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [entregadores, setEntregadores] = useState([]);
  const [lojaInfo, setLojaInfo] = useState({ id_loja: null, loja_nome: null });
  const [error, setError] = useState(null);
  const [valoresEditando, setValoresEditando] = useState({});
  
  // ✅ NOVOS ESTADOS PARA O MODAL DE CONFIRMAÇÃO
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [pedidosParaProcessar, setPedidosParaProcessar] = useState([]);

  // ==========================================================================
  // 2. FUNÇÕES DE VALIDAÇÃO (NOVAS)
  // ==========================================================================

  // Validar se pode processar pagamento
  const validarProcessamentoPagamento = () => {
    // 1. Verificar se há pedidos selecionados
    if (pedidosSelecionados.size === 0) {
      alert('❌ Selecione pelo menos um pedido para processar o pagamento.');
      return false;
    }

    // 2. Verificar se a data foi preenchida
    if (!dataPagamento) {
      alert('❌ Selecione uma data de pagamento antes de processar.');
      return false;
    }

    // 3. Verificar se todos os pedidos selecionados têm valor preenchido
    const pedidosComProblemas = [];
    
    Array.from(pedidosSelecionados).forEach(pedidoId => {
      const pedido = pedidos.find(p => p.id === pedidoId);
      const fretePago = parseFloat(pedido?.frete_pago);
      
      if (!fretePago || fretePago <= 0) {
        pedidosComProblemas.push(`Pedido #${pedido?.id_loja_woo || pedidoId}`);
      }
    });

    if (pedidosComProblemas.length > 0) {
      alert(`❌ Os seguintes pedidos não têm valor de frete preenchido:\n\n${pedidosComProblemas.join('\n')}\n\nPreencha o campo "Frete Pago" em todos os pedidos selecionados.`);
      return false;
    }

    return true;
  };

  // Preparar dados para o modal de confirmação
  const prepararResumoPagamento = () => {
    const pedidosResumo = Array.from(pedidosSelecionados).map(pedidoId => {
      return pedidos.find(p => p.id === pedidoId);
    }).filter(Boolean);

    const totalGeral = pedidosResumo.reduce((sum, pedido) => {
      return sum + (parseFloat(pedido.frete_pago) || 0);
    }, 0);

    return { pedidosResumo, totalGeral };
  };

  // ==========================================================================
  // 3. FUNÇÃO ATUALIZADA: PROCESSAR PAGAMENTO (COM MODAL)
  // ==========================================================================
  const iniciarProcessamentoPagamento = () => {
    // ✅ VALIDAÇÃO COMPLETA ANTES DE ABRIR MODAL
    if (!validarProcessamentoPagamento()) {
      return;
    }

    // ✅ PREPARAR DADOS PARA O MODAL
    const { pedidosResumo, totalGeral } = prepararResumoPagamento();
    setPedidosParaProcessar({ pedidosResumo, totalGeral });
    
    // ✅ ABRIR MODAL DE CONFIRMAÇÃO
    setModalConfirmacaoAberto(true);
  };

  // ✅ FUNÇÃO QUE REALMENTE PROCESSA O PAGAMENTO (CHAMADA PELO MODAL)
  const executarProcessamentoPagamento = async () => {
    setIsLoading(true);
    
    try {
      const updates = Array.from(pedidosSelecionados).map(async (id) => {
        const pedido = pedidos.find(p => p.id === id);
        const fretePago = parseFloat(pedido?.frete_pago) || 0.0;

        const dataPagamentoISO = new Date(dataPagamento).toISOString().split('T')[0];

        const { error } = await supabase
          .from('pedidos')
          .update({
            status_pagamento: fretePago > 0,
            data_pagamento: dataPagamentoISO,
            frete_pago: fretePago,
            frete_ja_processado: true
          })
          .eq('id', id);

        if (error) throw error;
      });

      await Promise.all(updates);
      
      // ✅ FEEDBACK DE SUCESSO
      alert(`✅ Pagamentos processados com sucesso!\n\n${pedidosSelecionados.size} pedido(s) processado(s)\nTotal: R$ ${pedidosParaProcessar.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      
      // ✅ LIMPAR ESTADOS E RECARREGAR
      carregarPedidos();
      setDataPagamento('');
      setPedidosSelecionados(new Set());
      setModalConfirmacaoAberto(false);
      
    } catch (err) {
      console.error('Erro ao atualizar pedidos:', err.message);
      alert('❌ Erro ao processar pagamentos. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 4. FUNÇÕES DE FORMATAÇÃO MONETÁRIA (MANTIDAS)
  // ==========================================================================
  const formatarParaMoeda = (valor) => {
    if (valor === null || valor === undefined || valor === '' || valor === 0) return '';
    const numero = parseFloat(valor);
    if (isNaN(numero)) return '';
    return numero.toFixed(2).replace('.', ',');
  };

  const converterDeMoeda = (valorString) => {
    if (!valorString || valorString === '') return null;
    const valorLimpo = valorString.replace(/[^\d,]/g, '').replace(',', '.');
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? null : numero;
  };

  const aplicarMascaraMonetaria = (valor) => {
    let apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros === '') return '';
    const numero = parseInt(apenasNumeros, 10) / 100;
    return numero.toFixed(2).replace('.', ',');
  };

// ==========================================================================
// 5. CARREGAR LOJA DO GERENTE (FUNÇÃO FALTANTE - MOVIDA PARA CÁ)
// ==========================================================================
useEffect(() => {
  const carregarLojaGerente = async () => {
    console.log('🔄 Iniciando carregamento da loja do gerente...');
    
    if (!userProfile?.uid) {
      console.log('❌ UserProfile vazio - uid:', userProfile);
      setError('Usuário não autenticado.');
      return;
    }

    console.log('🔍 Buscando loja para gerente UID:', userProfile.uid);

    try {
      // ✅ BUSCAR TODAS AS LOJAS DO USUÁRIO (não usar .single())
      const { data, error } = await supabase
        .from('loja_associada')
        .select('id_loja, loja_nome, funcao, status_vinculacao')
        .eq('uid_usuario', userProfile.uid)
        .eq('funcao', 'gerente')
        .eq('status_vinculacao', 'ativo');

      if (error) {
        console.error('❌ Erro na query da loja:', error);
        throw error;
      }

      console.log('📊 Resultado da busca de lojas:', data);

      if (!data || data.length === 0) {
        console.log('⚠️ Nenhuma loja encontrada para o gerente');
        setError('Usuário não é gerente de nenhuma loja ativa.');
        return;
      }

      // ✅ PEGAR A PRIMEIRA LOJA 
      const loja = data[0];
      console.log('✅ Loja encontrada:', loja);

      setLojaInfo({ 
        id_loja: loja.id_loja, 
        loja_nome: loja.loja_nome 
      });
      setError(null);

    } catch (err) {
      console.error('❌ Erro ao carregar loja do gerente:', err.message);
      setError('Falha ao carregar loja associada. Verifique o console.');
    }
  };

  carregarLojaGerente();
}, [userProfile]);
// ==========================================================================
// 6. CARREGAR ENTREGADORES DA LOJA DO GERENTE
// ==========================================================================
useEffect(() => {
  const carregarEntregadores = async () => {
    if (!lojaInfo.id_loja) return;

    try {
      const { data, error } = await supabase
        .from('loja_associada')
        .select('nome_completo, uid_usuario')
        .eq('funcao', 'entregador')
        .eq('id_loja', lojaInfo.id_loja)
        .order('nome_completo');

      if (error) throw error;
      setEntregadores(data.map(u => u.nome_completo).filter(Boolean) || []);
    } catch (error) {
      console.error('Erro ao carregar entregadores:', error.message);
      setError('Falha ao carregar entregadores.');
    }
  };

  carregarEntregadores();
}, [lojaInfo]);

// ==========================================================================
// 7. CARREGAR PEDIDOS DA LOJA DO GERENTE
// ==========================================================================
const carregarPedidos = useCallback(async () => {
  setIsLoading(true);
  try {
    if (!lojaInfo.id_loja) {
      console.log('❌ carregarPedidos: Sem lojaInfo.id_loja:', lojaInfo);
      setError('Usuário sem loja associada.');
      return;
    }

    console.log('🔍 carregarPedidos: Buscando pedidos para loja:', lojaInfo.id_loja);

    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('status_transporte', 'entregue')
      .eq('id_loja', lojaInfo.id_loja);

    if (filtroEntregador) {
      query = query.ilike('aceito_por_nome', `%${filtroEntregador}%`);
    }
    if (filtroStatus) {
      if (filtroStatus === 'processado') {
        query = query.eq('frete_ja_processado', true);
      } else {
        query = query.eq('status_pagamento', filtroStatus === 'true');
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log('📊 carregarPedidos: Query executada com sucesso:', {
      loja: lojaInfo.id_loja,
      filtros: { entregador: filtroEntregador, status: filtroStatus },
      quantidadePedidos: data?.length || 0,
      primeirosPedidos: data?.slice(0, 2).map(p => ({ id: p.id, id_woo: p.id_woo, status: p.status_transporte }))
    });

    setPedidos(data || []);
    setError(null);
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err.message);
    setError('Falha ao carregar pedidos.');
  } finally {
    setIsLoading(false);
  }
}, [lojaInfo, filtroEntregador, filtroStatus]);

// ==========================================================================
// 8. CALCULAR TOTAIS DOS PEDIDOS SELECIONADOS
// ==========================================================================
const calcularTotais = useCallback(() => {
  const total = Array.from(pedidosSelecionados).reduce((sum, id) => {
    const pedido = pedidos.find(p => p.id === id);
    return sum + (parseFloat(pedido?.frete_pago) || 0.0);
  }, 0.0);
  setTotalSelecionados(total);
}, [pedidosSelecionados, pedidos]);

// ==========================================================================
// 9. MANIPULAR SELEÇÃO DE PEDIDOS
// ==========================================================================
const handleSelecionarPedido = (pedidoId, isChecked) => {
  const newSet = new Set(pedidosSelecionados);
  if (isChecked) newSet.add(pedidoId);
  else newSet.delete(pedidoId);
  setPedidosSelecionados(newSet);
};

// ==========================================================================
// 10. ATUALIZAR VALOR DO FRETE
// ==========================================================================
const handleAtualizarFrete = async (pedidoId, novoValorString) => {
  const pedido = pedidos.find(p => p.id === pedidoId);
  
  // BLOQUEAR SE: Já processado OU já tem data de pagamento
  const pedidoBloqueado = pedido?.frete_ja_processado || pedido?.data_pagamento;
  
  if (pedidoBloqueado) {
    alert('⚠️ Este pedido já foi processado. O frete não pode ser alterado.');
    return;
  }

  // Converter string monetária para número
  const valorNumerico = converterDeMoeda(novoValorString);

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ frete_pago: valorNumerico })
      .eq('id', pedidoId);

    if (error) throw error;

    setPedidos(prevPedidos =>
      prevPedidos.map(p => p.id === pedidoId ? { ...p, frete_pago: valorNumerico } : p)
    );
  } catch (err) {
    console.error('Erro ao atualizar frete:', err.message);
    setError('Falha ao atualizar frete.');
  }
};

// ==========================================================================
// 11. MANIPULAR DIGITAÇÃO DO FRETE EM TEMPO REAL
// ==========================================================================
const handleFreteChange = (pedidoId, valorDigitado) => {
  const valorFormatado = aplicarMascaraMonetaria(valorDigitado);
  
  setValoresEditando(prev => ({
    ...prev,
    [pedidoId]: valorFormatado
  }));
};

const handleFreteBlur = (pedidoId) => {
  const valorTemp = valoresEditando[pedidoId];
  
  if (valorTemp !== undefined) {
    handleAtualizarFrete(pedidoId, valorTemp);
    
    setValoresEditando(prev => {
      const newState = { ...prev };
      delete newState[pedidoId];
      return newState;
    });
  }
};

const handleFreteKeyPress = (e, pedidoId) => {
  if (e.key === 'Enter') {
    handleFreteBlur(pedidoId);
    e.target.blur();
  }
};

// ==========================================================================
// 12. ABRIR MODAL DE DETALHES
// ==========================================================================
const abrirModalDetalhes = (pedido) => {
  if (pedido) {
    setPedidoSelecionado(pedido);
    setModalAberto(true);
  }
};

// ==========================================================================
// 13. FORMATAR DATA PARA EXIBIÇÃO
// ==========================================================================
const formatarDataParaExibicao = (dataString) => {
  if (!dataString) return '-';
  try {
    return new Date(dataString).toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

// ==========================================================================
// 14. USEEFFECTS PARA CARREGAMENTO
// ==========================================================================
useEffect(() => {
  if (lojaInfo.id_loja) carregarPedidos();
}, [lojaInfo, filtroEntregador, filtroStatus]); // ✅ CORRIGIDO: Removido carregarPedidos que causava loop infinito

useEffect(() => {
  calcularTotais();
}, [pedidosSelecionados, pedidos]); // ✅ CORRIGIDO: Removido calcularTotais que causava loop infinito

// ==========================================================================
// 15. RENDERIZAÇÃO ATUALIZADA
// ==========================================================================

return (
  <div className="bg-gray-50 min-h-screen p-4">
    {/* Modal de Detalhes do Pedido */}
    <OrderModal
      pedido={pedidoSelecionado}
      isOpen={modalAberto}
      onClose={() => setModalAberto(false)}
    >
      <WithCourier
        pedido={pedidoSelecionado}
        onClose={() => setModalAberto(false)}
      />
    </OrderModal>

    {/* ✅ MODAL DE CONFIRMAÇÃO DE PAGAMENTO */}
    <ModalConfirmacaoPagamento
      isOpen={modalConfirmacaoAberto}
      onClose={() => setModalConfirmacaoAberto(false)}
      onConfirm={executarProcessamentoPagamento}
      pedidosResumo={pedidosParaProcessar.pedidosResumo || []}
      dataPagamento={dataPagamento}
      totalGeral={pedidosParaProcessar.totalGeral || 0}
    />

    {/* Cabeçalho com nome da loja */}
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 sticky top-0 z-10">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-purple-800">Pedidos Entregues</h1>
          <p className="text-xs md:text-sm text-gray-600">
            Loja: {lojaInfo.loja_nome || lojaInfo.id_loja || 'Não definida'}
          </p>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2 hidden md:inline">
            {pedidosSelecionados.size} selecionados
          </span>
          <span className="text-sm md:text-lg font-semibold text-green-600">
            R$ {totalSelecionados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filtros: entregador e status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <select
          value={filtroEntregador}
          onChange={(e) => setFiltroEntregador(e.target.value)}
          className="w-full p-1 md:p-2 border border-gray-300 rounded text-sm md:text-base"
        >
          <option value="">Todos Entregadores</option>
          {entregadores.map((nome, index) => (
            <option key={index} value={nome}>{nome}</option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="w-full p-1 md:p-2 border border-gray-300 rounded text-sm md:text-base"
        >
          <option value="">Todos Status</option>
          <option value="true">Pago</option>
          <option value="false">Pendente</option>
          <option value="processado">Processado</option>
        </select>
      </div>

      {/* Data + botões de ação */}
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          className="flex-grow p-1 md:p-2 border border-gray-300 rounded text-sm md:text-base"
        />
        <button
          onClick={iniciarProcessamentoPagamento}
          className="bg-purple-600 text-white px-3 md:px-4 py-1 md:py-2 rounded hover:bg-purple-700 text-sm md:text-base disabled:bg-purple-400 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <span className="md:hidden">Pagar</span>
          <span className="hidden md:inline">Processar Pagamento</span>
        </button>
        <button
          onClick={() => gerarRecibosPDF(pedidosSelecionados, pedidos)}
          className="bg-green-600 text-white px-3 md:px-4 py-1 md:py-2 rounded hover:bg-green-700 text-sm md:text-base disabled:bg-green-400 disabled:cursor-not-allowed"
          disabled={isLoading || pedidosSelecionados.size === 0}
        >
          Recibo
        </button>
      </div>
      
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      
{/* Mensagem de validação - OCULTA NO MOBILE */}
    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded hidden md:block">
      <p className="text-sm text-blue-800">
        🎯 Para processar pagamento: 
        <span className="font-semibold"> Selecione pedidos</span> + 
        <span className="font-semibold"> Preencha data</span> + 
        <span className="font-semibold"> Defina valores</span>
      </p>
      <p className="text-xs text-blue-600 mt-1">
        ✅ <span className="font-semibold">Pedidos liberados:</span> Sem data, sem valor, ou <span className="font-semibold">zerados pelo admin</span>
        <br/>
        🔒 <span className="font-semibold">Pedidos bloqueados:</span> Com data válida ou marcados como <span className="font-semibold">🔒 Processado</span>
      </p>
    </div>
    </div>

    {/* Lista de Pedidos */}
    <div className="container mx-auto px-2">
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-purple-600">Carregando pedidos...</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-purple-600">Nenhum pedido encontrado para esta loja.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pedidos.map(pedido => (
            <div key={pedido.id} className={`bg-white rounded-lg shadow p-3 ${
              pedido.frete_ja_processado ? 'border-l-4 border-green-500' : ''
            }`}>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={pedidosSelecionados.has(pedido.id)}
                  onChange={(e) => handleSelecionarPedido(pedido.id, e.target.checked)}
                  className="h-5 w-5 md:h-4 md:w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  title={
                    (pedido.frete_ja_processado || pedido.data_pagamento) 
                      ? 'Pedido processado - pode selecionar para recibo' 
                      : 'Selecionar pedido'
                  }
                />
                <div className="flex-1 ml-2">
                  <button
                    onClick={() => abrirModalDetalhes(pedido)}
                    className="text-base font-bold text-purple-800 hover:underline text-left"
                  >
                    Pedido #{pedido.id_loja_woo}
                    {pedido.frete_ja_processado && (
                      <span className="ml-2 text-green-600 text-sm">🔒 Processado</span>
                    )}
                  </button>
                  <p className="text-sm font-semibold text-blue-800">{pedido.loja_nome}</p>
                </div>
              </div>
              <div className="ml-6 space-y-1 text-sm">
                <p><strong>Entregador:</strong> {pedido.aceito_por_nome || 'Não informado'}</p>
                <p><strong>Pago em:</strong> {formatarDataParaExibicao(pedido.data_pagamento)}</p>
                <p>
                  <strong>Pagamento:</strong>{' '}
                  {pedido.status_pagamento ? '✅ Pago' : '❌ Pendente'}
                </p>
                
                {pedido.frete_oferecido && (
                  <p>
                    <strong>Frete Oferecido:</strong> R${' '}
                    {parseFloat(pedido.frete_oferecido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
                
                <p className="flex items-center">
                  <strong>Frete Pago: R$</strong>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valoresEditando[pedido.id] !== undefined 
                      ? valoresEditando[pedido.id] 
                      : formatarParaMoeda(pedido.frete_pago)
                    }
                    onChange={(e) => handleFreteChange(pedido.id, e.target.value)}
                    onBlur={() => handleFreteBlur(pedido.id)}
                    onKeyPress={(e) => handleFreteKeyPress(e, pedido.id)}
                    onFocus={(e) => {
                      e.target.select();
                      if (valoresEditando[pedido.id] === undefined) {
                        setValoresEditando(prev => ({
                          ...prev,
                          [pedido.id]: formatarParaMoeda(pedido.frete_pago)
                        }));
                      }
                    }}
                    className={`w-24 p-1 border rounded ml-1 focus:ring-2 ${
                      (pedido.frete_ja_processado || pedido.data_pagamento) 
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-purple-500'
                    }`}
                    disabled={pedido.frete_ja_processado || pedido.data_pagamento || isLoading}
                    title={
                      (pedido.frete_ja_processado || pedido.data_pagamento) 
                        ? 'Frete já processado - não pode ser alterado' 
                        : 'Digite o valor (ex: 25,50)'
                    }
                    placeholder="0,00"
                  />
                  {pedido.frete_ja_processado && (
                    <span className="ml-2 text-xs text-gray-500">(bloqueado)</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
}