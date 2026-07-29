import React, { useEffect, useState } from "react";
import { ImagePlus, MessageCircle } from "lucide-react";
import { listPublicCatalog } from "../services/produtos";
import { GREEN, GOLD, CREAM, INK, FONT_IMPORT, money } from "../App";

const TABS = ["Pronta entrega", "Sob encomenda"];

export default function PublicCatalogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Pronta entrega");

  useEffect(() => {
    listPublicCatalog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((p) => p.disponibilidade === tab);

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "Manrope" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .cc-card { background: #fff; border: 1px solid #EFEBE0; border-radius: 16px; }
        .cc-btn-gold {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: ${GOLD}; color: #fff; border: none; border-radius: 10px;
          padding: 10px 18px; font-family: Manrope; font-weight: 700; font-size: 13px; cursor: pointer;
          transition: background .15s; text-decoration: none;
        }
        .cc-btn-gold:hover { background: #B4923F; }
        .cc-catalog-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 18px; }
        .cc-catalog-card { padding: 16px; }
      `}</style>

      <header style={{ padding: "34px 24px 18px", textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, margin: "0 auto 10px", borderRadius: "50%",
          border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "Cormorant Garamond", fontSize: 24, color: GREEN, fontStyle: "italic" }}>C</span>
        </div>
        <h1 style={{ fontFamily: "Cormorant Garamond", fontSize: 34, color: GREEN, margin: 0, letterSpacing: ".02em" }}>Cecília</h1>
        <p style={{ fontFamily: "Cormorant Garamond", fontStyle: "italic", fontSize: 16, color: GOLD, margin: "4px 0 0" }}>Catálogo de peças</p>
      </header>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 26, flexWrap: "wrap", padding: "0 16px" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: "Manrope", fontSize: 13, fontWeight: 700, padding: "9px 22px", borderRadius: 20,
            border: `1px solid ${tab === t ? GREEN : "#E2E0D6"}`,
            background: tab === t ? GREEN : "#fff", color: tab === t ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <main style={{ padding: "0 24px 60px", maxWidth: 1200, margin: "0 auto" }}>
        {loading && <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#8A968F" }}>Carregando catálogo...</p>}
        {error && <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#B94A48" }}>Erro ao carregar catálogo: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#8A968F" }}>Nenhuma peça disponível nesta categoria no momento.</p>
        )}
        <div className="cc-catalog-grid">
          {filtered.map((p) => {
            const msg = encodeURIComponent(`Olá! Tenho interesse na peça ${p.name} (${p.code}) — ${money(p.preco_sugerido)}.`);
            const detalhes = [p.banho, p.cor, p.pedra].filter(Boolean).join(" · ");
            return (
              <div key={p.id} className="cc-card cc-catalog-card">
                <div style={{
                  aspectRatio: "1/1", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative", overflow: "hidden",
                  background: p.photo_url ? `center/cover no-repeat url(${p.photo_url})` : `linear-gradient(150deg, ${CREAM}, #F0ECE0)`,
                }}>
                  {!p.photo_url && <ImagePlus size={28} color="#C9BFA6" />}
                  {p.promocao && <span style={{ position: "absolute", top: 10, left: 10, background: GOLD, color: "#fff", fontFamily: "Manrope", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 12 }}>PROMOÇÃO</span>}
                </div>
                <p style={{ fontFamily: "Manrope", fontSize: 11, fontWeight: 700, color: GOLD, margin: 0, letterSpacing: ".04em" }}>{p.code}</p>
                <p style={{ fontFamily: "Cormorant Garamond", fontSize: 19, fontWeight: 600, margin: "3px 0 6px", color: INK }}>{p.name}</p>
                <p style={{ fontFamily: "Manrope", fontSize: 12, color: "#7A897F", margin: "0 0 10px", lineHeight: 1.5 }}>
                  {[detalhes, p.garantia ? `Garantia ${p.garantia}` : ""].filter(Boolean).join(" · ")}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 700, color: GREEN }}>{money(p.preco_sugerido)}</span>
                  <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noopener noreferrer" className="cc-btn-gold" style={{ padding: "8px 12px", fontSize: 12 }}>
                    <MessageCircle size={14} /> Compartilhar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
