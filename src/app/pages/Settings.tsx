import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Check, Coins, Database, Eye, EyeOff, Globe2, KeyRound, Laptop, LockKeyhole,
  LogOut, Moon, Palette, ShieldCheck, Sun, UserRound,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Empresa } from "@/app/services/types";
import { formatarData, formatarDataHora, iniciais } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, DetailRow, EmptyState, ErrorBox, Field,
  InfoBox, Loading, PageHeader, Tabs,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

type Aba = "conta" | "empresa" | "aparencia" | "plataforma";
type Tema = "light" | "dark";

const ABAS = [
  { id: "conta", rotulo: "Conta" },
  { id: "empresa", rotulo: "Empresa" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "plataforma", rotulo: "Plataforma" },
];

const ROTULOS_MODULOS: Record<string, string> = {
  companies: "Empresas",
  users: "Utilizadores e permissões",
  projects: "Projectos",
  drill_holes: "Sondagens",
  samples: "Amostras",
  laboratories: "Laboratórios",
  assays: "Resultados laboratoriais",
  models: "Modelação 3D",
  resources: "Estimativa de recursos",
  dashboard: "Dashboard",
  audit: "Auditoria",
  imports: "Importação de dados",
};

const ROTULOS_ACCOES: Record<string, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Apagar",
  validate: "Validar",
  import: "Importar",
  export: "Exportar",
};

const PALETA = [
  { nome: "Petróleo", cor: "#0b2b33", descricao: "Cor institucional" },
  { nome: "Turquesa", cor: "#14b8a6", descricao: "Acção principal" },
  { nome: "Cobre", cor: "#f59e0b", descricao: "Destaque mineral" },
  { nome: "Areia", cor: "#f4efe6", descricao: "Superfícies claras" },
];

const VERSAO = "1.0.0";

interface FormEmpresa {
  nome: string;
  nif: string;
  pais: string;
  provincia: string;
  cidade: string;
  moeda: string;
  fuso_horario: string;
}

const FORM_EMPRESA_VAZIO: FormEmpresa = {
  nome: "",
  nif: "",
  pais: "Angola",
  provincia: "",
  cidade: "",
  moeda: "AOA",
  fuso_horario: "Africa/Luanda",
};

