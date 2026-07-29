import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart, Boxes,
  ClipboardList, Calculator, Wallet, BarChart3, BookOpen, Settings,
  Search, Bell, ChevronDown, Plus, X, Pencil, Trash2, ImagePlus,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  Instagram, MessageCircle, Store, MapPin, Eye, EyeOff, Lock, Mail,
  Menu, Sparkles, ArrowUpRight, ArrowDownRight, Filter, Share2, Upload
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";
import { login, getCurrentUser, getCurrentProfile, updateCurrentProfile, onAuthChange, requestPasswordReset } from "./services/auth";
import { listProducts, listCategories, createProduct, updateProduct, deleteProduct, bulkDeleteProducts, uploadProductPhoto, bulkCreateProducts } from "./services/produtos";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./services/fornecedores";
import { listClients, createClient, updateClient, deleteClient } from "./services/clientes";
import { listOrders, createOrder, updateOrder, updateOrderStatus, deleteOrder } from "./services/pedidos";
import { listCashflow, createCashflowEntry } from "./services/caixa";

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

const salesByMonth = [
  { mes: "Fev", vendas: 5200 }, { mes: "Mar", vendas: 6100 }, { mes: "Abr", vendas: 5800 },
  { mes: "Mai", vendas: 7300 }, { mes: "Jun", vendas: 8100 }, { mes: "Jul", vendas: 9250 },
];
const profitByMonth = [
  { mes: "Fev", lucro: 2400 }, { mes: "Mar", lucro: 2850 }, { mes: "Abr", lucro: 2600 },
  { mes: "Mai", lucro: 3400 }, { mes: "Jun", lucro: 3900 }, { mes: "Jul", lucro: 4450 },
];
const salesByCategory = [
  { name: "Brincos", value: 32 }, { name: "Anéis", value: 24 }, { name: "Colares", value: 18 },
  { name: "Pulseiras", value: 14 }, { name: "Conjuntos", value: 12 },
];
const topProducts = [
  { name: "Brinco Argola Trança", vendas: 41 }, { name: "Anel Solitário Baguete", vendas: 37 },
  { name: "Colar Gota Cristal", vendas: 22 }, { name: "Conjunto Pérolas", vendas: 15 },
];
const salesOrigin = [
  { name: "Instagram", value: 42 }, { name: "WhatsApp", value: 31 },
  { name: "Loja Virtual", value: 17 }, { name: "Presencial", value: 10 },
];
const PIE_COLORS = [GREEN, GOLD, "#8AA89B", "#DCC38A", "#3F7A63"];

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

// Wordmark reutilizável: texto serifado dourado + estrelinha decorativa.
// variant="large" acrescenta a linha com losango e a tagline em itálico.
export function CeciliaLogo({ variant = "large" }) {
  const compact = variant === "compact";
  return (
    <div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <span style={{
          fontFamily: "Cormorant Garamond", fontWeight: 600, fontStyle: "normal",
          fontSize: compact ? 21 : 40, color: GOLD, letterSpacing: ".02em", lineHeight: 1,
        }}>
          Cecília
        </span>
        <Sparkles
          size={compact ? 12 : 18}
          color={GOLD}
          style={{ position: "absolute", top: compact ? -5 : -10, right: compact ? -11 : -18 }}
        />
      </div>
      {!compact && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "12px 0 8px" }}>
            <span style={{ width: 44, height: 1, background: GOLD, display: "inline-block" }} />
            <span style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
            <span style={{ width: 44, height: 1, background: GOLD, display: "inline-block" }} />
          </div>
          <p style={{ fontFamily: "Cormorant Garamond", fontStyle: "italic", fontSize: 15.5, color: GOLD_SOFT, margin: 0, textAlign: "center" }}>
            Elegante como você.
          </p>
        </>
      )}
    </div>
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

