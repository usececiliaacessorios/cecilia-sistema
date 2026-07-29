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
