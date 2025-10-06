# Guia de Configuração do Sistema de Notificações Telegram para EntregasWoo

Este guia detalha os passos para configurar o sistema de notificações do Telegram, permitindo que gerentes de loja e entregadores recebam alertas sobre novos pedidos, pedidos aceitos e pedidos entregues.

---

## 1. Visão Geral do Sistema

- **Notificações por Loja:** Cada loja (L1, L2, L3, L4) terá seu próprio bot e grupo/canal no Telegram.
- **Gerentes:** Configuram o bot e adicionam entregadores ao grupo da sua loja.
- **Entregadores:** Recebem notificações sonoras e mensagens detalhadas no Telegram.
- **Gerenciamento:** A aceitação e atualização de status dos pedidos continuam sendo feitas pelo aplicativo web.

---

## 2. Configuração do Bot no Telegram (Para Cada Loja)

Para cada loja que você deseja configurar (L1, L2, L3, L4), siga estes passos:

### 2.1. Criar um Novo Bot com @BotFather

1. **Abra o Telegram** e procure por `@BotFather`.
2. Inicie uma conversa com ele e digite `/newbot`.
3. **Escolha um nome** para o seu bot (ex: "EntregasWoo L1 Bot").
4. **Escolha um username** para o seu bot (deve terminar com "bot", ex: "EntregasWooL1_bot").
5. O `@BotFather` irá fornecer um **HTTP API Token**. Guarde este token, ele será usado na configuração do Supabase.

### 2.2. Criar um Grupo ou Canal para a Loja

1. **Crie um novo grupo ou canal** no Telegram para a sua loja (ex: "Notificações EntregasWoo L1").
2. **Adicione o bot** que você acabou de criar a este grupo/canal.
3. **Torne o bot um administrador** do grupo/canal para que ele possa enviar mensagens.

### 2.3. Obter o Chat ID do Grupo/Canal

Para que o bot saiba para onde enviar as mensagens, você precisa do `chat_id` do grupo/canal.

1. **Envie uma mensagem qualquer** para o seu bot no grupo/canal (ex: "Olá").
2. Abra seu navegador e acesse a seguinte URL, substituindo `SEU_BOT_TOKEN` pelo token que você obteve do `@BotFather`:
   `https://api.telegram.org/bot<SEU_BOT_TOKEN>/getUpdates`
3. Procure na resposta JSON por um objeto `chat` dentro de `message` ou `channel_post`. O `id` dentro deste objeto `chat` é o `chat_id` que você precisa. Ele geralmente começa com `-100` para canais/grupos.
   Exemplo: `"chat":{"id":-1001234567890,"title":"Notificações EntregasWoo L1", ...}`
   Neste caso, o `chat_id` é `-1001234567890`.

---

## 3. Configuração no Supabase (Banco de Dados)

### 3.1. Executar o Schema SQL

O arquivo `database_schema_telegram.sql` contém a estrutura das tabelas necessárias.

1. **Acesse o Dashboard do Supabase.**
2. Vá para **SQL Editor**.
3. **Copie e cole o conteúdo** do arquivo `database_schema_telegram.sql` no editor.
4. **Execute a query.** Isso criará as tabelas `telegram_config`, `telegram_entregadores`, `telegram_notifications` e `telegram_templates`, além das políticas RLS.

### 3.2. Inserir Configurações Iniciais (Tabela `telegram_config`)

Para cada loja, insira o `bot_token` e o `chat_id` obtidos no Passo 2.

```sql
INSERT INTO public.telegram_config (id_loja, bot_token, chat_id, is_active)
VALUES
    ('L1', 'SEU_BOT_TOKEN_L1', 'SEU_CHAT_ID_L1', TRUE),
    ('L2', 'SEU_BOT_TOKEN_L2', 'SEU_CHAT_ID_L2', TRUE),
    ('L3', 'SEU_BOT_TOKEN_L3', 'SEU_CHAT_ID_L3', TRUE),
    ('L4', 'SEU_BOT_TOKEN_L4', 'SEU_CHAT_ID_L4', TRUE);
```
**Substitua `SEU_BOT_TOKEN_LX` e `SEU_CHAT_ID_LX` pelos valores reais de cada loja.**

### 3.3. Configurar Templates de Mensagem (Tabela `telegram_templates`)

Insira os templates de mensagem padrão. Você pode personalizá-los.

```sql
INSERT INTO public.telegram_templates (template_name, template_content, default_sound)
VALUES
    ('novo_pedido', '🚨 NOVO PEDIDO #{{pedido_id}} para *{{loja_nome}}*!\n\nCliente: {{nome_cliente}}\nTotal: {{total}}\nEndereço: {{endereco_entrega}}\nProduto(s): {{produto}}\nPagamento: {{forma_pagamento}}\nObservação: {{observacao_pedido}}\n\nAceite no app: [Link para o Pedido](https://app.entregaswoo.com.br/pedidos-pendentes)', 'default'),
    ('pedido_aceito', '✅ PEDIDO #{{pedido_id}} de *{{loja_nome}}* foi ACEITO por {{entregador_nome}} ({{entregador_telefone}}).\n\nVer detalhes no app: [Link para o Pedido](https://app.entregaswoo.com.br/pedidos-aceitos)', 'default'),
    ('pedido_entregue', '📦 PEDIDO #{{pedido_id}} de *{{loja_nome}}* foi ENTREGUE por {{entregador_nome}}.\n\nVer detalhes no app: [Link para o Pedido](https://app.entregaswoo.com.br/pedidos-entregues)', 'default');
```

---

## 4. Deploy da Edge Function do Supabase

