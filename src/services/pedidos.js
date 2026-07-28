import { supabase } from "../lib/supabaseClient";

export async function listOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      clients ( nome ),
      order_items ( id, qtd, preco_unit, products ( name, code ) )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Cria o pedido e, em seguida, os itens. O total é recalculado sozinho pelo
// trigger recalc_order_total() assim que os itens são inseridos — não precisa
// (nem deve) ser calculado e enviado do front-end.
export async function createOrder(form) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      cliente_id: form.clienteId,
      desconto: Number(form.desconto) || 0,
      forma_pagamento: form.forma,
      parcelas: Number(form.parcelas) || 1,
      status: form.status || "Aguardando pagamento",
      transportadora: form.transportadora,
      rastreio: form.rastreio,
      obs: form.obs,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const itens = form.itens.map((i) => ({
    order_id: order.id,
    produto_id: i.productId,
    qtd: i.qtd,
    preco_unit: i.preco,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itens);
  if (itemsError) throw itemsError;

  return order;
}

// Só isso: mudar o status. Toda a automação (baixar estoque, creditar cliente,
// lançar no caixa, e o estorno em caso de cancelamento) acontece dentro do
// banco, via o trigger handle_order_status_change().
export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}
