import React, { useEffect, useState } from "react";
import { ImagePlus, MessageCircle, ShoppingBag, X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { listPublicCatalog } from "../services/produtos";
import { listWishlistIds, addWishlistItem, removeWishlistItem } from "../services/wishlist";
import { registerVisit } from "../services/visitas";
import { listActiveBanners } from "../services/banners";
import { GREEN, GREEN_DARK, GOLD, CREAM, INK, FONT_IMPORT, money, CeciliaLogo } from "../App";

const TABS = ["Pronta entrega", "Sob encomenda", "Meus favoritos"];
const WHATSAPP_NUMBER = "5566999428631";
const VISITOR_ID_KEY = "cecilia_visitor_id";
const LAST_VISIT_KEY = "cecilia_last_visit_at";
const VISIT_DEDUPE_MS = 30 * 60 * 1000; // 30 minutos

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function shouldRegisterVisit() {
  const last = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
  return Date.now() - last > VISIT_DEDUPE_MS;
}

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

// Card de imagem com mini-carrossel quando o produto tem mais de uma foto
// (setas nas laterais + pontinhos embaixo); com uma foto só ou nenhuma,
// se comporta como antes.
function CatalogCardImage({ photos, fallbackUrl, promocao, favorited, onToggleFavorite }) {
  const list = photos && photos.length > 0 ? photos : (fallbackUrl ? [fallbackUrl] : []);
  const [idx, setIdx] = useState(0);
  const hasMultiple = list.length > 1;
  const current = list[Math.min(idx, list.length - 1)];

  function prev(e) {
    e.stopPropagation();
    setIdx((i) => (i - 1 + list.length) % list.length);
  }
  function next(e) {
    e.stopPropagation();
    setIdx((i) => (i + 1) % list.length);
  }

  return (
    <div style={{
      aspectRatio: "1/1", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative", overflow: "hidden",
      background: current ? `center/cover no-repeat url(${current})` : `linear-gradient(150deg, ${CREAM}, #F0ECE0)`,
    }}>
      {!current && <ImagePlus size={28} color="#C9BFA6" />}
      {promocao && <span style={{ position: "absolute", top: 10, left: 10, background: GOLD, color: "#fff", fontFamily: "Manrope", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 12 }}>PROMOÇÃO</span>}
      <button
        onClick={onToggleFavorite}
        title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        style={{
          position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%",
          background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <Heart size={15} color={favorited ? "#B5533D" : "#8A968F"} fill={favorited ? "#B5533D" : "none"} />
      </button>
      {hasMultiple && (
        <>
          <button onClick={prev} title="Foto anterior" style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%",
            background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <ChevronLeft size={15} color={INK} />
          </button>
          <button onClick={next} title="Próxima foto" style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%",
            background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <ChevronRight size={15} color={INK} />
          </button>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
            {list.map((_, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === idx ? "#fff" : "rgba(255,255,255,0.5)" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const BANNER_INTERVAL_MS = 5000;

// Carrossel de banners do topo do catálogo: troca automática a cada 5s (com
// fade), bolinhas clicáveis e swipe no celular. Com 1 banner só, fica fixo
// sem indicadores; com 0 banners, o chamador nem renderiza a seção.
function BannerCarousel({ banners }) {
  const [idx, setIdx] = useState(0);
  const hasMultiple = banners.length > 1;
  const touchStartX = React.useRef(null);

  useEffect(() => {
    if (!hasMultiple) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % banners.length), BANNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasMultiple, banners.length]);

  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners.length, idx]);

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    setIdx((i) => (dx < 0 ? (i + 1) % banners.length : (i - 1 + banners.length) % banners.length));
  }

  if (banners.length === 0) return null;

  return (
    <div style={{ padding: "0 16px", marginBottom: 22 }}>
      <div
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
        style={{
          position: "relative", width: "100%", maxWidth: 1200, aspectRatio: "2/1", margin: "0 auto",
          borderRadius: 16, overflow: "hidden", background: CREAM,
        }}
      >
        {banners.map((b, i) => (
          <img
            key={b.id}
            src={b.imagemUrl}
            alt="Banner"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: i === idx ? 1 : 0, transition: "opacity 0.6s ease",
            }}
          />
        ))}
        {hasMultiple && (
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIdx(i)}
                title={`Banner ${i + 1}`}
                style={{
                  width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                  background: i === idx ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [visitorId] = useState(getVisitorId);
  const [favorites, setFavorites] = useState(new Set());
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    listPublicCatalog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    listActiveBanners().then(setBanners).catch(() => {});
  }, []);

  useEffect(() => {
    listWishlistIds(visitorId).then((ids) => setFavorites(new Set(ids))).catch(() => {});
  }, [visitorId]);

  // Registra a visita no máximo uma vez a cada 30min por visitante — troca de
  // filtro/aba não gera visita nova porque isso roda só uma vez, no mount.
  // Grava o timestamp ANTES de chamar o Supabase (não no .then) para não
  // duplicar quando o efeito roda duas vezes de seguida (StrictMode em dev).
  useEffect(() => {
    if (!shouldRegisterVisit()) return;
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    registerVisit(visitorId).catch(() => localStorage.removeItem(LAST_VISIT_KEY));
  }, [visitorId]);

  async function toggleFavorite(productId) {
    const isFav = favorites.has(productId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(productId); else next.add(productId);
      return next;
    });
    try {
      if (isFav) await removeWishlistItem(productId, visitorId);
      else await addWishlistItem(productId, visitorId);
    } catch (err) {
      // desfaz a atualização otimista se a gravação falhar
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(productId); else next.delete(productId);
        return next;
      });
    }
  }

  // Opções geradas a partir dos produtos carregados — cada lojista pode ter categorias/banhos diferentes.
  const categoryOptions = [...new Set(items.map((p) => p.categoria).filter(Boolean))].sort();
  const banhoOptions = [...new Set(items.map((p) => p.banho).filter(Boolean))].sort();

  const filtered = items.filter((p) => {
    if (tab === "Meus favoritos" ? !favorites.has(p.id) : p.disponibilidade !== tab) return false;
    return (categoryFilter === "Todas" || p.categoria === categoryFilter) &&
      (banhoFilter === "Todos" || p.banho === banhoFilter);
  });

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

      <BannerCarousel banners={banners} />

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
          <p style={{ textAlign: "center", fontFamily: "Manrope", color: "#8A968F" }}>
            {tab === "Meus favoritos"
              ? "Você ainda não favoritou nenhuma peça — toque no coração das peças que você gostar!"
              : "Nenhuma peça encontrada com esses filtros."}
          </p>
        )}
        <div className="cc-catalog-grid">
          {filtered.map((p) => {
            const msg = encodeURIComponent(`Olá! Tenho interesse na peça ${p.name}${p.code ? ` (${p.code})` : ""} — ${money(p.preco_sugerido)}.`);
            const detalhes = [p.banho, p.cor, p.pedra].filter(Boolean).join(" · ");
            const hasDiscount = p.promocao && p.preco_original > p.preco_sugerido;
            const discountPercent = hasDiscount ? Math.round((1 - p.preco_sugerido / p.preco_original) * 100) : 0;
            return (
              <div key={p.id} className="cc-card cc-catalog-card">
                <CatalogCardImage
                  photos={p.photos}
                  fallbackUrl={p.photo_url}
                  promocao={p.promocao}
                  favorited={favorites.has(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
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
                  <div>
                    {hasDiscount && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                        <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#A79E8C", textDecoration: "line-through" }}>{money(p.preco_original)}</span>
                        <span style={{ fontFamily: "Manrope", fontSize: 10.5, fontWeight: 800, color: "#fff", background: "#B5533D", borderRadius: 10, padding: "1px 7px" }}>-{discountPercent}%</span>
                      </div>
                    )}
                    <span style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 700, color: GREEN }}>{money(p.preco_sugerido)}</span>
                  </div>
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
