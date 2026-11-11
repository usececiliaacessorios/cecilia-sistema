import { supabase } from "../lib/supabaseClient";

// Catálogo público — registra o clique em "Compartilhar" (origem "compartilhar")
// ou em "Enviar pelo WhatsApp" da sacola (origem "sacola", um registro por peça
// da sacola). Quem chama deve ignorar erros: medir nunca pode atrapalhar o
// cliente de abrir o WhatsApp.
export async function registerWhatsappClicks(produtoIds, visitorId, origem) {
  const rows = produtoIds.map((produto_id) => ({ produto_id, visitor_id: visitorId, origem }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("catalog_whatsapp_clicks").insert(rows);
  if (error) throw error;
}

// Área interna — todos os cliques (tabela pequena; agregação no front, como
// visitas e favoritos). Se a tabela ainda não existir ou falhar, devolve lista
// vazia em vez de derrubar o carregamento do sistema inteiro.
export async function listWhatsappClicks() {
  const { data, error } = await supabase.from("catalog_whatsapp_clicks").select("produto_id, visitor_id, origem, criado_em");
  if (error) {
    console.warn("Cliques no WhatsApp indisponíveis:", error.message);
    return [];
  }
  return data;
}
