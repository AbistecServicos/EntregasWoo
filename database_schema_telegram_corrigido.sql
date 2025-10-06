-- ========================================
-- SISTEMA DE NOTIFICAÇÕES TELEGRAM - ENTRREGASWOO (CORRIGIDO)
-- ========================================

-- 1. TABELA: Configurações do Telegram por Loja
CREATE TABLE telegram_config (
    id SERIAL PRIMARY KEY,
    id_loja VARCHAR(10) NOT NULL, -- L1, L2, L3, L4
    loja_nome VARCHAR(100) NOT NULL,
    bot_token VARCHAR(200) NOT NULL, -- Token do bot específico da loja
    chat_id VARCHAR(50) NOT NULL, -- ID do grupo/canal
    chat_type VARCHAR(20) DEFAULT 'group', -- group, channel, supergroup
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA: Entregadores Cadastrados no Telegram
CREATE TABLE telegram_entregadores (
    id SERIAL PRIMARY KEY,
    entregador_id UUID REFERENCES auth.users(id), -- ID do usuário no Supabase Auth
    id_loja VARCHAR(10) NOT NULL, -- Lojas onde o entregador trabalha
    telegram_user_id VARCHAR(50) NOT NULL, -- ID do usuário no Telegram
    telegram_username VARCHAR(50), -- @username do Telegram
    nome_entregador VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    cadastrado_por UUID REFERENCES auth.users(id), -- Quem cadastrou (gerente)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entregador_id, id_loja, telegram_user_id)
);

