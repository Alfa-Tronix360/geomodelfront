import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Inbox, Loader2, Search, X } from "lucide-react";
import type { Tom } from "@/app/services/types";
import { rotuloEstado, tomEstado } from "@/app/services/format";

/* ------------------------------------------------------------------ marca */
export function BrandMark({ tamanho = 42 }: { tamanho?: number }) {
  return (
    <span className="brand-mark" style={{ width: tamanho, height: tamanho }} aria-hidden>
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M32 9 51 20v24L32 55 13 44V20z" stroke="#2dd4bf" strokeWidth="3" />
        <path d="M32 17 44 24v16l-12 7-12-7V24z" fill="#14b8a6" fillOpacity=".22" />
        <path d="M20 38c6-9 9 5 15-4s6-4 9-8" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="44" cy="26" r="2.6" fill="#f59e0b" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ cabeçalho */
interface PageHeaderProps {
  eyebrow?: string;
  titulo: string;
  sub?: ReactNode;
  acoes?: ReactNode;
}

export function PageHeader({ eyebrow, titulo, sub, acoes }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="page-title">{titulo}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {acoes && <div className="page-actions">{acoes}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ cartões */
export function Card({
  children,
  className = "",
  flush = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section className={`card${flush ? " card--flush" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </section>
  );
}

export function CardHead({ titulo, hint, acoes }: { titulo: ReactNode; hint?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="card__head">
      <div style={{ minWidth: 0 }}>
        <h3 className="card__title">{titulo}</h3>
        {hint && <p className="card__hint">{hint}</p>}
      </div>
      {acoes && <div className="row" style={{ marginLeft: "auto", gap: 6 }}>{acoes}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card__body${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="section-title">{children}</h3>;
}

/* ------------------------------------------------------------------ KPI */
interface KpiProps {
  rotulo: string;
  valor: ReactNode;
  unidade?: string;
  icone: ReactNode;
  variante?: "primary" | "accent" | "info" | "success";
  rodape?: ReactNode;
}

export function Kpi({ rotulo, valor, unidade, icone, variante = "primary", rodape }: KpiProps) {
  const classe = variante === "primary" ? "" : ` kpi--${variante}`;
  return (
    <article className={`card kpi${classe}`}>
      <div className="kpi__top">
        <span className="kpi__label">{rotulo}</span>
        <span className="kpi__icon">{icone}</span>
      </div>
      <div className="kpi__value">
        {valor}
        {unidade && <small>{unidade}</small>}
      </div>
      {rodape && <div className="kpi__foot">{rodape}</div>}
    </article>
  );
}

/* ------------------------------------------------------------------ etiquetas */
export function Badge({ tom = "neutral", children, plain = false }: { tom?: Tom; children: ReactNode; plain?: boolean }) {
  return <span className={`badge badge--${tom}${plain ? " badge--plain" : ""}`}>{children}</span>;
}

export function EstadoBadge({ estado }: { estado: string | null | undefined }) {
  return <Badge tom={tomEstado(estado)}>{rotuloEstado(estado)}</Badge>;
}

/* ------------------------------------------------------------------ estados */
export function Loading({ texto = "A carregar…" }: { texto?: string }) {
  return (
    <div className="loading">
      <Loader2 size={17} className="spinner" style={{ border: 0, animation: "spin .8s linear infinite" }} />
      {texto}
    </div>
  );
}

export function ErrorBox({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className="alert alert--danger" role="alert">
      <AlertCircle size={17} style={{ flex: "none", marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div>{mensagem}</div>
        {aoTentar && (
          <button className="btn btn--sm btn--secondary" style={{ marginTop: 9 }} onClick={aoTentar}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  icone?: ReactNode;
  accao?: ReactNode;
}

export function EmptyState({ titulo, descricao, icone, accao }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon">{icone ?? <Inbox size={24} />}</div>
      <strong>{titulo}</strong>
      {descricao && <p>{descricao}</p>}
      {accao}
    </div>
  );
}

/* ------------------------------------------------------------------ formulários */
interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  erro?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, hint, erro, children, className = "" }: FieldProps) {
  return (
    <label className={`field${className ? ` ${className}` : ""}`}>
      <span className="field__label">
        {label} {required && <span>*</span>}
      </span>
      {children}
      {hint && !erro && <span className="field__hint">{hint}</span>}
      {erro && <span className="field__hint" style={{ color: "var(--danger)" }}>{erro}</span>}
    </label>
  );
}

export function SearchInput({
  valor,
  aoMudar,
  placeholder = "Pesquisar…",
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search" style={{ width: "100%" }}>
      <Search size={16} />
      <input value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

/* ------------------------------------------------------------------ modal */
interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largo?: boolean;
}

export function Modal({ aberto, aoFechar, titulo, descricao, children, rodape, largo = false }: ModalProps) {
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`modal${largo ? " modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal__head">
          <div>
            <h3>{titulo}</h3>
            {descricao && <p>{descricao}</p>}
          </div>
          <button className="icon-btn modal__close" onClick={aoFechar} aria-label="Fechar" type="button">
            <X size={17} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {rodape && <div className="modal__foot">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  aoConfirmar: () => void | Promise<void>;
  aoCancelar: () => void;
  ocupado?: boolean;
}

export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Eliminar",
  aoConfirmar,
  aoCancelar,
  ocupado = false,
}: ConfirmProps) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoCancelar}
      titulo={titulo}
      rodape={
        <>
          <button className="btn btn--secondary" onClick={aoCancelar} disabled={ocupado}>Cancelar</button>
          <button className="btn btn--danger" onClick={() => void aoConfirmar()} disabled={ocupado}>
            {ocupado ? "A processar…" : rotuloConfirmar}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{mensagem}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ tabs */
export function Tabs({
  opcoes,
  activo,
  aoMudar,
}: {
  opcoes: { id: string; rotulo: string; contagem?: number }[];
  activo: string;
  aoMudar: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          role="tab"
          aria-selected={activo === opcao.id}
          className={`tab${activo === opcao.id ? " tab--active" : ""}`}
          onClick={() => aoMudar(opcao.id)}
        >
          {opcao.rotulo}
          {opcao.contagem !== undefined && <span className="muted" style={{ marginLeft: 6 }}>{opcao.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ avatar */
export function Avatar({ nome, pequeno = false }: { nome: string; pequeno?: boolean }) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : nome.slice(0, 2);
  return <span className={`avatar${pequeno ? " avatar--sm" : ""}`}>{letras.toUpperCase()}</span>;
}

/* ------------------------------------------------------------------ paginação */
export function Pagination({
  total,
  pagina,
  porPagina,
  aoMudar,
}: {
  total: number;
  pagina: number;
  porPagina: number;
  aoMudar: (pagina: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = total === 0 ? 0 : pagina * porPagina + 1;
  const fim = Math.min(total, (pagina + 1) * porPagina);
  return (
    <div className="row" style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
      <span className="muted" style={{ fontSize: 12 }}>
        {inicio}–{fim} de {total}
      </span>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn btn--secondary btn--sm" disabled={pagina <= 0} onClick={() => aoMudar(pagina - 1)}>
          <ArrowLeft size={14} /> Anterior
        </button>
        <span className="muted" style={{ fontSize: 12, padding: "0 8px" }}>
          {pagina + 1} / {paginas}
        </span>
        <button className="btn btn--secondary btn--sm" disabled={pagina + 1 >= paginas} onClick={() => aoMudar(pagina + 1)}>
          Seguinte <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ detalhe */
export function DetailRow({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="detail-list__row">
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function InfoBox({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="info-box">
      <span>{rotulo}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function Progress({ valor }: { valor: number }) {
  return (
    <div className="progress">
      <i style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ tabela genérica */
export interface Coluna<T> {
  chave: string;
  cabecalho: ReactNode;
  render: (linha: T) => ReactNode;
  alinhar?: "left" | "right" | "center";
  largura?: string;
}

export function DataTable<T>({
  colunas,
  linhas,
  chaveDe,
  aoClicar,
  vazio,
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chaveDe: (linha: T) => string;
  aoClicar?: (linha: T) => void;
  vazio?: ReactNode;
}) {
  if (linhas.length === 0) {
    return <div className="table__empty">{vazio ?? "Sem registos."}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.chave} style={{ textAlign: coluna.alinhar ?? "left", width: coluna.largura }}>
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={chaveDe(linha)}
              className={aoClicar ? "is-clickable" : undefined}
              onClick={aoClicar ? () => aoClicar(linha) : undefined}
            >
              {colunas.map((coluna) => (
                <td key={coluna.chave} style={{ textAlign: coluna.alinhar ?? "left" }}>
                  {coluna.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
