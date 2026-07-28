import { supabase } from "../lib/supabaseClient";

export async function login(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw error;
  return data.user;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Busca nome e papel do usuário logado na tabela profiles (nome, papel: 'admin' | 'vendas')
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("nome, papel").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

// Atualiza o nome do usuário logado na tabela profiles
export async function updateCurrentProfile(nome) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nenhum usuário logado.");

  const { data, error } = await supabase.from("profiles").update({ nome }).eq("id", user.id).select("nome, papel").single();
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Escuta mudanças de sessão (login/logout em outra aba, expiração de token etc.)
export function onAuthChange(callback) {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => listener.subscription.unsubscribe();
}
