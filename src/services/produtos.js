import { supabase } from "../lib/supabaseClient";

// Converte uma linha de "products" (snake_case, com joins em categories/suppliers)
// para o formato camelCase que as telas do app usam.
function mapProductRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.categories?.nome ?? "",
    categoryId: row.category_id,
    collection: row.collection,
    photo: row.photo_url ?? "",
    banho: row.banho,
    cor: row.cor,
    pedra: row.pedra,
    garantia: row.garantia,
    peso: row.peso,
    fornecedor: row.suppliers?.nome ?? "",
    fornecedorId: row.fornecedor_id,
    dataCompra: row.data_compra ?? "",
    valorPago: row.valor_pago ?? 0,
    freteRateado: row.frete_rateado ?? 0,
    custoTotal: row.custo_total ?? 0,
    precoSugerido: row.preco_sugerido ?? 0,
    margem: row.margem ?? 0,
    lucro: row.lucro ?? 0,
    promocao: row.promocao,
    disponibilidade: row.disponibilidade ?? "Pronta entrega",
    quantidade: row.quantidade,
    estoqueMinimo: row.estoque_minimo,
    localizacao: row.localizacao,
  };
}

// Lista produtos já trazendo o nome da categoria e do fornecedor (joins),
// convertidos para o mesmo formato camelCase usado no restante do app.
export async function listProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories ( nome ),
      suppliers ( nome )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapProductRow);
}

export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("id, nome, prefixo").order("nome");
  if (error) throw error;
  return data;
}

// Cria um produto. O código (BR0001, CL0001...) é gerado sozinho pelo banco —
// não precisa (e não deve) ser enviado aqui.
export async function createProduct(form) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: form.name,
      category_id: form.categoryId,
      collection: form.collection,
      banho: form.banho,
      cor: form.cor,
      pedra: form.pedra,
      garantia: form.garantia,
      peso: form.peso,
      fornecedor_id: form.fornecedorId || null,
      data_compra: form.dataCompra || null,
      valor_pago: Number(form.valorPago) || 0,
      frete_rateado: Number(form.freteRateado) || 0,
      custo_total: (Number(form.valorPago) || 0) + (Number(form.freteRateado) || 0),
      preco_sugerido: Number(form.precoSugerido) || 0,
      promocao: !!form.promocao,
      disponibilidade: form.disponibilidade || "Pronta entrega",
      quantidade: Number(form.quantidade) || 0,
      estoque_minimo: Number(form.estoqueMinimo) || 5,
      localizacao: form.localizacao,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id, form) {
  const { data, error } = await supabase
    .from("products")
    .update({
      name: form.name,
      category_id: form.categoryId,
      collection: form.collection,
      banho: form.banho,
      cor: form.cor,
      pedra: form.pedra,
      garantia: form.garantia,
      peso: form.peso,
      preco_sugerido: Number(form.precoSugerido) || 0,
      promocao: !!form.promocao,
      disponibilidade: form.disponibilidade || "Pronta entrega",
      quantidade: Number(form.quantidade) || 0,
      estoque_minimo: Number(form.estoqueMinimo) || 5,
      localizacao: form.localizacao,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Cria vários produtos de uma vez (importação de planilha). Cada linha já
// deve trazer categoryId resolvido. O código (BR0001...) é gerado sozinho
// pelo banco para cada linha.
export async function bulkCreateProducts(rows) {
  const { data, error } = await supabase
    .from("products")
    .insert(rows.map((r) => ({
      name: r.name,
      category_id: r.categoryId,
      garantia: "12 meses",
      valor_pago: Number(r.valorPago) || 0,
      frete_rateado: Number(r.freteRateado) || 0,
      custo_total: Number(r.custoTotal) || 0,
      preco_sugerido: Number(r.precoSugerido) || 0,
      disponibilidade: r.disponibilidade || "Pronta entrega",
      quantidade: Number(r.quantidade) || 0,
      estoque_minimo: 5,
    })))
    .select();

  if (error) throw error;
  return data.map(mapProductRow);
}

// Catálogo público (view "public_catalog", sem exigir login) — usado pela página /catalogo
export async function listPublicCatalog() {
  const { data, error } = await supabase
    .from("public_catalog")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// Upload de foto: salva no bucket "produtos-fotos" e devolve a URL pública
export async function uploadProductPhoto(productId, file) {
  const path = `${productId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("produtos-fotos").upload(path, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("produtos-fotos").getPublicUrl(path);
  const photoUrl = data.publicUrl;

  const { error: updateError } = await supabase.from("products").update({ photo_url: photoUrl }).eq("id", productId);
  if (updateError) throw updateError;

  return photoUrl;
}
