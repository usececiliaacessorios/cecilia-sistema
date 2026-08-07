import { supabase } from "../lib/supabaseClient";

// Todas as metas cadastradas — o Dashboard filtra a do mês atual no front
// (tabela pequena, um registro por mês).
export async function listGoals() {
  const { data, error } = await supabase.from("financial_goals").select("*");
  if (error) throw error;
  return data;
}

// Cria ou atualiza a meta do mês/ano informado (um registro por mês).
export async function setGoalForMonth(mes, ano, valorMeta) {
  const { data: existing, error: findError } = await supabase
    .from("financial_goals")
    .select("id")
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from("financial_goals")
      .update({ valor_meta: valorMeta })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("financial_goals")
    .insert({ mes, ano, valor_meta: valorMeta })
    .select()
    .single();
  if (error) throw error;
  return data;
}
