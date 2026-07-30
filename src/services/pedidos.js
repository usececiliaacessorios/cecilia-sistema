import { supabase } from "../lib/supabaseClient";

// Converte uma linha de "orders" (snake_case, com joins em clients/order_items)
// para o formato camelCase que as telas do app usam.
function mapOrderRow(row) {
  const itens = (row.order_items || []).map((i) => ({
    id: i.id,
    productId: i.products?.id ?? null,
    code: i.products?.code ?? "",
    name: i.products?.name ?? "",
    qtd: i.qtd,
    preco: i.preco_unit,
    personalizacao: i.personalizacao ?? "",
  }));
  return {
    id: row.id,
    numero: row.numero,
    clienteId: row.cliente_id,
    cliente: row.clients?.nome ?? "",
    itens,
    produtos: itens.map((i) => `${i.name}${i.personalizacao ? ` (personalização: ${i.personalizacao})` : ""} x${i.qtd}`).join(", "),
    desconto: row.desconto ?? 0,
    forma: row.forma_pagamento ?? "",
    parcelas: row.parcelas ?? 1,
    status: row.status,
    rastreio: row.rastreio ?? "",
    transportadora: row.transportadora ?? "",
    obs: row.obs ?? "",
    total: row.total ?? 0,
    baixado: row.baixado,
    data: row.data,
  };
}

export async function listOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      clients ( nome ),
      order_items ( id, qtd, preco_unit, personalizacao, products ( id, name, code ) )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapOrderRow);
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
    personalizacao: i.personalizacao || null,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itens);
  if (itemsError) throw itemsError;

  return order;
}

// Edita um pedido existente: atualiza os campos do pedido e substitui os
// itens (apaga os antigos e insere os novos) — o total é recalculado
// sozinho pelo trigger assim que os itens mudam.
export async function updateOrder(id, form) {
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      cliente_id: form.clienteId,
      desconto: Number(form.desconto) || 0,
      forma_pagamento: form.forma,
      parcelas: Number(form.parcelas) || 1,
      status: form.status,
      transportadora: form.transportadora,
      rastreio: form.rastreio,
      obs: form.obs,
    })
    .eq("id", id);

  if (orderError) throw orderError;

  const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", id);
  if (deleteError) throw deleteError;

  const itens = (form.itens || []).map((i) => ({
    order_id: id,
    produto_id: i.productId,
    qtd: i.qtd,
    preco_unit: i.preco,
    personalizacao: i.personalizacao || null,
  }));
  if (itens.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(itens);
    if (itemsError) throw itemsError;
  }
}

// Só isso: mudar o status. Toda a automação (baixar estoque, creditar cliente,
// lançar no caixa, e o estorno em caso de cancelamento) acontece dentro do
// banco, via o trigger handle_order_status_change().
export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

// Exclui o pedido — order_items é apagado junto (on delete cascade).
// Chame só para pedidos que ainda não foram baixados; um pedido já baixado
// deve ser cancelado primeiro (o status "Cancelado" já estorna estoque,
// cliente e caixa via trigger) e só depois excluído.
export async function deleteOrder(id) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}
