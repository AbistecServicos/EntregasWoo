// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * FUNÇÃO RECEBER PEDIDOS - SEM NOTIFICAÇÕES
 * - Recebe webhook do WooCommerce com dados customizados do WordPress
 * - Valida assinatura
 * - Insere pedido completo no banco Supabase
 * - PRESERVA toda lógica de customização do WordPress
 * - SEM sistema de notificações (removido apenas send-notification)
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://czzidhzzpqegfvvmdgno.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Corrigido para a variável existente
console.log('🔑 Chave usada (supabaseKey):', supabaseKey); // Adicionando o log aqui
const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? 'xAI_WooHook_2025!@#Secure';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    console.log('📥 Webhook recebido - Corpo bruto:', body);
    
    const signature = req.headers.get('X-WC-Webhook-Signature');
    if (signature && webhookSecret) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), {
        name: 'HMAC',
        hash: 'SHA-256'
      }, false, ['sign']);
      const computedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const computedBase64 = btoa(String.fromCharCode(...new Uint8Array(computedSig)));
      if (signature !== computedBase64) {
        throw new Error('Assinatura inválida');
      }
    }
    
    let payload = JSON.parse(body);
    console.log('Webhook recebido - Resumo:', {
      id_loja: payload.id_loja,
      id_woo: payload.id_woo,
      id_loja_woo: payload.id_loja_woo,
      loja_nome: payload.loja_nome
    });

    // ✅ PRESERVA TODOS OS DADOS CUSTOMIZADOS DO WORDPRESS
    const pedidoData = {
      id_loja: payload.id_loja,                    // ← Customizado pelo WordPress
      id_woo: payload.id_woo,                      // ← Customizado pelo WordPress  
      id_loja_woo: payload.id_loja_woo,            // ← Customizado pelo WordPress
      loja_nome: payload.loja_nome,                // ← Customizado pelo WordPress
      loja_telefone: payload.loja_telefone,        // ← Customizado pelo WordPress
      loja_endereco: payload.loja_endereco,        // ← Customizado pelo WordPress
      status_transporte: 'aguardando',
      aceito_por_nome: null,
      aceito_por_email: null,
      aceito_por_telefone: null,
      aceito_por_uid: null,
      frete_oferecido: null,
      loja_obs: null,
      frete_pago: null,
      status_pagamento: !!payload.date_paid,
      data_pagamento: payload.date_paid ? new Date(payload.date_paid).toISOString() : null,
      nome_cliente: `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() || 'Desconhecido',
      email_cliente: payload.billing?.email || null,
      telefone_cliente: payload.billing?.phone || null,
      endereco_entrega: payload.shipping?.address_1 ? 
        `${payload.shipping.address_1}, ${payload.shipping.city}, ${payload.shipping.state}, ${payload.shipping.postcode}` : 
        null,
      // ✅ PRESERVA FORMATO ESPECIAL DOS PRODUTOS (customizado pelo WordPress)
      produto: payload.line_items?.map(item => `${item.name} (${item.quantity})`).join(', ') || null,
      forma_pagamento: payload.payment_method || null,
      total: parseFloat(payload.total) || 0,
      observacao_pedido: payload.customer_note || null,
      data: payload.date_created ? new Date(payload.date_created).toISOString() : new Date().toISOString(),
      ultimo_status: null
    };

    console.log('Dados para inserção:', pedidoData);

    // ✅ INSERÇÃO NO BANCO COM TODOS OS DADOS CUSTOMIZADOS
    const { data, error } = await supabase
      .from('pedidos')
      .insert([pedidoData])
      .select();

    if (error) throw error;

    const pedidoInserido = data[0];
    console.log(`✔ Inserção bem-sucedida. ID: ${pedidoInserido.id}`);

    // ❌ REMOVIDO: await enviarNotificacaoParaEntregadores(pedidoInserido);
    console.log('📝 Notificação removida - funcionalidade desabilitada');

    return new Response(JSON.stringify({
      message: 'Pedido recebido!',
      id: pedidoInserido.id,
      pedido: {
        id_loja_woo: pedidoInserido.id_loja_woo,
        loja_nome: pedidoInserido.loja_nome,
        produto: pedidoInserido.produto,
        total: pedidoInserido.total
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

