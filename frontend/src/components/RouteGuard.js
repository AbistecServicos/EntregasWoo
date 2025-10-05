// ===========================================
// ROUTEGUARD.JS - PROTEÇÃO DE ROTAS OTIMIZADA
// ===========================================
// Componente HOC para proteger páginas por role (admin, gerente, entregador).
// Usa UserContext para userRole/loading (global, anti-loading infinito).
// Redirect para /nao-autorizado se role insuficiente.
// Spinner durante loading do contexto.
// ===========================================
//
// OTIMIZAÇÕES:
// - Pega userRole do contexto (já carregado em _app.js, sem refetch).
// - Role levels hierárquicos (admin > gerente > entregador > visitante).
// - Loading spinner global (evita loading duplo em páginas como relatorios).
// - Compatível com migração: Comente useUserContext se usar useUserProfile.
//
// DEPENDÊNCIAS:
// - useUserContext (de ../context/UserContext.js).
// - useRouter (Next.js para redirect).
//
// COMO USAR:
// - Em páginas: <RouteGuard requiredRole="admin"><Conteúdo /></RouteGuard>
// - Export default para import em relatorios.js.
//
// PROBLEMAS RESOLVIDOS:
// - Undefined error: Export default adicionado.
// - Loading infinito: Espera contexto (loading false só após loadUserData).
// - Sync abas: Herda do contexto (_app.js + localStorage).

// import { useUserContext } from '../context/UserContext';  // MIGRE AQUI: Global state
import { useUserProfile } from '../hooks/useUserProfile';  // OU use isso se não migrado
import { useRouter } from 'next/router';
import { useEffect } from 'react';  // Para side-effects (redirect)

const RouteGuard = ({ children, requiredRole }) => {
  // const { userRole, loading } = useUserContext();  // Do contexto (loading global)
  const { userRole, loading } = useUserProfile();  // OU isso se não migrado
  const router = useRouter();

  // Role levels: Hierarquia para checks (admin pode tudo, etc.)
  const roleLevels = {
    'visitante': 0,
    'entregador': 1,
    'gerente': 2,
    'admin': 3
  };

  const userLevel = roleLevels[userRole] || 0;
  const requiredLevel = roleLevels[requiredRole] || 0;

  // ✅ DEBUG: Log detalhado para admin
  console.log('🔍 ROUTEGUARD DEBUG:', {
    userRole,
    requiredRole,
    userLevel,
    requiredLevel,
    hasAccess: userLevel >= requiredLevel,
    loading
  });

  // Loading: Spinner global (espera contexto resolver)
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Verificando acesso...</span>
      </div>
    );
  }

  // Unauthorized: Redirect para página de erro (ex.: /nao-autorizado)
  if (userLevel < requiredLevel) {
    useEffect(() => {
      console.warn(`❌ ACESSO NEGADO: Role '${userRole}' (level ${userLevel}) insuficiente para '${requiredRole}' (level ${requiredLevel})`);
      router.push('/nao-autorizado');
    }, [router, userRole, requiredRole, userLevel, requiredLevel]);

    return null;  // Não renderiza children durante redirect
  }

  // Authorized: Render children
  return <>{children}</>;
};

// ✅ Export default (fix para import em relatorios.js)
export default RouteGuard;

// (Opcional: Named export se preferir import { RouteGuard })
export { RouteGuard };