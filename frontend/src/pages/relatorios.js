// ===========================================
// RELATORIOS.JS - PÁGINA DE RELATÓRIOS (PROTEGIDA) - CORRIGIDA
// ===========================================
// Página para exibir relatórios de pedidos/lojas por role (admin, gerente, entregador).
// Usa useUserProfile para role/lojas/profile (migração para UserContext pendente).
// Protegida por RouteGuard (fix: requiredRole dinâmico).
// Renderiza cards + listas com dados do Supabase (agrupados por loja/entregador).
// ===========================================
//
// CORREÇÕES IMPLEMENTADAS:
// - ERRO PRINCIPAL: RouteGuard undefined → requiredRole dinâmico + fallback.
// - Queries: Added error checks (if error) + throw early para evitar data null.
// - Sync abas: visibilitychange listener para reload no focus (anti-F5).
// - Loading: Unificado userLoading + loading (evita spinner duplo/infinito).
// - Otimização: Mantida lógica original; adicionado console.warn para debug.
// - Migração UserContext: Substitua useUserProfile quando pronto (veja comentário).
//
// DEPENDÊNCIAS:
// - useUserProfile (migre para ../context/UserContext).
// - RouteGuard (export default obrigatório).
// - Supabase (queries em loja_associada).
//
// COMO USAR:
// - Salve isso em src/pages/relatorios.js.
// - Fix RouteGuard.js como acima.
// - Limpe: Remove-Item -Recurse -Force .next (PowerShell).
// - npm run dev > /relatorios (testa roles diferentes).
// - Migração: Troque import/hook por useUserContext (código comentado).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';  // MIGRE PARA: import { useUserContext } from '../context/UserContext';
// Então: const { userRole, userLojas, userProfile, loading: userLoading } = useUserContext();
import RouteGuard from '../components/RouteGuard';  // Default import: Confirme export default no arquivo
import usePageStatePreservation from '../hooks/usePageStatePreservation';

