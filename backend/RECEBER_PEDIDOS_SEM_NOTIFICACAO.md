# 🚀 RECEBER PEDIDOS - SEM NOTIFICAÇÃO COM DADOS CUSTOMIZADOS

## 🎯 **O QUE FOI MODIFICADO:**

**ÚNICA MUDANÇA:** Removida apenas a função `enviarNotificacaoParaEntregadores()`

**PRESERVADO:** Toda a lógica de processamento dos dados customizados do WordPress

## ✅ **DADOS CUSTOMIZADOS PRESERVADOS:**

### 🔧 **Personalizados pelo WordPress (Tema Filho):**
```javascript
id_loja: payload.id_loja           // "L1", "L2", "L3"
id_woo: payload.id_woo            // Número do pedido WooCommerce
id_loja_woo: payload.id_loja_woo  // "L1-1001", "L2-1002"
loja_nome: payload.loja_nome      // "Mercearia Luanda", "Brasil Carne"
loja_telefone: payload.loja_telefone // "2132757548", "983496342"
loja_endereco: payload.loja_endereco // "Rua Casemiro de Abreu, 59"
```

### 📦 **Formato Especial dos Produtos:**
```javascript
// ✅ FORMATO PRESERVADO:
produto: payload.line_items?.map(item => `${item.name} (${item.quantity})`).join(', ') || null

// ✅ RESULTADO ESPERADO:
"Alface (1), Alcatra (Kg) (1), Banana Prata (190g cada uma) (1), Azeite Portugues (Litro) (1)"
```

## ❌ **O QUE FOI REMOVIDO:**

### 🔕 **Função de Notificação:**
```javascript
// ❌ REMOVIDO COMPLETO:
async function enviarNotificacaoParaEntregadores(pedidoInserido) {
  // Buscar entregadores
  // Buscar tokens FCM  
  // Enviar para send-notification Edge Function
}

// ❌ REMOVIDO DA LÓGICA PRINCIPAL:
await enviarNotificacaoParaEntregadores(pedidoInserido);
```

## ✅ **O QUE PERMANECEU INTACTO:**

### 🔧 **Customização WordPress:**
- ✅ Hook `woocommerce_webhook_payload`
- ✅ Identificação automática de sites (multisite/single)
- ✅ Mapeamento de lojas por `site_path`
- ✅ Adição de campos customizados ao payload
- ✅ Logs de debug no WordPress

### 📊 **Processamento Completo:**
- ✅ Validação de assinatura webhook
- ✅ Parse completo do payload
- ✅ Inserção com todos os campos customizados
- ✅ Controle de erros
- ✅ Logs detalhados

### 🎯 **Dados na Tabela `pedidos`:**
- ✅ `id_loja`, `id_woo`, `id_loja_woo` (customizados)
- ✅ `loja_nome`, `loja_telefone`, `loja_endereco` (customizados)  
- ✅ `produto` no formato especial desejado
- ✅ Todos os outros campos do WooCommerce

## 🚀 **RESULTADO:**

1. **WordPress** → Envia webhook com dados customizados
2. **receberPedidos** → Recebe e salva tudo no Supabase
3. **Entregadores** → Veem pedidos na página `pedidos-pendentes`
4. **Zero notificações** → Sistema mais simples e confiável

## 📋 **IMPLEMENTAÇÃO:**

1. **Substitua** o arquivo da Edge Function pelo novo código
2. **Deploy** a função atualizada
3. **Teste** um pedido no WooCommerce
4. **Verifique** se os dados aparecem corretamente em `pedidos-pendentes`

**APENAS NOTIFICAÇÕES REMOVIDAS - TUDO MAIS PRESERVADO!** ✅