function lerTema(): Tema {
  try {
    const guardado = localStorage.getItem("geomodel.theme");
    if (guardado === "dark" || guardado === "light") return guardado;
  } catch {
    /* armazenamento indisponível */
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function CampoSenha({
  valor,
  aoMudar,
  placeholder,
  autoComplete,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="search" style={{ width: "100%", padding: "8px 11px" }}>
      <KeyRound size={16} />
      <input
        type={visivel ? "text" : "password"}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => setVisivel((actual) => !actual)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        style={{ width: 26, height: 26, border: 0, background: "transparent", flex: "none" }}
      >
        {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { sessao, empresaActual, recarregar, sair, pode, eSuperadmin } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [aba, setAba] = useState<Aba>("conta");

  const utilizador = sessao?.utilizador;
  const podeEditarPerfil = eSuperadmin || pode("users", "edit");
  const podeEditarEmpresa = eSuperadmin || pode("companies", "edit");

  /* ---------------------------------------------------------------- conta */
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aGuardarPerfil, setAGuardarPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState("");

  useEffect(() => {
    if (!utilizador) return;
    setNome(utilizador.nome);
    setTelefone(utilizador.telefone ?? "");
  }, [utilizador?.id, utilizador?.nome, utilizador?.telefone]);

  async function guardarPerfil(evento: FormEvent) {
    evento.preventDefault();
    if (!utilizador) return;
    if (nome.trim().length < 2) {
      setErroPerfil("Indique o nome completo.");
      return;
    }
    setErroPerfil("");
    setAGuardarPerfil(true);
    try {
      await api.patch(`/users/${utilizador.id}`, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      });
      toast.sucesso("Dados pessoais actualizados.");
      await recarregar();
    } catch (e) {
      setErroPerfil(mensagemErro(e));
    } finally {
      setAGuardarPerfil(false);
    }
  }

  const [senhaActual, setSenhaActual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const [aAlterarSenha, setAAlterarSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  async function alterarSenha(evento: FormEvent) {
    evento.preventDefault();
    if (!senhaActual) {
      setErroSenha("Indique a senha actual.");
      return;
    }
    if (senhaNova.length < 8) {
      setErroSenha("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senhaNova !== senhaConfirmar) {
      setErroSenha("A confirmação não corresponde à nova senha.");
      return;
    }
    if (senhaNova === senhaActual) {
      setErroSenha("A nova senha deve ser diferente da actual.");
      return;
    }
    setErroSenha("");
    setAAlterarSenha(true);
    try {
      await api.post("/auth/alterar-senha", {
        senha_actual: senhaActual,
        senha_nova: senhaNova,
      });
      toast.sucesso("Senha alterada com sucesso.", "Segurança");
      setSenhaActual("");
      setSenhaNova("");
      setSenhaConfirmar("");
    } catch (e) {
      setErroSenha(mensagemErro(e));
    } finally {
      setAAlterarSenha(false);
    }
  }

  /* ---------------------------------------------------------------- empresa */
  const {
    dados: empresa,
    carregando: carregandoEmpresa,
    erro: erroEmpresa,
    recarregar: recarregarEmpresa,
  } = useFetch<Empresa | null>(
    () => (empresaActual ? api.get<Empresa>(`/companies/${empresaActual.id}`) : Promise.resolve(null)),
    [empresaActual?.id],
  );

  const [empresaForm, setEmpresaForm] = useState<FormEmpresa>(FORM_EMPRESA_VAZIO);
  const [aGuardarEmpresa, setAGuardarEmpresa] = useState(false);
  const [erroEmpresaForm, setErroEmpresaForm] = useState("");

  useEffect(() => {
    if (!empresa) return;
    setEmpresaForm({
      nome: empresa.nome,
      nif: empresa.nif ?? "",
      pais: empresa.pais,
      provincia: empresa.provincia ?? "",
      cidade: empresa.cidade ?? "",
      moeda: empresa.moeda,
      fuso_horario: empresa.fuso_horario,
    });
  }, [empresa]);

  function actualizarEmpresa<K extends keyof FormEmpresa>(campo: K, valor: FormEmpresa[K]) {
    setEmpresaForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarEmpresa(evento: FormEvent) {
    evento.preventDefault();
    if (!empresa) return;
    if (empresaForm.nome.trim().length < 2) {
      setErroEmpresaForm("Indique o nome da empresa.");
      return;
    }
    setErroEmpresaForm("");
    setAGuardarEmpresa(true);
    try {
      await api.patch(`/companies/${empresa.id}`, {
        nome: empresaForm.nome.trim(),
        nif: empresaForm.nif.trim() || null,
        pais: empresaForm.pais.trim() || "Angola",
        provincia: empresaForm.provincia.trim() || null,
        cidade: empresaForm.cidade.trim() || null,
        moeda: empresaForm.moeda.trim().toUpperCase() || "AOA",
        fuso_horario: empresaForm.fuso_horario.trim() || "Africa/Luanda",
      });
      toast.sucesso("Dados da empresa actualizados.");
      recarregarEmpresa();
      await recarregar();
    } catch (e) {
      setErroEmpresaForm(mensagemErro(e));
    } finally {
      setAGuardarEmpresa(false);
    }
  }

  /* ---------------------------------------------------------------- aparência */
  const [tema, setTema] = useState<Tema>(lerTema);

  function aplicarTema(novo: Tema) {
    setTema(novo);
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("geomodel.theme", novo);
    } catch {
      /* armazenamento indisponível */
    }
    window.dispatchEvent(new CustomEvent("geomodel:theme", { detail: novo }));
  }

  /* ---------------------------------------------------------------- plataforma */
  const modulos = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const item of sessao?.permissoes ?? []) {
      const [modulo, accao] = item.split(":");
      if (!modulo || !accao) continue;
      const accoes = mapa.get(modulo) ?? [];
      if (!accoes.includes(accao)) accoes.push(accao);
      mapa.set(modulo, accoes);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sessao]);

  const acessoTotal = Boolean(sessao?.permissoes.includes("*"));
  const apiBase = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
  const ambiente = import.meta.env.MODE === "production" ? "Produção" : "Desenvolvimento";
  const fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!sessao || !utilizador) {
    return (
      <div className="page">
        <PageHeader eyebrow="Conta e plataforma" titulo="Definições" />
        <Loading texto="A carregar definições…" />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Conta e plataforma"
        titulo="Definições"
        sub="Gerir os dados pessoais, a segurança da conta, a empresa activa, a aparência da interface e a informação técnica da plataforma."
      />

      <Tabs opcoes={ABAS} activo={aba} aoMudar={(id) => setAba(id as Aba)} />

      {aba === "conta" && (
        <div className="grid grid--detail">
          <div className="stack">
            <Card>
              <CardHead
                titulo={<span className="row" style={{ gap: 8 }}><UserRound size={16} /> Dados pessoais</span>}
                hint="O e-mail de acesso é gerido pelo administrador da empresa."
              />
              <CardBody>
                <form className="stack" onSubmit={(e) => void guardarPerfil(e)}>
                  {erroPerfil && <div className="alert alert--danger">{erroPerfil}</div>}
                  {!podeEditarPerfil && (
                    <div className="alert alert--info">
                      <LockKeyhole size={16} style={{ flex: "none", marginTop: 1 }} />
                      <span>A sua conta não pode editar dados de utilizadores. Contacte um administrador.</span>
                    </div>
                  )}
                  <div className="form-grid">
                    <Field label="Nome completo" required className="span-2">
                      <input
                        className="input"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        disabled={!podeEditarPerfil}
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="E-mail" hint="Identificador de acesso à plataforma.">
                      <input className="input" value={utilizador.email} disabled autoComplete="email" />
                    </Field>
                    <Field label="Telefone">
                      <input
                        className="input"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        disabled={!podeEditarPerfil}
                        placeholder="+244 …"
                        autoComplete="tel"
                      />
                    </Field>
                  </div>
                  {podeEditarPerfil && (
                    <div className="row row--end">
                      <button className="btn btn--primary" type="submit" disabled={aGuardarPerfil}>
                        {aGuardarPerfil ? "A guardar…" : "Guardar dados"}
                      </button>
                    </div>
                  )}
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHead
                titulo={<span className="row" style={{ gap: 8 }}><KeyRound size={16} /> Segurança</span>}
                hint="Altere a senha de acesso. A operação fica registada na auditoria."
              />
              <CardBody>
                <form className="stack" onSubmit={(e) => void alterarSenha(e)}>
                  {erroSenha && <div className="alert alert--danger">{erroSenha}</div>}
                  <div className="form-grid">
                    <Field label="Senha actual" required className="span-2">
                      <CampoSenha
                        valor={senhaActual}
                        aoMudar={setSenhaActual}
                        placeholder="Introduza a senha actual"
                        autoComplete="current-password"
                      />
                    </Field>
                    <Field label="Nova senha" required hint="Mínimo de 8 caracteres.">
                      <CampoSenha
                        valor={senhaNova}
                        aoMudar={setSenhaNova}
                        placeholder="Nova senha"
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Confirmar nova senha" required>
                      <CampoSenha
                        valor={senhaConfirmar}
                        aoMudar={setSenhaConfirmar}
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>
                  <div className="row row--end">
                    <button className="btn btn--primary" type="submit" disabled={aAlterarSenha}>
                      {aAlterarSenha ? "A alterar…" : "Alterar senha"}
                    </button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          <div className="stack">
            <Card>
              <CardHead titulo="Perfil de acesso" hint="Informação da conta e do contexto actual." />
              <CardBody>
                <div className="row" style={{ gap: 13, marginBottom: 4 }}>
                  <span
                    className="avatar"
                    style={{ width: 52, height: 52, borderRadius: 15, fontSize: 17 }}
                  >
                    {iniciais(utilizador.nome)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 15 }}>{utilizador.nome}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{utilizador.email}</span>
                    <div className="row" style={{ gap: 5, marginTop: 5 }}>
                      {utilizador.superadmin && <Badge tom="copper">Super administrador</Badge>}
                      <Badge tom={utilizador.activo ? "ok" : "neutral"}>
                        {utilizador.activo ? "Conta activa" : "Conta inactiva"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="divider" />
                <dl className="detail-list">
                  <DetailRow rotulo="Perfil">
                    {sessao.papel ? sessao.papel.replaceAll("_", " ") : "—"}
                  </DetailRow>
                  <DetailRow rotulo="Empresa">{empresaActual?.nome ?? "Sem empresa activa"}</DetailRow>
                  <DetailRow rotulo="Último acesso">{formatarDataHora(utilizador.ultimo_acesso)}</DetailRow>
                  <DetailRow rotulo="Conta criada">{formatarData(utilizador.criado_em)}</DetailRow>
                  <DetailRow rotulo="Permissões">
                    {acessoTotal ? "Acesso total" : `${sessao.permissoes.length} permissões`}
                  </DetailRow>
                  <DetailRow rotulo="Identificador">
                    <span className="mono" style={{ fontSize: 11 }}>{utilizador.id}</span>
                  </DetailRow>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHead titulo="Sessão" hint="Termine a sessão neste dispositivo." />
              <CardBody>
                <div className="stack">
                  <div className="alert alert--info">
                    <ShieldCheck size={16} style={{ flex: "none", marginTop: 1 }} />
                    <span>
                      A sessão é protegida por token JWT e está associada à empresa activa
                      {" "}<strong>{empresaActual?.nome ?? "—"}</strong>.
                    </span>
                  </div>
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={() => {
                      sair();
                      navegar("/entrar", { replace: true });
                    }}
                  >
                    <LogOut size={15} /> Terminar sessão
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {aba === "empresa" && (
        <div className="stack">
          {!empresaActual ? (
            <Card>
              <EmptyState
                titulo="Sem empresa activa"
                descricao="Seleccione ou peça acesso a uma empresa para consultar os dados cadastrais."
                icone={<Building2 size={24} />}
              />
            </Card>
          ) : (
            <>
              <Card flush>
                <CardHead
                  titulo={<span className="row" style={{ gap: 8 }}><Building2 size={16} /> Empresa activa</span>}
                  hint="Contexto multi-empresa: todos os dados que consulta pertencem a esta empresa."
                  acoes={<Badge tom="teal">{empresa?.slug ?? empresaActual.slug}</Badge>}
                />
                <CardBody>
                  {carregandoEmpresa && !empresa ? (
                    <Loading texto="A carregar empresa…" />
                  ) : (
                    <div className="info-grid">
                      <InfoBox rotulo="Nome">{empresa?.nome ?? empresaActual.nome}</InfoBox>
                      <InfoBox rotulo="País">{empresa?.pais ?? "—"}</InfoBox>
                      <InfoBox rotulo="Província / cidade">
                        {[empresa?.provincia, empresa?.cidade].filter(Boolean).join(" · ") || "—"}
                      </InfoBox>
                      <InfoBox rotulo="NIF">{empresa?.nif ?? "—"}</InfoBox>
                      <InfoBox rotulo="Moeda">
                        <span className="row" style={{ gap: 6 }}>
                          <Coins size={14} /> {empresa?.moeda ?? "AOA"}
                        </span>
                      </InfoBox>
                      <InfoBox rotulo="Fuso horário">{empresa?.fuso_horario ?? "Africa/Luanda"}</InfoBox>
                    </div>
                  )}
                </CardBody>
              </Card>

              {erroEmpresa && <ErrorBox mensagem={erroEmpresa} aoTentar={recarregarEmpresa} />}

              <Card>
                <CardHead
                  titulo="Dados cadastrais"
                  hint="Actualize a informação fiscal e de localização da empresa."
                />
                <CardBody>
                  <form className="stack" onSubmit={(e) => void guardarEmpresa(e)}>
                    {erroEmpresaForm && <div className="alert alert--danger">{erroEmpresaForm}</div>}
                    {!podeEditarEmpresa && (
                      <div className="alert alert--info">
                        <LockKeyhole size={16} style={{ flex: "none", marginTop: 1 }} />
                        <span>
                          Não tem permissão para alterar a empresa. Pode consultar os dados, mas a edição está
                          reservada a perfis com a permissão <strong>companies:edit</strong>.
                        </span>
                      </div>
                    )}
                    <div className="form-grid">
                      <Field label="Nome" required className="span-2">
                        <input
                          className="input"
                          value={empresaForm.nome}
                          onChange={(e) => actualizarEmpresa("nome", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="NIF">
                        <input
                          className="input"
                          value={empresaForm.nif}
                          onChange={(e) => actualizarEmpresa("nif", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="País">
                        <input
                          className="input"
                          value={empresaForm.pais}
                          onChange={(e) => actualizarEmpresa("pais", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="Província">
                        <input
                          className="input"
                          value={empresaForm.provincia}
                          onChange={(e) => actualizarEmpresa("provincia", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="Cidade">
                        <input
                          className="input"
                          value={empresaForm.cidade}
                          onChange={(e) => actualizarEmpresa("cidade", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="Moeda" hint="Código ISO 4217, por exemplo AOA.">
                        <input
                          className="input mono"
                          value={empresaForm.moeda}
                          onChange={(e) => actualizarEmpresa("moeda", e.target.value.toUpperCase())}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                      <Field label="Fuso horário">
                        <input
                          className="input mono"
                          value={empresaForm.fuso_horario}
                          onChange={(e) => actualizarEmpresa("fuso_horario", e.target.value)}
                          disabled={!podeEditarEmpresa || carregandoEmpresa}
                        />
                      </Field>
                    </div>
                    {podeEditarEmpresa && (
                      <div className="row row--end">
                        <button className="btn btn--primary" type="submit" disabled={aGuardarEmpresa || !empresa}>
                          {aGuardarEmpresa ? "A guardar…" : "Guardar empresa"}
                        </button>
                      </div>
                    )}
                  </form>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      )}

      {aba === "aparencia" && (
        <div className="stack">
          <Card>
            <CardHead
              titulo={<span className="row" style={{ gap: 8 }}><Palette size={16} /> Tema da interface</span>}
              hint="A preferência é guardada neste navegador e aplica-se de imediato em toda a plataforma."
            />
            <CardBody>
              <div className="grid grid--2">
                {([
                  {
                    id: "light" as Tema,
                    nome: "Tema claro",
                    descricao: "Superfícies claras, ideal para ambientes bem iluminados.",
                    icone: <Sun size={18} />,
                  },
                  {
                    id: "dark" as Tema,
                    nome: "Tema escuro",
                    descricao: "Contraste reduzido, confortável para trabalho prolongado.",
                    icone: <Moon size={18} />,
                  },
                ]).map((opcao) => {
                  const activo = tema === opcao.id;
                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      className="card card--pad"
                      onClick={() => aplicarTema(opcao.id)}
                      style={{
                        textAlign: "left",
                        cursor: "pointer",
                        display: "grid",
                        gap: 10,
                        borderColor: activo ? "var(--primary)" : undefined,
                        boxShadow: activo ? "var(--ring)" : undefined,
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span className="quick__icon">{opcao.icone}</span>
                        {activo ? (
                          <Badge tom="teal"><Check size={11} /> Activo</Badge>
                        ) : (
                          <Badge tom="neutral">Disponível</Badge>
                        )}
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: 13.5 }}>{opcao.nome}</strong>
                        <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>{opcao.descricao}</p>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 5,
                          background: opcao.id === "dark" ? "#0c1c22" : "#f4f8f7",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          padding: 9,
                        }}
                      >
                        <div style={{
                          height: 7, width: "55%", borderRadius: 99,
                          background: opcao.id === "dark" ? "#5eead4" : "#0f766e",
                        }} />
                        <div style={{
                          height: 5, width: "85%", borderRadius: 99,
                          background: opcao.id === "dark" ? "#274a52" : "#d6e4e1",
                        }} />
                        <div style={{
                          height: 5, width: "70%", borderRadius: 99,
                          background: opcao.id === "dark" ? "#274a52" : "#d6e4e1",
                        }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              titulo="Identidade visual"
              hint="Paleta de referência utilizada nos gráficos, mapas e ilustrações da plataforma."
            />
            <CardBody>
              <div className="grid grid--2">
                {PALETA.map((cor) => (
                  <div className="row" key={cor.nome} style={{ gap: 12 }}>
                    <span
                      style={{
                        width: 40, height: 40, borderRadius: 11, background: cor.cor,
                        border: "1px solid var(--line-strong)", flex: "none",
                      }}
                      aria-hidden
                    />
                    <div>
                      <strong style={{ display: "block", fontSize: 12.5 }}>{cor.nome}</strong>
                      <span className="muted" style={{ fontSize: 11.5 }}>{cor.descricao} · {cor.cor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {aba === "plataforma" && (
        <div className="stack">
          <Card>
            <CardHead
              titulo="Informação da plataforma"
              hint="Versão, ambiente de execução e ligação à API."
            />
            <CardBody>
              <div className="info-grid">
                <InfoBox rotulo="Produto">CLACS GeoModel</InfoBox>
                <InfoBox rotulo="Versão">{VERSAO}</InfoBox>
                <InfoBox rotulo="Ambiente">{ambiente}</InfoBox>
                <InfoBox rotulo="Base da API"><span className="mono" style={{ fontSize: 12 }}>{apiBase}</span></InfoBox>
                <InfoBox rotulo="Empresa activa">{empresaActual?.nome ?? "—"}</InfoBox>
                <InfoBox rotulo="Utilizador">{utilizador.nome}</InfoBox>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              titulo="Permissões efectivas"
              hint="Acções autorizadas para o seu perfil na empresa activa."
              acoes={<Badge tom="teal">{acessoTotal ? "Acesso total" : `${sessao.permissoes.length} permissões`}</Badge>}
            />
            <CardBody>
              {acessoTotal ? (
                <div className="alert alert--info">
                  <ShieldCheck size={16} style={{ flex: "none", marginTop: 1 }} />
                  <span>O seu perfil tem acesso total a todos os módulos e acções da plataforma.</span>
                </div>
              ) : modulos.length === 0 ? (
                <EmptyState
                  titulo="Sem permissões atribuídas"
                  descricao="Peça a um administrador para associar um perfil de acesso à sua conta."
                  icone={<ShieldCheck size={24} />}
                />
              ) : (
                <div className="stack" style={{ gap: 0 }}>
                  {modulos.map(([modulo, accoes]) => (
                    <div
                      key={modulo}
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "9px 0",
                        borderBottom: "1px dashed var(--line)",
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                        {ROTULOS_MODULOS[modulo] ?? modulo}
                      </span>
                      <span className="row" style={{ gap: 4 }}>
                        {accoes.map((accao) => (
                          <Badge key={accao} tom="neutral" plain>
                            {ROTULOS_ACCOES[accao] ?? accao}
                          </Badge>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead
              titulo="Dispositivo e localização"
              hint="Dados do navegador utilizados para apresentação e formatação."
            />
            <CardBody>
              <div className="info-grid">
                <InfoBox rotulo="Idioma">
                  <span className="row" style={{ gap: 6 }}><Globe2 size={14} /> {navigator.language}</span>
                </InfoBox>
                <InfoBox rotulo="Fuso horário">{fusoHorario}</InfoBox>
                <InfoBox rotulo="Ecrã">
                  <span className="row" style={{ gap: 6 }}><Laptop size={14} /> {screen.width} × {screen.height}</span>
                </InfoBox>
                <InfoBox rotulo="Tema activo">{tema === "dark" ? "Escuro" : "Claro"}</InfoBox>
                <InfoBox rotulo="Armazenamento">
                  <span className="row" style={{ gap: 6 }}><Database size={14} /> Sessão local</span>
                </InfoBox>
                <InfoBox rotulo="Empresas disponíveis">{sessao.empresas.length}</InfoBox>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
