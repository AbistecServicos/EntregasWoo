// ===========================================
// _APP.JS - COMPLETO E OTIMIZADO COM USERCONTEXT CORRIGIDO ✅ CURSOR TRANSFORMOU
// ===========================================
// ✅ CORREÇÕES CURSOR: UserContext integrado, loops infinitos corrigidos, performance máxima
// ✅ CONTEXT: UserProvider agora gerencia estado global de forma otimizada
// Mantém estado de usuário, sincroniza entre abas,
// registra Service Worker, e carrega lojas associadas
// + Envolve com UserProvider para contexto global (fix erro useUserContext)
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import '../styles/globals.css';
import Layout from '../components/Layout';
import { supabase } from '../../lib/supabase';
import { UserProvider } from '../context/UserContext';  // ← NOVO: Import do Provider (fix erro)
import ErrorBoundary from '../components/ErrorBoundary';

const isDev = process.env.NODE_ENV === 'development';

function MyApp({ Component, pageProps }) {
  // ==================================================================
  // 1️⃣ ESTADOS GLOBAIS SIMPLIFICADOS (mantidos)
  // ==================================================================
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLojas, setUserLojas] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Sincroniza abas

  // ==================================================================
  // 2️⃣ SINCRONIZAÇÃO ENTRE ABAS (OTIMIZADO)
  // ==================================================================
  useEffect(() => {
    let syncTimeout;
    
    const syncBetweenTabs = () => {
      // ⚡ Debounce para evitar sync excessivo
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        setLastUpdate(Date.now());
      }, 500); // Só sync após 500ms de inatividade
    };

    document.addEventListener('visibilitychange', syncBetweenTabs);
    window.addEventListener('focus', syncBetweenTabs);

    return () => {
      clearTimeout(syncTimeout);
      document.removeEventListener('visibilitychange', syncBetweenTabs);
      window.removeEventListener('focus', syncBetweenTabs);
    };
  }, []);

  // ==================================================================
  // 3️⃣ SERVICE WORKER (DESABILITADO POR PERFORMANCE)
  // ==================================================================
  const registerServiceWorker = useCallback(async () => {
    // 🔥 CORREÇÃO CRÍTICA: Service Worker totalmente desabilitado
    // Causa problemas de performance e cache conflicts
    if (isDev && !registerServiceWorker.logged) {
      console.log('🚫 Service Worker desabilitado para performance');
      registerServiceWorker.logged = true; // Evitar spam no console
    }
    return null;
  }, []);

  // ==================================================================
  // 4️⃣ CARREGAR LOJAS ASSOCIADAS DO USUÁRIO (mantido)
  // ==================================================================
  const loadUserLojas = useCallback(async (userId) => {
    try {
      const { data: lojas, error } = await supabase
        .from('loja_associada')
        .select('id_loja, funcao')
        .eq('uid_usuario', userId)
        .eq('status_vinculacao', 'ativo');

      if (error) throw error;
      setUserLojas(lojas || []);
    } catch (error) {
      console.error('❌ Erro lojas:', error);
      setUserLojas([]);
    }
  }, []);

  // ==================================================================
  // 5️⃣ INITIALIZAÇÃO DO APP (mantido)
  // ==================================================================
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkInitialSession();
        await registerServiceWorker();
      } catch (error) {
        console.error('💥 Erro init:', error);
      }
    };

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadUserLojas(session.user.id);
        } else {
          setUser(null);
          setUserLojas([]);
        }
      } catch (error) {
        console.error('❌ Erro sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadUserLojas, registerServiceWorker]);

  // ==================================================================
  // 6️⃣ OUVIR AUTENTICAÇÃO (mantido)
  // ==================================================================
  // ✅ LISTENER REMOVIDO: UserContext.js já gerencia autenticação
  // ✅ Elimina duplicação de carregamento quando usuário troca de aba
  // ✅ Problema resolvido: TOKEN_REFRESHED não dispara recarregamento
  // useEffect(() => {
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(
  //     async (event, session) => {
  //       console.log(`🔄 Auth State: ${event}`, session?.user?.id);
  //       
  //       switch (event} {
  //         case 'SIGNED_IN':
  //           if (session?.user) {
  //             setUser(session.user);
  //             await loadUserLojas(session.user.id);
  //           }
  //           break;
  //         case 'SIGNED_OUT':
  //           setUser(null);
  //           setUserLojas([]);
  //           break;
  //         case 'USER_UPDATED':
  //           if (session?.user) setUser(session.user);
  //           break;
  //         default:
  //           break;
  //       }
  //       
  //       setIsLoading(false);
  //       setLastUpdate(Date.now());
  //     }
  //   );
  //   
  //   return () => subscription?.unsubscribe();
  // }, [loadUserLojas]);

  // ==================================================================
  // 7️⃣ SINCRONIZAR VIA SERVICE WORKER (mantido)
  // ==================================================================
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

    const handleSWMessage = (event) => {
      if (event.data?.type === 'TAB_SYNC_UPDATE') {
        console.log('🔄 Sincronizando via Service Worker');
        setLastUpdate(Date.now());
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, []);

  // ==================================================================
  // 8️⃣ RENDER FINAL (NOVO: Envolve com UserProvider + ErrorBoundary)
  // ==================================================================
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* ← NOVO: ErrorBoundary envolve tudo para capturar erros globais */}
      <ErrorBoundary>
        {/* ← NOVO: UserProvider envolve tudo (ativa contexto para RouteGuard/relatorios) */}
        <UserProvider>
          <Layout
            user={user}
            isLoading={isLoading}
            userLojas={userLojas}
            lastUpdate={lastUpdate}
          >
            <Component {...pageProps} user={user} userLojas={userLojas} />
          </Layout>
        </UserProvider>
        {/* Fim UserProvider */}
      </ErrorBoundary>
      {/* Fim ErrorBoundary */}
    </>
  );
}

export default MyApp;