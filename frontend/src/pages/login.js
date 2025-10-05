// ========================================
// LOGIN.JS - VERSÃO CORRIGIDA COM DEBUG ✅ CURSOR OTIMIZOU
// ========================================
// ✅ CORREÇÕES CURSOR: Auth melhorada, debug logs, fluxo Google OAuth otimizado

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

      // ✅ CORREÇÃO: Todos os usuários logados vão para Pedidos Pendentes
      let redirectPath = '/pedidos-pendentes';

      if (usuario.is_admin) {
        if (isDev) console.log('👑 Usuário é ADMIN - redirecionando para Pedidos Pendentes');
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
            if (isDev) console.log('💼 Usuário é GERENTE - redirecionando para Pedidos Pendentes');
            break;
          case 'entregador':
            if (isDev) console.log('🚚 Usuário é ENTREGADOR - redirecionando para Pedidos Pendentes');
            break;
          default:
            console.warn('⚠️ Função não reconhecida:', primeiraAssociacao.funcao);
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
            Login
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

          {/* Botão de login principal */}
          <div className="mt-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Entrar com Email e Senha
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

        {/* Links úteis */}
        <div className="text-center mt-6">
          <div className="space-y-2">
            <Link href="/cadastro" className="text-purple-200 hover:text-white text-sm transition-colors">
              Não tem conta? Cadastre-se
            </Link>
            <div className="text-purple-300 text-xs">
              ou
            </div>
            <Link href="/" className="text-purple-200 hover:text-white text-sm transition-colors">
              Voltar para página inicial
            </Link>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-6">
          <p className="text-purple-200 text-sm">
            © 2025 EntregasWoo - Sistema de Gestão
          </p>
        </div>
      </div>
    </div>
  );
}