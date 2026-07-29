import { supabase } from "../lib/supabaseClient";

function mapCashflowRow(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    desc: row.descricao,
    valor: row.valor,
    data: row.data,
    origem: row.origem,
  };
}

export async function listCashflow() {
  const { data, error } = await supabase
    .from("cashflow")
    .select("*")
    .order("data", { ascending: false });

  if (error) throw error;
  return data.map(mapCashflowRow);
}

// Lançamento manual (aluguel, embalagens, taxas...) — entradas/saídas de
// vendas e compras já são lançadas sozinhas pelos triggers do banco.
export async function createCashflowEntry(form) {
  const valorAbs = Math.abs(Number(form.valor) || 0);
  const { data, error } = await supabase
    .from("cashflow")
    .insert({
      tipo: form.tipo,
      descricao: form.desc,
      valor: form.tipo === "Saída" ? -valorAbs : valorAbs,
      data: form.data || new Date().toISOString().slice(0, 10),
      origem: "manual",
    })
    .select()
    .single();

  if (error) throw error;
  return mapCashflowRow(data);
}

// Só edita/exclui lançamentos manuais — os automáticos (origem 'pedido',
// 'compra', 'estorno') ficam presos ao pedido/compra de origem; a tela
// já bloqueia isso antes de chamar estas funções.
export async function updateCashflowEntry(id, form) {
  const valorAbs = Math.abs(Number(form.valor) || 0);
  const { data, error } = await supabase
    .from("cashflow")
    .update({
      tipo: form.tipo,
      descricao: form.desc,
      valor: form.tipo === "Saída" ? -valorAbs : valorAbs,
      data: form.data,
    })
    .eq("id", id)
    .eq("origem", "manual")
    .select()
    .single();

  if (error) throw error;
  return mapCashflowRow(data);
}

// Exclusão de lançamentos é restrita a admin pelo banco (mesma regra de
// produtos/pedidos) — quando bloqueado, o Supabase não retorna erro, só
// nenhuma linha afetada, então checamos isso aqui para avisar de verdade.
export async function deleteCashflowEntry(id) {
  const { data, error } = await supabase.from("cashflow").delete().eq("id", id).eq("origem", "manual").select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Não foi possível excluir — só administradores podem excluir lançamentos.");
  }
}
