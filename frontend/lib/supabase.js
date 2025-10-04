// ========================================
// SUPABASE CLIENT SIMPLIFICADO E OTIMIZADO
// ========================================
// Solução final para resolver AuthRetryableFetchError
// ========================================

import { createClient } from '@supabase/supabase-js';

// Validação de variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

// Configurações otimizadas para desenvolvimento
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInPersist: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
};

// Cliente principal
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Exportação padrão para compatibilidade
export default supabase;