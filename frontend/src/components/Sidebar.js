// components/Sidebar.js
// ✅ CURSOR OTIMIZOU: Sidebar com performance melhorada e estado de usuário corrigido
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import UserProfile from './UserProfile';

// ✅ CORREÇÃO: RECEBER PROPS DO LAYOUT
const Sidebar = ({ 
  isOpen, 
  toggleSidebar,
  user = null, // ← do _app.js via Layout
  isLoading = false, // ← do _app.js via Layout  
  userLojas = [] // ← do _app.js via Layout
}) => {
  const router = useRouter();
  
  // ✅ HOOK PARA DADOS COMPLETOS (USADO COMO FALLBACK)
  const { 
    user: hookUser, 
    userProfile, 
    userRole: hookUserRole, 
    userLojas: hookUserLojas, 
    loading: loadingUser, 
    error 
  } = useUserProfile();
  
  // ✅ ESTADO PARA DADOS INSTANTÂNEOS
  const [instantData, setInstantData] = useState({
    user: null,
    userLojas: [],
    userRole: 'visitante'
  });

  // ============================================================================
  // EFFECT: SINCRONIZAR DADOS INSTANTÂNEOS COM PROPS (CORRIGIDO)
  // ============================================================================
useEffect(() => {
  // ✅ SE LOGOUT: Limpar dados instantâneos
  if (!user) {
    setInstantData({
      user: null,
      userLojas: [],
      userRole: 'visitante'
    });
    return;
  }

  // ✅ SE LOGIN: Atualizar dados instantâneos
  if (user && !isLoading) {
    let instantRole = 'visitante';
    
    // ⚡ CORREÇÃO CRÍTICA: Verificar se userLojas está vazio ainda
    if (userLojas.length > 0) {
      const userFunctions = userLojas.map(loja => loja.funcao);
      
      if (userFunctions.includes('admin')) {
        instantRole = 'admin';
      } else if (userFunctions.includes('gerente')) {
        instantRole = 'gerente';
      } else if (userFunctions.includes('entregador')) {
        instantRole = 'entregador';
      }
    }
    
    setInstantData({
      user: user,
      userLojas: userLojas,
      userRole: instantRole
    });
  }
}, [user?.id, isLoading]); // ⚡ SÓ REEXECUTA SE MUDAR O USER ID ou loading


  // ============================================================================
  // EFFECT: ATUALIZAR COM DADOS COMPLETOS DO HOOK
  // ============================================================================
  useEffect(() => {
    if (hookUser && !loadingUser && hookUserRole && instantData.userRole !== hookUserRole) {
      setInstantData(prev => ({
        ...prev,
        userRole: hookUserRole // Atualiza role com dados completos
      }));
    }
  }, [hookUserRole]); // ⚡ SÓ REEXECUTA SE DUPLO HOOK CHANGES (não instantData)

  // ============================================================================
  // VARIÁVEIS FINAIS (DADOS INSTANTÂNEOS PRIMEIRO)
  // ============================================================================
  const displayUser = instantData.user || hookUser;
  const displayUserLojas = instantData.userLojas.length > 0 ? instantData.userLojas : hookUserLojas;
  const displayUserRole = instantData.userRole !== 'visitante' ? instantData.userRole : hookUserRole;
  const displayLoading = (isLoading && !instantData.user) || loadingUser;

  // ✅ CORREÇÃO: CRIAR PERFIL COMPLETO PARA O USERPROFILE
  const displayUserProfile = userProfile || (displayUser ? {
    // ✅ FALLBACK: criar perfil básico dos dados instantâneos
    nome_completo: displayUser.user_metadata?.full_name || displayUser.email,
    email: displayUser.email,
    foto: displayUser.user_metadata?.avatar_url,
    nome_usuario: displayUser.user_metadata?.user_name || displayUser.email.split('@')[0],
    telefone: displayUser.user_metadata?.phone || '',
  } : null);

  // ⚡ Log removido por performance (causava spam)

  // ============================================================================
  // ITENS DO MENU
  // ============================================================================
  const homeItem = { path: '/', icon: '🏠', label: 'EntregasWoo' };
  const vendasWooItem = { path: '/vendaswoo', icon: '🛍️', label: 'VendasWoo' };
  const perfilItem = { path: '/perfil', icon: '👤', label: 'Meu Perfil' };
  const pendentesItem = { path: '/pedidos-pendentes', icon: '📋', label: 'Pedidos Pendentes' };
  const aceitosItem = { path: '/pedidos-aceitos', icon: '✅', label: 'Pedidos Aceitos' };
  const entreguesItem = { path: '/pedidos-entregues', icon: '🚚', label: 'Pedidos Entregues' };
  const gestaoItem = { path: '/gestao-entregadores', icon: '👥', label: 'Gestão de Entregadores' };
  const todosItem = { path: '/todos-pedidos', icon: '📊', label: 'Todos os Pedidos' };
  const relatoriosItem = { path: '/relatorios', icon: '📈', label: 'Relatórios' };
  const adminItem = { path: '/admin', icon: '⚙️', label: 'Administração' };

  // ============================================================================
  // MONTAGEM CONDICIONAL DOS ITENS (USA DADOS INSTANTÂNEOS)
  // ============================================================================
  // ✅ CORREÇÃO: Páginas públicas removidas - sistema apenas para usuários logados
  let menuItems = [];

  // ✅ NOVO: Não mostrar mais páginas públicas (index e vendaswoo)
  // Sistema agora é apenas para usuários autenticados
  if (displayUser) {
    // Se usuário está logado, mostrar apenas páginas do sistema
    menuItems.push(perfilItem);

    // ✅ REORGANIZADO: Pedidos Pendentes disponível para todos os usuários autenticados
    if (['entregador', 'gerente', 'admin'].includes(displayUserRole)) {
      menuItems.push(pendentesItem);
    }

    // ✅ Pedidos Aceitos apenas para entregadores
    if (displayUserRole === 'entregador') {
      menuItems.push(aceitosItem);
    }

    // ✅ Pedidos Entregues para todos os usuários autenticados
    if (['entregador', 'gerente', 'admin'].includes(displayUserRole)) {
      menuItems.push(entreguesItem);
    }

    if (displayUserLojas.length > 0 || displayUserRole === 'admin') {
      menuItems.push(relatoriosItem);
    }

    if (['gerente', 'admin'].includes(displayUserRole)) {
      menuItems.push(gestaoItem, todosItem);
    }

    if (displayUserRole === 'admin') {
      menuItems.push(adminItem);
    }
  }

  // ============================================================================
  // FUNÇÃO DE LOGOUT CORRIGIDA (REDIRECIONAMENTO GARANTIDO PARA PÁGINA INICIAL)
  // ============================================================================
  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      
      // Fechar sidebar no mobile
      if (window.innerWidth < 1024) {
        toggleSidebar();
      }
      
      // ✅ CORREÇÃO: Limpar estado local ANTES do logout
      setInstantData({
        user: null,
        userLojas: [],
        userRole: 'visitante'
      });
      
      // Realizar logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ Logout realizado com sucesso');
      
      // ✅ CORREÇÃO: Redirecionamento garantido para página de login
      console.log('🔐 Redirecionando para página de login...');
      
      // Tentar router primeiro (mais rápido)
      try {
        await router.push('/login');
        console.log('✅ Redirecionamento via router concluído');
      } catch (routerError) {
        console.warn('⚠️ Router falhou, usando window.location:', routerError);
        // Fallback: usar window.location
        window.location.href = '/login';
      }
      
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      // Mesmo com erro, tentar redirecionar para página de login
      console.log('🔄 Tentando redirecionamento mesmo com erro...');
      try {
        await router.push('/login');
      } catch {
        window.location.href = '/login';
      }
    }
  };

  // ============================================================================
  // FUNÇÕES AUXILIARES
  // ============================================================================
  const handleLoginRedirect = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
    router.push('/login');
  };

  const handleMenuItemClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO CORRIGIDA
  // ============================================================================
  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar principal */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-purple-800 text-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full
      `}>
        {/* Logo / Marca do sistema */}
        <div className="p-4 border-b border-purple-700">
          <Link href="/" passHref onClick={handleMenuItemClick}>
            <div className="cursor-pointer flex justify-center">
              <img 
                src="https://czzidhzzpqegfvvmdgno.supabase.co/storage/v1/object/public/box/logos/logo_entregaswoo_600x240_branco.png"
                alt="EntregasWoo"
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-purple-300 text-sm mt-2 text-center">Sistema de Gestão</p>
          </Link>
        </div>

        {/* Menu de navegação - AGORA INSTANTÂNEO */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center py-3 px-4 rounded-lg mb-2 transition-colors
                ${router.pathname === item.path
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'hover:bg-purple-700 text-purple-200'
                }`}
              onClick={handleMenuItemClick}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* ✅ CORREÇÃO: UserProfile CORRETO - embaixo do menu */}
        <div className="mt-auto border-t border-purple-700">
          <UserProfile 
            user={displayUserProfile} // ✅ CORRETO: prop 'user'
            loading={displayLoading}
            showLogout={!!displayUser} // ✅ CORRETO: mostrar logout se logado
            onLogout={handleLogout} // ✅ CORRETO: função logout
            onLogin={handleLoginRedirect} // ✅ CORRETO: função login
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;