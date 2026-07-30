import React, { useEffect, useState } from "react";
import { ImagePlus, MessageCircle, ShoppingBag, X } from "lucide-react";
import { listPublicCatalog } from "../services/produtos";
import { GREEN, GREEN_DARK, GOLD, CREAM, INK, FONT_IMPORT, money, CeciliaLogo } from "../App";

const TABS = ["Pronta entrega", "Sob encomenda"];
const WHATSAPP_NUMBER = "5566999428631";

// Desconto por quantidade de peças no carrinho (não por valor).
// A contagem soma as quantidades de todos os itens, não o nº de produtos diferentes.
const DISCOUNT_TIER_1_QTY = 2;
const DISCOUNT_TIER_1_RATE = 0.10; // 10%
const DISCOUNT_TIER_2_QTY = 3;
const DISCOUNT_TIER_2_RATE = 0.15; // 15%

function getCartDiscountRate(totalQty) {
  if (totalQty >= DISCOUNT_TIER_2_QTY) return DISCOUNT_TIER_2_RATE;
  if (totalQty >= DISCOUNT_TIER_1_QTY) return DISCOUNT_TIER_1_RATE;
  return 0;
}

function getCartIncentiveMessage(totalQty) {
  if (totalQty >= DISCOUNT_TIER_2_QTY) {
    return `🎉 Você ganhou ${DISCOUNT_TIER_2_RATE * 100}% de desconto!`;
  }
  if (totalQty >= DISCOUNT_TIER_1_QTY) {
    const missing = DISCOUNT_TIER_2_QTY - totalQty;
    return `Adicione mais ${missing} peça${missing > 1 ? "s" : ""} e ganhe ${DISCOUNT_TIER_2_RATE * 100}% OFF!`;
  }
  const missing = DISCOUNT_TIER_1_QTY - totalQty;
  return `Adicione mais ${missing} peça${missing > 1 ? "s" : ""} e ganhe ${DISCOUNT_TIER_1_RATE * 100}% OFF!`;
}

const PROMO_BANNER_TEXT =
  `✨ Compre ${DISCOUNT_TIER_1_QTY} peças e ganhe ${DISCOUNT_TIER_1_RATE * 100}% OFF · ` +
  `💚 Compre ${DISCOUNT_TIER_2_QTY} ou mais e ganhe ${DISCOUNT_TIER_2_RATE * 100}% OFF!`;

function ChipRow({ options, value, onChange }) {
  return (
    <div className="cc-filter-row">
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          fontFamily: "Manrope", fontSize: 12.5, fontWeight: 700, padding: "8px 18px", borderRadius: 20,
          border: `1px solid ${value === opt ? GREEN : "#E2E0D6"}`,
          background: value === opt ? GREEN : "#fff", color: value === opt ? "#fff" : "#5B6B63", cursor: "pointer",
          flexShrink: 0, whiteSpace: "nowrap",
        }}>{opt}</button>
      ))}
    </div>
  );
}