function Dashboard({ products }) {
  const lowStock = products.filter((p) => p.quantidade <= p.estoqueMinimo);
  return (
    <div>
      <SectionTitle title="Visão geral" subtitle="Resumo do desempenho da Cecília — julho de 2026" />
      <div className="cc-grid-stats">
        <StatCard icon={Wallet} label="Faturamento do mês" value={money(9250)} trend="+13,2%" trendUp accent={GREEN} />
        <StatCard icon={TrendingUp} label="Lucro do mês" value={money(4450)} trend="+14,1%" trendUp accent={GOLD} />
        <StatCard icon={Boxes} label="Investido em estoque" value={money(6840)} accent="#3E6E85" />
        <StatCard icon={Sparkles} label="Ticket médio" value={money(112.4)} trend="+4,8%" trendUp accent={GREEN} />
        <StatCard icon={Package} label="Produtos vendidos" value="83" trend="+9" trendUp accent={GOLD} />
        <StatCard icon={Clock} label="Pedidos em andamento" value="7" accent="#3E6E85" />
        <StatCard icon={AlertTriangle} label="Pedidos pendentes" value="3" trend="-1" accent="#B5533D" />
        <StatCard icon={AlertTriangle} label="Estoque baixo" value={String(lowStock.length)} accent="#B5533D" />
      </div>

      <div className="cc-grid-charts">
        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Vendas por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesByMonth}>
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
            <BarChart data={profitByMonth}>
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
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={salesByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {salesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              <Legend wrapperStyle={{ fontFamily: "Manrope", fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Produtos mais vendidos</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: "Manrope", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontFamily: "Manrope", fontSize: 11.5, fill: INK }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              <Bar dataKey="vendas" fill={GREEN} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="cc-card" style={{ padding: 20, gridColumn: "1 / -1" }}>
          <p className="cc-chart-title">Origem das vendas</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center" }}>
            <ResponsiveContainer width={220} height={200}>
              <PieChart>
                <Pie data={salesOrigin} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {salesOrigin.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: "Manrope", fontSize: 12, borderRadius: 10, border: "1px solid #EFEBE0" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
              {salesOrigin.map((o, i) => {
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
    categoryId: categories?.[0]?.id || "", collection: "", name: "", photo: "",
    banho: "", cor: "", pedra: "", garantia: "05 meses", peso: "",
    fornecedorId: "", dataCompra: "", valorPago: "", freteRateado: "",
    precoSugerido: "", margem: 100, promocao: false, disponibilidade: "Pronta entrega",
    quantidade: "", estoqueMinimo: "", localizacao: "", observacoes: "",
  };
}

function ProdutosView({ products, setProducts, suppliers, categories, loading, loadError }) {
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

  async function save(data, photoFile) {
    setSaving(true);
    try {
      let productId = data.id;
      if (modal.mode === "new") {
        const created = await createProduct(data);
        productId = created.id;
      } else {
        await updateProduct(data.id, data);
      }
      if (photoFile) {
        await uploadProductPhoto(productId, photoFile);
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
                          <p style={{ margin: 0, fontWeight: 600 }}>{p.name}</p>
                          <p style={{ margin: 0, fontSize: 11.5, color: "#8A968F" }}>{p.collection}</p>
                        </div>
                      </div>
                    </td>
                    <td style={td}>{p.category}</td>
                    <td style={td}>
                      <Badge tone={p.quantidade <= p.estoqueMinimo ? "red" : "green"}>{p.quantidade} un.</Badge>
                    </td>
                    <td style={td}>{money(p.custoTotal)}</td>
                    <td style={td}>{money(p.precoSugerido)}{p.promocao && <Badge tone="gold"> Promo</Badge>}</td>
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
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(data.photo || "");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target && e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (!photoFile) return;
    const url = photoPreview;
    return () => URL.revokeObjectURL(url);
  }, [photoFile, photoPreview]);

  const custo = (parseFloat(form.valorPago) || 0) + (parseFloat(form.freteRateado) || 0);
  const lucro = (parseFloat(form.precoSugerido) || 0) - custo;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form, photoFile); }}>
      <p style={{ fontFamily: "Manrope", fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 4 }}>Código: {previewCode}</p>

      <p className="cc-form-group-title">Foto</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 10, background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          {photoPreview ? (
            <img src={photoPreview} alt="Prévia da foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImagePlus size={22} color="#B8AF9C" />
          )}
        </div>
        <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ fontFamily: "Manrope", fontSize: 12.5 }} />
      </div>

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

function ComprasView({ purchases, suppliers, products, onRegister }) {
  const [form, setForm] = useState({ fornecedor: "", produtoId: "", data: "", frete: "", qtdPecas: "", valorTotal: "" });
  const freteUnit = form.qtdPecas ? (parseFloat(form.frete || 0) / parseInt(form.qtdPecas)).toFixed(2) : "0.00";
  const produtoSelecionado = products.find((p) => String(p.id) === String(form.produtoId));

  function submit(e) {
    e.preventDefault();
    onRegister({ ...form, freteUnit: parseFloat(freteUnit) });
    setForm({ fornecedor: "", produtoId: "", data: "", frete: "", qtdPecas: "", valorTotal: "" });
  }

  return (
    <div>
      <SectionTitle title="Compras" subtitle="Registre entradas de mercadoria — o estoque e o custo médio são atualizados automaticamente" />
      <div className="cc-two-col">
        <div className="cc-card" style={{ padding: 20 }}>
          <p className="cc-chart-title">Nova compra</p>
          <form onSubmit={submit} className="cc-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Fornecedor" span={2}>
              <Select value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} required>
                <option value="">Selecione...</option>
                {suppliers.map((s) => <option key={s.id}>{s.nome}</option>)}
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
              <GoldButton type="submit" full>Registrar compra</GoldButton>
            </div>
          </form>
        </div>

        <div className="cc-card" style={{ padding: 0 }}>
          <p className="cc-chart-title" style={{ padding: "20px 20px 0" }}>Histórico de compras</p>
          <Table
            columns={["Fornecedor", "Produto", "Data", "Peças", "Total", "Frete/peça"]}
            rows={purchases}
            renderRow={(p) => (
              <tr key={p.id}>
                <td style={td}>{p.fornecedor}</td>
                <td style={td}>{p.produtoNome || "—"}</td>
                <td style={td}>{p.data ? new Date(p.data + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                <td style={td}>{p.qtdPecas}</td>
                <td style={td}>{money(parseFloat(p.valorTotal))}</td>
                <td style={td}>{money(p.freteUnit)}</td>
              </tr>
            )}
          />
        </div>
      </div>
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

function PedidosView({ orders, setOrders, clients, products, onStatusChange, loading, loadError }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  function openNew() {
    setModal({ mode: "new", data: { clienteId: "", itens: [], desconto: 0, forma: "Pix", parcelas: 1, status: "Aguardando pagamento", rastreio: "", transportadora: "", obs: "", baixado: false } });
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

  return (
    <div>
      <SectionTitle title="Pedidos" subtitle={`${orders.length} pedidos registrados — status "Pago" baixa estoque, credita o caixa e atualiza o cliente`} action={<GoldButton icon={Plus} onClick={openNew} disabled={loading || clients.length === 0}>Novo pedido</GoldButton>} />
      {loadError && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#B94A48", marginBottom: 14 }}>
          Erro ao carregar pedidos: {loadError}
        </p>
      )}
      {!loading && clients.length === 0 && (
        <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A4530", background: "#FBF0EA", border: "1px solid #EED9CC", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          Você ainda não tem nenhum cliente cadastrado — cadastre pelo menos um em "Clientes" antes de criar um pedido.
        </p>
      )}
      <div className="cc-card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ fontFamily: "Manrope", fontSize: 13, color: "#8A968F", padding: 20 }}>Carregando pedidos...</p>
        ) : (
          <Table
            columns={["Número", "Cliente", "Produtos", "Total", "Pagamento", "Status", ""]}
            rows={orders}
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
function OrderForm({ data, clients, products, onSave, saving, onCancel }) {
  const [form, setForm] = useState(data);
  const [pickProduto, setPickProduto] = useState("");
  const [pickQtd, setPickQtd] = useState(1);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function addItem() {
    const p = products.find((pr) => String(pr.id) === String(pickProduto));
    if (!p) return;
    setForm((f) => ({ ...f, itens: [...(f.itens || []), { productId: p.id, code: p.code, name: p.name, qtd: parseInt(pickQtd) || 1, preco: p.precoSugerido }] }));
    setPickProduto(""); setPickQtd(1);
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
        <GhostButton icon={Plus} onClick={addItem}>Adicionar</GhostButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        {(form.itens || []).length === 0 && <p style={{ fontFamily: "Manrope", fontSize: 12.5, color: "#96A39D" }}>Nenhum produto adicionado ainda.</p>}
        {(form.itens || []).map((i, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ fontFamily: "Manrope", fontSize: 13 }}>{i.name} <span style={{ color: "#8A968F" }}>x{i.qtd}</span></span>
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

function PrecificacaoView() {
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
    </div>
  );
}

/* ---------------- Fluxo de Caixa ---------------- */

function CaixaView({ cashflow, setCashflow, loading, loadError }) {
  const [period, setPeriod] = useState("Mês");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const entradas = cashflow.filter((c) => c.tipo === "Entrada").reduce((s, c) => s + c.valor, 0);
  const saidas = cashflow.filter((c) => c.tipo === "Saída").reduce((s, c) => s + c.valor, 0);
  const saldo = entradas + saidas;

  async function handleSave(form) {
    setSaving(true);
    try {
      await createCashflowEntry(form);
      const fresh = await listCashflow();
      setCashflow(fresh);
      setModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar lançamento: " + err.message);
    } finally {
      setSaving(false);
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
            <GoldButton icon={Plus} onClick={() => setModalOpen(true)}>Novo lançamento</GoldButton>
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
        ) : (
          <Table
            columns={["Descrição", "Tipo", "Data", "Valor"]}
            rows={cashflow}
            renderRow={(c) => (
              <tr key={c.id}>
                <td style={td}>{c.desc}</td>
                <td style={td}><Badge tone={c.tipo === "Entrada" ? "green" : "red"}>{c.tipo}</Badge></td>
                <td style={td}>{new Date(c.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td style={{ ...td, fontWeight: 700, color: c.valor >= 0 ? GREEN : "#B5533D" }}>{money(c.valor)}</td>
              </tr>
            )}
          />
        )}
      </div>

      {modalOpen && (
        <Modal title="Novo lançamento" onClose={() => setModalOpen(false)}>
          <CashflowForm onSave={handleSave} saving={saving} onCancel={() => setModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

function CashflowForm({ onSave, saving, onCancel }) {
  const [form, setForm] = useState({ tipo: "Saída", desc: "", valor: "", data: new Date().toISOString().slice(0, 10) });
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

function RelatoriosView({ products, clients, orders, cashflow, loading }) {
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

  const reports = [
    { title: "Produtos mais vendidos", data: maisVendidos },
    { title: "Lucro por categoria", data: lucroPorCategoria },
    { title: "Clientes que mais compram", data: [...clients].sort((a, b) => b.totalGasto - a.totalGasto).map((c) => ({ label: c.nome, value: money(c.totalGasto) })) },
    { title: "Produtos com estoque baixo", data: products.filter((p) => p.quantidade <= p.estoqueMinimo).map((p) => ({ label: p.name, value: `${p.quantidade} un.` })) },
    { title: "Produtos sem movimentação", data: produtosParados },
    { title: "Lucro por produto", data: products.map((p) => ({ label: p.name, value: money(p.lucro) })) },
    { title: "Fluxo de caixa", data: resumoCaixa },
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

function ConfiguracoesView() {
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
          <div className="cc-form-grid">
            <Field label="Margem padrão (%)"><TextInput type="number" defaultValue={100} /></Field>
            <Field label="Taxa da maquininha (%)"><TextInput type="number" defaultValue={3.5} /></Field>
            <Field label="Comissão (%)"><TextInput type="number" defaultValue={0} /></Field>
            <Field label="Impostos (%)"><TextInput type="number" defaultValue={6} /></Field>
          </div>
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

  // Carrega produtos, categorias, fornecedores, clientes, pedidos e caixa reais do Supabase assim que loga
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
    ])
      .then(([productRows, categoryRows, supplierRows, clientRows, orderRows, cashflowRows]) => {
        setProducts(productRows);
        setCategories(categoryRows);
        setSuppliers(supplierRows);
        setClients(clientRows);
        setOrders(orderRows);
        setCashflow(cashflowRows);
      })
      .catch((err) => setProductsError(err.message))
      .finally(() => setProductsLoading(false));
  }, [loggedIn]);

  function addCashflow(desc, valor) {
    setCashflow((prev) => [{ id: Date.now() + Math.random(), tipo: valor >= 0 ? "Entrada" : "Saída", desc, valor, data: new Date().toISOString().slice(0, 10) }, ...prev]);
  }

  // Compra registrada -> soma ao estoque, recalcula custo médio ponderado do produto e lança saída no caixa
  function registerPurchase(form) {
    const qtd = parseInt(form.qtdPecas) || 0;
    const valorTotal = parseFloat(form.valorTotal) || 0;
    const frete = parseFloat(form.frete) || 0;
    const custoNovaLeva = qtd ? (valorTotal + frete) / qtd : 0;
    const produto = products.find((p) => String(p.id) === String(form.produtoId));

    setProducts((prev) => prev.map((p) => {
      if (String(p.id) !== String(form.produtoId)) return p;
      const estoqueAtual = p.quantidade || 0;
      const custoAtual = p.custoTotal || 0;
      const novoEstoque = estoqueAtual + qtd;
      // custo médio ponderado entre o estoque existente e a nova leva
      const custoMedio = novoEstoque > 0 ? ((estoqueAtual * custoAtual) + (qtd * custoNovaLeva)) / novoEstoque : custoNovaLeva;
      const lucro = (p.precoSugerido || 0) - custoMedio;
      const margem = custoMedio ? Math.round((lucro / custoMedio) * 100) : 0;
      return { ...p, quantidade: novoEstoque, custoTotal: custoMedio, lucro, margem };
    }));

    setPurchases((prev) => [{ ...form, id: Date.now(), produtoNome: produto ? produto.name : "" }, ...prev]);
    addCashflow(`Compra ${produto ? produto.code : ""} — ${form.fornecedor}`, -(valorTotal + frete));
  }

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
          {active === "dashboard" && <Dashboard products={products} />}
          {active === "produtos" && <ProdutosView products={products} setProducts={setProducts} suppliers={suppliers} categories={categories} loading={productsLoading} loadError={productsError} />}
          {active === "clientes" && <ClientesView clients={clients} setClients={setClients} loading={productsLoading} loadError={productsError} />}
          {active === "fornecedores" && <FornecedoresView suppliers={suppliers} setSuppliers={setSuppliers} loading={productsLoading} loadError={productsError} />}
          {active === "compras" && <ComprasView purchases={purchases} suppliers={suppliers} products={products} onRegister={registerPurchase} />}
          {active === "estoque" && <EstoqueView products={products} loading={productsLoading} loadError={productsError} />}
          {active === "pedidos" && <PedidosView orders={orders} setOrders={setOrders} clients={clients} products={products} onStatusChange={handleOrderStatusChange} loading={productsLoading} loadError={productsError} />}
          {active === "precificacao" && <PrecificacaoView />}
          {active === "caixa" && <CaixaView cashflow={cashflow} setCashflow={setCashflow} loading={productsLoading} loadError={productsError} />}
          {active === "relatorios" && <RelatoriosView products={products} clients={clients} orders={orders} cashflow={cashflow} loading={productsLoading} />}
          {active === "catalogo" && <CatalogoView products={products} />}
          {active === "config" && <ConfiguracoesView />}
        </main>
      </div>
    </div>
  );
}
