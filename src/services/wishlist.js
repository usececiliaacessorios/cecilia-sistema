import { supabase } from "../lib/supabaseClient";

// Catálogo público (visitante anônimo, sem login) — lista de produtos que
// ESSE visitante (identificado por visitor_id salvo no localStorage dele)
// já favoritou.
export async function listWishlistIds(visitorId) {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("produto_id")
    .eq("visitor_id", visitorId);

  if (error) throw error;
  return data.map((r) => r.produto_id);
}

export async function addWishlistItem(produtoId, visitorId) {
  const { error } = await supabase.from("wishlist_items").insert({ produto_id: produtoId, visitor_id: visitorId });
  if (error) throw error;
}

export async function removeWishlistItem(produtoId, visitorId) {
  const { error } = await supabase.from("wishlist_items").delete().eq("produto_id", produtoId).eq("visitor_id", visitorId);
  if (error) throw error;
}

// Área interna — quantos favoritos cada produto tem, agregado no front
// (a tabela costuma ser pequena; não precisa de view/RPC no banco).
export async function listWishlistCounts() {
  const { data, error } = await supabase.from("wishlist_items").select("produto_id");
  if (error) throw error;
  const counts = {};
  data.forEach((r) => { counts[r.produto_id] = (counts[r.produto_id] || 0) + 1; });
  return counts;
}
