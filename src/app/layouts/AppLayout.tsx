import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Building2, ChevronDown, Cuboid, FlaskConical,
  FolderKanban, Gem, LayoutDashboard, LogOut, Menu, Microscope, Moon, Mountain,
  ScrollText, Search, Settings, ShieldCheck, Sun, Upload, Users, X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/app/services/auth";
import { iniciais } from "@/app/services/format";
import { Avatar, BrandMark } from "@/app/components/ui";
import { Sino } from "@/app/components/Sino";

interface ItemMenu {
  titulo: string;
  caminho: string;
  modulo: string;
  icone: LucideIcon;
  superadminOnly?: boolean;
}

interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

const MENU: GrupoMenu[] = [
  {
    titulo: "Visão geral",
    itens: [{ titulo: "Dashboard", caminho: "/", modulo: "dashboard", icone: LayoutDashboard }],
  },
  {
    titulo: "Exploração",
    itens: [
      { titulo: "Projectos", caminho: "/projectos", modulo: "projects", icone: FolderKanban },
      { titulo: "Sondagens", caminho: "/sondagens", modulo: "drill_holes", icone: Mountain },
      { titulo: "Amostras", caminho: "/amostras", modulo: "samples", icone: FlaskConical },
    ],
  },
  {
    titulo: "Laboratório",
    itens: [
      { titulo: "Laboratórios", caminho: "/laboratorios", modulo: "laboratories", icone: Microscope },
      { titulo: "Resultados", caminho: "/resultados", modulo: "assays", icone: Activity },
    ],
  },
  {
    titulo: "Modelação e recursos",
    itens: [
      { titulo: "Modelos 3D", caminho: "/modelos", modulo: "models", icone: Cuboid },
      { titulo: "Recursos", caminho: "/recursos", modulo: "resources", icone: Gem },
    ],
  },
  {
    titulo: "Dados",
    itens: [{ titulo: "Importação", caminho: "/importacao", modulo: "imports", icone: Upload }],
  },
  {
    titulo: "Administração",
    itens: [
      { titulo: "Utilizadores", caminho: "/utilizadores", modulo: "users", icone: Users },
      { titulo: "Perfis e permissões", caminho: "/perfis", modulo: "users", icone: ShieldCheck },
      { titulo: "Auditoria", caminho: "/auditoria", modulo: "audit", icone: ScrollText },
      { titulo: "Empresas", caminho: "/empresas", modulo: "companies", icone: Building2, superadminOnly: true },
      { titulo: "Definições", caminho: "/definicoes", modulo: "", icone: Settings },
    ],
  },
];

function tituloActual(caminho: string): string {
  for (const grupo of MENU) {
    for (const item of grupo.itens) {
      if (item.caminho === "/" ? caminho === "/" : caminho.startsWith(item.caminho)) return item.titulo;
    }
  }
  return "CLACS GeoModel";
}

