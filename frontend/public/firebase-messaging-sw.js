// ========================================
// SERVICE WORKER DESABILITADO POR PERFORMANCE
// ========================================
// Este arquivo está comentado para melhorar performance do app
// Remover se não usar Telegram depois
// ========================================

/* ⚡ SERVICE WORKER DESABILITADO PARA PERFORMANCE MÁXIMA
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

// ==============================================================================
// CONFIGURAÇÃO DO FIREBASE
// ==============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCQbJZQ1RP2VJvQOqUTDp-rvxCSN_cf4ZQ",
  authDomain: "entregaswoonotificacoes.firebaseapp.com",
  projectId: "entregaswoonotificacoes",
  storageBucket: "entregaswoonotificacoes.appspot.com",
  messagingSenderId: "185849507222",
  appId: "1:185849507222:web:02ecd0936086cc7a5dc1b7"
};

// ==============================================================================
// INICIALIZAÇÃO - COM CONTROLE DE CACHE
// ==============================================================================
try {
  console.log('🚀 Service Worker - Iniciando com cache controlado...');
  
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  
  console.log('✅ Firebase inicializado no Service Worker');

  // ============================================================================
  // 1. BACKGROUND MESSAGES (APP FECHADO) - COM CACHE CONTROLADO
  // ============================================================================
  messaging.onBackgroundMessage((payload) => {
    console.log('📢 Background message recebida:', payload);
    
    const notificationTitle = payload.notification?.title || '🚚 Novo Pedido!';
    const notificationBody = payload.notification?.body || 'Clique para ver detalhes';
    const badgeCount = payload.data?.count || '1';
    
    console.log('🎯 Criando notificação:', { notificationTitle, notificationBody, badgeCount });

    const notificationOptions = {
      body: notificationBody,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      image: payload.data?.image || '/banner-pedido.png',
      data: payload.data || {},
      tag: `pedido-${Date.now()}`,
      requireInteraction: true,
      silent: false,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        {
          action: 'view',
          title: '📋 Ver Pedido'
        },
        {
          action: 'dismiss',
          title: '❌ Fechar'
        }
      ],
      timestamp: Date.now()
    };

    // ✅ CORREÇÃO: Não interfere no cache das páginas
    return self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('✅ Notificação exibida com sucesso');
        return postMessageForCustomSound(payload.data?.sound || 'notification-sound.mp3');
      })
      .catch((error) => {
        console.error('❌ Erro ao exibir notificação:', error);
      });
  });

  // ============================================================================
  // 2. PUSH EVENT - COM CONTROLE DE CACHE
  // ============================================================================
  self.addEventListener('push', (event) => {
    console.log('📩 Push event disparado');
    
    let payload;
    try {
      payload = event.data ? event.data.json() : {};
      console.log('📦 Payload do push:', payload);
    } catch (error) {
      console.error('❌ Erro ao parsear payload:', error);
      return;
    }

    const notificationTitle = payload.notification?.title || '🚚 Novo Pedido Disponível!';
    const notificationBody = payload.notification?.body || 'Há um novo pedido para entrega';
    const badgeCount = payload.data?.count || '1';

    const notificationOptions = {
      body: notificationBody,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: payload.data || {},
      tag: `push-${Date.now()}`,
      requireInteraction: true,
      silent: false,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        { action: 'view', title: '📋 Ver' }
      ]
    };

    // ✅ CORREÇÃO: Evento waitUntil sem interferir no cache
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
          console.log('✅ Notificação push exibida');
          return postMessageForCustomSound(payload.data?.sound || 'notification-sound.mp3');
        })
        .catch(error => {
          console.error('❌ Erro na notificação push:', error);
        })
    );
  });

  // ============================================================================
  // 3. CLICK NA NOTIFICAÇÃO - CORRIGIDO PARA SINCRONIA ENTRE ABAS
  // ============================================================================
  self.addEventListener('notificationclick', (event) => {
    console.log('👆 Notificação clicada:', event.notification);
    
    event.notification.close();

    let targetUrl = '/pedidos-pendentes';
    const payloadData = event.notification.data;

    if (payloadData && payloadData.url) {
      targetUrl = payloadData.url;
    } else if (payloadData && payloadData.pedidoId) {
      targetUrl += `?pedido=${payloadData.pedidoId}`;
    }

    if (event.action === 'view') {
      targetUrl = '/pedidos-pendentes';
    } else if (event.action === 'dismiss') {
      return;
    }

    // ✅ CORREÇÃO: Foca/abre janela + sincroniza estado entre abas
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Tenta focar em cliente existente
          for (const client of clientList) {
            if (client.url.includes(targetUrl) && 'focus' in client) {
              // ✅ NOVO: Envia mensagem para sincronizar estado
              client.postMessage({
                type: 'SYNC_APP_STATE',
                timestamp: Date.now(),
                source: 'notification_click'
              });
              return client.focus();
            }
          }
          
          // Se não encontrou, abre nova janela
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl);
          }
        })
    );
  });

  // ============================================================================
  // 4. FUNÇÃO PARA SOM CUSTOM VIA POSTMESSAGE
  // ============================================================================
  function postMessageForCustomSound(soundFile = 'notification-sound.mp3') {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            sound: soundFile
          });
        });
        console.log('🔊 PostMessage enviado para som custom');
        return Promise.resolve();
      })
      .catch((error) => {
        console.error('❌ Erro no postMessage para som:', error);
      });
  }

  // ============================================================================
  // 5. ✅ CORREÇÃO CRÍTICA: INSTALL/ACTIVATE COM CONTROLE DE CACHE
  // ============================================================================
  self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalado - Foco em notificações apenas');
    // ✅ CORREÇÃO: Skip waiting mas com controle
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    console.log('🎯 Service Worker ativado - Cache controlado');
    
    // ✅ CORREÇÃO: Claim controlado - não interfere no cache das páginas
    event.waitUntil(
      self.clients.claim().then(() => {
        console.log('✅ Service Worker pronto - Notificações apenas');
        
        // ✅ NOVO: Envia mensagem para todas as abas sincronizarem
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              timestamp: Date.now()
            });
          });
        });
      })
    );
  });

  // ============================================================================
  // 6. ✅ NOVO: MENSAGENS PARA SINCRONIZAR ENTRE ABAS
  // ============================================================================
  self.addEventListener('message', (event) => {
    console.log('📨 Mensagem recebida no SW:', event.data);
    
    if (event.data && event.data.type === 'SYNC_BETWEEN_TABS') {
      // Repassa mensagem para todas as abas
      event.waitUntil(
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            if (client.id !== event.source.id) {
              client.postMessage({
                type: 'TAB_SYNC_UPDATE',
                data: event.data.data,
                timestamp: Date.now()
              });
            }
          });
        })
      );
    }
  });

  console.log('🚀 Service Worker configurado com cache controlado!');

} catch (error) {
  console.error('💥 ERRO no Service Worker:', error);
}
*/

console.log('⚡ Service Worker desabilitado para performance máxima!');