// ===========================================
// USE-PAGE-STATE-PRESERVATION.JS - HOOK OTIMIZADO
// ===========================================
// Hook para preservar estado de páginas quando usuário volta da aba
// Evita perder dados/comportamento quando minimize/mude de aba
// ===========================================

import { useState, useEffect, useRef } from 'react';

export const usePageStatePreservation = (initialLoading = false, initialData = null) => {
  const [pageState, setPageState] = useState({
    loading: initialLoading,
    data: initialData,
    lastUpdated: Date.now()
  });
  
  const isBackgroundRef = useRef(false);
  const lastVisibleRef = useRef(Date.now());

  // ============================================================================
  // MONITORAR VISIBILITY CHANGE (SEM RELOAD AGRESSIVO)
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Só vai para esse código quando volta do background
        const backgroundTime = Date.now() - lastVisibleRef.current;
        
        if (backgroundTime > 5000) { // Se passou mais de 5s em background
          console.log(`📱 Voltou após ${backgroundTime}ms em background`);
          
          // NÃO recarrega dados se já tem dados válidos
          if (pageState.data && pageState.lastUpdated > Date.now() - 30000) { // Cache válido por 30s
            console.log('✅ Cache ainda válido, mantendo dados');
            setPageState(prev => ({
              ...prev,
              loading: false, // Força parar loading se está ativo
              lastUpdated: Date.now()
            }));
          } else {
            console.log('🔄 Cache expirado, marcando para reload');
            setPageState(prev => ({
              ...prev,
              loading: true // Marca para reload apenas se necessário
            }));
          }
        }
        
        lastVisibleRef.current = Date.now();
        isBackgroundRef.current = false;
      } else {
        lastVisibleRef.current = Date.now();
        isBackgroundRef.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pageState.data, pageState.lastUpdated]);

  // ============================================================================
  // FUNÇÕES PARA ATUALIZAR O ESTADO DA PÁGINA
  // ============================================================================
  const setPageLoading = (loading) => {
    setPageState(prev => ({
      ...prev,
      loading,
      lastUpdated: loading ? prev.lastUpdated : Date.now()
    }));
  };

  const setPageData = (data) => {
    setPageState(prev => ({
      ...prev,
      data,
      loading: false,
      lastUpdated: Date.now()
    }));
  };

  const refreshPageData = () => {
    setPageState(prev => ({
      ...prev,
      loading: true,
      lastUpdated: prev.lastUpdated // Mantém lastUpdated anterior para comparação
    }));
  };

  return {
    // Estados
    pageLoading: pageState.loading,
    pageData: pageState.data,
    isBackground: isBackgroundRef.current,
    
    // Funções
    setPageLoading,
    setPageData,
    refreshPageData,
    
    // Metadados
    lastUpdated: pageState.lastUpdated,
    hasValidCache: pageState.data && pageState.lastUpdated > Date.now() - 30000
  };
};

export default usePageStatePreservation;


