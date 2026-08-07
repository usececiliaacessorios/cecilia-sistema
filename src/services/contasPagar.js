import { supabase } from "../lib/supabaseClient";

function mapAccountRow(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: row.valor,
    vencimento: row.vencimento,
    pago: row.pago,
    pagoEm: row.pago_em,
    fornecedorId: row.fornecedor_id,
    fornecedor: row.suppliers?.nome ?? "",
  };
}

export async function listAccountsPayable() {
  const { data, error } = await supabase
    .from("accounts_payable")
    .select(`*, suppliers ( nome )`)
    .order("vencimento", { ascending: true });
  if (error) throw error;
  return data.map(mapAccountRow);
}

export async function createAccountPayable(form) {
  const { data, error } = await supabase
    .from("accounts_payable")
    .insert({
      descricao: form.descricao,
      valor: Number(form.valor) || 0,
      vencimento: form.vencimento,
      fornecedor_id: form.fornecedorId || null,
    })
    .select(`*, suppliers ( nome )`)
    .single();
  if (error) throw error;
  return mapAccountRow(data);
}

export async function updateAccountPayable(id, form) {
  const { data, error } = await supabase
    .from("accounts_payable")
    .update({
      descricao: form.descricao,
      valor: Number(form.valor) || 0,
      vencimento: form.vencimento,
      fornecedor_id: form.fornecedorId || null,
    })
    .eq("id", id)
    .select(`*, suppliers ( nome )`)
    .single();
  if (error) throw error;
  return mapAccountRow(data);
}

export async function deleteAccountPayable(id) {
  const { error } = await supabase.from("accounts_payable").delete().eq("id", id);
  if (error) throw error;
}

// Marca como paga e lança a saída correspondente no caixa. Não existe
// trigger para essa tabela (diferente de purchases/orders) — as duas
// escritas acontecem aqui mesmo, em sequência.
export async function markAccountAsPaid(conta) {
  const hoje = new Date().toISOString().slice(0, 10);

  const { error: updateError } = await supabase
    .from("accounts_payable")
    .update({ pago: true, pago_em: hoje })
    .eq("id", conta.id);
  if (updateError) throw updateError;

  const { error: cashflowError } = await supabase.from("cashflow").insert({
    tipo: "Saída",
    descricao: conta.descricao,
    valor: -Math.abs(conta.valor),
    data: hoje,
    origem: "conta_a_pagar",
    referencia_id: conta.id,
  });
  if (cashflowError) throw cashflowError;
}
