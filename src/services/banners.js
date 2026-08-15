import { supabase } from "../lib/supabaseClient";

function mapBannerRow(row) {
  return {
    id: row.id,
    imagemUrl: row.imagem_url,
    ordem: row.ordem,
    ativo: row.ativo,
  };
}

// Todos os banners (ativos e inativos), pra tela de gestão em Configurações.
export async function listBanners() {
  const { data, error } = await supabase.from("catalog_banners").select("*").order("ordem", { ascending: true });
  if (error) throw error;
  return data.map(mapBannerRow);
}

// Só os ativos, na ordem certa — usado pelo carrossel do catálogo público.
export async function listActiveBanners() {
  const { data, error } = await supabase
    .from("catalog_banners")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data.map(mapBannerRow);
}

// Extrai o caminho dentro do bucket a partir da URL pública, pra dar pra apagar
// o arquivo do Storage depois. Banners cadastrados com uma URL que não é do
// bucket (ex: arquivo estático em /public) simplesmente não têm o que apagar.
function pathFromPublicUrl(url) {
  const marker = "/catalogo-banners/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function uploadBannerImage(file) {
  const path = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("catalogo-banners").upload(path, file);
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("catalogo-banners").getPublicUrl(path);
  return data.publicUrl;
}

export async function createBanner(imagemUrl, ordem) {
  const { data, error } = await supabase
    .from("catalog_banners")
    .insert({ imagem_url: imagemUrl, ordem, ativo: true })
    .select()
    .single();
  if (error) throw error;
  return mapBannerRow(data);
}

export async function updateBannerOrder(id, ordem) {
  const { error } = await supabase.from("catalog_banners").update({ ordem }).eq("id", id);
  if (error) throw error;
}

export async function setBannerActive(id, ativo) {
  const { error } = await supabase.from("catalog_banners").update({ ativo }).eq("id", id);
  if (error) throw error;
}

// Remove a linha e, se a imagem estiver no bucket catalogo-banners, o arquivo também.
export async function deleteBanner(banner) {
  const path = pathFromPublicUrl(banner.imagemUrl);
  if (path) {
    await supabase.storage.from("catalogo-banners").remove([path]);
  }
  const { error } = await supabase.from("catalog_banners").delete().eq("id", banner.id);
  if (error) throw error;
}
