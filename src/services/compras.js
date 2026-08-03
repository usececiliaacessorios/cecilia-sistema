import { supabase } from "../lib/supabaseClient";

function mapPurchaseRow(row) {
  return {
    id: row.id,
    fornecedorId: row.fornecedor_id,
    fornecedor: row.suppliers?.nome ?? "",
    produtoId: row.produto_id,
    produtoNome: row.products?.name ?? "",
    produtoCode: row.products?.code ?? "",
    data: row.data,
    frete: row.frete,
    qtdPecas: row.qtd_pecas,
    valorTotal: row.valor_total,
    freteUnit: row.frete_unit,
  };
}

export async function listPurchases() {
  const { data, error } = await supabase
    .from("purchases")
    .select(`
      *,
      suppliers ( nome ),
      products ( name, code )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapPurchaseRow);
}

// Insere a compra — o trigger apply_purchase() no banco cuida sozinho de
// somar o estoque, recalcular o custo médio ponderado do produto e lançar
// a saída correspondente no fluxo de caixa. Não duplicar essa lógica aqui.
export async function createPurchase(form) {
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      fornecedor_id: form.fornecedorId,
      produto_id: form.produtoId,
      data: form.data || new Date().toISOString().slice(0, 10),
      frete: Number(form.frete) || 0,
      qtd_pecas: Number(form.qtdPecas) || 0,
      valor_total: Number(form.valorTotal) || 0,
    })
    .select(`*, suppliers ( nome ), products ( name, code )`)
    .single();

  if (error) throw error;
  return mapPurchaseRow(data);
}
