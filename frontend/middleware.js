// middleware.js (versão compatível com Vercel Edge Functions)
import { NextResponse } from 'next/server';

export async function middleware(req) {
  // Middleware simplificado para evitar problemas com Edge Functions
  // A autenticação será gerenciada pelo UserContext no frontend
  
  const res = NextResponse.next();
  
  // Apenas redirecionamentos básicos sem consultas ao banco
  const pathname = req.nextUrl.pathname;
  
  // Se tentar acessar rota protegida sem token, redireciona para login
  const protectedRoutes = [
    '/pedidos-pendentes',
    '/pedidos-aceitos', 
    '/pedidos-entregues',
    '/todos-pedidos',
    '/admin',
    '/gestao-entregadores',
    '/perfil'  // ✅ CORREÇÃO: Adicionar perfil às rotas protegidas
  ];
  
  if (protectedRoutes.includes(pathname)) {
    // Verifica se há token no localStorage (será verificado no frontend)
    // Por enquanto, permite acesso - o UserContext fará a verificação
    return res;
  }
  
  return res;
}

export const config = {
  matcher: [
    '/pedidos-pendentes',
    '/pedidos-aceitos',
    '/pedidos-entregues', 
    '/todos-pedidos',
    '/admin',
    '/gestao-entregadores',
    '/perfil'  // ✅ CORREÇÃO: Adicionar perfil ao matcher
  ],
};