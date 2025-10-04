// src/hooks/useUserProfile.js ✅ CURSOR OTIMIZOU
// ============================================
// ✅ CORREÇÕES CURSOR: Hook otimizado para performance e integração com UserContext
// HOOK useUserProfile COM PERSISTÊNCIA E SINCRONIZAÇÃO ENTRE ABAS
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ============================================================================
// 1. CHAVE DO LOCALSTORAGE
// ============================================================================
const STORAGE_KEY = 'userProfileState';

// ============================================================================
// 2. HOOK PRINCIPAL
// ============================================================================
export const useUserProfile = () => {
  // --------------------------------------------------------------------------
  // 2.1 ESTADOS PRINCIPAIS
  // --------------------------------------------------------------------------
  const [state, setState] = useState({
    user: null,
    userProfile: null,
    userRole: 'visitante',
    userLojas: [],
    loading: true,
    error: null,
    updating: false
  });

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // ========================================================================
  // 3. FUNÇÃO PARA CARREGAR DADOS DO SUPABASE
  // ========================================================================
  const loadUserData = useCallback(async () => {
    if (isLoadingRef.current) return; // evita chamadas duplicadas
    try {
      isLoadingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (!isMountedRef.current) return;

      if (authError || !authUser) {
        setState({
          user: null,
          userProfile: null,
          userRole: 'visitante',
          userLojas: [],
          loading: false,
          error: null,
          updating: false
        });
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // --------------------------------------------------------------------
      // 3.1 Buscar perfil do usuário
      // --------------------------------------------------------------------
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('uid, nome_completo, email, is_admin, telefone')
        .eq('uid', authUser.id)
        .single();

      if (usuarioError || !usuarioData) {
        setState({
          user: authUser,
          userProfile: null,
          userRole: 'visitante',
          userLojas: [],
          loading: false,
          error: 'Perfil não encontrado',
          updating: false
        });
        return;
      }

      // --------------------------------------------------------------------
      // 3.2 Verificar função do usuário
      // --------------------------------------------------------------------
      let finalUserRole = 'visitante';
      const lojasQuery = await supabase
        .from('loja_associada')
        .select('*')
        .eq('uid_usuario', authUser.id)
        .eq('status_vinculacao', 'ativo');

      const lojasData = lojasQuery.data || [];

      if (usuarioData.is_admin) {
        finalUserRole = 'admin';
      } else if (lojasData.length > 0) {
        const funcoes = lojasData.map(loja => loja.funcao);
        if (funcoes.includes('gerente')) finalUserRole = 'gerente';
        else if (funcoes.includes('entregador')) finalUserRole = 'entregador';
      }

      // --------------------------------------------------------------------
      // 3.3 Atualizar estado e localStorage
      // --------------------------------------------------------------------
      const newState = {
        user: authUser,
        userProfile: usuarioData,
        userRole: finalUserRole,
        userLojas: lojasData,
        loading: false,
        error: null,
        updating: false
      };

      setState(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    } catch (error) {
      if (isMountedRef.current) {
        setState({
          user: null,
          userProfile: null,
          userRole: 'visitante',
          userLojas: [],
          loading: false,
          error: 'Erro ao carregar perfil',
          updating: false
        });
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // ========================================================================
  // 4. INICIALIZAÇÃO DO HOOK
  // ========================================================================
  useEffect(() => {
    isMountedRef.current = true;

    // --------------------------------------------------------------------
    // 4.1 Primeiro tenta carregar do localStorage
    // --------------------------------------------------------------------
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      setState(prev => ({ ...prev, ...JSON.parse(savedState), loading: false }));
    }

    // --------------------------------------------------------------------
    // 4.2 Depois garante que está sincronizado com Supabase
    // --------------------------------------------------------------------
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        loadUserData();
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    };
    initializeAuth();

    return () => { isMountedRef.current = false; };
  }, [loadUserData]);

  // ========================================================================
  // 5. LISTENER DE AUTENTICAÇÃO
  // ========================================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMountedRef.current) return;

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setTimeout(() => loadUserData(), 100);
            }
            break;
          case 'SIGNED_OUT':
            const resetState = {
              user: null,
              userProfile: null,
              userRole: 'visitante',
              userLojas: [],
              loading: false,
              error: null,
              updating: false
            };
            setState(resetState);
            localStorage.removeItem(STORAGE_KEY);
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  // ========================================================================
  // 6. SINCRONIZAÇÃO ENTRE ABAS
  // ========================================================================
  useEffect(() => {
    const syncAcrossTabs = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setState(JSON.parse(event.newValue));
      }
    };
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  // ========================================================================
  // 7. FUNÇÕES AUXILIARES
  // ========================================================================
  const updateUserProfile = async (formData) => {
    // implementar atualização de perfil
  };

  const reloadUserData = async () => { await loadUserData(); };

  // ========================================================================
  // 8. RETORNO DO HOOK
  // ========================================================================
  return {
    user: state.user,
    userProfile: state.userProfile,
    userRole: state.userRole,
    userLojas: state.userLojas,
    loading: state.loading,
    error: state.error,
    updating: state.updating,
    updateUserProfile,
    reloadUserData
  };
};
