import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart, Boxes,
  ClipboardList, Calculator, Wallet, BarChart3, BookOpen, Settings,
  Search, Bell, ChevronDown, Plus, X, Pencil, Trash2, ImagePlus,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  Instagram, MessageCircle, Store, MapPin, Eye, EyeOff, Lock, Mail,
  Menu, Sparkles, ArrowUpRight, ArrowDownRight, Filter, Share2, Upload, Star
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";
import { login, getCurrentUser, getCurrentProfile, updateCurrentProfile, onAuthChange, requestPasswordReset } from "./services/auth";
import { listProducts, listCategories, createProduct, updateProduct, updateProductPrice, deleteProduct, bulkDeleteProducts, syncProductPhotos, bulkCreateProducts } from "./services/produtos";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./services/fornecedores";
import { listClients, createClient, updateClient, deleteClient } from "./services/clientes";
import { listOrders, createOrder, updateOrder, updateOrderStatus, deleteOrder } from "./services/pedidos";
import { listCashflow, createCashflowEntry, updateCashflowEntry, deleteCashflowEntry } from "./services/caixa";
import { listPurchases, createPurchase } from "./services/compras";
import { listWishlistCounts } from "./services/wishlist";
import { listVisits } from "./services/visitas";
import { getSettings, updateSettings } from "./services/settings";
import { listGoals, setGoalForMonth } from "./services/metas";
import { listAccountsPayable, createAccountPayable, updateAccountPayable, deleteAccountPayable, markAccountAsPaid } from "./services/contasPagar";

/* ============================================================
   CECÍLIA — Sistema de Gestão
   Paleta: verde esmeralda escuro #0F3D2E · dourado fosco #C8A45A · branco
   ============================================================ */

export const GREEN = "#0F3D2E";
export const GREEN_DARK = "#0A2A20";
export const GOLD = "#C8A45A";
const GOLD_SOFT = "#E4D2A8";
export const CREAM = "#FAF7F1";
export const INK = "#22302B";

export const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&display=swap');
`;

/* ---------------- Mock seed data ---------------- */

const CATEGORY_PREFIX = {
  "Brincos": "BR", "Colares": "CL", "Pulseiras": "PU", "Anéis": "AN",
  "Conjuntos": "CJ", "Tornozeleiras": "TO", "Piercings": "PI",
  "Chokers": "CH", "Pingentes": "PN", "Relógios": "RL",
};
const CATEGORIES = Object.keys(CATEGORY_PREFIX);

const PIE_COLORS = [GREEN, GOLD, "#8AA89B", "#DCC38A", "#3F7A63"];
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const money = (v) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------------- Shared UI atoms ---------------- */

function StatCard({ icon: Icon, label, value, trend, trendUp, accent }) {
  return (
    <div className="cc-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#6B7A74", fontWeight: 600, letterSpacing: ".02em", margin: 0 }}>{label}</p>
          <p style={{ fontFamily: "Cormorant Garamond", fontSize: 30, fontWeight: 600, color: INK, margin: "6px 0 0" }}>{value}</p>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          background: accent ? `${accent}1A` : `${GREEN}12`, color: accent || GREEN, flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
          {trendUp ? <ArrowUpRight size={14} color={GREEN} /> : <ArrowDownRight size={14} color="#B5533D" />}
          <span style={{ fontFamily: "Manrope", fontSize: 12.5, color: trendUp ? GREEN : "#B5533D", fontWeight: 700 }}>{trend}</span>
          <span style={{ fontFamily: "Manrope", fontSize: 12, color: "#96A39D" }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "Cormorant Garamond", fontSize: 30, fontWeight: 600, color: INK, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: "Manrope", fontSize: 13.5, color: "#7A897F", margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function GoldButton({ children, onClick, icon: Icon, type = "button", full, disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="cc-btn-gold" style={{ width: full ? "100%" : undefined, opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}
function GhostButton({ children, onClick, icon: Icon, type = "button", disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="cc-btn-ghost" style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      {Icon && <Icon size={15} strokeWidth={2} />}
      {children}
    </button>
  );
}

function Badge({ children, tone = "green" }) {
  const tones = {
    green: { bg: `${GREEN}14`, fg: GREEN },
    gold: { bg: `${GOLD}22`, fg: "#8A6B2E" },
    red: { bg: "#F4E3DE", fg: "#B5533D" },
    gray: { bg: "#EEF1EF", fg: "#6B7A74" },
    blue: { bg: "#E4EEF3", fg: "#3E6E85" },
  };
  const t = tones[tone] || tones.green;
  return (
    <span style={{
      background: t.bg, color: t.fg, fontFamily: "Manrope", fontWeight: 700, fontSize: 11.5,
      padding: "4px 10px", borderRadius: 20, letterSpacing: ".01em", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function statusTone(status) {
  const map = {
    "Disponível": "green", "Vendido": "gray", "Reservado": "gold", "Encomendado": "blue", "Devolvido": "red",
    "Pago": "green", "Entregue": "green", "Enviado": "blue", "Separando": "gold",
    "Aguardando pagamento": "red", "Cancelado": "red",
  };
  return map[status] || "gray";
}

function Field({ label, children, span }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontFamily: "Manrope", fontSize: 12, fontWeight: 700, color: "#5B6B63" }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = {
  fontFamily: "Manrope", fontSize: 13.5, padding: "9px 12px", borderRadius: 10,
  border: "1px solid #E2E0D6", outline: "none", background: "#fff", color: INK, width: "100%", boxSizing: "border-box",
};
function TextInput(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select({ children, ...props }) { return <select {...props} style={inputStyle}>{children}</select>; }
function TextArea(props) { return <textarea {...props} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />; }

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(22,63,50,0.35)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="cc-card" style={{
        width: "100%", maxWidth: wide ? 760 : 480, maxHeight: "88vh", overflowY: "auto", padding: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #EFEBE0" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 600, margin: 0, color: INK }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A897F" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Table({ columns, rows, renderRow }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{
                textAlign: "left", fontFamily: "Manrope", fontSize: 11.5, fontWeight: 700, color: "#8A968F",
                textTransform: "uppercase", letterSpacing: ".04em", padding: "10px 14px", borderBottom: "1px solid #EFEBE0",
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
const td = { padding: "13px 14px", fontFamily: "Manrope", fontSize: 13.5, color: INK, borderBottom: "1px solid #F4F1E9" };
const thStyle = {
  textAlign: "left", fontFamily: "Manrope", fontSize: 11.5, fontWeight: 700, color: "#8A968F",
  textTransform: "uppercase", letterSpacing: ".04em", padding: "10px 14px", borderBottom: "1px solid #EFEBE0",
};

/* ---------------- Logo ---------------- */

const LOGO_SRC = {
  verde: "/cecilia-logo-fundo-verde.png",
  branco: "/cecilia-logo-fundo-branco.png",
};

// Logo oficial (imagem real, proporção 3:2). variant="compact" reduz o
// tamanho máximo para uso na barra lateral; background escolhe a versão
// certa conforme o fundo em que o logo será colocado.
export function CeciliaLogo({ variant = "large", background = "verde" }) {
  const compact = variant === "compact";
  return (
    <img
      src={LOGO_SRC[background]}
      alt="Cecília Semijoias"
      style={{
        display: "block", width: "100%", height: "auto",
        maxWidth: compact ? 170 : 340, margin: compact ? 0 : "0 auto",
      }}
    />
  );
}

/* ---------------- Login ---------------- */

function LoginScreen({ onLogin }) {
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoverMsg, setRecoverMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, senha);
    } catch (err) {
      setError("E-mail ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover() {
    setError("");
    setRecoverMsg("");
    setLoading(true);
    try {
      await requestPasswordReset(recoverEmail);
      setRecoverMsg("Link de recuperação enviado! Confira seu e-mail.");
    } catch (err) {
      setError("Não foi possível enviar o link. Verifique o e-mail informado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 55%, #1B4F3E 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Manrope",
    }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <CeciliaLogo variant="large" />
      </div>
      <div style={{
        background: "#fff", borderRadius: 22, width: "100%", maxWidth: 400, padding: "36px 36px 42px",
        boxShadow: "0 30px 60px rgba(0,0,0,0.25)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%", background: `${GOLD}22` }} />

        {mode === "login" ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="LOGIN">
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 12, top: 11, color: "#9AA79F" }} />
                <TextInput type="text" placeholder="seuemail@cecilia.com" style={{ paddingLeft: 34 }} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </Field>
            <Field label="SENHA">
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 12, top: 11, color: "#9AA79F" }} />
                <TextInput type={showPw ? "text" : "password"} placeholder="••••••••" style={{ paddingLeft: 34, paddingRight: 34 }} value={senha} onChange={(e) => setSenha(e.target.value)} />
                <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 10, top: 9, background: "none", border: "none", color: "#9AA79F", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            {error && <p style={{ margin: 0, fontFamily: "Manrope", fontSize: 12.5, color: "#B94A48" }}>{error}</p>}
            <div style={{ textAlign: "right" }}>
              <button type="button" onClick={() => { setMode("recover"); setError(""); setRecoverMsg(""); }} style={{ background: "none", border: "none", color: GREEN, fontFamily: "Manrope", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Esqueci minha senha
              </button>
            </div>
            <GoldButton type="submit" full disabled={loading}>{loading ? "Entrando..." : "Entrar"}</GoldButton>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#5B6B63", textAlign: "center" }}>
              Informe seu e-mail para receber o link de recuperação de senha.
            </p>
            <Field label="E-MAIL">
              <TextInput type="email" placeholder="seuemail@cecilia.com" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} />
            </Field>
            {error && <p style={{ margin: 0, fontFamily: "Manrope", fontSize: 12.5, color: "#B94A48" }}>{error}</p>}
            {recoverMsg && <p style={{ margin: 0, fontFamily: "Manrope", fontSize: 12.5, color: GREEN }}>{recoverMsg}</p>}
            <GoldButton onClick={handleRecover} full disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</GoldButton>
            <button onClick={() => { setMode("login"); setError(""); setRecoverMsg(""); }} style={{ background: "none", border: "none", color: "#7A897F", fontFamily: "Manrope", fontSize: 12.5, cursor: "pointer" }}>
              Voltar ao login
            </button>
          </div>
        )}
      </div>
      <style>{FONT_IMPORT}</style>
    </div>
  );
}

/* ---------------- Sidebar / Shell ---------------- */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "compras", label: "Compras", icon: ShoppingCart },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "precificacao", label: "Precificação", icon: Calculator },
  { id: "caixa", label: "Fluxo de Caixa", icon: Wallet },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "config", label: "Configurações", icon: Settings },
];

const PAPEL_LABEL = { admin: "Administradora", vendas: "Vendas" };

function Sidebar({ active, setActive, mobileOpen, setMobileOpen, profile, onOpenProfile }) {
  const nome = profile?.nome || "Usuário";
  const papel = PAPEL_LABEL[profile?.papel] || profile?.papel || "";
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }} className="cc-only-mobile" />}
      <aside className={`cc-sidebar ${mobileOpen ? "cc-sidebar-open" : ""}`} style={{
        background: GREEN_DARK, width: 232, flexShrink: 0, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "26px 22px 18px" }}>
          <CeciliaLogo variant="compact" />
          <p style={{ fontFamily: "Manrope", color: "#8FB3A5", fontSize: 10, margin: "6px 0 0", letterSpacing: ".08em" }}>SEMIJOIAS</p>
        </div>
        <nav style={{ flex: 1, padding: "6px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "9.5px 12px", borderRadius: 10,
                border: "none", cursor: "pointer", textAlign: "left",
                background: isActive ? "rgba(200,164,90,0.16)" : "transparent",
                color: isActive ? GOLD : "#CBDED4",
                fontFamily: "Manrope", fontSize: 13.5, fontWeight: isActive ? 700 : 500,
              }}>
                <item.icon size={16.5} strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button onClick={onOpenProfile} style={{
          padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Manrope", fontWeight: 800, color: GREEN_DARK, fontSize: 13, flexShrink: 0 }}>{inicial}</div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ fontFamily: "Manrope", color: "#fff", fontSize: 12.5, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</p>
            <p style={{ fontFamily: "Manrope", color: "#8FB3A5", fontSize: 11, margin: 0 }}>{papel}</p>
          </div>
        </button>
      </aside>
    </>
  );
}

function ProfileModal({ profile, onSave, onClose }) {
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const papel = PAPEL_LABEL[profile?.papel] || profile?.papel || "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(nome);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Meu perfil" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="cc-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <Field label="Nome"><TextInput required value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <Field label="Papel"><TextInput disabled value={papel} /></Field>
        </div>
        {error && <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#B94A48", marginTop: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
          <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</GoldButton>
        </div>
      </form>
    </Modal>
  );
}

function Topbar({ title, setMobileOpen }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px",
      borderBottom: "1px solid #EFEBE0", background: "#fff", position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="cc-only-mobile" onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: INK }}>
          <Menu size={22} />
        </button>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={15} style={{ position: "absolute", left: 12, color: "#9AA79F" }} />
          <input placeholder="Buscar produtos, clientes, pedidos..." className="cc-search" style={{
            fontFamily: "Manrope", fontSize: 13, padding: "8.5px 14px 8.5px 34px", borderRadius: 20,
            border: "1px solid #E2E0D6", width: 300, outline: "none", background: CREAM,
          }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#5B6B63", position: "relative" }}>
          <Bell size={19} strokeWidth={1.7} />
          <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: GOLD }} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function EmptyChartState({ message }) {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", textAlign: "center" }}>{message}</p>
    </div>
  );
}

function Dashboard({ products, orders, cashflow, visits, financialGoals }) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = (dateStr) => !!dateStr && dateStr.slice(0, 7) === currentMonthKey;

  const metaMes = financialGoals.find((g) => g.mes === now.getMonth() + 1 && g.ano === now.getFullYear());

  const visitsThisMonth = visits.filter((v) => isCurrentMonth(v.criado_em));
  const visitasCatalogoMes = visitsThisMonth.length;
  const visitantesUnicosMes = new Set(visitsThisMonth.map((v) => v.visitor_id)).size;

  const lowStock = products.filter((p) => p.quantidade <= p.estoqueMinimo);

  const ordersThisMonth = orders.filter((o) => isCurrentMonth(o.data));
  const ordersThisMonthValid = ordersThisMonth.filter((o) => o.status !== "Cancelado");
  const ordersValid = orders.filter((o) => o.status !== "Cancelado");

  const faturamentoMes = ordersThisMonthValid.reduce((s, o) => s + (o.total || 0), 0);

  const cashflowThisMonth = cashflow.filter((c) => isCurrentMonth(c.data));
  const lucroMes = cashflowThisMonth.reduce((s, c) => s + (c.valor || 0), 0);

  const investidoEstoque = products.reduce((s, p) => s + (p.quantidade || 0) * (p.custoTotal || 0), 0);

  const pedidosPagosMes = ordersThisMonth.filter((o) => o.baixado).length;
  const ticketMedio = pedidosPagosMes > 0 ? faturamentoMes / pedidosPagosMes : 0;

  const produtosVendidosMes = ordersThisMonthValid.reduce((s, o) => s + (o.itens || []).reduce((si, i) => si + (i.qtd || 0), 0), 0);

  const pedidosAndamento = orders.filter((o) => ["Aguardando pagamento", "Pago", "Separando", "Enviado"].includes(o.status)).length;
  const pedidosPendentes = orders.filter((o) => o.status === "Aguardando pagamento").length;

  // Últimos 6 meses (incluindo o atual) — meses sem pedidos/lançamentos aparecem com 0, não somem.
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, mes: MESES_ABREV[d.getMonth()] };
  });
  const salesByMonthData = last6Months.map(({ key, mes }) => ({
    mes, vendas: ordersValid.filter((o) => o.data?.slice(0, 7) === key).reduce((s, o) => s + (o.total || 0), 0),
  }));
  const profitByMonthData = last6Months.map(({ key, mes }) => ({
    mes, lucro: cashflow.filter((c) => c.data?.slice(0, 7) === key).reduce((s, c) => s + (c.valor || 0), 0),
  }));

  // Vendas por categoria e produtos mais vendidos — agregados de todos os itens de pedidos válidos (não cancelados)
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));
  const categoryTotals = {};
  const productTotals = {};
  ordersValid.forEach((o) => {
    (o.itens || []).forEach((i) => {
      const categoria = productById[i.productId]?.category || "Outros";
      categoryTotals[categoria] = (categoryTotals[categoria] || 0) + i.qtd;
      productTotals[i.name] = (productTotals[i.name] || 0) + i.qtd;
    });
  });
  const salesByCategoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const topProductsData = Object.entries(productTotals).map(([name, vendas]) => ({ name, vendas })).sort((a, b) => b.vendas - a.vendas).slice(0, 5);

  // Origem das vendas — proporção entre os pedidos válidos
  const originTotals = {};
  ordersValid.forEach((o) => {
    const origem = o.origem || "Loja Virtual";
    originTotals[origem] = (originTotals[origem] || 0) + 1;
  });
  const originCount = Object.values(originTotals).reduce((a, b) => a + b, 0);
  const salesOriginData = Object.entries(originTotals).map(([name, count]) => ({ name, value: originCount ? Math.round((count / originCount) * 100) : 0 }));

  const mesAtualLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const progressoMeta = metaMes ? Math.min(100, Math.round((faturamentoMes / metaMes.valor_meta) * 100)) : 0;

  return (
    <div>
      <SectionTitle title="Visão geral" subtitle={`Resumo do desempenho da Cecília — ${mesAtualLabel}`} />

      {metaMes ? (
        <div className="cc-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <p style={{ fontFamily: "Manrope", fontSize: 12.5, fontWeight: 700, color: "#5B6B63", margin: 0 }}>Meta de faturamento do mês</p>
            <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#7A897F", margin: 0 }}>
              {money(faturamentoMes)} de {money(metaMes.valor_meta)} — <strong style={{ color: GREEN }}>{progressoMeta}% da meta</strong>
            </p>
          </div>
          <div style={{ background: "#F0ECE0", borderRadius: 10, height: 10, overflow: "hidden" }}>
            <div style={{ width: `${progressoMeta}%`, height: "100%", background: GOLD, borderRadius: 10, transition: "width .4s ease" }} />
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#96A39D", marginBottom: 20 }}>
          Defina sua meta de faturamento em Configurações → Financeiro para acompanhar o progresso do mês aqui.
        </p>
      )}

      <div className="cc-grid-stats">
        <StatCard icon={Wallet} label="Faturamento do mês" value={money(faturamentoMes)} accent={GREEN} />
        <StatCard icon={TrendingUp} label="Lucro do mês" value={money(lucroMes)} accent={GOLD} />
        <StatCard icon={Boxes} label="Investido em estoque" value={money(investidoEstoque)} accent="#3E6E85" />
        <StatCard icon={Sparkles} label="Ticket médio" value={money(ticketMedio)} accent={GREEN} />
        <StatCard icon={Package} label="Produtos vendidos" value={String(produtosVendidosMes)} accent={GOLD} />
        <StatCard icon={Clock} label="Pedidos em andamento" value={String(pedidosAndamento)} accent="#3E6E85" />
        <StatCard icon={AlertTriangle} label="Pedidos pendentes" value={String(pedidosPendentes)} accent="#B5533D" />
        <StatCard icon={AlertTriangle} label="Estoque baixo" value={String(lowStock.length)} accent="#B5533D" />
        <StatCard icon={Eye} label="Visitas ao catálogo (mês)" value={String(visitasCatalogoMes)} accent="#3E6E85" />
        <StatCard icon={Users} label="Visitantes únicos (mês)" value={String(visitantesUnicosMes)} accent={GOLD} />
      </div>

      <div className="cc-grid-charts">
        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Vendas por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesByMonthData}>
              <defs>
                <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontFamily: "Manrope", fontSize: 12, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "Manrope", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              <Area type="monotone" dataKey="vendas" stroke={GREEN} strokeWidth={2.5} fill="url(#gVendas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Lucro mensal</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={profitByMonthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontFamily: "Manrope", fontSize: 12, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "Manrope", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              <Bar dataKey="lucro" fill={GOLD} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Vendas por categoria</p>
          {salesByCategoryData.length === 0 ? <EmptyChartState message="Nenhuma venda registrada ainda." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={salesByCategoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {salesByCategoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
                <Legend wrapperStyle={{ fontFamily: "Manrope", fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Produtos mais vendidos</p>
          {topProductsData.length === 0 ? <EmptyChartState message="Nenhuma venda registrada ainda." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductsData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" horizontal={false} />
                <XAxis type="number" tick={{ fontFamily: "Manrope", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontFamily: "Manrope", fontSize: 11.5, fill: INK }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
                <Bar dataKey="vendas" fill={GREEN} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="cc-card" style={{ padding: 20, gridColumn: "1 / -1" }}>
          <p className="cc-chart-title">Origem das vendas</p>
          {salesOriginData.length === 0 ? <EmptyChartState message="Nenhuma venda registrada ainda." /> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center" }}>
              <ResponsiveContainer width={220} height={200}>
                <PieChart>
                  <Pie data={salesOriginData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {salesOriginData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
                {salesOriginData.map((o, i) => {
                  const icons = { Instagram, WhatsApp: MessageCircle, "Loja Virtual": Store, Presencial: MapPin };
                  const Icon = icons[o.name] || Store;
                  return (
                    <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${PIE_COLORS[i]}1F`, display: "flex", alignItems: "center", justifyContent: "center", color: PIE_COLORS[i] }}>
                        <Icon size={14} />
                      </div>
                      <span style={{ fontFamily: "Manrope", fontSize: 13, color: INK, flex: 1 }}>{o.name}</span>
                      <span style={{ fontFamily: "Manrope", fontSize: 13, fontWeight: 700, color: INK }}>{o.value}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Produtos ---------------- */