export default function PublicCatalogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Pronta entrega");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [banhoFilter, setBanhoFilter] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [personalizeFor, setPersonalizeFor] = useState(null);
  const [personalizeText, setPersonalizeText] = useState("");

  useEffect(() => {
    listPublicCatalog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Opções geradas a partir dos produtos carregados — cada lojista pode ter categorias/banhos diferentes.
  const categoryOptions = [...new Set(items.map((p) => p.categoria).filter(Boolean))].sort();
  const banhoOptions = [...new Set(items.map((p) => p.banho).filter(Boolean))].sort();

  const filtered = items.filter((p) =>
    p.disponibilidade === tab &&
    (categoryFilter === "Todas" || p.categoria === categoryFilter) &&
    (banhoFilter === "Todos" || p.banho === banhoFilter)
  );

  function addToCart(p, personalizacao = "") {
    const key = personalizacao ? `${p.id}::${personalizacao}` : p.id;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { key, id: p.id, code: p.code, name: p.name, preco: p.preco_sugerido, qty: 1, personalizacao }];
    });
  }
  function handleAddClick(p) {
    if (p.categoria === "Personalizáveis") {
      setPersonalizeText("");
      setPersonalizeFor(p);
    } else {
      addToCart(p);
    }
  }
  function confirmPersonalization() {
    if (!personalizeText.trim()) return;
    addToCart(personalizeFor, personalizeText.trim());
    setPersonalizeFor(null);
  }
  function removeFromCart(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.qty * i.preco, 0);
  const discountRate = getCartDiscountRate(cartCount);
  const discountValue = cartSubtotal * discountRate;
  const cartTotal = cartSubtotal - discountValue;
  const cartMessage = encodeURIComponent(
    `Olá! Tenho interesse nestas peças:\n` +
    cart.map((i) => `- ${i.name}${i.code ? ` (${i.code})` : ""}${i.personalizacao ? ` (personalização: ${i.personalizacao})` : ""} x${i.qty} — ${money(i.preco * i.qty)}`).join("\n") +
    (discountRate > 0
      ? `\n\nSubtotal: ${money(cartSubtotal)}\nDesconto (${discountRate * 100}%): -${money(discountValue)}\nTotal: ${money(cartTotal)}`
      : `\n\nTotal: ${money(cartTotal)}`)
  );

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
        .cc-filter-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 16px 8px; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
        .cc-filter-row::-webkit-scrollbar { height: 4px; }
        .cc-filter-row::-webkit-scrollbar-thumb { background: #E2E0D6; border-radius: 4px; }
      `}</style>

      <header style={{ padding: "42px 24px 34px", textAlign: "center", background: GREEN_DARK }}>
        <CeciliaLogo variant="large" />
        <p style={{ fontFamily: "Manrope", color: "#8FB3A5", fontSize: 11.5, margin: "12px 0 0", letterSpacing: ".08em" }}>CATÁLOGO DE PEÇAS</p>
      </header>

      <div style={{ display: "flex", justifyContent: "center", padding: "0 16px", marginBottom: 22 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, background: GOLD, color: "#fff",
          borderRadius: 30, padding: "10px 20px", fontFamily: "Manrope", fontSize: 13, fontWeight: 700, textAlign: "center",
        }}>
          {PROMO_BANNER_TEXT}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14, flexWrap: "wrap", padding: "0 16px" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: "Manrope", fontSize: 13, fontWeight: 700, padding: "9px 22px", borderRadius: 20,
            border: `1px solid ${tab === t ? GREEN : "#E2E0D6"}`,
            background: tab === t ? GREEN : "#fff", color: tab === t ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ marginBottom: 22 }}>
        <ChipRow options={["Todas", ...categoryOptions]} value={categoryFilter} onChange={setCategoryFilter} />
        {banhoOptions.length > 0 && (
          <ChipRow options={["Todos", ...banhoOptions]} value={banhoFilter} onChange={setBanhoFilter} />
        )}
      </div>

      <main style={{ padding: "0 24px 60px", maxWidth: 1200, margin: "0 auto" }}>
        {loading && <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#8A968F" }}>Carregando catálogo...</p>}
        {error && <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#B94A48" }}>Erro ao carregar catálogo: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#8A968F" }}>Nenhuma peça encontrada com esses filtros.</p>
        )}
        <div className="cc-catalog-grid">
          {filtered.map((p) => {
            const msg = encodeURIComponent(`Olá! Tenho interesse na peça ${p.name}${p.code ? ` (${p.code})` : ""} — ${money(p.preco_sugerido)}.`);
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
                <p style={{ fontFamily: "Manrope", fontSize: 12, color: "#7A897F", margin: p.observacoes ? "0 0 4px" : "0 0 10px", lineHeight: 1.5 }}>
                  {[detalhes, p.garantia ? `Garantia ${p.garantia}` : ""].filter(Boolean).join(" · ")}
                </p>
                {p.observacoes && (
                  <p style={{ fontFamily: "Manrope", fontSize: 12, color: "#8A6B2E", margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>
                    {p.observacoes}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 700, color: GREEN }}>{money(p.preco_sugerido)}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleAddClick(p)} className="cc-btn-gold" style={{ padding: "8px 10px", fontSize: 12 }} title="Adicionar à sacola">
                      <ShoppingBag size={14} />
                    </button>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="cc-btn-gold" style={{ padding: "8px 12px", fontSize: 12 }}>
                      <MessageCircle size={14} /> Compartilhar
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {cart.length > 0 && (
        <button onClick={() => setCartOpen(true)} style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 60,
          width: 56, height: 56, borderRadius: "50%", background: GREEN, color: "#fff",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
        }}>
          <ShoppingBag size={22} />
          <span style={{
            position: "absolute", top: -4, right: -4, background: GOLD, color: "#fff", borderRadius: "50%",
            width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, fontFamily: "Manrope",
          }}>{cartCount}</span>
        </button>
      )}

      {cartOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(22,63,50,0.35)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
          }}
          onClick={() => setCartOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="cc-card" style={{ width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto", padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #EFEBE0" }}>
              <h3 style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 600, margin: 0, color: INK }}>Sua sacola</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A897F" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 22 }}>
              {cart.length === 0 ? (
                <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F" }}>Sua sacola está vazia.</p>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {cart.map((i) => (
                      <div key={i.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, borderRadius: 10, padding: "10px 12px" }}>
                        <div>
                          <p style={{ margin: 0, fontFamily: "Manrope", fontSize: 13, fontWeight: 600, color: INK }}>
                            {i.name}{i.personalizacao && <span style={{ fontWeight: 400, fontStyle: "italic", color: "#8A6B2E" }}> — personalização: "{i.personalizacao}"</span>}
                          </p>
                          <p style={{ margin: 0, fontFamily: "Manrope", fontSize: 12, color: "#8A968F" }}>{i.qty}x {money(i.preco)}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: "Manrope", fontSize: 13, fontWeight: 700, color: INK }}>{money(i.qty * i.preco)}</span>
                          <button onClick={() => removeFromCart(i.key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#B5533D" }} title="Remover">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid #EFEBE0", paddingTop: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                      <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#7A897F" }}>Subtotal</span>
                      <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#7A897F" }}>{money(cartSubtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                      <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#8A6B2E", fontWeight: 700 }}>Desconto ({discountRate * 100}%)</span>
                      <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#8A6B2E", fontWeight: 700 }}>-{money(discountValue)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
                      <span style={{ fontFamily: "Manrope", fontSize: 13.5, fontWeight: 700, color: INK }}>Total</span>
                      <span style={{ fontFamily: "Cormorant Garamond", fontSize: 24, fontWeight: 700, color: GREEN }}>{money(cartTotal)}</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: "Manrope", fontSize: 11.5, fontWeight: 700, color: cartCount >= DISCOUNT_TIER_2_QTY ? GREEN : "#8A968F", margin: "-10px 0 16px", textAlign: "center" }}>
                    {getCartIncentiveMessage(cartCount)}
                  </p>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${cartMessage}`} target="_blank" rel="noopener noreferrer" className="cc-btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <MessageCircle size={16} /> Enviar pelo WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {personalizeFor && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(22,63,50,0.35)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 16,
          }}
          onClick={() => setPersonalizeFor(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="cc-card" style={{ width: "100%", maxWidth: 360, padding: 22 }}>
            <h3 style={{ fontFamily: "Cormorant Garamond", fontSize: 20, fontWeight: 600, margin: "0 0 4px", color: INK }}>Personalizar peça</h3>
            <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#7A897F", margin: "0 0 14px" }}>{personalizeFor.name}</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "Manrope", fontSize: 12, fontWeight: 700, color: "#5B6B63" }}>Qual letra ou nome você deseja nessa peça?</span>
              <input
                autoFocus
                value={personalizeText}
                onChange={(e) => setPersonalizeText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmPersonalization(); }}
                placeholder="ex: M, Maria..."
                style={{
                  fontFamily: "Manrope", fontSize: 13.5, padding: "9px 12px", borderRadius: 10,
                  border: "1px solid #E2E0D6", outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setPersonalizeFor(null)} style={{
                background: "none", border: "1px solid #E2E0D6", borderRadius: 10, padding: "9px 16px",
                fontFamily: "Manrope", fontWeight: 600, fontSize: 13, cursor: "pointer", color: INK,
              }}>Cancelar</button>
              <button onClick={confirmPersonalization} disabled={!personalizeText.trim()} className="cc-btn-gold" style={{ opacity: personalizeText.trim() ? 1 : 0.6, cursor: personalizeText.trim() ? "pointer" : "not-allowed" }}>
                Adicionar à sacola
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
