import { supabase } from "../lib/supabaseClient";

function mapClientRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    cidade: row.cidade,
    estado: row.estado,
    aniversario: row.aniversario ?? "",
    dataCadastro: row.data_cadastro,
    totalGasto: row.total_gasto ?? 0,
    qtdPedidos: row.qtd_pedidos ?? 0,
    obs: row.obs,
  };
}

export async function listClients() {
  const { data, error } = await supabase.from("clients").select("*").order("nome");
  if (error) throw error;
  return data.map(mapClientRow);
}

// total_gasto e qtd_pedidos não são enviados aqui — são mantidos pelo
// trigger handle_order_status_change() quando um pedido é pago/cancelado.
export async function createClient(form) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      nome: form.nome,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      cidade: form.cidade,
      estado: form.estado,
      aniversario: form.aniversario || null,
      obs: form.obs,
    })
    .select()
    .single();

  if (error) throw error;
  return mapClientRow(data);
}

export async function updateClient(id, form) {
  const { data, error } = await supabase
    .from("clients")
    .update({
      nome: form.nome,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      cidade: form.cidade,
      estado: form.estado,
      aniversario: form.aniversario || null,
      obs: form.obs,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapClientRow(data);
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
