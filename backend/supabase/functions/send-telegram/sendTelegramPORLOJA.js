// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * TELEGRAM POR LOJA - OTIMIZADO
 * 1 notificação por loja enviada para canal/grupo específico
 * Todos os entregadores/gerentes da loja recebem automaticamente
 * MUITO MAIS ESCALÁVEL!
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ⚙️ MAPEAMENTO LOJA → TELEGRAM_CHANNEL_ID
const LOJA_TELEGRAM_CHANNELS = {
  'L1': '-1001234567890',  // Canal: "Entregas Mercearia Luanda"
  'L2': '-1001234567891',  // Canal: "Entregas Brasil Carne"  
  'L3': '-1001234567892',  // Canal: "Entregas Mais Uma Loja"
  // Adicione mais conforme necessário
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

if (!supabaseUrl || !supabaseKey || !TELEGRAM_BOT_TOKEN) {
  throw new Error('Variáveis de ambiente obrigatórias ausentes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('📱 TELEGRAM POR LOJA - Iniciando...');
    
    const body = await req.json();
    const { pedido, loja_id } = body;

    if (!pedido || !loja_id) {
      throw new Error('Dados do pedido e loja_id são obrigatórios');
    }

    // ✅ BUSCAR TELEGRAM CHANNEL DA LOJA
    const telegramChannelId = LOJA_TELEGRAM_CHANNELS[loja_id];
    
    if (!telegramChannelId) {
      console.warn(`⚠️ Canal Telegram não configurado para loja ${loja_id}`);
      return new Response(JSON.stringify({
        success: false,
        message: `Canal Telegram não encontrado para loja ${loja_id}`,
        suggestion: 'Configure o canal na variável LOJA_TELEGRAM_CHANNELS'
      }), { status: 404 });
    }

    console.log(`📡 Enviando para canal da loja ${loja_id}: ${telegramChannelId}`);

    // ✅ MENSAGEM FORMATADA OTIMIZADA
    const message = `
🚚 **NOVO PEDIDO - ${pedido.loja_nome}**

📦 **Pedido:** #${pedido.id_loja_woo}
👤 **Cliente:** ${pedido.nome_cliente}
📞 **Telefone:** ${pedido.telefone_cliente || 'Não informado'}
🚚 **Endereço:** ${pedido.endereco_entrega || 'Não informado'}

💰 **Total:** R$ ${pedido.total.toFixed(2)}
📦 **Produtos:**
${pedido.produto || 'Produtos não especificados'}

⏰ **Ação:** Aceite pelo app ou Telegram!
🔄 **Status:** Aguardando aceite

---
_Canal: ${pedido.loja_nome}_
    `.trim();

    // ✅ ENVIAR UMA ÚNICA MENSAGEM PARA O CANAL DA LOJA
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        chat_id: telegramChannelId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API Error: ${result.description}`);
    }

    console.log(`✅ Enviado com sucesso para ${pedido.loja_nome}!`);

    // ✅ LOG DE ESTATÍSTICAS (OPCIONAL)
    try {
      await supabase
        .from('logs_notificacoes')
        .insert([{
          loja_id,
          pedido_id: pedido.id,
          canal_telegram: telegramChannelId,
          sucesso: true,
          timestamp: new Date().toISOString()
        }]);
    } catch (logError) {
      console.warn('Log de estatística falhou:', logError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Notificação enviada para canal da loja ${pedido.loja_nome}`,
      canal_id: telegramChannelId,
      canal_link: `https://t.me/c/${telegramChannelId.slice(1)}`,
      estatisticas: {
        usuarios_envolvidos: 'Todos os subs do canal',
        eficiencia: '1 mensagem para toda a loja',
        escalabilidade: 'Suporta milhares de usuários por canal'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no Telegram por Loja:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

