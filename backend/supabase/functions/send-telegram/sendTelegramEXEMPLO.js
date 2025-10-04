// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * FUNÇÃO SEND TELEGRAM - INDEPENDENTE
 * Recebe dados e envia via Telegram Bot API
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN'); // ⚙️ Configure no Supabase
const telegramChatIds = Deno.env.get('TELEGRAM_CHAT_IDS'); // ⚙️ IDs dos chats (separados por vírgula)

if (!telegramBotToken || !telegramChatIds) {
  throw new Error('TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_IDS são obrigatórios');
}

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    
    const {
      pedido,
      title = '🚚 Novo Pedido Disponível!',
      loja_id = null, // Para filtrar entregadores por loja
    } = body;

    if (!pedido) {
      throw new Error('Dados do pedido são obrigatórios');
    }

    console.log('📨 Preparando envio para Telegram:', {
      pedido_id: pedido.id,
      loja: pedido.id_loja
    });

    // ✅ BUSCAR ENTREGADORES DA LOJA (substitui tokens FCM)
    let entregadoresWhere = supabase
      .from('loja_associada')
      .select(`
        uid_usuario,
        usuarios:uid_usuario (
          telegram_chat_id
        )
      `)
      .eq('funcao', 'entregador')
      .eq('status_vinculacao', 'ativo');

    if (loja_id) {
      entregadoresWhere = entregadoresWhere.eq('id_loja', loja_id);
    }

    const { data: entregadores, error } = await entregadoresWhere;

    if (error) throw error;

    // ✅ FILTRAR APENAS ENTREGADORES COM CHAT_ID DO TELEGRAM
    const chatIds = entregadores
      .filter(e => e.usuarios?.telegram_chat_id)
      .map(e => e.usuarios.telegram_chat_id);

    console.log(`📱 Chat IDs encontrados: ${chatIds.length}`);

    if (chatIds.length === 0) {
    console.log('ℹ️ Nenhum entregador com Telegram cadastrado');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum chat para enviar' 
      }), { status: 200 });
    }

    // ✅ MENSAGEM FORMATADA
    const message = `
${title}

📦 Pedido: #${pedido.id_loja_woo}
🏪 Loja: ${pedido.loja_nome}
👤 Cliente: ${pedido.nome_cliente}
📞 Telefone: ${pedido.telefone_cliente || 'Não informado'}
🚚 Endereço: ${pedido.endereco_entrega || 'Não informado'}
💰 Total: R$ ${pedido.total.toFixed(2)}
📦 Produtos: ${pedido.produto}

⏰ Aceite o pedido pelo app!
    `.trim();

    // ✅ ENVIAR PARA TODOS OS CHAT IDs
    const promises = chatIds.map(async (chatId) => {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      return response.json();
    });

    const results = await Promise.allSettled(promises);
    
    console.log('📊 Resultados do envio:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Mensagens enviadas com sucesso!',
      sent_to: chatIds.length,
      results: results.map(r => r.status)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no Telegram:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