A Edge Function `send-telegram-notification` é responsável por enviar as mensagens.

1. **Navegue até a pasta da Edge Function:**
   ```bash
   cd backend/supabase/functions/send-telegram-notification
   ```

2. **Faça o deploy da função:**
   ```bash
   supabase functions deploy send-telegram-notification --no-verify-jwt
   ```
   O `--no-verify-jwt` é necessário porque a função será invocada internamente pelo seu frontend, e não diretamente por um usuário autenticado via JWT.

---

## 5. Integração no Frontend (Aplicativo Web)

### 5.1. Componente de Configuração (Para Gerentes)

O componente `frontend/src/components/TelegramConfig.js` permite que os gerentes configurem o bot e os templates.

- **Adicione este componente** a uma página acessível apenas por gerentes (ex: `/admin/telegram-settings` ou dentro da página de perfil da loja).

### 5.2. Disparo de Notificações Automáticas

O arquivo `frontend/src/utils/pedidoNotifications.js` contém as funções para disparar notificações em eventos de pedido.

- **Integre estas funções** nos locais apropriados do seu código:
  - **`notifyNewPedido(pedido)`:** Chame esta função quando um **novo pedido** for criado (ex: após a inserção na tabela `pedidos` ou no webhook do WooCommerce).
  - **`notifyPedidoAceito(pedido)`:** Chame quando um entregador **aceitar um pedido**.
  - **`notifyPedidoEntregue(pedido)`:** Chame quando um pedido for marcado como **entregue**.

**Exemplo de integração em `pedidos-pendentes.js` (ao aceitar um pedido):**

```javascript
// Dentro da função que aceita o pedido
const { data: updatedPedido, error: updateError } = await supabase
  .from('pedidos')
  .update({
    status_transporte: 'aceito',
    aceito_por_uid: userProfile.uid,
    aceito_por_nome: userProfile.nome_completo,
    aceito_por_email: userProfile.email,
    aceito_por_telefone: userProfile.telefone,
  })
  .eq('id', pedidoId)
  .select()
  .single()

if (updateError) {
  console.error('Erro ao aceitar pedido:', updateError)
  // ... tratar erro
} else {
  // ✅ NOTIFICAÇÃO TELEGRAM: Pedido aceito
  await notifyPedidoAceito(updatedPedido)
  
  // ... resto da lógica
}
```

---

## 6. Adicionando Entregadores ao Sistema

### 6.1. Para Gerentes

1. **Adicione entregadores ao grupo/canal** do Telegram da sua loja.
2. **Configure os entregadores** na tabela `telegram_entregadores` via SQL ou através de uma interface administrativa.

```sql
INSERT INTO public.telegram_entregadores (uid_entregador, id_loja, is_active)
SELECT uid, 'L1', TRUE
FROM public.usuarios 
WHERE email = 'entregador@exemplo.com' AND is_admin = FALSE;
```

### 6.2. Para Entregadores

1. **Instale o Telegram** no celular.
2. **Peça ao gerente** para adicioná-lo ao grupo/canal da loja.
3. **Mantenha as notificações ativadas** para receber alertas sonoros.

---

## 7. Testando o Sistema

### 7.1. Teste Manual

1. **Configure uma loja** usando o componente `TelegramConfig`.
2. **Use o botão "Testar Notificação"** para enviar uma mensagem de teste.
3. **Verifique se a mensagem chegou** no grupo/canal do Telegram.

### 7.2. Teste com Pedido Real

1. **Crie um pedido de teste** no WooCommerce.
2. **Verifique se a notificação** foi enviada automaticamente.
3. **Aceite o pedido** e verifique se a notificação de "pedido aceito" foi enviada.
4. **Marque como entregue** e verifique se a notificação de "pedido entregue" foi enviada.

---

## 8. Monitoramento e Troubleshooting

### 8.1. Verificar Logs

- **Supabase Edge Functions:** Acesse o dashboard do Supabase > Edge Functions > Logs para ver erros.
- **Telegram API:** Use `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` para ver mensagens enviadas.

### 8.2. Problemas Comuns

1. **Bot não envia mensagens:** Verifique se o bot é administrador do grupo/canal.
2. **Chat ID incorreto:** Use o método do Passo 2.3 para obter o ID correto.
3. **Token inválido:** Verifique se o token do bot está correto.
4. **Edge Function não executa:** Verifique se a função foi deployada corretamente.

### 8.3. Histórico de Notificações

Use o componente `TelegramConfig` na aba "Histórico" para ver todas as notificações enviadas e seus status.

---

## 9. Personalização Avançada

### 9.1. Templates Personalizados

Você pode modificar os templates de mensagem diretamente no banco de dados ou através do componente `TelegramConfig`.

### 9.2. Sons Personalizados

O Telegram permite diferentes tipos de notificação. Modifique o campo `default_sound` nos templates.

### 9.3. Botões Interativos

Você pode adicionar botões inline ao Telegram usando `reply_markup` na Edge Function.

---

## 10. Segurança

- **Mantenha os tokens do bot seguros** e não os compartilhe publicamente.
- **Use RLS (Row Level Security)** para garantir que apenas usuários autorizados possam acessar as configurações.
- **Monitore o uso** das notificações para evitar spam.

---

## Próximos Passos

1. **Execute o schema SQL** no Supabase.
2. **Configure os bots** para cada loja.
3. **Faça o deploy** da Edge Function.
4. **Integre as notificações** no seu código frontend.
5. **Teste o sistema** com pedidos reais.

Para dúvidas ou problemas, consulte a documentação do Telegram Bot API: https://core.telegram.org/bots/api