// Cliente Supabase — ponto único de conexão com o banco

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Configuracao ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para habilitar os fluxos com banco.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
