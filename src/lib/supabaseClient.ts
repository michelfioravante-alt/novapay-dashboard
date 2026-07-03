import { createClient } from '@supabase/supabase-js';

// Credenciais de conexão para a base de dados do Supabase
// Utilizamos variáveis de ambiente do Vite por padrão, com fallback seguro para a base "novapay"
// Isso garante que a aplicação funcione de forma transparente tanto localmente quanto após o deploy
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rxtnlvzxhzyeetpobkyx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dG5sdnp4aHp5ZWV0cG9ia3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODUwMDIsImV4cCI6MjA5ODY2MTAwMn0.Od8bDBEYeRmx2FPZrKdwIzfJkAF3qziABFmVDyBM5uY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Alerta: Credenciais do Supabase não encontradas. Certifique-se de configurar o arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
