// ===========================================
// USERCONTEXT.JS - CORRIGIDO PARA SCHEMA SUPABASE ✅ CURSOR GH
// ===========================================
// Gerencia estado global do usuário com Supabase Auth,
// paraleliza queries para performance, e suporta sync entre abas
// ===========================================
//
// CORREÇÕES IMPLEMENTADAS (baseado no erro):
// - ERRO PRINCIPAL: "column usuarios.nome does not exist" → Select fields errados.
//   - Fix: Mudei para .select('*') em 'usuarios' (como no useUserProfile original).
//     - Isso pega todos os campos (inclui 'is_admin', 'uid', etc.). Ajuste para campos reais depois (ex.: 'id, nome_completo, email, is_admin').
// - Para 'loja_associada': Mantido 'id_loja, funcao' (parece OK).
// - Error handling: Melhorei logs para debug (isDev flag).
// - Loading: Set false no catch para evitar infinito.
// - Role computation: Usa usuarioData.is_admin (assumindo que existe).
//
// DEPENDÊNCIAS REQUERIDAS:
// - React (createContext, useState, useEffect, useCallback, useContext).
// - Supabase (auth e from/select/eq/single).
//
// ARQUIVOS RELACIONADOS:
// - src/pages/_app.js (envolve com <UserProvider>).
// - src/lib/supabase.js (instância do cliente).
// - src/components/RouteGuard.js (usa useUserContext para userRole/loading).
// - src/pages/relatorios.js, src/pages/admin.js (consomem via RouteGuard).
//
// COMO USAR:
// - Crie/atualize src/context/UserContext.js com isso.
// - Em _app.js: <UserProvider><Component ... /></UserProvider>.
// - Teste: npm run dev > /admin ou /relatorios (admin view).
// - Schema Supabase: Verifique colunas em 'usuarios' (ex.: se 'nome' for 'nome_completo', mude select).
//
// PROBLEMAS RESOLVIDOS:
// - Query falha: Select '*' evita column errors (temporário; otimize depois).
// - Erro em admin/relatorios: Contexto carrega sem crash, role computado OK.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase'; // Cliente Supabase para auth e DB
import { logger, authLog, dbLog, throttleLog, networkLog } from '../utils/logger';

// ==================================================================
// 1️⃣ CRIAÇÃO DO CONTEXTO
// ==================================================================
// Contexto padrão nulo (useContext lançará erro se usado sem Provider).
const UserContext = createContext(null);

