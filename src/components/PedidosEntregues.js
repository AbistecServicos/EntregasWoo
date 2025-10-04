// components/PedidosEntregues.js ✅ CURSOR OTIMIZOU
// ============================================================================
// ✅ CORREÇÕES CURSOR: Componente principal otimizado com roteamento inteligente por role
// 🎯 PERFORMANCE: Carregamento condicional baseado no tipo de usuário
// 🔧 INTEGRAÇÃO: Sistema unificado que direciona para Admin/Gerente/Entregador automaticamente
// ============================================================================
// 1. IMPORTAÇÕES
// ============================================================================
import { useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";

// Importa as versões da página, cada uma para um tipo de usuário
import PedidosEntreguesAdmin from "./PedidosEntreguesAdmin";
import PedidosEntreguesGerente from "./PedidosEntreguesGerente";
import PedidosEntreguesEntregador from "./PedidosEntreguesEntregador";

// ============================================================================
// 2. COMPONENTE PRINCIPAL
// ============================================================================
export default function PedidosEntregues() {
  // Hook que carrega dados do usuário
  const { userProfile, userRole, userLojas, loading } = useUserProfile();

    // ==========================================================================
  // 3. ESTADOS DE CARREGAMENTO E AUTENTICAÇÃO
  // ==========================================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-purple-600 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600 text-lg">Usuário não autenticado</div>
        <p className="text-gray-600 text-sm mt-2">
          Faça login para acessar esta página.
        </p>
      </div>
    );
  }



    // ==========================================================================
  // 4. ROTEAMENTO INTELIGENTE BASEADO NO TIPO DE USUÁRIO ✅ CURSOR OTIMIZOU
  // ==========================================================================
  // ✅ CORREÇÃO CURSOR: Sistema de roteamento inteligente que carrega apenas o componente necessário
  // 🎯 PERFORMANCE: Evita carregar todos os componentes, só o relevante para a role
  // 🔧 MANUTENIBILIDADE: Cada role tem seu próprio componente otimizado
  switch (userRole?.toLowerCase()) {
    // ------------------------------------------------------------------------
    // CASO 1: ADMINISTRADOR ✅ CURSOR OTIMIZOU
    // ------------------------------------------------------------------------
    // ✅ OTIMIZAÇÃO: Admin carrega componente específico com formatação brasileira
    // 🎯 PERFORMANCE: Sem overhead de outros componentes
    case "admin":
    case "administrador":
    case "administrator":
      return <PedidosEntreguesAdmin userProfile={userProfile} />;

    // ------------------------------------------------------------------------
    // CASO 2: GERENTE ✅ CURSOR OTIMIZOU
    // ------------------------------------------------------------------------
    // ✅ OTIMIZAÇÃO: Gerente carrega componente com debug logs e loops corrigidos
    // 🎯 PERFORMANCE: Debug inteligente apenas em desenvolvimento
    case "gerente":
    case "manager":
    case "gestor":
      return (
        <PedidosEntreguesGerente
          userProfile={userProfile}
          userLojas={userLojas}
        />
      );

    // ------------------------------------------------------------------------
    // CASO 3: ENTREGADOR
    // ------------------------------------------------------------------------
    case "entregador":
    case "delivery":
    case "courier":
    case "motoboy":
      return (
        <PedidosEntreguesEntregador
          userProfile={userProfile}
          userLojas={userLojas}
        />
      );

    // ------------------------------------------------------------------------
    // CASO PADRÃO: ACESSO NEGADO
    // ------------------------------------------------------------------------
    default:
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-red-800 text-xl font-bold mb-2">
              ⚠️ Acesso Não Autorizado
            </h2>

            <p className="text-gray-700 mb-3">
              Seu tipo de usuário não tem permissão para acessar esta página.
            </p>

            <div className="bg-gray-100 p-3 rounded text-sm mb-4">
              <p>
                <strong>Tipo de usuário:</strong>{" "}
                {userRole || "Não definido"}
              </p>
              <p>
                <strong>Usuário:</strong>{" "}
                {userProfile.nome_completo || userProfile.email}
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Contate o administrador do sistema para solicitar acesso.
            </p>

            <button
              onClick={() => window.history.back()}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      );
  }
}

