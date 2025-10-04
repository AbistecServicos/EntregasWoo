// ===========================================
// ERRORBOUNDARY.JS - TRATAMENTO DE ERROS ELEGANTE
// ===========================================
// Captura erros JavaScript em componentes React e exibe UI de fallback
// Implementa retry e logging para debugging
// ===========================================

import React from 'react';
import { logger } from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza state para exibir UI de erro
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para debugging
    logger.error('🚨 ErrorBoundary capturou um erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString()
    });

    // Em produção, você pode enviar para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, enableRetry = true } = this.props;

      // UI personalizada se fornecido
      if (CustomFallback) {
        return <CustomFallback 
          error={this.state.error} 
          retry={this.handleRetry}
          retryCount={this.state.retryCount}
        />;
      }

      // UI padrão de erro
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-gray-50 border-2 border-red-200 rounded-lg">
          <div className="text-center">
            {/* Ícone de erro */}
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>

            {/* Mensagem */}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ops! Algo deu errado
            </h3>
            
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              Encontramos um erro inesperado. Isso geralmente é temporário.
              {this.state.retryCount > 0 && (
                <span className="block mt-1 text-xs text-gray-500">
                  Tentativa atual: {this.state.retryCount}
                </span>
              )}
            </p>

            {/* Botões de ação */}
            <div className="flex gap-3 justify-center">
              {enableRetry && (
                <button
                  onClick={this.handleRetry}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  🔄 Tentar Novamente
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                🔄 Recarregar Página
              </button>
            </div>

            {/* Debug info (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left text-xs text-gray-500 max-w-md">
                <summary className="cursor-pointer hover:text-gray-700">
                  🐛 Detalhes do Erro (Desenvolvimento)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded border">
                  <div className="font-mono">
                    {this.state.error.message}
                  </div>
                  <div className="mt-2 text-xs opacity-75">
                    {this.state.error.stack?.split('\n').slice(0, 3).join('\n')}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC para facilitar uso
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// Componente especializado para páginas
export const PageErrorBoundary = ({ children, pageName = 'Esta página' }) => (
  <ErrorBoundary 
    fallback={({ error, retry, retryCount }) => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Erro em {pageName}
          </h1>
          <p className="text-gray-600 mb-6">
            Não foi possível carregar {pageName.toLowerCase()}. 
            Tente novamente ou volte mais tarde.
          </p>
          <button
            onClick={retry}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;


