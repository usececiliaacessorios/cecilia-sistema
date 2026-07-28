import { createClient } from "@supabase/supabase-js";

// Essas duas variáveis vêm do arquivo .env.local (veja .env.local.example)
// Nunca coloque a URL/chave direto no código quando for subir para produção.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