export function AppLayout() {
  const { sessao, empresaActual, empresas, mudarEmpresa, sair, pode, eSuperadmin } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuUtilizador, setMenuUtilizador] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [tema, setTema] = useState<"light" | "dark">(() => {
    try {
      const guardado = localStorage.getItem("geomodel.theme");
      if (guardado === "dark" || guardado === "light") return guardado;
    } catch {
      /* sem armazenamento */
    }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const utilizadorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem("geomodel.theme", tema);
    } catch {
      /* sem armazenamento */
    }
  }, [tema]);

  useEffect(() => {
    const aoMudarTema = (evento: Event) => {
      const detalhe = (evento as CustomEvent<string>).detail;
      if (detalhe === "dark" || detalhe === "light") setTema(detalhe);
    };
    window.addEventListener("geomodel:theme", aoMudarTema);
    return () => window.removeEventListener("geomodel:theme", aoMudarTema);
  }, []);

  useEffect(() => {
    setMenuAberto(false);
    setMenuUtilizador(false);
  }, [localizacao.pathname]);

  useEffect(() => {
    const aoClicarFora = (evento: MouseEvent) => {
      if (utilizadorRef.current && !utilizadorRef.current.contains(evento.target as Node)) {
        setMenuUtilizador(false);
      }
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function submeterPesquisa(evento: React.FormEvent) {
    evento.preventDefault();
    const termo = pesquisa.trim();
    navegar(termo ? `/projectos?q=${encodeURIComponent(termo)}` : "/projectos");
    setPesquisa("");
  }

  const nome = sessao?.utilizador.nome ?? "Utilizador";
  const papel = sessao?.papel ?? (eSuperadmin ? "super_admin" : null);

  return (
    <div className={`shell${menuAberto ? " shell--open" : ""}`}>
      <aside className="sidebar" aria-label="Menu principal">
        <div className="sidebar__brand">
          <BrandMark />
          <div className="brand-text">
            <strong>CLACS GeoModel</strong>
            <span>Geologia &amp; mineração</span>
          </div>
          <button
            className="icon-btn burger"
            style={{ marginLeft: "auto", background: "transparent", borderColor: "var(--sidebar-line)", color: "var(--sidebar-text)" }}
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {MENU.map((grupo) => {
            const itens = grupo.itens.filter(
              (item) => (!item.superadminOnly || eSuperadmin) && (item.modulo === "" || pode(item.modulo)),
            );
            if (itens.length === 0) return null;
            return (
              <div className="nav-group" key={grupo.titulo}>
                <div className="nav-group__title">{grupo.titulo}</div>
                {itens.map((item) => {
                  const Icone = item.icone;
                  return (
                    <NavLink
                      key={item.caminho}
                      to={item.caminho}
                      end={item.caminho === "/"}
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                    >
                      <span className="nav-link__icon"><Icone size={17} strokeWidth={2} /></span>
                      {item.titulo}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="user-chip">
            <Avatar nome={nome} pequeno />
            <div className="user-chip__meta">
              <strong>{nome}</strong>
              <span>{empresaActual?.nome ?? "Super administrador"}</span>
            </div>
          </div>
          <button className="btn-ghost-dark" onClick={() => setTema(tema === "dark" ? "light" : "dark")}>
            {tema === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {tema === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-btn burger" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu size={19} />
            </button>
            <span className="nowrap" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              {tituloActual(localizacao.pathname)}
            </span>
            <form className="search" onSubmit={submeterPesquisa} style={{ marginLeft: 10 }}>
              <Search size={16} />
              <input
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar projectos…"
                aria-label="Pesquisar projectos"
              />
              <kbd>↵</kbd>
            </form>
          </div>

          <div className="topbar__right">
            {empresas.length > 0 && (
              <label className="company-switch" title="Empresa activa">
                <span className="dot" />
                <select
                  value={empresaActual?.id ?? ""}
                  onChange={(e) => void mudarEmpresa(e.target.value)}
                  aria-label="Empresa activa"
                >
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                  ))}
                </select>
              </label>
            )}
            <Sino empresaId={empresaActual?.id} />

            <div className="menu-wrap" ref={utilizadorRef}>
              <button
                className="row"
                style={{ background: "none", border: 0, padding: 0, gap: 8 }}
                onClick={() => setMenuUtilizador((aberto) => !aberto)}
                aria-expanded={menuUtilizador}
              >
                <Avatar nome={nome} />
                <ChevronDown size={15} className="muted" />
              </button>
              {menuUtilizador && (
                <div className="menu">
                  <div className="menu__head">
                    <strong>{nome}</strong>
                    <span>{sessao?.utilizador.email}</span>
                    <span style={{ marginTop: 3, color: "var(--primary)", fontWeight: 700 }}>
                      {papel ? papel.replaceAll("_", " ") : "sem perfil"}
                    </span>
                  </div>
                  <button className="menu__item" onClick={() => navegar("/definicoes")}>
                    <Settings size={15} /> Definições da conta
                  </button>
                  <button className="menu__item menu__item--danger" onClick={sair}>
                    <LogOut size={15} /> Terminar sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ selecção de empresa */
export function SeletorEmpresa() {
  const { pendente, escolherEmpresa, sair, erro } = useAuth();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  async function escolher(id: string) {
    setOcupado(id);
    setFalha(null);
    try {
      await escolherEmpresa(id);
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Não foi possível abrir a empresa.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="auth" style={{ gridTemplateColumns: "1fr" }}>
      <div className="auth__panel">
        <div className="auth__form" style={{ maxWidth: 460 }}>
          <div className="auth__brand">
            <BrandMark />
            <div>
              <strong>CLACS GeoModel</strong>
              <span>Seleccionar empresa</span>
            </div>
          </div>
          <div>
            <h2>Em que empresa vai trabalhar?</h2>
            <p className="sub">
              Olá {pendente?.utilizador.nome ?? "utilizador"}. A sua conta tem acesso a mais do que uma empresa.
              Escolha a empresa activa para esta sessão.
            </p>
          </div>

          {(falha ?? erro) && <div className="alert alert--danger">{falha ?? erro}</div>}

          <div className="stack">
            {pendente?.empresas.map((empresa) => (
              <button
                key={empresa.id}
                className="card card--pad row"
                style={{ textAlign: "left", gap: 13, cursor: "pointer" }}
                onClick={() => void escolher(empresa.id)}
                disabled={ocupado !== null}
              >
                <span className="avatar" style={{ borderRadius: 12 }}>
                  {iniciais(empresa.nome)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 14 }}>{empresa.nome}</strong>
                  <span className="muted" style={{ fontSize: 11.5 }}>{empresa.slug}</span>
                </span>
                {ocupado === empresa.id ? (
                  <span className="spinner" />
                ) : (
                  <span className="badge badge--teal">Abrir</span>
                )}
              </button>
            ))}
            {(!pendente || pendente.empresas.length === 0) && (
              <p className="muted">A conta não está associada a nenhuma empresa.</p>
            )}
          </div>

          <button className="btn btn--ghost" onClick={sair} style={{ justifySelf: "start" }}>
            <LogOut size={15} /> Terminar sessão
          </button>
        </div>
      </div>
    </div>
  );
}
