// ========================================
// LOGIN.JS - VERSÃO CORRIGIDA COM DEBUG
// ========================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

const isDev = process.env.NODE_ENV === 'development';

export default function Login() {
  // Estados do componente
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const router = useRouter();

  // Conexão Simplificada (sem teste automático)
  useEffect(() => {
    if (isDev) console.log('🔗 Cliente Supabase inicializado');
  }, []);

  // Validar formulário em tempo real
  useEffect(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordValid = password.length >= 6;
    setFormValid(emailValid && passwordValid);
  }, [email, password]);

  // Traduzir erros técnicos
  const translateError = (error) => {
    if (error.message?.includes('AuthRetryableFetchError') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    if (error.message?.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    } 
    
    if (error.message?.includes('Email not confirmed')) {
      return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    } 
    
    if (error.message?.includes('/auth/v1/token')) {
      return 'Servidor temporariamente indisponível. Tente novamente em alguns segundos.';
    }
    
    if (error.message?.includes('Too many requests')) {
      return 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.';
    }
    
    return `Erro ao fazer login: ${error.message || 'Erro desconhecido'}`;
  };

  // Login com email/senha
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Conexão sempre conectada (simplificado para teste)
    
    if (!formValid) {
      setError('Por favor, insira um email válido e uma senha com pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isDev) console.log('🔐 Iniciando processo de login...');
      
      // Autenticação com retry
      const maxRetries = 3;
      let authData = null;
      let authError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (isDev) console.log(`🔄 Tentativa de login ${attempt}/${maxRetries}`);
          
          const result = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
          
          authData = result.data;
          authError = result.error;
          
          if (!authError || !authError.message?.includes('AuthRetryableFetchError')) {
            break;
          }
          
          if (attempt < maxRetries) {
            const delay = 1000 * attempt;
            if (isDev) console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (networkError) {
          authError = networkError;
          if (attempt < maxRetries) {
            const delay = 1000 * attempt;
            if (isDev) console.log(`🌐 Erro de rede, tentando novamente em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (authError) {
        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Resposta de autenticação inválida');
      }

      if (isDev) console.log('✅ Usuário autenticado:', authData.user.email);

      // Verificação de perfil
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('uid, is_admin, nome_completo')
        .eq('uid', authData.user.id)
        .single();
      
      if (userError) {
        if (userError.code === 'PGRST116') {
          console.warn('⚠️ Usuário não encontrado na tabela usuarios:', authData.user.id);
          setError('Perfil não encontrado. Contate o administrador.');
          await supabase.auth.signOut();
          return;
        }
        throw userError;
      }

      // Determinar redirecionamento
      let redirectPath = '/';

      if (usuario.is_admin) {
        redirectPath = '/admin';
        if (isDev) console.log('👑 Usuário é ADMIN');
      } else {
        const { data: associacoes, error: assocError } = await supabase
          .from('loja_associada')
          .select('funcao, loja_nome, id_loja')
          .eq('uid_usuario', authData.user.id)
          .eq('status_vinculacao', 'ativo');
        
        if (assocError) {
          console.error('Erro ao buscar associações:', assocError);
          setError('Erro ao verificar permissões. Tente novamente.');
          return;
        }

        if (!associacoes || associacoes.length === 0) {
          setError('Você não possui acesso ativo às lojas. Contate o administrador.');
          await supabase.auth.signOut();
          return;
        }

        const primeiraAssociacao = associacoes[0];
        switch (primeiraAssociacao.funcao) {
          case 'gerente':
            redirectPath = '/todos-pedidos';
            if (isDev) console.log('💼 Usuário é GERENTE');
            break;
          case 'entregador':
            redirectPath = '/pedidos-pendentes';
            if (isDev) console.log('🚚 Usuário é ENTREGADOR');
            break;
          default:
            console.warn('⚠️ Função não reconhecida:', primeiraAssociacao.funcao);
            redirectPath = '/';
            break;
        }
      }

      // Redirecionamento
      if (isDev) console.log('🎯 Redirecionando para:', redirectPath);
      await router.replace(redirectPath);
      
      if (isDev) console.log('🔄 Login concluído com sucesso');

    } catch (error) {
      const errorMessage = translateError(error);
      setError(errorMessage);
      
      if (isDev) {
        console.error('❌ Erro detalhado no login:', {
          message: error.message,
          code: error.code,
          status: error.status,
          name: error.name
        });
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Login Google
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (isDev) console.log('🔐 Iniciando login Google...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
      });
      
      if (error) throw error;
      
      if (isDev) console.log('🔐 Redirecionando para Google OAuth...');
      
    } catch (error) {
      const errorMessage = translateError(error);
      setError(errorMessage);
      
      if (isDev) console.error('❌ Erro no login Google:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800">
      <div className="max-w-md w-full mx-auto">
        
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center"
            role="img"
            aria-label="Ícone de entrega"
          >
            <span className="text-3xl text-purple-600">🚚</span>
          </div>
          <h1 className="text-3xl font-bold text-white">EntregasWoo</h1>
          <p className="text-purple-200 mt-2">Sistema de Gestão de Entregas</p>
          
          {/* Debug simplificado */}
          {isDev && (
            <div className="mt-2 text-xs text-purple-300">
              🚀 Sistema pronto para login
            </div>
          )}
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Acessar Sistema
          </h2>

          {/* Exibição de erro */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-start"
              role="alert"
            >
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Botão Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Carregando...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </>
            )}
          </button>

          {/* Link para login com email */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Ou entre com email e senha
            </button>
          </div>

          {/* Modal de login email/senha */}
          {isModalOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setIsModalOpen(false)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    Login com Email
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={loading}
                      placeholder="seu@email.com"
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={loading}
                      placeholder="Sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-500"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !formValid}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Entrando...
                      </span>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>
                
                <div className="mt-4 text-center">
                  <Link href="/recuperar-senha" className="text-purple-600 hover:text-purple-800 text-sm">
                    Esqueceu sua senha?
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Links extras */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-600 text-sm">
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="text-purple-600 hover:text-purple-800 font-medium">
                Criar nova conta
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8">
          <p className="text-purple-200 text-sm">
            © 2025 EntregasWoo - Sistema de Gestão
          </p>
        </div>
      </div>
    </div>
  );
}