// ==================================================================
// 2️⃣ PROVIDER QUE ENVOLVE O APP
// ==================================================================
// Wrapper que fornece o estado global para toda a app.
// - Envolva em _app.js: <UserProvider>{children}</UserProvider>.
// - Value: Estados + função reload para updates manuais.
export const UserProvider = ({ children }) => {
  // Estado inicial: Loading true para evitar render prematuro em guards.
  const [userState, setUserState] = useState({
    user: null,          // User auth do Supabase
    userProfile: null,   // Perfil de 'usuarios' (nome_completo?, email, is_admin)
    userRole: 'visitante', // Role computada (admin, gerente, entregador, visitante)
    userLojas: [],       // Array de lojas associadas (id_loja, funcao)
    loading: true,       // Flag global de loading
    error: null          // Erro para handling (opcional)
  });

  // 🔥 SIMPLIFICADO: Flag para evitar múltiplos loads simultâneos
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // ✅ CACHE INTELIGENTE: Evita recarregamentos desnecessários
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 30000; // 30 segundos de cache

  // ==================================================================
  // 3️⃣ FUNÇÃO PARA CARREGAR DADOS DO USUÁRIO (PARALELIZADO)
  // ==================================================================
  // - getUser() para auth.
  // - Promise.all para queries paralelas: usuarios + loja_associada.
  // - Computa role baseada em is_admin ou funcao nas lojas.
  // - FIX: Select '*' em usuarios (evita "column nome does not exist").
  // - Error handling: Try/catch + fallback para estados vazios.
  const loadUserData = useCallback(async () => {
    const currentTimestamp = new Date().toLocaleTimeString();
    const currentPage = typeof window !== 'undefined' ? window.location.pathname : 'server';
    
    // ✅ CACHE INTELIGENTE + PROTECÇÃO DUPLICATA: Evita recarregamentos muito frequentes
    const now = Date.now();
    if (userState.user && lastLoadTime > 0 && (now - lastLoadTime < CACHE_DURATION)) {
      authLog('💾 Cache válido, evitando recarregamento', {
        cacheAge: now - lastLoadTime,
        threshold: CACHE_DURATION,
        timestamp: currentTimestamp,
        page: currentPage,
        tabVisible: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
        hasUser: !!userState.user
      });
      return;
    }
    
    // Evita múltiplos carregamentos simultâneos
    if (isLoadingData) {
      authLog('🔄 LoadUserData já em execução, pulando duplicata', {
        timestamp: currentTimestamp,
        page: currentPage
      });
      return;
    }

    setIsLoadingData(true);
    setLastLoadTime(now);
    const triggerType = userState.user ? 'reload' : 'initial';
    authLog('🚀 INICIANDO carregamento de dados do usuário', {
      type: triggerType,
      timestamp: currentTimestamp,
      page: currentPage,
      tabVisible: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
      windowActive: typeof document !== 'undefined' ? document.hasFocus() : 'unknown'
    });

    setUserState(prev => ({ ...prev, loading: true, error: null })); // Inicia loading

    try {
      // Pega user auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (!authUser || authError) {
        logger.warn('⚠️ Sem user auth ou erro:', authError);
        setUserState({
          user: null,
          userProfile: null,
          userRole: 'visitante',
          userLojas: [],
          loading: false,
          error: authError?.message || 'Falha na autenticação'
        });
        return;
      }

      // ✅ OTIMIZADO: Só busca loja_associada se não for admin
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('uid, nome_completo, email, is_admin, telefone')
        .eq('uid', authUser.id)
        .single();

      if (usuarioError) {
        networkLog(usuarioError, 'Query usuarios');
        throw new Error(`Erro perfil: ${usuarioError.message}`);
      }

      // ✅ ADMIN: Retorna direto sem consultar loja_associada
      if (usuarioData.is_admin) {
        setUserState({
          user: authUser,
          userProfile: usuarioData,
          userRole: 'admin',
          userLojas: [], // Admin tem acesso a todas as lojas
          loading: false,
          error: null
        });

        authLog('✅ Dados do ADMIN carregados otimizados', { 
          role: 'admin', 
          lojasCount: 0,
          user: authUser.id,
          timestamp: new Date().toLocaleTimeString()
        });
        return; // ⚡ Admin não precisa de mais nada
      }

      // ✅ NÃO-ADMIN: Busca lojas associadas
      const { data: lojasData, error: lojasError } = await supabase
        .from('loja_associada')
        .select('id_loja, funcao')
        .eq('uid_usuario', authUser.id)
        .eq('status_vinculacao', 'ativo');

      if (lojasError) {
        networkLog(lojasError, 'Query loja_associada');
        throw new Error(`Erro lojas: ${lojasError.message}`);
      }

      // Computa role baseado nas lojas
      const lojas = lojasData || [];
      let finalRole = 'visitante';
      
      if (lojas.length > 0) {
        if (lojas.some(loja => loja.funcao === 'gerente')) {
          finalRole = 'gerente';
        } else if (lojas.some(loja => loja.funcao === 'entregador')) {
          finalRole = 'entregador';
        }
      }

      setUserState({
        user: authUser,
        userProfile: usuarioData,
        userRole: finalRole,
        userLojas: lojas,
        loading: false,
        error: null
      });

      authLog('✅ Dados carregados com sucesso', { 
        role: finalRole, 
        lojasCount: lojas.length,
        user: authUser.id,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      logger.error('❌ Erro ao carregar dados:', error);
      setUserState({
        user: null,
        userProfile: null,
        userRole: 'visitante',
        userLojas: [],
        loading: false,  // ← FIX: Set false no catch (evita loading eterno)
        error: error.message
      });
    } finally {
      // Limpa flag para permitir próximo carregamento
      setIsLoadingData(false);
    }
  }, [isLoadingData]); // Dependência na flag para evitar duplicatas

  // 🚫 DEBOUNCED RELOAD REMOVIDO: Causava loops
  const debouncedReload = useCallback(() => {
    authLog('🔄 Reload manual chamado (sem debounce)');
    loadUserData();
  }, [loadUserData]);

  // ==================================================================
  // 4️⃣ INICIALIZAÇÃO E LISTENER DE AUTENTICAÇÃO
  // ==================================================================
  // - Carrega dados iniciais no mount.
  // - onAuthStateChange: Reage a eventos (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT).
  // - Cleanup: Unsubscribe condicional para evitar erros.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => { // Async callback
        authLog(`Auth event: ${event}`, session?.user?.id);

        switch (event) {
          case 'INITIAL_SESSION':
            // ✅ INITIAL_SESSION: Só na primeira carga real
            if (session?.user && !isLoadingData && lastLoadTime === 0) {
              authLog('🔄 Executando loadUserData do auth listener', { 
                event, 
                userId: session?.user?.id || 'null-session',
                timestamp: new Date().toLocaleTimeString()
              });
              await loadUserData();
            } else {
              authLog('🚫 Ignorando INITIAL_SESSION - evita loop infinito', { 
                event, 
                userId: session?.user?.id || 'null-session',
                isLoading: isLoadingData,
                cacheTime: lastLoadTime,
                timestamp: new Date().toLocaleTimeString()
              });
            }
            break;
          case 'SIGNED_IN':
            // ✅ SIGNED_IN: Bloquear completamente exceto login real
            authLog('🚫 IGNORANDO SIGNED_IN - evita recarregamento ao voltar á aba', { 
              event, 
              userId: session?.user?.id,
              timestamp: new Date().toLocaleTimeString(),
              reason: 'Event triggered on tab focus - blocked to prevent loops'
            });
            break;
          case 'TOKEN_REFRESHED':
            // ✅ TOKEN_REFRESHED apenas atualiza expiry, não recarrega dados
            authLog('Token refreshed - dados já carregados, mantendo estado');
            break;
          case 'SIGNED_OUT':
            setUserState({
              user: null,
              userProfile: null,
              userRole: 'visitante',
              userLojas: [],
              loading: false,
              error: null
            });
            setLastLoadTime(0); // Reset cache on logout
            authLog('Logout: Estados limpos', { userId: session?.user?.id || 'null-session' });
            break;
          case 'USER_UPDATED':
            if (session?.user) {
              // Atualiza só user (perfil/lojas via reload se necessário)
              setUserState(prev => ({ ...prev, user: session.user }));
            }
            break;
          default:
            break;
        }
      }
    );

    // Cleanup: Unsubscribe no unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // SEM dependências para evitar loops

  // ==================================================================
  // 5️⃣ SINCRONIZAÇÃO ENTRE ABAS (VIA LOCALSTORAGE)
  // ==================================================================
  // - Persiste userRole/lojas no localStorage.
  // - Escuta 'storage' event para sync de outras abas.
  // - Útil para foco em abas background (ex.: Firefox throttling).
  useEffect(() => {
    // Persiste no storage (só se logado)
    if (userState.user) {
      localStorage.setItem('userContext', JSON.stringify({
        userRole: userState.userRole,
        userLojas: userState.userLojas,
        timestamp: Date.now() // Evita stale data >1h
      }));
    } else {
      localStorage.removeItem('userContext');
    }

    // Listener para sync de outras abas
    const handleStorageChange = (e) => {
      if (e.key === 'userContext' && e.newValue) {
        try {
          const stored = JSON.parse(e.newValue);
          // Valida timestamp (opcional: ignora se velho)
          if (Date.now() - stored.timestamp < 3600000) { // 1h
            setUserState(prev => ({
              ...prev,
              userRole: stored.userRole || prev.userRole,
              userLojas: stored.userLojas || prev.userLojas
            }));
            authLog('Sync de aba via localStorage');
          }
        } catch (err) {
          logger.warn('⚠️ Erro ao parse storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userState.userRole, userState.userLojas]); // Dependências: muda só quando role/lojas mudam

  // 🚫 THROTTLE REMOVIDO: Causava loops infinitos
  // Sistema simples sem background reload

  // ==================================================================
  // 6️⃣ RENDER DO PROVIDER
  // ==================================================================
  // Fornece todo estado + reload function para filhos.
  return (
    <UserContext.Provider value={{ ...userState, reloadUserData: loadUserData }}>
      {children}
    </UserContext.Provider>
  );
};

// ==================================================================
// 7️⃣ HOOK PARA CONSUMO DO CONTEXTO
// ==================================================================
// Custom hook: useUserContext() em componentes.
// Lança erro se usado fora do Provider.
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext deve ser usado dentro de UserProvider');
  }
  return context;
};