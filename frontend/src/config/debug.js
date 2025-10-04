// ===========================================
// DEBUG.JS - CONFIGURAÇÕES DE DEBUG/TESTE
// ===========================================
// Local central para ligar/desligar funcionalidades
// para debug/teste de performance
// ===========================================

export const DEBUG_CONFIG = {
  // 🔥 CORREÇÃO THROTTLING: Desabilita FCM PERMANENTEMENTE por performance
  DISABLE_FCM: true, // SEMPRE TRUE - FCM causa lentidão desnecessária
  
  // 🔥 CORREÇÃO THROTTLING: Desabilita SW PERMANENTEMENTE por performance
  DISABLE_SERVICE_WORKER: true, // SEMPRE TRUE - SW causa cache conflicts
  
  // Debug de performance
  ENABLE_PERFORMANCE_LOGS: process.env.NODE_ENV === 'development',
  
  // Debounce timing
  RELOAD_DEBOUNCE_MS: 1000,
  
  // Cache validation
  CACHE_VALIDATION_MINUTES: 5, // Assume dados stale após 5min
};

// Helper para verificar se FCM deve ser usado
export const shouldUseFCM = () => !DEBUG_CONFIG.DISABLE_FCM;
export const shouldUseSW = () => !DEBUG_CONFIG.DISABLE_SERVICE_WORKER;
