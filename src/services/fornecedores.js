import { supabase } from "../lib/supabaseClient";

function mapSupplierRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    contato: row.contato,
    telefone: row.telefone,
    instagram: row.instagram,
    site: row.site,
    prazoMedio: row.prazo_medio,
    obs: row.obs,
  };
}

export async function listSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").order("nome");
  if (error) throw error;
  return data.map(mapSupplierRow);
}

export async function createSupplier(form) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      nome: form.nome,
      contato: form.contato,
      telefone: form.telefone,
      instagram: form.instagram,
      site: form.site,
      prazo_medio: form.prazoMedio,
      obs: form.obs,
    })
    .select()
    .single();

  if (error) throw error;
  return mapSupplierRow(data);
}

export async function updateSupplier(id, form) {
  const { data, error } = await supabase
    .from("suppliers")
    .update({
      nome: form.nome,
      contato: form.contato,
      telefone: form.telefone,
      instagram: form.instagram,
      site: form.site,
      prazo_medio: form.prazoMedio,
      obs: form.obs,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapSupplierRow(data);
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}
