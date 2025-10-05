// next.config.js - Versão simplificada para Vercel
const path = require('path');

module.exports = {
  // ==========================================================================
  // CONFIGURAÇÕES BÁSICAS DO NEXT.JS
  // ==========================================================================
  reactStrictMode: true,
  
  // ==========================================================================
  // CONFIGURAÇÕES DE WEBPACK
  // ==========================================================================
  webpack: (config, { isServer }) => {
    // ✅ Desativar módulos do Node.js que não são necessários no cliente
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  },
  
  // ==========================================================================
  // CONFIGURAÇÕES DE HEADERS
  // ==========================================================================
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};