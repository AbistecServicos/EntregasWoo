// pages/nao-autorizado.js
// ✅ Página de erro para usuários não autorizados
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function NaoAutorizado() {
  const router = useRouter();

  // Auto-redirect para login após 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ⚠️ Acesso Negado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-4">
                Acesso Não Autorizado
              </h3>
              
              <p className="text-gray-700 mb-4">
                Seu usuário não possui as permissões necessárias para acessar esta área do sistema.
              </p>

              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Possíveis motivos:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 text-left">
                  <li>• Usuário não logado</li>
                  <li>• Permissões insuficientes</li>
                  <li>• Sessão expirada</li>
                  <li>• Acesso revogado</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Você será redirecionado para a página de login em alguns segundos...
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  🔐 Ir para Login
                </button>
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  🏠 Página Inicial
                </button>
              </div>

              <button
                onClick={() => window.history.back()}
                className="mt-3 text-sm text-purple-600 hover:text-purple-500 underline"
              >
                ← Voltar à página anterior
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
          Redirecionando automaticamente...
        </div>
      </div>
    </div>
  );
}
