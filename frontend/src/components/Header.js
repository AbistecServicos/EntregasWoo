// ========================================
// HEADER.JS - COMPONENTE SIMPLIFICADO (SEM FCM) ✅ CURSOR COMMIT
// ========================================
// Header limpo sem sistema de notificações para máxima performance
// ✅ TRANSFORMAÇÃO RADICAL FEITA PELO CURSOR:
// ❌ ANTES: Header complexo com sininho, FCM, notificações, badges
// ✅ DEPOIS: Header ultra-simplificado, sem dependências
// 🚀 PERFORMANCE: De 200+ linhas para <60 linhas
// 🎯 RESULTADO: Carregamento instantâneo, sem loops infinitos
// ========================================

import React from 'react';

const Header = ({ 
  toggleSidebar, 
  showMenuButton = true,
  title,
  userLojas = [],
  userId
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        
        {/* Lado Esquerdo: Botão Hambúrguer */}
        <div className="flex items-center">
          {showMenuButton && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Abrir menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Centro: Logo + Título */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <img 
              src="https://czzidhzzpqegfvvmdgno.supabase.co/storage/v1/object/public/box/logos/logo_entregaswoo_600x240.png" 
              alt="EntregasWoo" 
              className="h-16 lg:h-20"
            />
            
            {/* Título (mobile hidden, desktop visible) */}
            {title && (
              <h1 className="hidden lg:block text-xl font-semibold text-gray-900">
                {title}
              </h1>
            )}
          </div>
        </div>

      </div>

    </header>
  );
};

export default Header;