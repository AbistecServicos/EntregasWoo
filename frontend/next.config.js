// next.config.js - FIX DEFINITIVO (SEM PWA/SW EM DEV, ANTI-CACHE STALE)
const path = require('path');

// 🔥 CORREÇÃO CRÍTICA: Desativa PWA/SW TOTALMENTE para resolver throttling
const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,
  skipWaiting: false,
  disable: true, // ✅ SEMPRE DESABILITADO - Evita conflitos SW
  runtimeCaching: [],
  publicExcludes: ['!noprecache/**/*'],
  buildExcludes: [/middleware-manifest\.json$/]
});

module.exports = withPWA({
  // ==========================================================================
  // CONFIGURAÇÕES PARA MÚLTIPLOS LOCKFILES (mantido)
  // ==========================================================================
  outputFileTracingRoot: path.join(__dirname, '../'),
  
  // ==========================================================================
  // NEXT.JS BASE (OTIMIZADO)
  // ==========================================================================
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: true, // Melhor minificação SWC
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'] // Manter apenas erros e warnings
    } : false,
  },
  
  // ✅ NOVO: Otimizações de bundle
  typescript: {
    // Type checking apenas em produção para desenvolvimento mais rápido
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  // ==========================================================================
  // MONOREPO PERFORMANCE (mantido)
  // ==========================================================================
  transpilePackages: [],
  
  // ==========================================================================
  // WEBPACK (FIX: Comentado rules, cache memory dev)
  // ==========================================================================
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      config.cache = { type: 'memory' }; // ← FIX: Cache volátil em dev (anti-stale)
    }
    
    // FIX: Comentado rules problemáticos (quebra exports/getInitialProps)
    /*
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: [path.resolve(__dirname, 'src/lib')],
      use: 'babel-loader',
    });
    
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    */
    
    // Trata SW (mas desativado)
    config.module.rules.push({
      test: /firebase-messaging-sw\.js$/,
      type: 'asset/resource',
      generator: { filename: 'static/chunks/[name].[hash][ext]' }
    });
    
    return config;
  },
  
  // ==========================================================================
  // HEADERS (FIX: No-cache para rotas dinâmicas + FCM)
  // ==========================================================================
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/lib/:file*',
        headers: [{ key: 'Content-Type', value: 'application/javascript' }],
      },
      // FIX CRÍTICO: No-cache para FCM SW (anti-throttling, PDF seção 12)
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // NOVO: No-cache para rotas dinâmicas (admin/relatorios - anti-stale em abas)
      {
        source: '/admin',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      {
        source: '/relatorios',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      {
        source: '/gestao-entregadores',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      // Headers gerais de segurança (mantido)
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
  
  // ==========================================================================
  // REWRITES (mantido)
  // ==========================================================================
  async rewrites() {
    return [
      { source: '/firebase-messaging-sw.js', destination: '/firebase-messaging-sw.js' },
    ];
  },
  
  // ==========================================================================
  // REDIRECTS (mantido)
  // ==========================================================================
  async redirects() {
    return [
      { source: '/_next/webpack-hmr', destination: '/', permanent: false },
    ];
  },
  
  // ==========================================================================
  // EXPERIMENTAL (mantido)
  // ==========================================================================
  experimental: {
    optimizeCss: false, // Evita conflitos FCM
    scrollRestoration: true,
  },
  
  // ==========================================================================
  // PWA (desativado)
  // ==========================================================================
  pwa: { scope: '/', sw: 'sw.js' } // Ignorado por disable=true
});