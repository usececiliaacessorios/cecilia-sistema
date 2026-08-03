import { supabase } from "../lib/supabaseClient";

// Catálogo público — registra uma visita (a tela já garante no máximo uma
// por visitor_id a cada 30 minutos, usando o localStorage dela).
export async function registerVisit(visitorId, pagina = "/catalogo") {
  const { error } = await supabase.from("catalog_visits").insert({ visitor_id: visitorId, pagina });
  if (error) throw error;
}

// Área interna — todas as visitas, para Dashboard e Relatórios agregarem
// (tabela pequena; agregação é feita no front).
export async function listVisits() {
  const { data, error } = await supabase.from("catalog_visits").select("visitor_id, pagina, criado_em");
  if (error) throw error;
  return data;
}
