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
