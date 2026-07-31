import { supabase } from "../lib/supabaseClient";

// A tabela settings tem uma única linha fixa (id = true)
export async function getSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data;
}

// Só a coleção em destaque por enquanto — o restante da aba Empresa ainda é estático.
export async function updateColecaoDestaque(colecao) {
  const { error } = await supabase.from("settings").update({ colecao_destaque: colecao || null }).eq("id", true);
  if (error) throw error;
}
