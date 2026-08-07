import { supabase } from "../lib/supabaseClient";

export async function getSettings() {
  const { data, error } = await supabase.from("settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data;
}

// Alterar configurações é restrito a admin pelo banco — quando bloqueado,
// o Supabase não retorna erro, só nenhuma linha afetada, então checamos
// isso aqui para avisar de verdade em vez de fingir que salvou.
export async function updateSettings(fields) {
  const { data, error } = await supabase.from("settings").update(fields).eq("id", true).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Não foi possível salvar — só administradores podem alterar as configurações.");
  }
  return data[0];
}