// ============================================================================
// COMPONENTES LOCAIS (RENDERIZADORES POR ROLE - MANTIDOS INTACTOS)
// ============================================================================
function RenderRelatoriosEntregador({ dados, periodo }) {
  if (!dados) return <p className="text-gray-500 text-center py-4">Nenhum dado encontrado</p>;

  return (
    <>
      {/* ESTATÍSTICAS DE HOJE/PERÍODO - CARDS COM SOMA */}
      <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">
          {periodo === 'dia' ? '🕒 Estatísticas de Hoje' : 
           periodo === 'semana' ? '📅 Estatísticas da Semana' :
           periodo === 'mes' ? '📊 Estatísticas do Mês' : '📈 Estatísticas do Ano'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {periodo === 'dia' ? dados.entreguesHoje : dados.totalEntregas}
            </div>
            <div className="text-sm text-gray-600">
              {periodo === 'dia' ? 'Entregas Hoje' : 'Total de Entregas'}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {periodo === 'dia' ? dados.cancelamentosHoje : dados.totalCancelamentos}
            </div>
            <div className="text-sm text-gray-600">Cancelamentos</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              R$ {((periodo === 'dia' ? dados.freteOferecidoHoje : dados.totalFretesPagos) || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {periodo === 'dia' ? 'Frete Oferecido' : 'Frete Pago'}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA INDIVIDUAL POR LOJA */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-medium mb-4">🏪 Desempenho por Loja</h3>
        
        {dados.lojas && dados.lojas.length > 0 ? (
          <div className="space-y-3">
            {dados.lojas.map((loja, index) => (
              <div key={index} className="p-3 border rounded-lg bg-gray-50 grid grid-cols-4 gap-4 text-sm">
                <div className="font-medium">{loja.loja_nome}</div>
                <div>📦 {loja.entregues || 0} entr.</div>
                <div>❌ {loja.cancelamentos || 0} canc.</div>
                <div className="font-semibold text-green-600">R$ {(loja.frete_pago || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum dado encontrado</p>
        )}
      </div>
    </>
  );
}

function RenderRelatoriosGerente({ dados, periodo }) {
  if (!dados) return <p className="text-gray-500 text-center py-4">Nenhum entregador encontrado nesta loja</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {periodo === 'dia' ? '📊 Estatísticas de Hoje' : 
         periodo === 'semana' ? '📅 Estatísticas da Semana' :
         periodo === 'mes' ? '📈 Estatísticas do Mês' : '🎯 Estatísticas do Ano'} - {dados.loja}
      </h2>

      {/* CARDS COM SOMA DE TODOS OS ENTREGADORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{dados.totalEntregas || 0}</div>
          <div className="text-gray-600">
            {periodo === 'dia' ? 'Entregas Hoje' : 'Total de Entregas'}
          </div>
        </div>
        
        <div className="bg-red-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{dados.totalCancelamentos || 0}</div>
          <div className="text-gray-600">Cancelamentos</div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            R$ {(dados.totalFretesPagos || 0).toFixed(2)}
          </div>
          <div className="text-gray-600">
            {periodo === 'dia' ? 'Frete Oferecido' : 'Frete Pago'}
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{dados.totalEntregadores || 0}</div>
          <div className="text-gray-600">Entregadores Ativos</div>
        </div>
      </div>

      {/* DETALHES INDIVIDUAIS POR ENTREGADOR */}
      <h3 className="text-lg font-medium mb-4">👥 Desempenho por Entregador</h3>
      
      {dados.entregadores && dados.entregadores.length > 0 ? (
        <div className="space-y-4">
          {dados.entregadores.map((entregador, index) => {
            // ✅ CORRETO: Usa os campos que já vieram formatados da função
            const entregas = entregador.entregas || 0;
            const cancelamentos = entregador.cancelamentos || 0;
            const fretePago = entregador.frete_pago || 0;
            
            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 grid grid-cols-5 gap-4 text-sm">
                <div className="font-medium col-span-2">
                  {entregador.nome_completo}
                  {entregador.veiculo && (
                    <span className="text-xs text-gray-500 block">🚗 {entregador.veiculo}</span>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-green-600 font-semibold">📦 {entregas}</span>
                  <div className="text-xs text-gray-500">entregas</div>
                </div>
                <div className="text-center">
                  <span className="text-red-600 font-semibold">❌ {cancelamentos}</span>
                  <div className="text-xs text-gray-500">cancel.</div>
                </div>
                <div className="text-center font-semibold text-green-600">
                  R$ {fretePago.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">Nenhum entregador encontrado nesta loja</p>
      )}
    </div>
  );
}

function RenderRelatoriosAdmin({ dados, periodo }) {
  if (!dados) return <p className="text-gray-500 text-center py-4">Nenhuma loja encontrada</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {periodo === 'dia' ? '📊 Estatísticas de Hoje' : 
         periodo === 'semana' ? '📅 Estatísticas da Semana' :
         periodo === 'mes' ? '📈 Estatísticas do Mês' : '🎯 Estatísticas do Ano'} - Sistema Completo
      </h2>

      {/* CARDS COM TOTAIS GERAIS DO SISTEMA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{dados.totalEntregas || 0}</div>
          <div className="text-gray-600">
            {periodo === 'dia' ? 'Entregas Hoje' : 'Total de Entregas'}
          </div>
        </div>
        
        <div className="bg-red-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{dados.totalCancelamentos || 0}</div>
          <div className="text-gray-600">Cancelamentos</div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            R$ {(dados.totalFretesPagos || 0).toFixed(2)}
          </div>
          <div className="text-gray-600">
            {periodo === 'dia' ? 'Frete Oferecido' : 'Frete Pago'}
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg shadow-sm text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{dados.totalEntregadores || 0}</div>
          <div className="text-gray-600">Entregadores Ativos</div>
        </div>
      </div>

      {/* DETALHES POR LOJA */}
      <h3 className="text-lg font-medium mb-4">🏢 Desempenho por Loja</h3>
      
      {dados.lojas && dados.lojas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dados.lojas.map((loja, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3 text-lg">{loja.loja_nome}</h4>
              
              {/* TOTAIS DA LOJA */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div className="text-center">
                  <div className="text-green-600 font-semibold">📦 {loja.total_entregas || 0}</div>
                  <div className="text-xs text-gray-500">entregas</div>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-semibold">❌ {loja.total_cancelamentos || 0}</div>
                  <div className="text-xs text-gray-500">cancel.</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-semibold">R$ {(loja.total_fretes || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">fretes</div>
                </div>
              </div>

              {/* ENTREGADORES DA LOJA (COLLAPSÍVEL) */}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-700">
                  👥 {loja.entregadores.length} Entregador(es)
                </summary>
                <div className="mt-2 space-y-2">
                  {loja.entregadores.map((entregador, idx) => (
                    <div key={idx} className="flex justify-between text-xs border-t pt-2">
                      <span>{entregador.nome_completo}</span>
                      <div className="flex gap-3">
                        <span className="text-green-600">📦 {entregador.entregas}</span>
                        <span className="text-red-600">❌ {entregador.cancelamentos}</span>
                        <span className="text-blue-600">R$ {entregador.frete_pago.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">Nenhuma loja encontrada</p>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL - PÁGINA DE RELATÓRIOS
// ============================================================================
export default function Relatorios() {
  // ==========================================================================
  // 1. HOOK DE PRESERVAÇÃO DE ESTADO (NOVO)
  // ==========================================================================
  const { 
    pageLoading, 
    pageData, 
    setPageLoading, 
    setPageData, 
    hasValidCache 
  } = usePageStatePreservation(true, null);

  // ==========================================================================
  // 2. ESTADOS E HOOKS (ALINHADOS COM PRESERVAÇÃO)
  // ==========================================================================
  const { userRole, userLojas, userProfile, loading: userLoading } = useUserProfile();
  const loading = pageLoading;
  const dadosRelatorios = pageData;
  const [periodo, setPeriodo] = useState('mes'); // dia, semana, mes, ano
  const [error, setError] = useState(null);

  // ==========================================================================
  // 2. SYNC ENTRE ABAS (DESABILITADO POR PERFORMANCE)
  // ==========================================================================
  // ⚡ CORREÇÃO: Removido listener que causa reload desnecessário
  // Dados permanecem em cache enquanto navega

  // ==========================================================================
  // 3. MAPEAMENTO DOS NOMES DAS LOJAS
  // ==========================================================================
  const mapeamentoLojas = {
    'L1': 'Mercearia Luanda',
    'L2': 'Brasil Carne', 
    'L3': 'Mistos Angola',
    'L4': '3G Luanda'
  };

  // ==========================================================================
  // 4. FUNÇÃO PARA CORRIGIR NOME DA LOJA
  // ==========================================================================
  const corrigirNomeLoja = (idLoja, nomeOriginal) => {
    return mapeamentoLojas[idLoja] || nomeOriginal;
  };

  // ==========================================================================
  // 5. EFFECT PRINCIPAL - CARREGAR DADOS
  // ==========================================================================
  useEffect(() => {
    if (!userLoading) {
      carregarRelatorios();
    }
  }, [userLoading, periodo]);

  // ==========================================================================
  // 6. CARREGAR RELATÓRIOS PRINCIPAIS
  // ==========================================================================
  const carregarRelatorios = async () => {
    try {
      setPageLoading(true);
      setError(null);
      
      let dados = null;

      if (userRole === 'admin') {
        dados = await carregarRelatoriosAdmin();
      } else if (userRole === 'gerente') {
        dados = await carregarRelatoriosGerente();
      } else if (userRole === 'entregador') {
        dados = await carregarRelatoriosEntregador();
      }

      setPageData(dados);
      
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      setError('Erro ao carregar relatórios. Tente novamente.');
    } finally {
      setPageLoading(false);
    }
  };

  // ==========================================================================
  // 7. RELATÓRIOS PARA ADMIN - CORRIGIDO (COM ERROR CHECK)
  // ==========================================================================
  const carregarRelatoriosAdmin = async () => {
    // CONSULTA CORRIGIDA - SEM COMENTÁRIOS NA QUERY
    const { data, error } = await supabase
      .from('loja_associada')
      .select(`
        id_loja,
        loja_nome,
        uid_usuario,
        nome_completo,
        email_usuario,
        total_entregue_hoje,
        total_cancelado_hoje,
        total_frete_pago_hoje,
        semana_entregue,
        semana_cancelado,
        mes_entregue,
        mes_cancelado,
        ano_entregue,
        ano_cancelado,
        frete_pago_semana,
        frete_pago_mes,
        frete_pago_ano
      `)
      .eq('status_vinculacao', 'ativo')
      .eq('funcao', 'entregador');

    if (error) throw new Error(`Query admin falhou: ${error.message}`);  // Fix: Throw early
    if (!data) throw new Error('Dados admin vazios');

    // Log removido por performance

    // FUNÇÕES AUXILIARES PARA OBTER DADOS CORRETOS POR PERÍODO
    const getEntregas = (item) => {
      switch (periodo) {
        case 'dia': return item.total_entregue_hoje || 0;
        case 'semana': return item.semana_entregue || 0;
        case 'mes': return item.mes_entregue || 0;
        case 'ano': return item.ano_entregue || 0;
        default: return 0;
      }
    };

    const getCancelamentos = (item) => {
      switch (periodo) {
        case 'dia': return item.total_cancelado_hoje || 0;
        case 'semana': return item.semana_cancelado || 0;
        case 'mes': return item.mes_cancelado || 0;
        case 'ano': return item.ano_cancelado || 0;
        default: return 0;
      }
    };

    const getFretes = (item) => {
      switch (periodo) {
        case 'dia': return parseFloat(item.total_frete_pago_hoje || 0);
        case 'semana': return parseFloat(item.frete_pago_semana || 0);
        case 'mes': return parseFloat(item.frete_pago_mes || 0);
        case 'ano': return parseFloat(item.frete_pago_ano || 0);
        default: return 0;
      }
    };

    // ==================================================
    // 1. AGRUPAR DADOS POR LOJA
    // ==================================================
    const lojasAgrupadas = data.reduce((acc, item) => {
      if (!acc[item.id_loja]) {
        acc[item.id_loja] = {
          id_loja: item.id_loja,
          loja_nome: corrigirNomeLoja(item.id_loja, item.loja_nome),
          entregadores: [],
          // Inicializar totais da loja
          total_entregas: 0,
          total_cancelamentos: 0,
          total_fretes: 0
        };
      }
      
      // Somar totais da loja
      acc[item.id_loja].total_entregas += getEntregas(item);
      acc[item.id_loja].total_cancelamentos += getCancelamentos(item);
      acc[item.id_loja].total_fretes += getFretes(item);
      
      // Adicionar entregador
      acc[item.id_loja].entregadores.push({
        uid_usuario: item.uid_usuario,
        nome_completo: item.nome_completo,
        email_usuario: item.email_usuario,
        // Dados específicos do entregador
        entregas: getEntregas(item),
        cancelamentos: getCancelamentos(item),
        frete_pago: getFretes(item)
      });

      return acc;
    }, {});

    const lojasCorrigidas = Object.values(lojasAgrupadas);
    
    // ==================================================
    // 2. CALCULAR TOTAIS GERAIS (SISTEMA COMPLETO)
    // ==================================================
    const totalEntregas = lojasCorrigidas.reduce((sum, loja) => sum + loja.total_entregas, 0);
    const totalCancelamentos = lojasCorrigidas.reduce((sum, loja) => sum + loja.total_cancelamentos, 0);
    const totalFretesPagos = lojasCorrigidas.reduce((sum, loja) => sum + loja.total_fretes, 0);
    const totalEntregadores = new Set(data.map(item => item.uid_usuario)).size;

    // Log removido por performance

    return {
      tipo: 'admin',
      
      // ================= TOTAIS GERAIS =================
      totalEntregas,           // SOMA de todo o sistema
      totalCancelamentos,      // SOMA de todo o sistema  
      totalFretesPagos,        // SOMA de todo o sistema
      totalEntregadores,       // Total de entregadores únicos
      
      // ================= DADOS POR LOJA =================
      lojas: lojasCorrigidas,  // Dados agrupados por loja
      
      periodo
    };
  };

  // ==========================================================================
  // 8. RELATÓRIOS PARA GERENTE - CORRIGIDO (COM ERROR CHECK)
  // ==========================================================================
  const carregarRelatoriosGerente = async () => {
    if (!userLojas || userLojas.length === 0) {
      throw new Error('Sem lojas para gerente');  // Fix: Early throw
    }

    const idLoja = userLojas[0].id_loja;
    const nomeLojaCorrigido = corrigirNomeLoja(idLoja, userLojas[0].loja_nome);

    // CONSULTA CORRIGIDA - SEM COMENTÁRIOS NA QUERY
    const { data, error } = await supabase
      .from('loja_associada')
      .select(`
        uid_usuario,
        nome_completo,
        email_usuario,
        veiculo,
        total_entregue_hoje,
        total_cancelado_hoje,
        total_frete_pago_hoje,
        semana_entregue,
        semana_cancelado,
        mes_entregue,
        mes_cancelado,
        ano_entregue,
        ano_cancelado,
        frete_pago_semana,
        frete_pago_mes,
        frete_pago_ano
      `)
      .eq('id_loja', idLoja)
      .eq('status_vinculacao', 'ativo')
      .eq('funcao', 'entregador')
      .order('mes_entregue', { ascending: false });

    if (error) throw new Error(`Query gerente falhou: ${error.message}`);
    if (!data) throw new Error('Dados gerente vazios');

    console.log('DEBUG - Dados do gerente:', data);

    // FUNÇÕES AUXILIARES PARA OBTER DADOS CORRETOS POR PERÍODO
    const getEntregas = (item) => {
      switch (periodo) {
        case 'dia': return item.total_entregue_hoje || 0;
        case 'semana': return item.semana_entregue || 0;
        case 'mes': return item.mes_entregue || 0;
        case 'ano': return item.ano_entregue || 0;
        default: return 0;
      }
    };

    const getCancelamentos = (item) => {
      switch (periodo) {
        case 'dia': return item.total_cancelado_hoje || 0;
        case 'semana': return item.semana_cancelado || 0;
        case 'mes': return item.mes_cancelado || 0;
        case 'ano': return item.ano_cancelado || 0;
        default: return 0;
      }
    };

    const getFretes = (item) => {
      switch (periodo) {
        case 'dia': return parseFloat(item.total_frete_pago_hoje || 0);
        case 'semana': return parseFloat(item.frete_pago_semana || 0);
        case 'mes': return parseFloat(item.frete_pago_mes || 0);
        case 'ano': return parseFloat(item.frete_pago_ano || 0);
        default: return 0;
      }
    };

    // ==================================================
    // 1. DADOS PARA OS CARDS (SOMA DE TODOS OS ENTREGADORES)
    // ==================================================
    
    // SOMA de todos os entregadores para o PERÍODO SELECIONADO
    const totalEntregas = data.reduce((sum, item) => sum + getEntregas(item), 0);
    const totalCancelamentos = data.reduce((sum, item) => sum + getCancelamentos(item), 0);
    const totalFretesPagos = data.reduce((sum, item) => sum + getFretes(item), 0);

    // ==================================================
    // 2. DADOS PARA A LISTA (DETALHES POR ENTREGADOR)
    // ==================================================
    
    // Preparar dados INDIVIDUAIS por entregador
    const entregadores = data.map(item => ({
      uid_usuario: item.uid_usuario,
      nome_completo: item.nome_completo,
      email_usuario: item.email_usuario,
      veiculo: item.veiculo,
      // Dados específicos do período para ESTE entregador
      entregas: getEntregas(item),
      cancelamentos: getCancelamentos(item),
      frete_pago: getFretes(item)
    }));

    console.log('DEBUG - Gerente - Soma dos cards:', { 
      totalEntregas, 
      totalCancelamentos, 
      totalFretesPagos 
    });
    
    console.log('DEBUG - Gerente - Dados por entregador:', entregadores);

    return {
      tipo: 'gerente',
      
      // ================= CARDS DE CIMA =================
      // SOMA de todos os entregadores para os cards principais
      totalEntregas,           // SOMA para o período selecionado
      totalCancelamentos,      // SOMA para o período selecionado  
      totalFretesPagos,        // SOMA para o período selecionado
      totalEntregadores: data.length, // Quantidade de entregadores
      
      // ================= LISTA DE BAIXO =================
      // Dados INDIVIDUAIS por entregador para a lista
      entregadores,
      
      loja: nomeLojaCorrigido,
      periodo
    };
  };

  // ==========================================================================
  // 9. RELATÓRIOS PARA ENTREGADOR - CORRIGIDO (COM ERROR CHECK)
  // ==========================================================================
  const carregarRelatoriosEntregador = async () => {
    if (!userProfile?.uid) throw new Error('Sem UID para entregador');

    // CONSULTA ÚNICA - tudo da loja_associada
    const { data, error } = await supabase
      .from('loja_associada')
      .select(`
        id_loja,
        loja_nome,
        total_entregue_hoje,
        total_cancelado_hoje,
        total_frete_pago_hoje,
        semana_entregue,
        semana_cancelado,
        mes_entregue,
        mes_cancelado,
        ano_entregue,
        ano_cancelado,
        frete_pago_semana,
        frete_pago_mes,
        frete_pago_ano
      `)
      .eq('uid_usuario', userProfile.uid)
      .eq('status_vinculacao', 'ativo');

    if (error) throw new Error(`Query entregador falhou: ${error.message}`);
    if (!data) throw new Error('Dados entregador vazios');

    console.log('DEBUG - Dados brutos por loja:', data);

    // FUNÇÕES AUXILIARES PARA OBTER DADOS CORRETOS POR PERÍODO
    const getEntregas = (item) => {
      switch (periodo) {
        case 'dia': return item.total_entregue_hoje || 0;
        case 'semana': return item.semana_entregue || 0;
        case 'mes': return item.mes_entregue || 0;
        case 'ano': return item.ano_entregue || 0;
        default: return 0;
      }
    };

    const getCancelamentos = (item) => {
      switch (periodo) {
        case 'dia': return item.total_cancelado_hoje || 0;
        case 'semana': return item.semana_cancelado || 0;
        case 'mes': return item.mes_cancelado || 0;
        case 'ano': return item.ano_cancelado || 0;
        default: return 0;
      }
    };

    const getFretes = (item) => {
      switch (periodo) {
        case 'dia': return parseFloat(item.total_frete_pago_hoje || 0);
        case 'semana': return parseFloat(item.frete_pago_semana || 0);
        case 'mes': return parseFloat(item.frete_pago_mes || 0);
        case 'ano': return parseFloat(item.frete_pago_ano || 0);
        default: return 0;
      }
    };

    // ==================================================
    // 1. DADOS PARA OS CARDS (SOMA DE TODAS AS LOJAS)
    // ==================================================
    
    // SOMA de todas as lojas para o PERÍODO SELECIONADO
    const totalEntregas = data.reduce((sum, item) => sum + getEntregas(item), 0);
    const totalCancelamentos = data.reduce((sum, item) => sum + getCancelamentos(item), 0);
    const totalFretesPagos = data.reduce((sum, item) => sum + getFretes(item), 0);

    // SOMA de todas as lojas para HOJE (específico)
    const entreguesHoje = data.reduce((sum, item) => sum + (item.total_entregue_hoje || 0), 0);
    const cancelamentosHoje = data.reduce((sum, item) => sum + (item.total_cancelado_hoje || 0), 0);
    const freteOferecidoHoje = data.reduce((sum, item) => sum + parseFloat(item.total_frete_pago_hoje || 0), 0);

    // ==================================================
    // 2. DADOS PARA A LISTA (DETALHES POR LOJA)
    // ==================================================
    
    // Preparar dados INDIVIDUAIS por loja para o período selecionado
    const dadosPorLojaPeriodo = data.map(item => ({
      id_loja: item.id_loja,
      loja_nome: corrigirNomeLoja(item.id_loja, item.loja_nome),
      entregues: getEntregas(item),      // Dados desta loja específica
      cancelamentos: getCancelamentos(item), // Dados desta loja específica
      frete_pago: getFretes(item)        // Dados desta loja específica
    }));

    // Preparar dados INDIVIDUAIS por loja para HOJE
    const dadosHojePorLoja = data.map(item => ({
      id_loja: item.id_loja,
      loja_nome: corrigirNomeLoja(item.id_loja, item.loja_nome),
      entregues: item.total_entregue_hoje || 0,        // Dados HOJE desta loja
      cancelamentos: item.total_cancelado_hoje || 0,   // Dados HOJE desta loja
      total_frete: parseFloat(item.total_frete_pago_hoje || 0) // Dados HOJE desta loja
    }));

    console.log('DEBUG - Soma dos cards:', { 
      totalEntregas, 
      totalCancelamentos, 
      totalFretesPagos,
      entreguesHoje,
      cancelamentosHoje,
      freteOferecidoHoje
    });
    
    console.log('DEBUG - Dados por loja:', dadosPorLojaPeriodo);

    return {
      tipo: 'entregador',
      
      // ================= CARDS DE CIMA =================
      // SOMA de todas as lojas para os cards principais
      totalEntregas,           // SOMA para o período selecionado
      totalCancelamentos,      // SOMA para o período selecionado  
      totalFretesPagos,        // SOMA para o período selecionado
      
      // Dados específicos de HOJE (sempre mostra soma de hoje)
      entreguesHoje,           // SOMA de HOJE de todas as lojas
      cancelamentosHoje,       // SOMA de HOJE de todas as lojas
      freteOferecidoHoje,      // SOMA de HOJE de todas as lojas
      
      // ================= LISTA DE BAIXO =================
      // Dados INDIVIDUAIS por loja para a lista
      dadosHojePorLoja,        // Dados individuais por loja (HOJE)
      lojas: dadosPorLojaPeriodo, // Dados individuais por loja (período selecionado)
      
      periodo
    };
  };

  // ==========================================================================
  // 10. COMPONENTE DE CARREGAMENTO (UNIFICADO)
  // ==========================================================================
  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3">Carregando relatórios...</span>
      </div>
    );
  }

  // ==========================================================================
  // 11. RENDERIZAÇÃO PRINCIPAL (COM ROUTEGUARD DINÂMICO)
  // ==========================================================================
  // Fix: requiredRole dinâmico baseado em userRole (não fixo em 'entregador')
  const requiredRole = userRole === 'admin' ? 'admin' : userRole === 'gerente' ? 'gerente' : 'entregador';

  // Fallback se RouteGuard undefined (debug temporário)
  if (typeof RouteGuard === 'undefined') {
    console.warn('⚠️ RouteGuard undefined — cheque export em components/RouteGuard.js');
    return <div className="p-4 text-red-600">Erro: RouteGuard não encontrado. Verifique exports.</div>;
  }

  return (
    <RouteGuard requiredRole={requiredRole}>
      <div className="container mx-auto px-4 py-8">
        {/* CABEÇALHO E FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-purple-800 mb-4 md:mb-0">
            📊 Relatórios - {userRole?.toUpperCase()}
          </h1>
          
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="dia">Hoje</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
            <option value="ano">Este Ano</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* RENDERIZAÇÃO ESPECÍFICA POR TIPO DE USUÁRIO */}
        {userRole === 'entregador' && (
          <RenderRelatoriosEntregador dados={dadosRelatorios} periodo={periodo} />
        )}

        {userRole === 'gerente' && (
          <RenderRelatoriosGerente dados={dadosRelatorios} periodo={periodo} />
        )}

        {userRole === 'admin' && (
          <RenderRelatoriosAdmin dados={dadosRelatorios} periodo={periodo} />
        )}
      </div>
    </RouteGuard>
  );
}