-- 3. TABELA: Histórico de Notificações Enviadas
CREATE TABLE telegram_notifications (
    id SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL,
    id_loja VARCHAR(10) NOT NULL,
    notification_type VARCHAR(20) DEFAULT 'novo_pedido', -- novo_pedido, pedido_aceito, etc
    message_content TEXT NOT NULL,
    telegram_message_id VARCHAR(50), -- ID da mensagem no Telegram
    sent_to_chat_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent', -- sent, failed, delivered
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA: Templates de Mensagens
CREATE TABLE telegram_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(50) NOT NULL,
    template_content TEXT NOT NULL,
    variables JSONB, -- Variáveis disponíveis: {pedido_id}, {cliente_nome}, {total}, etc
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX idx_telegram_config_loja ON telegram_config(id_loja);
CREATE INDEX idx_telegram_entregadores_loja ON telegram_entregadores(id_loja);
CREATE INDEX idx_telegram_entregadores_user ON telegram_entregadores(entregador_id);
CREATE INDEX idx_telegram_notifications_pedido ON telegram_notifications(id_pedido);
CREATE INDEX idx_telegram_notifications_loja ON telegram_notifications(id_loja);

-- ========================================
-- POLÍTICAS RLS (Row Level Security) - CORRIGIDAS
-- ========================================

-- Habilitar RLS
ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para telegram_config - CORRIGIDAS
CREATE POLICY "Gerentes podem ver config da sua loja" ON telegram_config
    FOR SELECT USING (
        auth.uid() IN (
            SELECT uid FROM usuarios 
            WHERE loja_associada = telegram_config.id_loja
        )
    );

CREATE POLICY "Admins podem ver todas as configs" ON telegram_config
    FOR ALL USING (
        auth.uid() IN (
            SELECT uid FROM usuarios WHERE is_admin = true
        )
    );

-- Políticas para telegram_entregadores - CORRIGIDAS
CREATE POLICY "Entregadores podem ver seus dados" ON telegram_entregadores
    FOR SELECT USING (auth.uid() = entregador_id);

CREATE POLICY "Gerentes podem gerenciar entregadores da sua loja" ON telegram_entregadores
    FOR ALL USING (
        auth.uid() IN (
            SELECT uid FROM usuarios 
            WHERE loja_associada = telegram_entregadores.id_loja
        )
    );

-- Políticas para telegram_notifications
CREATE POLICY "Admins podem ver todas as notificações" ON telegram_notifications
    FOR SELECT USING (
        auth.uid() IN (
            SELECT uid FROM usuarios WHERE is_admin = true
        )
    );

CREATE POLICY "Gerentes podem ver notificações da sua loja" ON telegram_notifications
    FOR SELECT USING (
        auth.uid() IN (
            SELECT uid FROM usuarios 
            WHERE loja_associada = telegram_notifications.id_loja
        )
    );

-- Políticas para telegram_templates
CREATE POLICY "Todos podem ver templates ativos" ON telegram_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins podem gerenciar templates" ON telegram_templates
    FOR ALL USING (
        auth.uid() IN (
            SELECT uid FROM usuarios WHERE is_admin = true
        )
    );

-- ========================================
-- FUNÇÕES AUXILIARES
-- ========================================

-- Função para obter configuração do Telegram por loja
CREATE OR REPLACE FUNCTION get_telegram_config(loja_id VARCHAR(10))
RETURNS TABLE (
    bot_token VARCHAR(200),
    chat_id VARCHAR(50),
    chat_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT tc.bot_token, tc.chat_id, tc.chat_type
    FROM telegram_config tc
    WHERE tc.id_loja = loja_id 
    AND tc.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter entregadores ativos por loja
CREATE OR REPLACE FUNCTION get_active_entregadores_telegram(loja_id VARCHAR(10))
RETURNS TABLE (
    telegram_user_id VARCHAR(50),
    nome_entregador VARCHAR(100),
    telegram_username VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT te.telegram_user_id, te.nome_entregador, te.telegram_username
    FROM telegram_entregadores te
    WHERE te.id_loja = loja_id 
    AND te.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS PARA AUTO-UPDATE
-- ========================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_telegram_config_updated_at 
    BEFORE UPDATE ON telegram_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_entregadores_updated_at 
    BEFORE UPDATE ON telegram_entregadores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DADOS INICIAIS (TEMPLATES)
-- ========================================

INSERT INTO telegram_templates (template_name, template_content, variables) VALUES
(
    'novo_pedido',
    '🛒 *NOVO PEDIDO DISPONÍVEL!*

📋 *Pedido:* #{pedido_id}
👤 *Cliente:* {cliente_nome}
📞 *Telefone:* {telefone_cliente}
🏪 *Loja:* {loja_nome}
💰 *Total:* R$ {total}
📍 *Endereço:* {endereco_entrega}

⏰ *Aceite o pedido no app EntregasWoo para começar a entrega!*

🔗 [Abrir App]({app_url})',
    '{"pedido_id": "ID do pedido", "cliente_nome": "Nome do cliente", "telefone_cliente": "Telefone do cliente", "loja_nome": "Nome da loja", "total": "Valor total", "endereco_entrega": "Endereço de entrega", "app_url": "URL do app"}'
),
(
    'pedido_aceito',
    '✅ *PEDIDO ACEITO!*

📋 *Pedido:* #{pedido_id}
🚚 *Entregador:* {entregador_nome}
⏰ *Aceito em:* {data_aceito}

🎯 *Boa entrega!*',
    '{"pedido_id": "ID do pedido", "entregador_nome": "Nome do entregador", "data_aceito": "Data/hora de aceite"}'
),
(
    'pedido_entregue',
    '🎉 *PEDIDO ENTREGUE!*

📋 *Pedido:* #{pedido_id}
🚚 *Entregador:* {entregador_nome}
⏰ *Entregue em:* {data_entrega}

💯 *Parabéns pela entrega!*',
    '{"pedido_id": "ID do pedido", "entregador_nome": "Nome do entregador", "data_entrega": "Data/hora de entrega"}'
);

-- ========================================
-- CONFIGURAÇÕES INICIAIS DAS LOJAS
-- ========================================

INSERT INTO telegram_config (id_loja, loja_nome, bot_token, chat_id, chat_type) VALUES
('L1', 'Mercearia Luanda', 'SEU_BOT_TOKEN_L1', 'SEU_CHAT_ID_L1', 'group'),
('L2', 'Brasil Carne', 'SEU_BOT_TOKEN_L2', 'SEU_CHAT_ID_L2', 'group'),
('L3', 'Mistos Angola', 'SEU_BOT_TOKEN_L3', 'SEU_CHAT_ID_L3', 'group'),
('L4', '3G Luanda', 'SEU_BOT_TOKEN_L4', 'SEU_CHAT_ID_L4', 'group');

