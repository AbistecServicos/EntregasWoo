// ========================================
// LAYOUT.JS - VERSÃO COMPLETAMENTE LIMPA (SEM NOTIFICAÇÕES)
// ========================================

import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserContext } from '../context/UserContext';

const Layout = ({ 
  children, 
  hideSidebar = false,
  userLojas = [],
  user = null,
  isLoading = false
}) => {
  // ============================================================================
  // 1. ESTADOS LIMPOS (SEM NOTIFICAÇÕES)
  // ============================================================================
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  // ============================================================================
  // 2. HOOKS SIMPLES
  // ============================================================================
  const { userProfile, loading: userLoading } = useUserProfile();
  const { userRole, userLojas: contextUserLojas } = useUserContext();
  const uid = userProfile?.uid || null;
  const finalLojas = userLojas.length > 0 ? userLojas : contextUserLojas;

  // ============================================================================
  // 3. EFFECT: DETECTAR TAMANHO DA TELA
  // ============================================================================
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // ============================================================================
  // 4. FUNÇÕES AUXILIARES SIMPLES
  // ============================================================================
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const closeSidebar = () => {
    if (isMobile) setSidebarOpen(false);
  };

  // ============================================================================
  // 5. LOGS DE DEBUG LIMPOS (SEM NOTIFICAÇÕES)
  // ============================================================================
  useEffect(() => {
    if (isDev && userProfile?.uid) {
      console.log('🏪 Layout - Estado atual:', {
        usuario: userProfile.uid,
        lojas: finalLojas.length,
        role: userRole || 'visitante',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [userProfile?.uid, finalLojas.length, userRole]);

  // ============================================================================
  // 6. RENDERIZAÇÃO LIMPA
  // ============================================================================
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
        user={user} 
        isLoading={isLoading || userLoading} 
        userLojas={finalLojas}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Simplificado */}
        <Header 
          toggleSidebar={toggleSidebar} 
          showMenuButton={!hideSidebar}
          title={hideSidebar ? "Painel Administrativo" : undefined}
          userLojas={finalLojas} 
          userId={uid}
        />
         
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;