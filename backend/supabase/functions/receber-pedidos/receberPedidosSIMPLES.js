// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * VERSIONADO DE WEBHOOK SIMPLIFICADO - SEM NOTIFICAÇÕES
 * 
 * Este arquivo recebe pedidos do WooCommerce e salva no Supabase
 * SEM enviar notificações (Telegram, Firebase, etc.)
 * 
 * Uso recomendado:
 * - Durante desenvolvimento/teste
 * - Quando notificações estão causando problemas
 * - Para debug e isolamento de funcionalidades
 */

/**
 * Bloco 1: Configurações Globais - MANTIDO
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://czzidhzzpqegfvvmdgno.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const webhookSecret = Deno.env.get('WEBHOOK_SECRET') ?? 'xAI_WooHook_2025!@#Secure';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Bloco 2: FUNÇÃO DE NOTIFICAÇÕES REMOVIDA COMPLETAMENTE
 * ❌ NÃO HÁ MAIS NENHUMA FUNÇÃO DE NOTIFICAÇÃO
 * ❌ NÃO HÁ CHAMADAS PARA Telegram, Firebase, etc.
 */

/**
 * Bloco 3: Servidor Principal - SIMPLIFICADO
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    console.log('📥 Webhook SIMPLES recebido - Corpo bruto:', body);

    // Validação de assinatura - MANTIDO
    const signature = req.headers.get('X-WC-Webhook-Signature');
    if (signature && webhookSecret) {
      const key = await crypto.subtle.importKey(
        'raw', 
        new TextEncoder().encode(webhookSecret), 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const computedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const computedBase64 = btoa(String.fromCharCode(...new Uint8Array(computedSig)));
      
      if (signature !== computedBase64) {
        throw new Error('Assinatura inválida');
      }
    }

    let payload = JSON.parse(body);
    console.log('Webhook SIMPLES recebido - Resumo:', {
      id_loja: payload.id_loja,
      id_woo: payload.id_woo,
      tipo: 'SIMPLES [SEM NOTIFICAÇÕES]'
    });

    // Dados do pedido - MANTIDO IGUAL À VERSÃO COMPLETA
    const pedidoData = {
      id_loja: payload.id_loja,
      id_woo: payload.id_woo,
      id_loja_woo: payload.id_loja_woo,
      loja_nome: payload.loja_nome,
      loja_telefone: payload.loja_telefone,
      loja_endereco: payload.loja_endereco,
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
        `${payload.shipping.address_1}, ${payload.shipping.city}, ${payload.shipping.state}, ${payload.shipping.postcode}` : null,
      produto: payload.line_items?.map((item) => `${item.name} (${item.quantity})`).join(', ') || null,
      forma_pagamento: payload.payment_method || null,
      total: parseFloat(payload.total) || 0,
      observacao_pedido: payload.customer_note || null,
      data: payload.date_created ? new Date(payload.date_created).toISOString() : new Date().toISOString(),
      ultimo_status: null
    };

    console.log('📝 Dados para inserção (SEM NOTIFICAÇÕES):', pedidoData);

    // Inserir no Supabase - MANTIDO
    const { data, error } = await supabase.from('pedidos').insert([pedidoData]).select();
    
    if (error) throw error;

    const pedidoInserido = data[0];
    console.log(`✅ Inserção SIMPLES bem-sucedida. ID: ${pedidoInserido.id}`);

    // ❌ SEM CHAMADA PARA NOTIFICAÇÕES
    // Este é o comportamento "limpo" - apenas salva o pedido

    return new Response(
      JSON.stringify({
        message: 'Pedido recebido e salvo! (MODO SIMPLES - Notificações desativadas)',
        id: pedidoInserido.id,
        modo: 'SIMPLES',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro no webhook SIMPLES:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        modo: 'SIMPLES',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});