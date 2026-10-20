// "Despertador" do Supabase: o plano gratuito pausa o projeto após ~1 semana
// sem atividade. A Vercel chama esta rota uma vez por dia (veja "crons" em
// vercel.json) e ela faz uma consulta leve ao banco, o que conta como atividade.
// Usa as mesmas variáveis de ambiente do site (URL e chave pública/anon).
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: "Variáveis do Supabase não configuradas na Vercel" });
  }

  try {
    const resp = await fetch(`${url}/rest/v1/catalog_banners?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.status(resp.ok ? 200 : 502).json({ ok: resp.ok, status: resp.status, at: new Date().toISOString() });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
}
