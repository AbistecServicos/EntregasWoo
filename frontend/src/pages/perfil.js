// pages/perfil.js
// ✅ CURSOR TRANSFORMOU: Loops infinitos corrigidos - useEffect com execução única
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useUserContext } from '../context/UserContext'; // ✅ OTIMIZADO: Direct context access
import EditUsuarioModal from '../components/EditUsuarioModal';
import EditLojaModal from '../components/EditLojaModal';

// ==============================================================================
// PÁGINA: PERFIL DO USUÁRIO (CORRIGIDA PARA LOGIN GOOGLE)
// ==============================================================================
export default function Perfil() {
  const router = useRouter();
  // ✅ CORREÇÃO: Usar UserContext otimizado em vez de duplicar
  // const { userProfile, userRole, userLojas, loading, error } = useUserProfile(); // REMOVIDO
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [modalLojaOpen, setModalLojaOpen] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState(null);
  const [lojasAtualizadas, setLojasAtualizadas] = useState([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // ============================================================================
  // 1. MAPEAMENTO DOS NOMES CORRETOS DAS LOJAS
  // ============================================================================
  const mapeamentoLojas = {
    'L1': 'Mercearia Luanda',
    'L2': 'Brasil Carne', 
    'L3': 'Mistos Angola',
    'L4': '3G Luanda'
  };

  // ✅ CORREÇÃO: Usar UserContext direto para melhor performance e debugging
  const { userProfile, userRole, userLojas, loading: userLoading } = useUserContext();

  // ============================================================================
  // 2. EFFECT SIMPLIFICADO: Redirecionamento quando necessário
  // ============================================================================
  useEffect(() => {
    const currentTimestamp = new Date().toLocaleTimeString();
    console.log('🔄 PERFIL EFFECT - Executando:', {
      timestamp: currentTimestamp,
      userLoading,
      hasUser: !!userProfile,
      hasUserRole: userRole,
      lojasCount: userLojas?.length || 0,
      page: 'perfil',
      redirecting: isRedirecting,
      tabVisible: document.visibilityState,
      urlHasCode: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('code') : false
    });

    // Se veio do login Google, redirecionar após brief delay
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has('code');
      
      if (hasCode && !isRedirecting) {
        console.log('🔗 PERFIL: Google OAuth detectado, iniciando redirecionamento');
        setIsRedirecting(true);
        
        // Limpar URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        setTimeout(() => router.push('/'), 1000);
      }
    }
    
    // ✅ CORREÇÃO: Redirecionamento mais robusto - aguardar carregamento completo
    if (!userLoading && !userProfile && !isRedirecting) {
      console.log('🚪 PERFIL: Nenhum usuário encontrado após carregamento, redirecionando para login');
      setIsRedirecting(true);
      // Usar setTimeout para evitar problemas de estado
      setTimeout(() => {
        router.push('/login');
      }, 100);
    } else if (userProfile && userRole) {
      console.log('✅ PERFIL: Usuário identificado', { 
        role: userRole, 
        uid: userProfile.uid,
        timestamp: currentTimestamp 
      });
    }
  }, [userLoading, userProfile, userRole]); // ✅ CORREÇÃO: Remover isRedirecting das dependências para evitar loops
  
  // ============================================================================
  // 3. EFFECT: ATUALIZAR OS NOMES DAS LOJAS
  // ============================================================================
  useEffect(() => {
    if (userLojas && userLojas.length > 0) {
      const lojasCorrigidas = userLojas.map(loja => ({
        ...loja,
        loja_nome: mapeamentoLojas[loja.id_loja] || loja.loja_nome
      }));
      setLojasAtualizadas(lojasCorrigidas);
    }
  }, [userLojas]);

  // ============================================================================
  // 4. ABRIR MODAL DE EDIÇÃO DA LOJA
  // ============================================================================
  const abrirModalLoja = (loja) => {
    setLojaSelecionada(loja);
    setModalLojaOpen(true);
  };

  // ============================================================================
  // 5. SE ESTÁ REDIRECIONANDO, MOSTRAR LOADING
  // ============================================================================
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Login realizado com sucesso!</h2>
          <p className="text-gray-600 mt-2">Redirecionando para o sistema...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. SE AINDA ESTÁ CARREGANDO, MOSTRAR LOADING
  // ============================================================================
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 7. SE HOUVER ERRO, MOSTRAR MENSAGEM
  // ============================================================================
  // Não há verificação de erro neste componente - UserProfile gerencia internamente
  // O tratamento de erro é feito no próprio hook useUserProfile

  // ============================================================================
  // 8. SE NÃO TEM PERFIL, REDIRECIONAR
  // ============================================================================
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 9. RENDERIZAÇÃO DA PÁGINA (APENAS SE TUDO ESTIVER CERTO)
  // ============================================================================
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      
      {/* CABEÇALHO */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-purple-800 mb-2">👤 Meu Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e de entrega</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* CARD: DADOS DO USUÁRIO */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">📋 Dados Pessoais</h2>
          
          <div className="space-y-3 mb-4">
            {userProfile.foto && (
              <div className="text-center">
                <img
                  src={userProfile.foto}
                  alt="Foto do perfil"
                  className="w-20 h-20 rounded-full mx-auto border-2 border-purple-600"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-600">Nome Completo</label>
              <p className="text-gray-800 font-medium">{userProfile.nome_completo || 'Não informado'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600">Nome de Usuário</label>
              <p className="text-gray-800">{userProfile.nome_usuario || 'Não informado'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-800">{userProfile.email}</p>
            </div>
            
            {userProfile.telefone && (
              <div>
                <label className="block text-sm font-medium text-gray-600">Telefone</label>
                <p className="text-gray-800">{userProfile.telefone}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setModalUsuarioOpen(true)}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
          >
            ✏️ Editar Dados Pessoais
          </button>
        </div>

        {/* CARD: LOJAS ASSOCIADAS */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">
            {userRole === 'entregador' ? '🏪 Lojas Associadas' : '👑 Sua Gerência'}
          </h2>
          
          {lojasAtualizadas.length === 0 ? (
            <p className="text-gray-600 text-center py-4">Nenhuma loja associada</p>
          ) : (
            <div className="space-y-3">
              {lojasAtualizadas.map((loja) => (
                <div key={loja.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <h3 className="font-semibold text-gray-800">{loja.loja_nome}</h3>
                  <p className="text-sm text-gray-600">ID: {loja.id_loja}</p>
                  <p className="text-sm text-purple-600">Função: {loja.funcao}</p>
                  
                  {loja.funcao === 'entregador' && (
                    <div className="mt-2 text-sm text-gray-700">
                      <p>🚗 Veículo: {loja.veiculo || 'Não informado'}</p>
                      <p>📦 Carga máxima: {loja.carga_maxima || '0'} kg</p>
                      <p>📍 Perímetro: {loja.perimetro_entrega || 'Não definido'}</p>
                    </div>
                  )}

                  {loja.funcao === 'gerente' && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600 font-medium">👑 Você é o gerente desta loja.</p>
                      <p className="text-xs text-gray-500">Para editar dados da loja, contate um administrador.</p>
                    </div>
                  )}

                  {loja.funcao === 'entregador' && (
                    <button
                      onClick={() => abrirModalLoja(loja)}
                      className="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      ✏️ Editar Dados de Entrega
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAIS */}
      <EditUsuarioModal
        isOpen={modalUsuarioOpen}
        onClose={() => setModalUsuarioOpen(false)}
        userProfile={userProfile}
      />
      
      {lojaSelecionada && (
        <EditLojaModal
          isOpen={modalLojaOpen}
          onClose={() => setModalLojaOpen(false)}
          loja={lojaSelecionada}
        />
      )}
    </div>
  );
}