/* ---------------- Importação de planilha ---------------- */

function normalizeText(str) {
  return (str ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

// Aceita número já numérico ou texto formatado (ex: "R$ 1.234,56")
function parseSheetNumber(val) {
  if (typeof val === "number") return val;
  if (val === null || val === undefined || val === "") return 0;
  const cleaned = String(val).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Aceita data já como objeto Date (Excel formatado como data), texto dd/mm/aaaa,
// texto aaaa-mm-dd, ou número de série do Excel — devolve sempre "aaaa-mm-dd".
function parseSheetDate(val) {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  const br = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d+(\.\d+)?$/.test(str)) {
    const d = new Date(Math.round((parseFloat(str) - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
}

// Busca uma coluna pelo nome, ignorando acentos/maiúsculas e espaços extras no cabeçalho
function getSheetCell(row, name) {
  const target = normalizeText(name);
  const key = Object.keys(row).find((k) => normalizeText(k) === target);
  return key !== undefined ? row[key] : "";
}

const DISPONIBILIDADE_OPTIONS = ["Pronta entrega", "Sob encomenda"];

function ImportModal({ categories, onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  function matchCategory(texto) {
    const alvo = normalizeText(texto);
    return categories.find((c) => normalizeText(c.nome) === alvo);
  }

  function matchDisponibilidade(texto) {
    const alvo = normalizeText(texto);
    return DISPONIBILIDADE_OPTIONS.find((d) => normalizeText(d) === alvo);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setRows([]);
    setFileName(file.name);
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.find((n) => normalizeText(n) === "custos") || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // A planilha pode ter linhas em branco/título antes do cabeçalho de verdade —
      // procura a linha que contém a coluna "Produto" em vez de assumir que é a primeira.
      const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const headerRowIndex = grid.findIndex((row) => row.some((cell) => normalizeText(cell) === "produto"));
      if (headerRowIndex === -1) {
        setError(`Não encontrei uma coluna "Produto" na aba "${sheetName}".`);
        setRows([]);
        return;
      }
      const raw = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" });
      const headerRow = grid[headerRowIndex];
      const hasDisponibilidadeColumn = headerRow.some((cell) => normalizeText(cell) === "disponibilidade");

      const mapped = raw
        .filter((r) => normalizeText(getSheetCell(r, "Produto")))
        .map((r, i) => {
          const categoriaTexto = String(getSheetCell(r, "Categoria") || "").trim();
          const match = matchCategory(categoriaTexto);
          const disponibilidadeTexto = String(getSheetCell(r, "Disponibilidade") || "").trim();
          const disponibilidadeMatch = matchDisponibilidade(disponibilidadeTexto);
          return {
            _key: i,
            name: String(getSheetCell(r, "Produto") || "").trim(),
            categoriaTexto,
            categoryId: match ? match.id : "",
            disponibilidadeTexto,
            disponibilidade: disponibilidadeMatch || (!hasDisponibilidadeColumn ? "Pronta entrega" : ""),
            quantidade: parseSheetNumber(getSheetCell(r, "Estoque")),
            valorPago: parseSheetNumber(getSheetCell(r, "Custo da peça")),
            freteRateado: parseSheetNumber(getSheetCell(r, "Frete rateado")),
            custoTotal: parseSheetNumber(getSheetCell(r, "Custo total")),
            precoSugerido: parseSheetNumber(getSheetCell(r, "Preço de venda")),
            lucroPlanilha: parseSheetNumber(getSheetCell(r, "Lucro (R$)")),
          };
        });

      if (mapped.length === 0) setError(`Nenhuma linha com "Produto" preenchido foi encontrada na aba "${sheetName}".`);
      setRows(mapped);
    } catch (err) {
      setError("Erro ao ler o arquivo: " + err.message);
    } finally {
      setParsing(false);
    }
  }

  function setRowCategory(key, categoryId) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, categoryId } : r)));
  }

  function setRowDisponibilidade(key, disponibilidade) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, disponibilidade } : r)));
  }

  const pendingCount = rows.filter((r) => !r.categoryId || !r.disponibilidade).length;

  async function handleConfirm() {
    if (rows.length === 0) return;
    if (pendingCount > 0) {
      setError("Escolha a categoria e a disponibilidade de todas as linhas destacadas antes de confirmar.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const created = await bulkCreateProducts(rows);
      onImported(created.length);
      onClose();
    } catch (err) {
      setError("Erro ao importar: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Importar planilha de produtos" onClose={onClose} wide>
      <Field label="Arquivo (.xlsx)">
        <input type="file" accept=".xlsx" onChange={handleFile} style={{ fontFamily: "Manrope", fontSize: 12.5 }} />
      </Field>

      {parsing && <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", marginTop: 10 }}>Lendo planilha...</p>}
      {error && <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#B94A48", marginTop: 10 }}>{error}</p>}

      {rows.length > 0 && (
        <>
          <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#5B6B63", margin: "16px 0 10px" }}>
            <strong>{fileName}</strong> — {rows.length} linhas encontradas
            {pendingCount > 0 ? `, ${pendingCount} precisam de categoria e/ou disponibilidade (destacadas abaixo)` : ", todas com categoria e disponibilidade reconhecidas"}.
          </p>
          <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid #EFEBE0", borderRadius: 12 }}>
            <Table
              columns={["Produto", "Categoria", "Disponibilidade", "Estoque", "Custo peça", "Frete", "Custo total", "Preço venda", "Lucro (planilha)"]}
              rows={rows}
              renderRow={(r) => (
                <tr key={r._key} style={{ background: (r.categoryId && r.disponibilidade) ? "transparent" : "#FBEFEF" }}>
                  <td style={td}>{r.name}</td>
                  <td style={td}>
                    {r.categoryId ? (
                      <Badge tone="green">{categories.find((c) => c.id === r.categoryId)?.nome}</Badge>
                    ) : (
                      <Select value={r.categoryId} onChange={(e) => setRowCategory(r._key, e.target.value)} style={{ borderColor: "#D98C8C", minWidth: 160 }}>
                        <option value="">"{r.categoriaTexto || "—"}" — escolher...</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </Select>
                    )}
                  </td>
                  <td style={td}>
                    {r.disponibilidade ? (
                      <Badge tone={r.disponibilidade === "Pronta entrega" ? "green" : "blue"}>{r.disponibilidade}</Badge>
                    ) : (
                      <Select value={r.disponibilidade} onChange={(e) => setRowDisponibilidade(r._key, e.target.value)} style={{ borderColor: "#D98C8C", minWidth: 150 }}>
                        <option value="">"{r.disponibilidadeTexto || "—"}" — escolher...</option>
                        {DISPONIBILIDADE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </Select>
                    )}
                  </td>
                  <td style={td}>{r.quantidade}</td>
                  <td style={td}>{money(r.valorPago)}</td>
                  <td style={td}>{money(r.freteRateado)}</td>
                  <td style={td}>{money(r.custoTotal)}</td>
                  <td style={td}>{money(r.precoSugerido)}</td>
                  <td style={td}>{money(r.lucroPlanilha)}</td>
                </tr>
              )}
            />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <GhostButton onClick={onClose}>Cancelar</GhostButton>
        <GoldButton onClick={handleConfirm} disabled={rows.length === 0 || importing || pendingCount > 0}>
          {importing ? "Importando..." : `Confirmar importação (${rows.length})`}
        </GoldButton>
      </div>
    </Modal>
  );
}

function emptyProduct(categories) {
  return {
    categoryId: categories?.[0]?.id || "", collection: "", name: "", photo: "", photos: [],
    banho: "", cor: "", pedra: "", garantia: "05 meses", peso: "",
    fornecedorId: "", dataCompra: "", valorPago: "", freteRateado: "",
    precoSugerido: "", precoOriginal: "", margem: 100, promocao: false, disponibilidade: "Pronta entrega",
    quantidade: "", estoqueMinimo: "", localizacao: "", observacoes: "",
  };
}

function ProdutosView({ products, setProducts, suppliers, categories, wishlistCounts, loading, loadError }) {
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', data}
  const [filterCat, setFilterCat] = useState("Todas");
  const [filterDisponibilidade, setFilterDisponibilidade] = useState("Todas");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => { setSelected(new Set()); }, [filterCat, filterDisponibilidade]);

  function openNew() { setModal({ mode: "new", data: emptyProduct(categories) }); }
  function openEdit(p) { setModal({ mode: "edit", data: { ...p } }); }

  async function save(data, photoMeta) {
    setSaving(true);
    try {
      let productId = data.id;
      if (modal.mode === "new") {
        const created = await createProduct(data);
        productId = created.id;
      } else {
        await updateProduct(data.id, data);
      }
      if (photoMeta?.changed) {
        await syncProductPhotos(productId, photoMeta.keepPhotos, photoMeta.newFiles);
      }
      const fresh = await listProducts();
      setProducts(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar produto: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Remover este produto?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert("Erro ao remover produto: " + err.message);
    }
  }

  async function handleImported(count) {
    const fresh = await listProducts();
    setProducts(fresh);
    setImportMsg(`${count} produto${count === 1 ? "" : "s"} importado${count === 1 ? "" : "s"} com sucesso!`);
  }

  const categoryNames = categories.map((c) => c.nome);
  const filtered = products
    .filter((p) => filterCat === "Todas" || p.category === filterCat)
    .filter((p) => filterDisponibilidade === "Todas" || p.disponibilidade === filterDisponibilidade);

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  async function removeSelected() {
    setBulkDeleting(true);
    try {
      await bulkDeleteProducts(Array.from(selected));
      const fresh = await listProducts();
      setProducts(fresh);
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (err) {
      alert("Erro ao excluir produtos selecionados: " + err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div>
      <SectionTitle
        title="Produtos"
        subtitle={`${products.length} peças cadastradas`}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <GhostButton icon={Upload} onClick={() => { setImportMsg(""); setImportOpen(true); }} disabled={loading || categories.length === 0}>Importar planilha</GhostButton>
            <GoldButton icon={Plus} onClick={openNew} disabled={loading || categories.length === 0}>Novo produto</GoldButton>
          </div>
        }
      />

      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar produtos: {loadError}
        </p>
      )}

      {importMsg && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: GREEN, marginBottom: 14, fontWeight: 600 }}>
          {importMsg}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {["Todas", ...categoryNames].map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            fontFamily: "Manrope", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 20,
            border: `1px solid ${filterCat === c ? GREEN : "#E2E0D6"}`,
            background: filterCat === c ? GREEN : "#fff", color: filterCat === c ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["Todas", "Pronta entrega", "Sob encomenda"].map((d) => (
          <button key={d} onClick={() => setFilterDisponibilidade(d)} style={{
            fontFamily: "Manrope", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 20,
            border: `1px solid ${filterDisponibilidade === d ? GOLD : "#E2E0D6"}`,
            background: filterDisponibilidade === d ? GOLD : "#fff", color: filterDisponibilidade === d ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{d}</button>
        ))}
      </div>

      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando produtos...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40 }}>
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} disabled={filtered.length === 0} />
                  </th>
                  {["Código", "Produto", "Categoria", "Estoque", "Custo", "Preço", "Lucro", ""].map((c) => (
                    <th key={c} style={thStyle}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ background: selected.has(p.id) ? `${GOLD}0F` : "transparent" }}>
                    <td style={td}><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                    <td style={td}><span style={{ fontWeight: 700, color: GREEN }}>{p.code}</span></td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ImagePlus size={14} color="#B8AF9C" />
                          </div>
                        )}
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            {p.name}
                            {wishlistCounts[p.id] > 0 && (
                              <span style={{ fontFamily: "Manrope", fontSize: 10.5, fontWeight: 700, color: "#B5533D", background: "#F4E3DE", borderRadius: 10, padding: "1px 7px", whiteSpace: "nowrap" }}>
                                ♥ {wishlistCounts[p.id]}
                              </span>
                            )}
                          </p>
                          <p style={{ margin: 0, fontSize: 11.5, color: "#8A968F" }}>{p.collection}</p>
                        </div>
                      </div>
                    </td>
                    <td style={td}>{p.category}</td>
                    <td style={td}>
                      <Badge tone={p.quantidade <= p.estoqueMinimo ? "red" : "green"}>{p.quantidade} un.</Badge>
                    </td>
                    <td style={td}>{money(p.custoTotal)}</td>
                    <td style={td}>
                      {p.promocao && p.precoOriginal > p.precoSugerido && (
                        <span style={{ display: "block", fontSize: 11.5, color: "#A79E8C", textDecoration: "line-through" }}>{money(p.precoOriginal)}</span>
                      )}
                      {money(p.precoSugerido)}{p.promocao && <Badge tone="gold"> Promo</Badge>}
                    </td>
                    <td style={td}><span style={{ color: GREEN, fontWeight: 700 }}>{money(p.lucro)}</span></td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(p)} className="cc-icon-btn"><Pencil size={14} /></button>
                        <button onClick={() => remove(p.id)} className="cc-icon-btn"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Novo produto" : `Editar ${modal.data.code}`} onClose={() => setModal(null)} wide>
          <ProductForm data={modal.data} suppliers={suppliers} categories={categories} onSave={save} saving={saving} onCancel={() => setModal(null)} previewCode={modal.mode === "new" ? "gerado automaticamente" : modal.data.code} />
        </Modal>
      )}

      {importOpen && (
        <ImportModal categories={categories} onClose={() => setImportOpen(false)} onImported={handleImported} />
      )}

      {selected.size > 0 && (
        <div style={{
          position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 60,
          background: GREEN_DARK, color: "#fff", borderRadius: 14, padding: "12px 14px 12px 20px",
          display: "flex", alignItems: "center", gap: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        }}>
          <span style={{ fontFamily: "Manrope", fontSize: 13.5, fontWeight: 600 }}>
            {selected.size} produto{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}
          </span>
          <button onClick={() => setConfirmOpen(true)} className="cc-btn-gold" style={{ padding: "9px 16px", fontSize: 13 }}>
            <Trash2 size={14} /> Excluir selecionados
          </button>
          <button onClick={() => setSelected(new Set())} style={{ background: "none", border: "none", color: "#CBDED4", cursor: "pointer", fontFamily: "Manrope", fontSize: 12.5 }}>
            Cancelar
          </button>
        </div>
      )}

      {confirmOpen && (
        <Modal title="Excluir produtos selecionados" onClose={() => !bulkDeleting && setConfirmOpen(false)}>
          <p style={{ fontFamily: "Manrope", fontSize: 13.5, color: INK, lineHeight: 1.6, margin: 0 }}>
            Tem certeza que deseja excluir <strong>{selected.size}</strong> produto{selected.size === 1 ? "" : "s"}? Essa ação não pode ser desfeita.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <GhostButton onClick={() => setConfirmOpen(false)} disabled={bulkDeleting}>Cancelar</GhostButton>
            <GoldButton onClick={removeSelected} disabled={bulkDeleting}>{bulkDeleting ? "Excluindo..." : "Excluir selecionados"}</GoldButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ data, suppliers, categories, onSave, saving, onCancel, previewCode }) {
  const [form, setForm] = useState(data);
  // Fotos existentes (URLs já salvas no banco), na ordem em que aparecem —
  // a primeira é sempre a capa. newPhotos são arquivos novos ainda não
  // enviados, mostrados depois das existentes.
  const [existingPhotos, setExistingPhotos] = useState(data.photos?.length ? data.photos : (data.photo ? [data.photo] : []));
  const [newPhotos, setNewPhotos] = useState([]); // [{file, preview}]
  const [photosChanged, setPhotosChanged] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target && e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewPhotos((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    setPhotosChanged(true);
    e.target.value = "";
  }

  useEffect(() => {
    return () => newPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeExisting(url) {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
    setPhotosChanged(true);
  }

  function removeNew(preview) {
    setNewPhotos((prev) => prev.filter((p) => p.preview !== preview));
    URL.revokeObjectURL(preview);
    setPhotosChanged(true);
  }

  function makeCover(url) {
    setExistingPhotos((prev) => [url, ...prev.filter((p) => p !== url)]);
    setPhotosChanged(true);
  }

  const capaUrl = existingPhotos[0] || newPhotos[0]?.preview || "";

  const custo = (parseFloat(form.valorPago) || 0) + (parseFloat(form.freteRateado) || 0);
  const lucro = (parseFloat(form.precoSugerido) || 0) - custo;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (form.promocao && form.precoOriginal !== "" && form.precoOriginal != null) {
        if (Number(form.precoOriginal) <= (Number(form.precoSugerido) || 0)) {
          alert("O preço original precisa ser maior que o preço sugerido (promocional).");
          return;
        }
      }
      onSave(form, { keepPhotos: existingPhotos, newFiles: newPhotos.map((p) => p.file), changed: photosChanged });
    }}>
      <p style={{ fontFamily: "Manrope", fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 4 }}>Código: {previewCode}</p>

      <p className="cc-form-group-title">Fotos</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {existingPhotos.map((url) => (
          <div key={url} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: url === capaUrl ? `2px solid ${GOLD}` : "1px solid #E2E0D6" }}>
            <img src={url} alt="Foto do produto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {url === capaUrl && (
              <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(199,161,90,0.9)", color: "#fff", fontFamily: "Manrope", fontSize: 8.5, fontWeight: 700, textAlign: "center", padding: "1px 0" }}>CAPA</span>
            )}
            <div style={{ position: "absolute", top: 2, right: 2, display: "flex", gap: 2 }}>
              {url !== capaUrl && (
                <button type="button" onClick={() => makeCover(url)} title="Definir como capa" style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Star size={10} color={GREEN} />
                </button>
              )}
              <button type="button" onClick={() => removeExisting(url)} title="Remover foto" style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={11} color="#B94A48" />
              </button>
            </div>
          </div>
        ))}
        {newPhotos.map((p) => (
          <div key={p.preview} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: p.preview === capaUrl ? `2px solid ${GOLD}` : "1px solid #E2E0D6" }}>
            <img src={p.preview} alt="Prévia da foto nova" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {p.preview === capaUrl && (
              <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(199,161,90,0.9)", color: "#fff", fontFamily: "Manrope", fontSize: 8.5, fontWeight: 700, textAlign: "center", padding: "1px 0" }}>CAPA</span>
            )}
            <button type="button" onClick={() => removeNew(p.preview)} title="Remover foto" style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={11} color="#B94A48" />
            </button>
          </div>
        ))}
        <label style={{ width: 64, height: 64, borderRadius: 10, background: CREAM, border: "1px dashed #C9BFA6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
          <ImagePlus size={20} color="#B8AF9C" />
          <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: "none" }} />
        </label>
      </div>
      <p style={{ fontFamily: "Manrope", fontSize: 11, color: "#8A968F", margin: "6px 0 0" }}>A primeira foto (com a estrelinha) é a capa mostrada nas listagens e no catálogo.</p>

      <p className="cc-form-group-title">Identificação</p>
      <div className="cc-form-grid">
        <Field label="Nome" span={2}><TextInput required value={form.name} onChange={set("name")} /></Field>
        <Field label="Categoria"><Select value={form.categoryId} onChange={set("categoryId")}>{categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></Field>
        <Field label="Coleção"><TextInput value={form.collection} onChange={set("collection")} /></Field>
      </div>

      <p className="cc-form-group-title">Características</p>
      <div className="cc-form-grid">
        <Field label="Banho"><TextInput value={form.banho} onChange={set("banho")} placeholder="Ouro 18k, Ródio..." /></Field>
        <Field label="Cor"><TextInput value={form.cor} onChange={set("cor")} /></Field>
        <Field label="Pedra"><TextInput value={form.pedra} onChange={set("pedra")} /></Field>
        <Field label="Garantia"><TextInput value={form.garantia} onChange={set("garantia")} /></Field>
        <Field label="Peso"><TextInput value={form.peso} onChange={set("peso")} placeholder="ex: 3.2g" /></Field>
      </div>

      <p className="cc-form-group-title">Compra</p>
      <div className="cc-form-grid">
        <Field label="Fornecedor">
          <Select value={form.fornecedorId || ""} onChange={set("fornecedorId")}>
            <option value="">Selecione...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Select>
        </Field>
        <Field label="Data"><TextInput type="date" value={form.dataCompra} onChange={set("dataCompra")} /></Field>
        <Field label="Valor pago (R$)"><TextInput type="number" step="0.01" value={form.valorPago} onChange={set("valorPago")} /></Field>
        <Field label="Frete rateado (R$)"><TextInput type="number" step="0.01" value={form.freteRateado} onChange={set("freteRateado")} /></Field>
        <Field label="Custo total"><TextInput disabled value={money(custo)} /></Field>
      </div>

      <p className="cc-form-group-title">Venda</p>
      <div className="cc-form-grid">
        <Field label="Preço sugerido (R$)"><TextInput type="number" step="0.01" value={form.precoSugerido} onChange={set("precoSugerido")} /></Field>
        <Field label="Lucro estimado"><TextInput disabled value={money(lucro)} /></Field>
        <Field label="Em promoção?">
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0" }}>
            <input type="checkbox" checked={!!form.promocao} onChange={set("promocao")} /> <span style={{ fontFamily: "Manrope", fontSize: 13 }}>Sim</span>
          </label>
        </Field>
        <Field label="Preço original (R$)">
          <TextInput
            type="number"
            step="0.01"
            disabled={!form.promocao}
            value={form.precoOriginal}
            onChange={set("precoOriginal")}
            placeholder="Preço antes da promoção"
          />
        </Field>
        <Field label="Disponibilidade">
          <Select value={form.disponibilidade || "Pronta entrega"} onChange={set("disponibilidade")}>
            <option value="Pronta entrega">Pronta entrega</option>
            <option value="Sob encomenda">Sob encomenda</option>
          </Select>
        </Field>
      </div>

      <p className="cc-form-group-title">Estoque</p>
      <div className="cc-form-grid">
        <Field label="Quantidade"><TextInput type="number" value={form.quantidade} onChange={set("quantidade")} /></Field>
        <Field label="Estoque mínimo"><TextInput type="number" value={form.estoqueMinimo} onChange={set("estoqueMinimo")} /></Field>
        <Field label="Localização física"><TextInput value={form.localizacao} onChange={set("localizacao")} placeholder="ex: Gaveta A1" /></Field>
      </div>

      <p className="cc-form-group-title">Observações</p>
      <div className="cc-form-grid" style={{ gridTemplateColumns: "1fr" }}>
        <Field label="Observações"><TextArea value={form.observacoes} onChange={set("observacoes")} placeholder="ex: disponível também em banho prata, consulte disponibilidade..." /></Field>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
        <GhostButton onClick={onCancel}>Cancelar</GhostButton>
        <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar produto"}</GoldButton>
      </div>
    </form>
  );
}

