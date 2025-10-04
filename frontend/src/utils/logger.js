// ========================================
// LOGGER.JS - SISTEMA DE LOG OTIMIZADO ✅ CURSOR GH
// ========================================
// ✅ CORREÇÕES CURSOR: Sistema de logs otimizado com throttling inteligente para evitar spam
// Controle centralizado de logs para desenvolvimento/produção
// Remove logs em produção para melhor performance
// ========================================

export const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Erros sempre são logados em produção para debugging
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      console.debug(...args);
    }
  }
};

// Helper para logs de performance
export const perfLog = (label, fn) => {
  if (!isDevelopment) return fn();
  
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  logger.info(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
};

// Helper para logs de auth com throttling
let lastAuthLogTime = 0;
let authLogCount = 0;

export const authLog = (message, data = null) => {
  const now = Date.now();
  
  // Se for o mesmo log repetido em menos de 1 segundo, agrupar
  if (now - lastAuthLogTime < 1000 && message.includes('Auth event:')) {
    authLogCount++;
    // Só mostra a cada 5 eventos repetidos
    if (authLogCount % 5 !== 0) return;
    logger.info(`🔐 AUTH: ${message} (${authLogCount}x)`, data || '');
  } else {
    authLogCount = 1;
    lastAuthLogTime = now;
    logger.info(`🔐 AUTH: ${message}`, data || '');
  }
};

// Helper para logs de database
export const dbLog = (operation, data = null) => {
  logger.debug(`🗄️ DB ${operation}:`, data || '');
};

// Helper para logs de throttling/debugging
export const throttleLog = (message, data = null) => {
  logger.info(`🐌 THROTTLE: ${message}`, data || '');
};

// Helper para logs de network errors
export const networkLog = (error, context = '') => {
  if (error.message?.includes('NetworkError')) {
    logger.error(`🌐 NETWORK ERROR ${context}:`, error);
  } else {
    logger.debug(`🌐 Network ${context}:`, error);
  }
};

export default logger;