/* ---------------- Clientes ---------------- */

function ClientesView({ clients, setClients, loading, loadError }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  function openNew() { setModal({ mode: "new", data: { nome: "", telefone: "", whatsapp: "", instagram: "", cidade: "", estado: "", aniversario: "", obs: "" } }); }
  function openEdit(c) { setModal({ mode: "edit", data: { ...c } }); }

  async function save(data) {
    setSaving(true);
    try {
      if (modal.mode === "new") {
        await createClient(data);
      } else {
        await updateClient(data.id, data);
      }
      const fresh = await listClients();
      setClients(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar cliente: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Remover este cliente?")) return;
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Erro ao remover cliente: " + err.message);
    }
  }

  return (
    <div>
      <SectionTitle title="Clientes" subtitle={`${clients.length} clientes cadastrados`} action={<GoldButton icon={Plus} onClick={openNew}>Novo cliente</GoldButton>} />
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar clientes: {loadError}
        </p>
      )}
      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando clientes...</p>
        ) : (
          <Table
            columns={["Cliente", "Contato", "Cidade/UF", "Aniversário", "Total gasto", "Pedidos", ""]}
            rows={clients}
            renderRow={(c) => (
              <tr key={c.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{c.nome}</span></td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, color: "#5B6B63" }}>
                    <MessageCircle size={13} /> {c.whatsapp}
                  </div>
                  {c.instagram && <div style={{ display: "flex", gap: 6, color: "#8A968F", fontSize: 12, marginTop: 2 }}><Instagram size={12} /> {c.instagram}</div>}
                </td>
                <td style={td}>{c.cidade}/{c.estado}</td>
                <td style={td}>{c.aniversario ? new Date(c.aniversario + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                <td style={td}><span style={{ fontWeight: 700, color: GREEN }}>{money(c.totalGasto)}</span></td>
                <td style={td}>{c.qtdPedidos}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(c)} className="cc-icon-btn"><Pencil size={14} /></button>
                    <button onClick={() => remove(c.id)} className="cc-icon-btn"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Novo cliente" : "Editar cliente"} onClose={() => setModal(null)}>
          <ClientForm data={modal.data} onSave={save} saving={saving} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function ClientForm({ data, onSave, saving, onCancel }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="cc-form-grid">
        <Field label="Nome" span={2}><TextInput required value={form.nome} onChange={set("nome")} /></Field>
        <Field label="Telefone"><TextInput value={form.telefone} onChange={set("telefone")} /></Field>
        <Field label="WhatsApp"><TextInput value={form.whatsapp} onChange={set("whatsapp")} /></Field>
        <Field label="Instagram"><TextInput value={form.instagram} onChange={set("instagram")} /></Field>
        <Field label="Aniversário"><TextInput type="date" value={form.aniversario} onChange={set("aniversario")} /></Field>
        <Field label="Cidade"><TextInput value={form.cidade} onChange={set("cidade")} /></Field>
        <Field label="Estado"><TextInput value={form.estado} onChange={set("estado")} maxLength={2} /></Field>
        <Field label="Observações" span={2}><TextArea value={form.obs} onChange={set("obs")} /></Field>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <GhostButton onClick={onCancel} disabled={saving}>Cancelar</GhostButton>
        <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</GoldButton>
      </div>
    </form>
  );
}

/* ---------------- Fornecedores ---------------- */

function FornecedoresView({ suppliers, setSuppliers, loading, loadError }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  function openNew() { setModal({ mode: "new", data: { nome: "", contato: "", telefone: "", instagram: "", site: "", prazoMedio: "", obs: "" } }); }
  function openEdit(s) { setModal({ mode: "edit", data: { ...s } }); }

  async function save(data) {
    setSaving(true);
    try {
      if (modal.mode === "new") {
        await createSupplier(data);
      } else {
        await updateSupplier(data.id, data);
      }
      const fresh = await listSuppliers();
      setSuppliers(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar fornecedor: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Remover este fornecedor?")) return;
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Erro ao remover fornecedor: " + err.message);
    }
  }

  return (
    <div>
      <SectionTitle title="Fornecedores" subtitle={`${suppliers.length} fornecedores`} action={<GoldButton icon={Plus} onClick={openNew}>Novo fornecedor</GoldButton>} />
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar fornecedores: {loadError}
        </p>
      )}
      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando fornecedores...</p>
        ) : (
          <Table
            columns={["Fornecedor", "Contato", "Telefone", "Prazo médio", "Site", ""]}
            rows={suppliers}
            renderRow={(s) => (
              <tr key={s.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{s.nome}</span></td>
                <td style={td}>{s.contato}</td>
                <td style={td}>{s.telefone}</td>
                <td style={td}><Badge tone="blue">{s.prazoMedio}</Badge></td>
                <td style={td}>{s.site}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(s)} className="cc-icon-btn"><Pencil size={14} /></button>
                    <button onClick={() => remove(s.id)} className="cc-icon-btn"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </div>
      {modal && (
        <Modal title={modal.mode === "new" ? "Novo fornecedor" : "Editar fornecedor"} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save(modal.data); }}>
            {/* controlled via local state per field for simplicity */}
            <SupplierFields data={modal.data} onChange={(d) => setModal({ ...modal, data: d })} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <GhostButton onClick={() => setModal(null)}>Cancelar</GhostButton>
              <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar fornecedor"}</GoldButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function SupplierFields({ data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  return (
    <div className="cc-form-grid">
      <Field label="Nome" span={2}><TextInput required value={data.nome} onChange={set("nome")} /></Field>
      <Field label="Contato"><TextInput value={data.contato} onChange={set("contato")} /></Field>
      <Field label="Telefone"><TextInput value={data.telefone} onChange={set("telefone")} /></Field>
      <Field label="Instagram"><TextInput value={data.instagram} onChange={set("instagram")} /></Field>
      <Field label="Site"><TextInput value={data.site} onChange={set("site")} /></Field>
      <Field label="Prazo médio"><TextInput value={data.prazoMedio} onChange={set("prazoMedio")} placeholder="ex: 7 dias" /></Field>
      <Field label="Observações" span={2}><TextArea value={data.obs} onChange={set("obs")} /></Field>
    </div>
  );
}

/* ---------------- Compras ---------------- */

function matchSupplierByName(texto, suppliers) {
  const alvo = normalizeText(texto);
  return suppliers.find((s) => normalizeText(s.nome) === alvo);
}

// Tenta código exato primeiro (mais confiável), depois nome exato/aproximado.
// Quando o nome bate com mais de um produto, devolve os candidatos em vez de
// escolher sozinho — a tela mostra um seletor só com essas opções.
function matchProductForPurchase(texto, products) {
  const alvo = normalizeText(texto);
  if (!alvo) return { productId: "", candidates: [] };
  const byCode = products.find((p) => normalizeText(p.code || "") === alvo);
  if (byCode) return { productId: byCode.id, candidates: [byCode] };
  const nameMatches = products.filter((p) => normalizeText(p.name).includes(alvo) || alvo.includes(normalizeText(p.name)));
  if (nameMatches.length === 1) return { productId: nameMatches[0].id, candidates: nameMatches };
  return { productId: "", candidates: nameMatches };
}

function ImportComprasModal({ suppliers, products, onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // { success, failures: [{row, reason}] }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setRows([]); setResults(null); setFileName(file.name); setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const headerRowIndex = grid.findIndex((row) => row.some((cell) => normalizeText(cell) === "fornecedor"));
      if (headerRowIndex === -1) {
        setError(`Não encontrei uma coluna "Fornecedor" na aba "${sheetName}".`);
        return;
      }
      const raw = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" });

      const mapped = raw
        .filter((r) => normalizeText(getSheetCell(r, "Fornecedor")) || normalizeText(getSheetCell(r, "Produto")))
        .map((r, i) => {
          const fornecedorTexto = String(getSheetCell(r, "Fornecedor") || "").trim();
          const fornecedorMatch = matchSupplierByName(fornecedorTexto, suppliers);
          const produtoTexto = String(getSheetCell(r, "Produto") || "").trim();
          const { productId, candidates } = matchProductForPurchase(produtoTexto, products);
          return {
            _key: i,
            fornecedorTexto,
            fornecedorId: fornecedorMatch ? fornecedorMatch.id : "",
            produtoTexto,
            produtoId: productId,
            produtoCandidates: candidates,
            data: parseSheetDate(getSheetCell(r, "Data")),
            qtdPecas: parseSheetNumber(getSheetCell(r, "Quantidade de peças")),
            valorTotal: parseSheetNumber(getSheetCell(r, "Valor total")),
            frete: parseSheetNumber(getSheetCell(r, "Frete")),
          };
        });

      if (mapped.length === 0) setError(`Nenhuma linha com Fornecedor/Produto preenchidos foi encontrada na aba "${sheetName}".`);
      setRows(mapped);
    } catch (err) {
      setError("Erro ao ler o arquivo: " + err.message);
    } finally {
      setParsing(false);
    }
  }

  function setRowFornecedor(key, fornecedorId) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, fornecedorId } : r)));
  }
  function setRowProduto(key, produtoId) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, produtoId } : r)));
  }

  const pendingCount = rows.filter((r) => !r.fornecedorId || !r.produtoId).length;

  // Insere uma compra de cada vez (não em lote) — assim cada linha aciona o
  // trigger apply_purchase() na ordem certa (o custo médio de cada leva depende
  // do estoque já atualizado pela leva anterior) e uma falha numa linha não
  // derruba as outras.
  async function handleConfirm() {
    if (rows.length === 0 || pendingCount > 0) {
      setError("Escolha o fornecedor e o produto de todas as linhas destacadas antes de confirmar.");
      return;
    }
    setImporting(true);
    setError("");
    let success = 0;
    const failures = [];
    for (const r of rows) {
      try {
        await createPurchase(r);
        success++;
      } catch (err) {
        failures.push({ row: r, reason: err.message });
      }
    }
    setImporting(false);
    setResults({ success, failures });
    onImported({ success, failures });
  }

  return (
    <Modal title="Importar planilha de compras" onClose={onClose} wide>
      {!results && (
        <>
          <Field label="Arquivo (.xlsx)">
            <input type="file" accept=".xlsx" onChange={handleFile} style={{ fontFamily: "Manrope", fontSize: 12.5 }} />
          </Field>

          {parsing && <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", marginTop: 10 }}>Lendo planilha...</p>}
          {error && <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#B94A48", marginTop: 10 }}>{error}</p>}

          {rows.length > 0 && (
            <>
              <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#5B6B63", margin: "16px 0 10px" }}>
                <strong>{fileName}</strong> — {rows.length} linhas encontradas
                {pendingCount > 0 ? `, ${pendingCount} precisam de fornecedor e/ou produto (destacadas abaixo)` : ", todas reconhecidas"}.
              </p>
              <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid #EFEBE0", borderRadius: 12 }}>
                <Table
                  columns={["Fornecedor", "Produto", "Data", "Peças", "Valor total", "Frete"]}
                  rows={rows}
                  renderRow={(r) => (
                    <tr key={r._key} style={{ background: (r.fornecedorId && r.produtoId) ? "transparent" : "#FBEFEF" }}>
                      <td style={td}>
                        {r.fornecedorId ? (
                          <Badge tone="green">{suppliers.find((s) => s.id === r.fornecedorId)?.nome}</Badge>
                        ) : (
                          <Select value={r.fornecedorId} onChange={(e) => setRowFornecedor(r._key, e.target.value)} style={{ borderColor: "#D98C8C", minWidth: 170 }}>
                            <option value="">"{r.fornecedorTexto || "—"}" — cadastre ou escolha...</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                          </Select>
                        )}
                      </td>
                      <td style={td}>
                        {r.produtoId ? (
                          <Badge tone="green">{products.find((p) => p.id === r.produtoId)?.code} — {products.find((p) => p.id === r.produtoId)?.name}</Badge>
                        ) : (
                          <Select value={r.produtoId} onChange={(e) => setRowProduto(r._key, e.target.value)} style={{ borderColor: "#D98C8C", minWidth: 190 }}>
                            <option value="">"{r.produtoTexto || "—"}" — escolher...</option>
                            {(r.produtoCandidates.length > 0 ? r.produtoCandidates : products).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                          </Select>
                        )}
                      </td>
                      <td style={td}>{r.data ? new Date(r.data + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={td}>{r.qtdPecas}</td>
                      <td style={td}>{money(r.valorTotal)}</td>
                      <td style={td}>{money(r.frete)}</td>
                    </tr>
                  )}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
            <GoldButton onClick={handleConfirm} disabled={rows.length === 0 || importing || pendingCount > 0}>
              {importing ? "Importando..." : `Confirmar importação (${rows.length})`}
            </GoldButton>
          </div>
        </>
      )}

      {results && (
        <div>
          <p style={{ fontFamily: "Manrope", fontSize: 14, color: GREEN, fontWeight: 700, marginBottom: 10 }}>
            {results.success} compra{results.success === 1 ? "" : "s"} registrada{results.success === 1 ? "" : "s"} com sucesso.
          </p>
          {results.failures.length > 0 && (
            <>
              <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", fontWeight: 700, marginBottom: 8 }}>
                {results.failures.length} linha{results.failures.length === 1 ? "" : "s"} falhou{results.failures.length === 1 ? "" : "ram"}:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {results.failures.map((f, i) => (
                  <div key={i} style={{ background: "#FBEFEF", borderRadius: 8, padding: "8px 12px", fontFamily: "Manrope", fontSize: 12.5, color: "#8A4530" }}>
                    <strong>{f.row.produtoTexto || f.row.fornecedorTexto || `Linha ${i + 1}`}</strong>: {f.reason}
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <GoldButton onClick={onClose}>Fechar</GoldButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ComprasView({ purchases, setPurchases, suppliers, products, setProducts, setCashflow, loading, loadError }) {
  const [form, setForm] = useState({ fornecedorId: "", produtoId: "", data: "", frete: "", qtdPecas: "", valorTotal: "" });
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const freteUnit = form.qtdPecas ? (parseFloat(form.frete || 0) / parseInt(form.qtdPecas)).toFixed(2) : "0.00";
  const produtoSelecionado = products.find((p) => String(p.id) === String(form.produtoId));

  async function refreshAfterPurchase() {
    const [freshPurchases, freshProducts, freshCashflow] = await Promise.all([listPurchases(), listProducts(), listCashflow()]);
    setPurchases(freshPurchases);
    setProducts(freshProducts);
    setCashflow(freshCashflow);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createPurchase(form);
      await refreshAfterPurchase();
      setForm({ fornecedorId: "", produtoId: "", data: "", frete: "", qtdPecas: "", valorTotal: "" });
    } catch (err) {
      alert("Erro ao registrar compra: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImported(result) {
    await refreshAfterPurchase();
    setImportMsg(`${result.success} compra${result.success === 1 ? "" : "s"} importada${result.success === 1 ? "" : "s"} com sucesso.${result.failures.length > 0 ? ` ${result.failures.length} falharam.` : ""}`);
  }

  return (
    <div>
      <SectionTitle
        title="Compras"
        subtitle="Registre entradas de mercadoria — o estoque e o custo médio são atualizados automaticamente"
        action={
          <GhostButton icon={Upload} onClick={() => { setImportMsg(""); setImportOpen(true); }} disabled={loading || suppliers.length === 0 || products.length === 0}>
            Importar planilha
          </GhostButton>
        }
      />
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar compras: {loadError}
        </p>
      )}
      {importMsg && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: GREEN, marginBottom: 14, fontWeight: 600 }}>
          {importMsg}
        </p>
      )}
      <div className="cc-two-col">
        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Nova compra</p>
          <form onSubmit={submit} className="cc-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Fornecedor" span={2}>
              <Select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })} required>
                <option value="">Selecione...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
            </Field>
            <Field label="Produto reabastecido" span={2}>
              <Select value={form.produtoId} onChange={(e) => setForm({ ...form, produtoId: e.target.value })} required>
                <option value="">Selecione...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </Select>
            </Field>
            <Field label="Data"><TextInput type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></Field>
            <Field label="Quantidade de peças"><TextInput type="number" value={form.qtdPecas} onChange={(e) => setForm({ ...form, qtdPecas: e.target.value })} required /></Field>
            <Field label="Valor total (R$)"><TextInput type="number" step="0.01" value={form.valorTotal} onChange={(e) => setForm({ ...form, valorTotal: e.target.value })} required /></Field>
            <Field label="Frete (R$)"><TextInput type="number" step="0.01" value={form.frete} onChange={(e) => setForm({ ...form, frete: e.target.value })} /></Field>
            <Field label="Frete por peça (calculado)"><TextInput disabled value={money(freteUnit)} /></Field>
            {produtoSelecionado && (
              <div style={{ gridColumn: "1 / -1", background: CREAM, borderRadius: 10, padding: "10px 14px", fontFamily: "Manrope", fontSize: 12.5, color: "#5B6B63" }}>
                Estoque atual de <strong>{produtoSelecionado.name}</strong>: {produtoSelecionado.quantidade} un. · custo médio atual: {money(produtoSelecionado.custoTotal)}
              </div>
            )}
            <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
              <GoldButton type="submit" full disabled={saving}>{saving ? "Registrando..." : "Registrar compra"}</GoldButton>
            </div>
          </form>
        </div>

        <div className="cc-card" style={{ padding: 0 }}>
          <p className="cc-chart-title" style={{ padding: "20px 20px 0" }}>Histórico de compras</p>
          {loading ? (
            <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando compras...</p>
          ) : (
            <Table
              columns={["Fornecedor", "Produto", "Data", "Peças", "Total", "Frete/peça"]}
              rows={purchases}
              renderRow={(p) => (
                <tr key={p.id}>
                  <td style={td}>{p.fornecedor}</td>
                  <td style={td}>{p.produtoCode ? `${p.produtoCode} — ` : ""}{p.produtoNome || "—"}</td>
                  <td style={td}>{p.data ? new Date(p.data + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={td}>{p.qtdPecas}</td>
                  <td style={td}>{money(p.valorTotal)}</td>
                  <td style={td}>{money(p.freteUnit)}</td>
                </tr>
              )}
            />
          )}
        </div>
      </div>

      {importOpen && (
        <ImportComprasModal suppliers={suppliers} products={products} onClose={() => setImportOpen(false)} onImported={handleImported} />
      )}
    </div>
  );
}

/* ---------------- Estoque ---------------- */

function EstoqueView({ products, loading, loadError }) {
  const [filterDisponibilidade, setFilterDisponibilidade] = useState("Todas");
  const statuses = ["Disponível", "Reservado", "Encomendado", "Vendido", "Devolvido"];
  const lowStock = products.filter((p) => p.quantidade <= p.estoqueMinimo);
  const filtered = products.filter((p) => filterDisponibilidade === "Todas" || p.disponibilidade === filterDisponibilidade);
  return (
    <div>
      <SectionTitle title="Estoque" subtitle="Controle de disponibilidade e localização física das peças" />

      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar estoque: {loadError}
        </p>
      )}

      {lowStock.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, background: "#FBF0EA", border: "1px solid #EED9CC",
          borderRadius: 12, padding: "12px 16px", marginBottom: 18,
        }}>
          <AlertTriangle size={17} color="#B5533D" />
          <span style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A4530" }}>
            {lowStock.length} produto(s) atingiram o estoque mínimo: {lowStock.map((p) => p.name).join(", ")}.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["Todas", "Pronta entrega", "Sob encomenda"].map((d) => (
          <button key={d} onClick={() => setFilterDisponibilidade(d)} style={{
            fontFamily: "Manrope", fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 20,
            border: `1px solid ${filterDisponibilidade === d ? GOLD : "#E2E0D6"}`,
            background: filterDisponibilidade === d ? GOLD : "#fff", color: filterDisponibilidade === d ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{d}</button>
        ))}
      </div>

      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando estoque...</p>
        ) : (
          <Table
            columns={["Código", "Produto", "Localização", "Qtd.", "Mínimo", "Status"]}
            rows={filtered}
            renderRow={(p) => {
              const status = p.quantidade === 0 ? "Vendido" : "Disponível";
              return (
                <tr key={p.id}>
                  <td style={td}><span style={{ fontWeight: 700, color: GREEN }}>{p.code}</span></td>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{p.localizacao}</td>
                  <td style={td}>{p.quantidade}</td>
                  <td style={td}>{p.estoqueMinimo}</td>
                  <td style={td}><Badge tone={statusTone(status)}>{status}</Badge></td>
                </tr>
              );
            }}
          />
        )}
      </div>

      <p className="cc-chart-title" style={{ marginTop: 24 }}>Legenda de status</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {statuses.map((s) => <Badge key={s} tone={statusTone(s)}>{s}</Badge>)}
      </div>
    </div>
  );
}

/* ---------------- Pedidos ---------------- */

const ORDER_STATUSES = ["Reservado", "Aguardando pagamento", "Pago", "Separando", "Enviado", "Entregue", "Cancelado"];

// Painel de pedidos reutilizável — usado na tela de Pedidos (lista completa)
// e na seção "Pedidos recentes" do Fluxo de Caixa (lista curta, sem botão de novo).
function PedidosPanel({ orders, setOrders, clients, products, onStatusChange, loading, loadError, title, subtitle, limit, showNewButton = true }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  function openNew() {
    setModal({ mode: "new", data: { clienteId: "", itens: [], desconto: 0, forma: "Pix", parcelas: 1, status: "Aguardando pagamento", rastreio: "", transportadora: "", obs: "", baixado: false, origem: "Loja Virtual" } });
  }
  function openEdit(o) { setModal({ mode: "edit", data: { ...o } }); }

  async function save(data) {
    setSaving(true);
    try {
      if (modal.mode === "new") {
        await createOrder(data);
      } else {
        await updateOrder(data.id, data);
      }
      const fresh = await listOrders();
      setOrders(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar pedido: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(o) {
    if (o.baixado) {
      alert(`O pedido ${o.numero} já teve o estoque baixado, o cliente creditado e o caixa lançado. Para excluir, primeiro mude o status para "Cancelado" no seletor (isso estorna tudo automaticamente) e só depois exclua.`);
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o pedido ${o.numero}? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteOrder(o.id);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (err) {
      alert("Erro ao excluir pedido: " + err.message);
    }
  }

  const displayOrders = limit ? orders.slice(0, limit) : orders;

  return (
    <div>
      {title && (
        <SectionTitle title={title} subtitle={subtitle} action={showNewButton ? <GoldButton icon={Plus} onClick={openNew} disabled={loading || clients.length === 0}>Novo pedido</GoldButton> : undefined} />
      )}
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar pedidos: {loadError}
        </p>
      )}
      {showNewButton && !loading && clients.length === 0 && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A4530", background: "#FBF0EA", border: "1px solid #EED9CC", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          Você ainda não tem nenhum cliente cadastrado — cadastre pelo menos um em "Clientes" antes de criar um pedido.
        </p>
      )}
      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando pedidos...</p>
        ) : displayOrders.length === 0 ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Nenhum pedido registrado ainda.</p>
        ) : (
          <Table
            columns={["Número", "Cliente", "Produtos", "Total", "Pagamento", "Status", ""]}
            rows={displayOrders}
            renderRow={(o) => (
              <tr key={o.id}>
                <td style={td}><span style={{ fontWeight: 700, color: GREEN }}>{o.numero}</span></td>
                <td style={td}>{o.cliente}</td>
                <td style={td} title={o.produtos}><span style={{ maxWidth: 220, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.produtos}</span></td>
                <td style={td}>{money(o.total)}</td>
                <td style={td}>{o.forma} {o.parcelas > 1 ? `${o.parcelas}x` : ""}</td>
                <td style={td}>
                  <Select value={o.status} onChange={(e) => onStatusChange(o.id, e.target.value)} style={{ padding: "5px 8px", fontSize: 12 }}>
                    {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                  {o.baixado && <div style={{ marginTop: 4 }}><Badge tone="green">estoque baixado</Badge></div>}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(o)} className="cc-icon-btn"><Pencil size={14} /></button>
                    <button onClick={() => remove(o)} className="cc-icon-btn"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Novo pedido" : `Editar ${modal.data.numero}`} onClose={() => setModal(null)} wide>
          <OrderForm data={modal.data} clients={clients} products={products} onSave={save} saving={saving} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function PedidosView({ orders, setOrders, clients, products, onStatusChange, loading, loadError }) {
  return (
    <PedidosPanel
      orders={orders} setOrders={setOrders} clients={clients} products={products}
      onStatusChange={onStatusChange} loading={loading} loadError={loadError}
      title="Pedidos" subtitle={`${orders.length} pedidos registrados — status "Pago" baixa estoque, credita o caixa e atualiza o cliente`}
      showNewButton
    />
  );
}
function OrderForm({ data, clients, products, onSave, saving, onCancel }) {
  const [form, setForm] = useState(data);
  const [pickProduto, setPickProduto] = useState("");
  const [pickQtd, setPickQtd] = useState(1);
  const [pickPersonalizacao, setPickPersonalizacao] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickedProduct = products.find((pr) => String(pr.id) === String(pickProduto));
  const pickNeedsPersonalizacao = pickedProduct?.category === "Personalizáveis";

  function addItem() {
    const p = pickedProduct;
    if (!p) return;
    if (pickNeedsPersonalizacao && !pickPersonalizacao.trim()) return;
    setForm((f) => ({ ...f, itens: [...(f.itens || []), { productId: p.id, code: p.code, name: p.name, qtd: parseInt(pickQtd) || 1, preco: p.precoSugerido, personalizacao: pickNeedsPersonalizacao ? pickPersonalizacao.trim() : "" }] }));
    setPickProduto(""); setPickQtd(1); setPickPersonalizacao("");
  }
  function removeItem(idx) { setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) })); }

  const bruto = (form.itens || []).reduce((s, i) => s + i.qtd * i.preco, 0);
  const total = bruto * (1 - (parseFloat(form.desconto) || 0) / 100);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="cc-form-grid">
        <Field label="Cliente" span={3}>
          <Select value={form.clienteId || ""} onChange={set("clienteId")} required>
            <option value="">Selecione...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
      </div>

      <p className="cc-form-group-title">Produtos do pedido</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Select value={pickProduto} onChange={(e) => setPickProduto(e.target.value)} style={{ flex: 2, minWidth: 160 }}>
          <option value="">Selecione um produto...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} ({money(p.precoSugerido)})</option>)}
        </Select>
        <TextInput type="number" min={1} value={pickQtd} onChange={(e) => setPickQtd(e.target.value)} style={{ width: 70 }} />
        {pickNeedsPersonalizacao && (
          <TextInput value={pickPersonalizacao} onChange={(e) => setPickPersonalizacao(e.target.value)} placeholder="Letra ou nome para personalizar" style={{ flex: 1, minWidth: 160 }} />
        )}
        <GhostButton icon={Plus} onClick={addItem} disabled={pickNeedsPersonalizacao && !pickPersonalizacao.trim()}>Adicionar</GhostButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        {(form.itens || []).length === 0 && <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#96A39D" }}>Nenhum produto adicionado ainda.</p>}
        {(form.itens || []).map((i, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ fontFamily: "Manrope", fontSize: 13 }}>
              {i.name}{i.personalizacao && <span style={{ fontStyle: "italic", color: "#8A6B2E" }}> — personalização: "{i.personalizacao}"</span>} <span style={{ color: "#8A968F" }}>x{i.qtd}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Manrope", fontSize: 13, fontWeight: 700 }}>{money(i.qtd * i.preco)}</span>
              <button type="button" onClick={() => removeItem(idx)} className="cc-icon-btn"><X size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="cc-form-grid" style={{ marginTop: 14 }}>
        <Field label="Desconto (%)"><TextInput type="number" value={form.desconto} onChange={set("desconto")} /></Field>
        <Field label="Total do pedido"><TextInput disabled value={money(total)} /></Field>
        <Field label="Forma de pagamento">
          <Select value={form.forma} onChange={set("forma")}>
            <option>Pix</option><option>Cartão</option><option>Dinheiro</option><option>Boleto</option>
          </Select>
        </Field>
        <Field label="Parcelas"><TextInput type="number" min={1} value={form.parcelas} onChange={set("parcelas")} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={set("status")}>
            {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Origem da venda">
          <Select value={form.origem || "Loja Virtual"} onChange={set("origem")}>
            <option>Instagram</option><option>WhatsApp</option><option>Loja Virtual</option><option>Presencial</option>
          </Select>
        </Field>
        <Field label="Transportadora"><TextInput value={form.transportadora} onChange={set("transportadora")} /></Field>
        <Field label="Código de rastreio" span={2}><TextInput value={form.rastreio} onChange={set("rastreio")} /></Field>
        <Field label="Observações" span={2}><TextArea value={form.obs} onChange={set("obs")} /></Field>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <GhostButton onClick={onCancel} disabled={saving}>Cancelar</GhostButton>
        <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar pedido"}</GoldButton>
      </div>
    </form>
  );
}

/* ---------------- Precificação ---------------- */

function PrecificacaoView({ products, setProducts, settings }) {
  const [v, setV] = useState({
    peca: 25, frete: 2, embalagem: 3, sacola: 1.5, etiqueta: 0.5,
    cartao: 0, maquininha: 3.5, impostos: 6, comissao: 0, margem: 100,
  });
  const set = (k) => (e) => setV({ ...v, [k]: parseFloat(e.target.value) || 0 });

  const custoBase = v.peca + v.frete + v.embalagem + v.sacola + v.etiqueta + v.cartao;
  const taxasPercent = v.maquininha + v.impostos + v.comissao;
  const precoSugerido = custoBase * (1 + v.margem / 100) / (1 - taxasPercent / 100);
  const precoMinimo = custoBase / (1 - taxasPercent / 100);
  const custoReal = custoBase + precoSugerido * (taxasPercent / 100);
  const lucro = precoSugerido - custoReal;
  const precoPromocional = precoSugerido * 0.85;

  const fields = [
    ["peca", "Valor da peça (R$)"], ["frete", "Frete (R$)"], ["embalagem", "Embalagem (R$)"],
    ["sacola", "Sacola (R$)"], ["etiqueta", "Etiqueta (R$)"], ["cartao", "Cartão/tag (R$)"],
    ["maquininha", "Taxa da maquininha (%)"], ["impostos", "Impostos (%)"], ["comissao", "Comissão (%)"], ["margem", "Margem padrão (%)"],
  ];

  // Simulador "e se" — pré-preenchido com os valores salvos em Configurações,
  // assim que eles chegam (a tela pode renderizar antes do fetch terminar).
  const [simMargem, setSimMargem] = useState(100);
  const [simMaquininha, setSimMaquininha] = useState(3.5);
  const [simInitialized, setSimInitialized] = useState(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");

  useEffect(() => {
    if (settings && !simInitialized) {
      setSimMargem(settings.margem_padrao ?? 100);
      setSimMaquininha(settings.taxa_maquininha ?? 3.5);
      setSimInitialized(true);
    }
  }, [settings, simInitialized]);

  const taxasSimuladas = simMaquininha + (settings?.impostos ?? 0) + (settings?.comissao ?? 0);
  const simulatedProducts = products.map((p) => {
    const custo = p.custoTotal || 0;
    const precoSimulado = taxasSimuladas < 100 ? custo * (1 + simMargem / 100) / (1 - taxasSimuladas / 100) : 0;
    const diferenca = precoSimulado - (p.precoSugerido || 0);
    const diferencaPercent = p.precoSugerido ? (diferenca / p.precoSugerido) * 100 : 0;
    return { ...p, precoSimulado, diferenca, diferencaPercent };
  });

  async function handleApply() {
    setApplying(true);
    setApplyMsg("");
    let success = 0;
    const failures = [];
    for (const p of simulatedProducts) {
      try {
        await updateProductPrice(p.id, p.precoSimulado, p.custoTotal);
        success++;
      } catch (err) {
        failures.push(p.name);
      }
    }
    try {
      const fresh = await listProducts();
      setProducts(fresh);
    } catch (err) {
      // a lista pode falhar ao rebuscar sem que a aplicação em si tenha falhado
    }
    setApplying(false);
    setConfirmApplyOpen(false);
    setApplyMsg(
      `${success} produto${success === 1 ? "" : "s"} atualizado${success === 1 ? "" : "s"} com o novo preço.` +
      (failures.length > 0 ? ` ${failures.length} falharam: ${failures.join(", ")}.` : "")
    );
  }

  return (
    <div>
      <SectionTitle title="Precificação" subtitle="Calculadora automática de preço — margem padrão de 100%" />
      <div className="cc-two-col">
        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Custos e taxas</p>
          <div className="cc-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {fields.map(([k, label]) => (
              <Field key={k} label={label}>
                <TextInput type="number" step="0.01" value={v[k]} onChange={set(k)} />
              </Field>
            ))}
          </div>
        </div>

        <div className="cc-card" style={{ padding: 20, background: GREEN, color: "#fff" }}>
          <p style={{ fontFamily: "Manrope", fontSize: 12.5, fontWeight: 700, color: GOLD_SOFT, letterSpacing: ".04em", marginBottom: 16 }}>RESULTADO DO CÁLCULO</p>
          {[
            ["Custo real", custoReal], ["Preço mínimo", precoMinimo], ["Preço sugerido", precoSugerido],
            ["Preço promocional", precoPromocional], ["Lucro estimado", lucro],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
              <span style={{ fontFamily: "Manrope", fontSize: 13.5, color: "#D9E9E1" }}>{label}</span>
              <span style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 600, color: label === "Preço sugerido" ? GOLD : "#fff" }}>{money(val)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <p className="cc-chart-title">Simular impacto em todos os produtos</p>
        <div className="cc-card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="cc-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Nova margem padrão (%)">
              <TextInput type="number" step="0.1" value={simMargem} onChange={(e) => setSimMargem(parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Nova taxa de maquininha (%)">
              <TextInput type="number" step="0.1" value={simMaquininha} onChange={(e) => setSimMaquininha(parseFloat(e.target.value) || 0)} />
            </Field>
          </div>
          <p style={{ fontFamily: "Manrope", fontSize: 12, color: "#8A968F", margin: "10px 0 0" }}>
            Comissão ({settings?.comissao ?? 0}%) e impostos ({settings?.impostos ?? 0}%) usados na simulação são os valores atuais salvos em Configurações.
          </p>
        </div>

        <div className="cc-card" style={{ padding: 0 }}>
          {products.length === 0 ? (
            <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Nenhum produto cadastrado ainda.</p>
          ) : (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              <Table
                columns={["Produto", "Preço atual", "Preço simulado", "Diferença", "Diferença %"]}
                rows={simulatedProducts}
                renderRow={(p) => (
                  <tr key={p.id}>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{money(p.precoSugerido)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{money(p.precoSimulado)}</td>
                    <td style={{ ...td, fontWeight: 700, color: p.diferenca >= 0 ? GREEN : "#B5533D" }}>
                      {p.diferenca >= 0 ? "+" : ""}{money(p.diferenca)}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: p.diferenca >= 0 ? GREEN : "#B5533D" }}>
                      {p.diferenca >= 0 ? "+" : ""}{p.diferencaPercent.toFixed(1)}%
                    </td>
                  </tr>
                )}
              />
            </div>
          )}
        </div>

        {applyMsg && (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: GREEN, fontWeight: 600, marginTop: 14 }}>{applyMsg}</p>
        )}

        <div style={{ marginTop: 16 }}>
          <GoldButton onClick={() => setConfirmApplyOpen(true)} disabled={products.length === 0}>
            Aplicar a todos os produtos
          </GoldButton>
        </div>
      </div>

      {confirmApplyOpen && (
        <Modal title="Aplicar simulação a todos os produtos" onClose={() => !applying && setConfirmApplyOpen(false)}>
          <p style={{ fontFamily: "Manrope", fontSize: 13.5, color: INK, lineHeight: 1.6, margin: 0 }}>
            Isso vai atualizar o <strong>preço sugerido</strong> de <strong>{products.length}</strong> produto{products.length === 1 ? "" : "s"} com base
            nesta simulação (margem {simMargem}%, maquininha {simMaquininha}%). Os preços atuais serão substituídos e essa ação não pode ser desfeita automaticamente.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <GhostButton onClick={() => setConfirmApplyOpen(false)} disabled={applying}>Cancelar</GhostButton>
            <GoldButton onClick={handleApply} disabled={applying}>{applying ? "Aplicando..." : "Sim, aplicar a todos"}</GoldButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Fluxo de Caixa ---------------- */

function isInPeriod(dateStr, period) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (period === "Dia") return diffDays === 0;
  if (period === "Semana") return diffDays >= 0 && diffDays <= 6;
  if (period === "Mês") return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  if (period === "Ano") return d.getFullYear() === today.getFullYear();
  return true;
}

function origemLabel(origem) {
  if (origem === "manual") return "Manual";
  if (origem === "pedido") return "Pedido";
  if (origem === "compra") return "Compra";
  if (origem === "estorno") return "Estorno";
  return origem || "—";
}

function statusContaPagar(c) {
  if (c.pago) return { label: "Paga", tone: "green" };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(c.vencimento + "T00:00");
  const diffDays = Math.round((venc - hoje) / 86400000);
  if (diffDays < 0) return { label: "Vencida", tone: "red" };
  if (diffDays <= 3) return { label: "Vence em breve", tone: "red" };
  return { label: "Em aberto", tone: "gray" };
}

function ContaPagarForm({ data, suppliers, onSave, saving, onCancel }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="cc-form-grid">
        <Field label="Descrição" span={3}><TextInput required value={form.descricao} onChange={set("descricao")} placeholder="ex: Aluguel de agosto" /></Field>
        <Field label="Valor (R$)"><TextInput type="number" step="0.01" min="0" required value={form.valor} onChange={set("valor")} /></Field>
        <Field label="Vencimento"><TextInput type="date" required value={form.vencimento} onChange={set("vencimento")} /></Field>
        <Field label="Fornecedor (opcional)">
          <Select value={form.fornecedorId || ""} onChange={set("fornecedorId")}>
            <option value="">Nenhum</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Select>
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <GhostButton onClick={onCancel} disabled={saving}>Cancelar</GhostButton>
        <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar conta"}</GoldButton>
      </div>
    </form>
  );
}

function ContasPagarPanel({ accountsPayable, setAccountsPayable, suppliers, setCashflow }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setModal({ mode: "new", data: { descricao: "", valor: "", vencimento: "", fornecedorId: "" } });
  }
  function openEdit(c) {
    if (c.pago) { alert("Essa conta já foi paga e não pode ser editada."); return; }
    setModal({ mode: "edit", data: { ...c } });
  }

  async function save(data) {
    setSaving(true);
    try {
      if (modal.mode === "new") await createAccountPayable(data);
      else await updateAccountPayable(data.id, data);
      const fresh = await listAccountsPayable();
      setAccountsPayable(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar conta: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    if (c.pago) { alert("Essa conta já foi paga e não pode ser excluída."); return; }
    if (!window.confirm(`Tem certeza que deseja excluir "${c.descricao}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteAccountPayable(c.id);
      setAccountsPayable((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert("Erro ao excluir conta: " + err.message);
    }
  }

  async function markPaid(c) {
    if (!window.confirm(`Marcar "${c.descricao}" (${money(c.valor)}) como paga? Isso lança uma saída no fluxo de caixa.`)) return;
    try {
      await markAccountAsPaid(c);
      const [freshAccounts, freshCashflow] = await Promise.all([listAccountsPayable(), listCashflow()]);
      setAccountsPayable(freshAccounts);
      setCashflow(freshCashflow);
    } catch (err) {
      alert("Erro ao marcar como paga: " + err.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <p className="cc-chart-title" style={{ margin: 0 }}>Contas a pagar</p>
        <GhostButton icon={Plus} onClick={openNew}>Nova conta</GhostButton>
      </div>
      <div className="cc-card" style={{ padding: 0 }}>
        {accountsPayable.length === 0 ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Nenhuma conta cadastrada.</p>
        ) : (
          <Table
            columns={["Descrição", "Fornecedor", "Vencimento", "Valor", "Status", ""]}
            rows={accountsPayable}
            renderRow={(c) => {
              const status = statusContaPagar(c);
              return (
                <tr key={c.id}>
                  <td style={td}>{c.descricao}</td>
                  <td style={td}>{c.fornecedor || "—"}</td>
                  <td style={td}>{new Date(c.vencimento + "T00:00").toLocaleDateString("pt-BR")}</td>
                  <td style={td}>{money(c.valor)}</td>
                  <td style={td}><Badge tone={status.tone}>{status.label}</Badge></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!c.pago && (
                        <button onClick={() => markPaid(c)} className="cc-icon-btn" title="Marcar como paga"><CheckCircle2 size={14} /></button>
                      )}
                      <button onClick={() => openEdit(c)} className="cc-icon-btn"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} className="cc-icon-btn"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Nova conta a pagar" : "Editar conta a pagar"} onClose={() => setModal(null)}>
          <ContaPagarForm data={modal.data} suppliers={suppliers} onSave={save} saving={saving} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function CaixaView({ cashflow, setCashflow, orders, setOrders, clients, products, onStatusChange, accountsPayable, setAccountsPayable, suppliers, loading, loadError }) {
  const [period, setPeriod] = useState("Mês");
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', data}
  const [saving, setSaving] = useState(false);

  const filteredCashflow = cashflow.filter((c) => isInPeriod(c.data, period));
  const entradas = filteredCashflow.filter((c) => c.tipo === "Entrada").reduce((s, c) => s + c.valor, 0);
  const saidas = filteredCashflow.filter((c) => c.tipo === "Saída").reduce((s, c) => s + c.valor, 0);
  const saldo = entradas + saidas;

  function openNew() {
    setModal({ mode: "new", data: { tipo: "Saída", desc: "", valor: "", data: new Date().toISOString().slice(0, 10) } });
  }
  function openEdit(c) {
    if (c.origem !== "manual") {
      alert(`Este lançamento veio de um processo automático (${origemLabel(c.origem)}) e não pode ser editado por aqui. Para ajustar, cancele o pedido/compra de origem na tela correspondente.`);
      return;
    }
    setModal({ mode: "edit", data: { id: c.id, tipo: c.tipo, desc: c.desc, valor: Math.abs(c.valor), data: c.data } });
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal.mode === "new") {
        await createCashflowEntry(form);
      } else {
        await updateCashflowEntry(modal.data.id, form);
      }
      const fresh = await listCashflow();
      setCashflow(fresh);
      setModal(null);
    } catch (err) {
      alert("Erro ao salvar lançamento: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    if (c.origem !== "manual") {
      alert(`Este lançamento veio de um processo automático (${origemLabel(c.origem)}) e não pode ser excluído por aqui. Para remover, cancele o pedido/compra de origem na tela correspondente.`);
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o lançamento "${c.desc}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteCashflowEntry(c.id);
      setCashflow((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert("Erro ao excluir lançamento: " + err.message);
    }
  }

  return (
    <div>
      <SectionTitle
        title="Fluxo de caixa"
        subtitle="Entradas, saídas e saldo"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["Dia", "Semana", "Mês", "Ano"].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  fontFamily: "Manrope", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 18,
                  border: `1px solid ${period === p ? GREEN : "#E2E0D6"}`, background: period === p ? GREEN : "#fff",
                  color: period === p ? "#fff" : "#5B6B63", cursor: "pointer",
                }}>{p}</button>
              ))}
            </div>
            <GoldButton icon={Plus} onClick={openNew}>Novo lançamento</GoldButton>
          </div>
        }
      />
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar o fluxo de caixa: {loadError}
        </p>
      )}
      <div className="cc-grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <StatCard icon={ArrowUpRight} label="Entradas" value={money(entradas)} accent={GREEN} />
        <StatCard icon={ArrowDownRight} label="Saídas" value={money(Math.abs(saidas))} accent="#B5533D" />
        <StatCard icon={Wallet} label="Saldo" value={money(saldo)} accent={GOLD} />
        <StatCard icon={TrendingUp} label="Lucro líquido" value={money(saldo)} accent={GREEN} />
      </div>

      <div className="cc-card" style={{ padding: 0, marginTop: 4 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando fluxo de caixa...</p>
        ) : filteredCashflow.length === 0 ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Nenhum lançamento neste período.</p>
        ) : (
          <Table
            columns={["Descrição", "Tipo", "Data", "Valor", "Origem", ""]}
            rows={filteredCashflow}
            renderRow={(c) => (
              <tr key={c.id}>
                <td style={td}>{c.desc}</td>
                <td style={td}><Badge tone={c.tipo === "Entrada" ? "green" : "red"}>{c.tipo}</Badge></td>
                <td style={td}>{new Date(c.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td style={{ ...td, fontWeight: 700, color: c.valor >= 0 ? GREEN : "#B5533D" }}>{money(c.valor)}</td>
                <td style={td}><Badge tone={c.origem === "manual" ? "gold" : "gray"}>{origemLabel(c.origem)}</Badge></td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(c)} className="cc-icon-btn"><Pencil size={14} /></button>
                    <button onClick={() => remove(c)} className="cc-icon-btn"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Novo lançamento" : "Editar lançamento"} onClose={() => setModal(null)}>
          <CashflowForm data={modal.data} onSave={handleSave} saving={saving} onCancel={() => setModal(null)} />
        </Modal>
      )}

      <div style={{ marginTop: 36 }}>
        <ContasPagarPanel accountsPayable={accountsPayable} setAccountsPayable={setAccountsPayable} suppliers={suppliers} setCashflow={setCashflow} />
      </div>

      <div style={{ marginTop: 36 }}>
        <p className="cc-chart-title">Pedidos recentes</p>
        <PedidosPanel
          orders={orders} setOrders={setOrders} clients={clients} products={products}
          onStatusChange={onStatusChange} loading={loading} loadError=""
          limit={8} showNewButton={false}
        />
      </div>
    </div>
  );
}

function CashflowForm({ data, onSave, saving, onCancel }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="cc-form-grid">
        <Field label="Tipo">
          <Select value={form.tipo} onChange={set("tipo")}>
            <option>Entrada</option>
            <option>Saída</option>
          </Select>
        </Field>
        <Field label="Data"><TextInput type="date" value={form.data} onChange={set("data")} required /></Field>
        <Field label="Valor (R$)"><TextInput type="number" step="0.01" min="0" value={form.valor} onChange={set("valor")} required /></Field>
        <Field label="Descrição" span={3}><TextInput value={form.desc} onChange={set("desc")} required placeholder="ex: Aluguel, embalagens, taxa..." /></Field>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <GhostButton onClick={onCancel} disabled={saving}>Cancelar</GhostButton>
        <GoldButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar lançamento"}</GoldButton>
      </div>
    </form>
  );
}

/* ---------------- Relatórios ---------------- */

function RelatoriosView({ products, clients, orders, cashflow, wishlistCounts, visits, loading }) {
  // Quantidade vendida por produto, somando os itens de pedidos que não foram cancelados
  const vendidoPorProduto = {};
  orders.filter((o) => o.status !== "Cancelado").forEach((o) => {
    (o.itens || []).forEach((i) => {
      if (!i.productId) return;
      vendidoPorProduto[i.productId] = (vendidoPorProduto[i.productId] || 0) + i.qtd;
    });
  });

  const maisVendidos = products
    .map((p) => ({ label: p.name, qty: vendidoPorProduto[p.id] || 0 }))
    .filter((p) => p.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .map((p) => ({ label: p.label, value: `${p.qty} un.` }));

  const lucroPorCategoriaMap = {};
  products.forEach((p) => {
    const qty = vendidoPorProduto[p.id] || 0;
    if (qty === 0) return;
    const cat = p.category || "Sem categoria";
    lucroPorCategoriaMap[cat] = (lucroPorCategoriaMap[cat] || 0) + (p.lucro || 0) * qty;
  });
  const lucroPorCategoria = Object.entries(lucroPorCategoriaMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value: money(value) }));

  const produtosParados = products
    .filter((p) => !vendidoPorProduto[p.id])
    .map((p) => ({ label: p.name, value: `${p.quantidade} un. em estoque` }));

  const entradas = cashflow.filter((c) => c.tipo === "Entrada").reduce((s, c) => s + c.valor, 0);
  const saidas = cashflow.filter((c) => c.tipo === "Saída").reduce((s, c) => s + c.valor, 0);
  const resumoCaixa = [
    { label: "Entradas", value: money(entradas) },
    { label: "Saídas", value: money(Math.abs(saidas)) },
    { label: "Saldo", value: money(entradas + saidas) },
  ];

  const maisFavoritadas = products
    .map((p) => ({ label: `${p.code ? p.code + " — " : ""}${p.name}`, qty: wishlistCounts[p.id] || 0 }))
    .filter((p) => p.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .map((p) => ({ label: p.label, value: `♥ ${p.qty}` }));

  // Visitas por dia nos últimos 30 dias — dias sem visita aparecem com 0, não somem.
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    return { key: d.toISOString().slice(0, 10), label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` };
  });
  const visitsByDayData = last30Days.map(({ key, label }) => ({
    dia: label,
    visitas: visits.filter((v) => v.criado_em?.slice(0, 10) === key).length,
  }));

  const reports = [
    { title: "Produtos mais vendidos", data: maisVendidos },
    { title: "Lucro por categoria", data: lucroPorCategoria },
    { title: "Clientes que mais compram", data: [...clients].sort((a, b) => b.totalGasto - a.totalGasto).map((c) => ({ label: c.nome, value: money(c.totalGasto) })) },
    { title: "Produtos com estoque baixo", data: products.filter((p) => p.quantidade <= p.estoqueMinimo).map((p) => ({ label: p.name, value: `${p.quantidade} un.` })) },
    { title: "Produtos sem movimentação", data: produtosParados },
    { title: "Lucro por produto", data: products.map((p) => ({ label: p.name, value: money(p.lucro) })) },
    { title: "Fluxo de caixa", data: resumoCaixa },
    { title: "Peças mais favoritadas", data: maisFavoritadas },
  ];
  return (
    <div>
      <SectionTitle title="Relatórios" subtitle="Análises rápidas para decisões de negócio" />
      {loading && <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", marginBottom: 14 }}>Carregando relatórios...</p>}
      <div className="cc-grid-charts">
        {reports.map((r) => (
          <div key={r.title} className="cc-card" style={{ padding: 20 }}>
            <p className="cc-chart-title">{r.title}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {r.data.length === 0 && <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#96A39D" }}>Sem dados no momento.</p>}
              {r.data.slice(0, 6).map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F4F1E9" }}>
                  <span style={{ fontFamily: "Manrope", fontSize: 13, color: INK }}>{d.label}</span>
                  <span style={{ fontFamily: "Manrope", fontSize: 13, fontWeight: 700, color: GREEN }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="cc-card" style={{ padding: 20, gridColumn: "1 / -1" }}>
          <p className="cc-chart-title">Visitas por dia (últimos 30 dias)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={visitsByDayData}>
              <defs>
                <linearGradient id="gVisitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" vertical={false} />
              <XAxis dataKey="dia" interval={3} tick={{ fontFamily: "Manrope", fontSize: 10.5, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontFamily: "Manrope", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              <Area type="monotone" dataKey="visitas" stroke={GREEN} strokeWidth={2.5} fill="url(#gVisitas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Catálogo ---------------- */

function CatalogoView({ products }) {
  return (
    <div>
      <SectionTitle title="Catálogo" subtitle="Vitrine digital das peças Cecília" />
      <div className="cc-catalog-grid">
        {products.map((p) => {
          const msg = encodeURIComponent(`Olá! Tenho interesse na peça ${p.name} (${p.code}) — ${money(p.precoSugerido)}.`);
          return (
            <div key={p.id} className="cc-card cc-catalog-card">
              <div style={{
                aspectRatio: "1/1", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative", overflow: "hidden",
                background: p.photo ? `center/cover no-repeat url(${p.photo})` : `linear-gradient(150deg, ${CREAM}, #F0ECE0)`,
              }}>
                {!p.photo && <ImagePlus size={28} color="#C9BFA6" />}
                {p.promocao && <span style={{ position: "absolute", top: 10, left: 10, background: GOLD, color: "#fff", fontFamily: "Manrope", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 12 }}>PROMOÇÃO</span>}
              </div>
              <p style={{ fontFamily: "Manrope", fontSize: 11, fontWeight: 700, color: GOLD, margin: 0, letterSpacing: ".04em" }}>{p.code}</p>
              <p style={{ fontFamily: "Cormorant Garamond", fontSize: 19, fontWeight: 600, margin: "3px 0 6px", color: INK }}>{p.name}</p>
              <p style={{ fontFamily: "Manrope", fontSize: 12, color: "#7A897F", margin: "0 0 10px", lineHeight: 1.5 }}>
                {[p.banho, p.cor, p.pedra, p.garantia ? `Garantia ${p.garantia}` : ""].filter(Boolean).join(" · ")}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: 700, color: GREEN }}>{money(p.precoSugerido)}</span>
                <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noopener noreferrer" className="cc-btn-gold" style={{ padding: "8px 12px", fontSize: 12 }}>
                  <MessageCircle size={14} /> Compartilhar
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Configurações ---------------- */

function FinanceiroTab({ settings, setSettings, financialGoals, setFinancialGoals }) {
  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  const metaAtual = financialGoals.find((g) => g.mes === mes && g.ano === ano);

  const [form, setForm] = useState({
    margem_padrao: settings?.margem_padrao ?? 100,
    taxa_maquininha: settings?.taxa_maquininha ?? 3.5,
    comissao: settings?.comissao ?? 0,
    impostos: settings?.impostos ?? 6,
    meta: metaAtual?.valor_meta ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const updated = await updateSettings({
        margem_padrao: parseFloat(form.margem_padrao) || 0,
        taxa_maquininha: parseFloat(form.taxa_maquininha) || 0,
        comissao: parseFloat(form.comissao) || 0,
        impostos: parseFloat(form.impostos) || 0,
      });
      setSettings(updated);

      if (form.meta !== "") {
        const goal = await setGoalForMonth(mes, ano, parseFloat(form.meta) || 0);
        setFinancialGoals((prev) => [...prev.filter((g) => !(g.mes === mes && g.ano === ano)), goal]);
      }
      setMsg("Alterações salvas com sucesso!");
    } catch (err) {
      setMsg("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const mesLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <p className="cc-form-group-title" style={{ marginTop: 0 }}>Meta de faturamento</p>
      <div className="cc-form-grid">
        <Field label={`Meta para ${mesLabel} (R$)`}>
          <TextInput type="number" step="0.01" min="0" value={form.meta} onChange={set("meta")} placeholder="ex: 9000" />
        </Field>
      </div>

      <p className="cc-form-group-title">Custos e taxas padrão</p>
      <div className="cc-form-grid">
        <Field label="Margem padrão (%)"><TextInput type="number" value={form.margem_padrao} onChange={set("margem_padrao")} /></Field>
        <Field label="Taxa da maquininha (%)"><TextInput type="number" value={form.taxa_maquininha} onChange={set("taxa_maquininha")} /></Field>
        <Field label="Comissão (%)"><TextInput type="number" value={form.comissao} onChange={set("comissao")} /></Field>
        <Field label="Impostos (%)"><TextInput type="number" value={form.impostos} onChange={set("impostos")} /></Field>
      </div>

      {msg && (
        <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: msg.startsWith("Erro") ? "#B94A48" : GREEN, marginTop: 14 }}>{msg}</p>
      )}
      <div style={{ marginTop: 16 }}>
        <GoldButton onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</GoldButton>
      </div>
    </div>
  );
}

function ConfiguracoesView({ settings, setSettings, financialGoals, setFinancialGoals }) {
  const [tab, setTab] = useState("empresa");
  const tabs = [
    { id: "empresa", label: "Empresa" }, { id: "financeiro", label: "Financeiro" },
    { id: "categorias", label: "Categorias" }, { id: "usuarios", label: "Usuários e permissões" },
    { id: "backup", label: "Backup" },
  ];

  return (
    <div>
      <SectionTitle title="Configurações" subtitle="Personalize o sistema Cecília" />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily: "Manrope", fontSize: 12.5, fontWeight: 600, padding: "8px 15px", borderRadius: 20,
            border: `1px solid ${tab === t.id ? GREEN : "#E2E0D6"}`, background: tab === t.id ? GREEN : "#fff",
            color: tab === t.id ? "#fff" : "#5B6B63", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      <div className="cc-card" style={{ padding: 24, maxWidth: 640 }}>
        {tab === "empresa" && (
          <div className="cc-form-grid">
            <Field label="Nome da empresa"><TextInput defaultValue="Cecília Semijoias" /></Field>
            <Field label="Logo">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Cormorant Garamond", fontStyle: "italic", color: GREEN }}>C</span>
                </div>
                <GhostButton icon={ImagePlus}>Alterar logo</GhostButton>
              </div>
            </Field>
            <Field label="Cor primária"><div style={{ display: "flex", gap: 8 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: GREEN }} /><div style={{ width: 32, height: 32, borderRadius: 8, background: GOLD }} /><div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", border: "1px solid #E2E0D6" }} /></div></Field>
          </div>
        )}
        {tab === "financeiro" && (
          <FinanceiroTab settings={settings} setSettings={setSettings} financialGoals={financialGoals} setFinancialGoals={setFinancialGoals} />
        )}
        {tab === "categorias" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: CREAM, borderRadius: 10 }}>
                <span style={{ fontFamily: "Manrope", fontSize: 13.5 }}>{c}</span>
                <Badge tone="gold">{CATEGORY_PREFIX[c]}0001</Badge>
              </div>
            ))}
          </div>
        )}
        {tab === "usuarios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ nome: "Ana Cecília", papel: "Administradora" }, { nome: "Beatriz Lima", papel: "Vendas" }].map((u) => (
              <div key={u.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: CREAM, borderRadius: 10 }}>
                <span style={{ fontFamily: "Manrope", fontSize: 13.5, fontWeight: 600 }}>{u.nome}</span>
                <Badge tone="green">{u.papel}</Badge>
              </div>
            ))}
            <GhostButton icon={Plus}>Convidar usuário</GhostButton>
          </div>
        )}
        {tab === "backup" && (
          <div>
            <p style={{ fontFamily: "Manrope", fontSize: 13.5, color: "#5B6B63", marginBottom: 14 }}>
              Último backup: hoje às 06:00 (automático diário).
            </p>
            <GoldButton>Gerar backup agora</GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- App shell ---------------- */

const VIEW_TITLES = {
  dashboard: "Dashboard", produtos: "Produtos", clientes: "Clientes", fornecedores: "Fornecedores",
  compras: "Compras", estoque: "Estoque", pedidos: "Pedidos", precificacao: "Precificação",
  caixa: "Fluxo de Caixa", relatorios: "Relatórios", catalogo: "Catálogo", config: "Configurações",
};

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [clients, setClients] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [wishlistCounts, setWishlistCounts] = useState({});
  const [visits, setVisits] = useState([]);
  const [settings, setSettings] = useState(null);
  const [financialGoals, setFinancialGoals] = useState([]);
  const [accountsPayable, setAccountsPayable] = useState([]);

  // Verifica se já existe uma sessão ativa e escuta mudanças (login/logout em outra aba, expiração de token)
  useEffect(() => {
    getCurrentUser().then((user) => {
      setLoggedIn(!!user);
      setAuthChecked(true);
    });
    const unsubscribe = onAuthChange((user) => setLoggedIn(!!user));
    return unsubscribe;
  }, []);

  async function handleLogin(email, senha) {
    await login(email, senha); // erros são tratados na LoginScreen; sucesso atualiza loggedIn via onAuthChange
  }

  // Busca nome e papel do usuário logado (tabela profiles) para o rodapé da barra lateral
  useEffect(() => {
    if (!loggedIn) {
      setProfile(null);
      return;
    }
    getCurrentProfile().then(setProfile).catch((err) => console.error("Erro ao carregar perfil:", err));
  }, [loggedIn]);

  // Carrega produtos, categorias, fornecedores, clientes, pedidos, caixa e compras reais do Supabase assim que loga
  useEffect(() => {
    if (!loggedIn) return;
    setProductsLoading(true);
    setProductsError("");
    Promise.all([
      listProducts(),
      listCategories(),
      listSuppliers(),
      listClients(),
      listOrders(),
      listCashflow(),
      listPurchases(),
      listWishlistCounts(),
      listVisits(),
      getSettings(),
      listGoals(),
      listAccountsPayable(),
    ])
      .then(([productRows, categoryRows, supplierRows, clientRows, orderRows, cashflowRows, purchaseRows, wishlistCountRows, visitRows, settingsRow, goalRows, accountRows]) => {
        setProducts(productRows);
        setCategories(categoryRows);
        setSuppliers(supplierRows);
        setClients(clientRows);
        setOrders(orderRows);
        setCashflow(cashflowRows);
        setPurchases(purchaseRows);
        setWishlistCounts(wishlistCountRows);
        setVisits(visitRows);
        setSettings(settingsRow);
        setFinancialGoals(goalRows);
        setAccountsPayable(accountRows);
      })
      .catch((err) => setProductsError(err.message))
      .finally(() => setProductsLoading(false));
  }, [loggedIn]);

  // Muda só o status do pedido — baixar estoque, creditar cliente e lançar no
  // caixa (ou estornar, se cancelado) acontece sozinho no banco via trigger.
  // Depois é só rebuscar tudo que pode ter sido afetado.
  async function handleOrderStatusChange(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      const [freshOrders, freshProducts, freshClients, freshCashflow] = await Promise.all([
        listOrders(),
        listProducts(),
        listClients(),
        listCashflow(),
      ]);
      setOrders(freshOrders);
      setProducts(freshProducts);
      setClients(freshClients);
      setCashflow(freshCashflow);
    } catch (err) {
      alert("Erro ao atualizar status do pedido: " + err.message);
    }
  }

  if (!authChecked) return null;
  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: CREAM, fontFamily: "Manrope" }}>
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
        .cc-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px; background: #fff; color: ${INK};
          border: 1px solid #E2E0D6; border-radius: 10px; padding: 9px 16px;
          font-family: Manrope; font-weight: 600; font-size: 13px; cursor: pointer;
        }
        .cc-btn-ghost:hover { background: ${CREAM}; }
        .cc-icon-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid #E2E0D6; background: #fff;
          color: #5B6B63; display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .cc-icon-btn:hover { border-color: ${GOLD}; color: ${GOLD}; }
        .cc-grid-stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 14px; margin-bottom: 22px; }
        .cc-grid-charts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 6px; }
        .cc-two-col { display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; align-items: start; }
        .cc-chart-title { font-family: Cormorant Garamond; font-size: 18px; font-weight: 600; color: ${INK}; margin: 0 0 14px; }
        .cc-form-group-title {
          font-family: Manrope; font-size: 11.5px; font-weight: 800; color: ${GOLD_SOFT === "" ? GOLD : "#8A6B2E"};
          text-transform: uppercase; letter-spacing: .06em; margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #EFEBE0;
        }
        .cc-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .cc-catalog-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 18px; }
        .cc-catalog-card { padding: 16px; }
        .cc-only-mobile { display: none; }
        .cc-sidebar { position: sticky; top: 0; height: 100vh; }
        input:focus, select:focus, textarea:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px ${GOLD}22; }

        @media (max-width: 980px) {
          .cc-grid-charts { grid-template-columns: 1fr; }
          .cc-two-col { grid-template-columns: 1fr; }
          .cc-form-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .cc-form-grid { grid-template-columns: 1fr; }
          .cc-search { width: 160px !important; }
          .cc-only-mobile { display: flex; }
          .cc-sidebar { position: fixed; left: -240px; top: 0; height: 100vh; z-index: 50; transition: left .2s ease; }
          .cc-sidebar-open { left: 0; }
        }
      `}</style>

      <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} profile={profile} onOpenProfile={() => setProfileModalOpen(true)} />

      {profileModalOpen && (
        <ProfileModal
          profile={profile}
          onClose={() => setProfileModalOpen(false)}
          onSave={async (nome) => {
            const updated = await updateCurrentProfile(nome);
            setProfile(updated);
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar title={VIEW_TITLES[active]} setMobileOpen={setMobileOpen} />
        <main style={{ padding: "22px 24px 60px" }}>
          {active === "dashboard" && <Dashboard products={products} orders={orders} cashflow={cashflow} visits={visits} financialGoals={financialGoals} />}
          {active === "produtos" && <ProdutosView products={products} setProducts={setProducts} suppliers={suppliers} categories={categories} wishlistCounts={wishlistCounts} loading={productsLoading} loadError={productsError} />}
          {active === "clientes" && <ClientesView clients={clients} setClients={setClients} loading={productsLoading} loadError={productsError} />}
          {active === "fornecedores" && <FornecedoresView suppliers={suppliers} setSuppliers={setSuppliers} loading={productsLoading} loadError={productsError} />}
          {active === "compras" && <ComprasView purchases={purchases} setPurchases={setPurchases} suppliers={suppliers} products={products} setProducts={setProducts} setCashflow={setCashflow} loading={productsLoading} loadError={productsError} />}
          {active === "estoque" && <EstoqueView products={products} loading={productsLoading} loadError={productsError} />}
          {active === "pedidos" && <PedidosView orders={orders} setOrders={setOrders} clients={clients} products={products} onStatusChange={handleOrderStatusChange} loading={productsLoading} loadError={productsError} />}
          {active === "precificacao" && <PrecificacaoView products={products} setProducts={setProducts} settings={settings} />}
          {active === "caixa" && <CaixaView cashflow={cashflow} setCashflow={setCashflow} orders={orders} setOrders={setOrders} clients={clients} products={products} onStatusChange={handleOrderStatusChange} accountsPayable={accountsPayable} setAccountsPayable={setAccountsPayable} suppliers={suppliers} loading={productsLoading} loadError={productsError} />}
          {active === "relatorios" && <RelatoriosView products={products} clients={clients} orders={orders} cashflow={cashflow} wishlistCounts={wishlistCounts} visits={visits} loading={productsLoading} />}
          {active === "catalogo" && <CatalogoView products={products} />}
          {active === "config" && <ConfiguracoesView settings={settings} setSettings={setSettings} financialGoals={financialGoals} setFinancialGoals={setFinancialGoals} />}
        </main>
      </div>
    </div>
  );
}
