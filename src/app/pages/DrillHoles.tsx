import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight, Compass, MapPin, Mountain, Pencil, Plus, Ruler, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Furo, Pagina, Projecto } from "@/app/services/types";
import { dentroDeAngola, geoParaUtm } from "@/app/services/coordenadas";
import {
  formatarData, formatarMetros, formatarNumero, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  EstadoBadge, Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput,
  type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormFuro {
  project_id: string;
  codigo: string;
  nome: string;
  tipo: string;
  estado: string;
  latitude: string;
  longitude: string;
  x: string;
  y: string;
  z: string;
  azimute: string;
  inclinacao: string;
  profundidade_prevista: string;
  profundidade_final: string;
  data_inicio: string;
  data_fim: string;
  sonda: string;
  notas: string;
}

const FORM_VAZIO: FormFuro = {
  project_id: "", codigo: "", nome: "", tipo: "diamantado", estado: "planeado",
  latitude: "", longitude: "", x: "", y: "", z: "", azimute: "", inclinacao: "", profundidade_prevista: "",
  profundidade_final: "", data_inicio: "", data_fim: "", sonda: "", notas: "",
};

const TIPOS = ["diamantado", "rc", "percussao", "rotativo", "outro"];
const ESTADOS = [
  { valor: "planeado", rotulo: "Planeado" },
  { valor: "em_sondagem", rotulo: "Em sondagem" },
  { valor: "concluido", rotulo: "Concluído" },
  { valor: "abandonado", rotulo: "Abandonado" },
];

export default function DrillHolesPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const [pesquisa, setPesquisa] = useState(params.get("q") ?? "");
  const [termo, setTermo] = useState(params.get("q") ?? "");
  const [projecto, setProjecto] = useState(params.get("projecto") ?? "");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Furo | null>(null);
  const [form, setForm] = useState<FormFuro>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Furo | null>(null);
  const [aApagar, setAApagar] = useState(false);
  // X/Y acompanham a latitude/longitude até o utilizador os escrever à mão
  const [xyAuto, setXyAuto] = useState(true);
  const [codigoSugerido, setCodigoSugerido] = useState("");
  const limite = 14;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setTermo(pesquisa);
      setPagina(0);
    }, 320);
    return () => window.clearTimeout(temporizador);
  }, [pesquisa]);

  const { dados: projetos } = useFetch<Pagina<Projecto>>(
    () => api.get("/projects?limit=200"),
    [],
  );
  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Furo>>(
    () => api.get(`/drill-holes${qs({ project_id: projecto, estado, q: termo, skip: pagina * limite, limit: limite })}`),
    [projecto, estado, termo, pagina],
  );

  useEffect(() => {
    if (params.get("novo")) {
      abrirNovo();
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const items = dados?.items ?? [];
  const metros = items.reduce((soma, furo) => soma + (furo.profundidade_final ?? 0), 0);
  const concluidos = items.filter((furo) => furo.estado === "concluido").length;
  const emCurso = items.filter((furo) => furo.estado === "em_sondagem").length;

  // o formulário pode abrir antes de a lista de projectos chegar: escolhe o primeiro quando chegar
  useEffect(() => {
    const primeiro = projetos?.items[0]?.id;
    if (modal && !editando && !form.project_id && primeiro) {
      setForm((actual) => ({ ...actual, project_id: projecto || primeiro }));
    }
  }, [modal, editando, form.project_id, projetos, projecto]);

  // código automático sugerido para o projecto escolhido (só ao criar)
  useEffect(() => {
    if (!modal || editando || !form.project_id) {
      setCodigoSugerido("");
      return;
    }
    let activo = true;
    api.get<{ codigo: string }>(`/drill-holes/proximo-codigo${qs({ project_id: form.project_id })}`)
      .then((r) => { if (activo) setCodigoSugerido(r.codigo); })
      .catch(() => { if (activo) setCodigoSugerido(""); });
    return () => { activo = false; };
  }, [modal, editando, form.project_id]);

  const utm = useMemo(
    () => (form.latitude.trim() && form.longitude.trim()
      ? geoParaUtm(Number(form.latitude), Number(form.longitude))
      : null),
    [form.latitude, form.longitude],
  );
  const foraDeAngola = utm !== null && !dentroDeAngola(Number(form.latitude), Number(form.longitude));

  function abrirNovo() {
    setEditando(null);
    setXyAuto(true);
    setForm({ ...FORM_VAZIO, project_id: projecto || projetos?.items[0]?.id || "" });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(furo: Furo) {
    setEditando(furo);
    const calculado = furo.latitude !== null && furo.longitude !== null
      ? geoParaUtm(furo.latitude, furo.longitude) : null;
    setXyAuto(
      (furo.x === null && furo.y === null)
      || (calculado !== null && furo.x !== null && furo.y !== null
        && Math.abs(calculado.x - furo.x) < 1 && Math.abs(calculado.y - furo.y) < 1),
    );
    setForm({
      project_id: furo.project_id,
      codigo: furo.codigo,
      nome: furo.nome ?? "",
      tipo: furo.tipo,
      estado: furo.estado,
      latitude: furo.latitude === null ? "" : String(furo.latitude),
      longitude: furo.longitude === null ? "" : String(furo.longitude),
      x: furo.x === null ? "" : String(furo.x),
      y: furo.y === null ? "" : String(furo.y),
      z: furo.z === null ? "" : String(furo.z),
      azimute: furo.azimute === null ? "" : String(furo.azimute),
      inclinacao: furo.inclinacao === null ? "" : String(furo.inclinacao),
      profundidade_prevista: furo.profundidade_prevista === null ? "" : String(furo.profundidade_prevista),
      profundidade_final: furo.profundidade_final === null ? "" : String(furo.profundidade_final),
      data_inicio: furo.data_inicio ?? "",
      data_fim: furo.data_fim ?? "",
      sonda: furo.sonda ?? "",
      notas: furo.notas ?? "",
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar(campo: keyof FormFuro, valor: string) {
    setForm((actual) => {
      const novo = { ...actual, [campo]: valor };
      if ((campo === "latitude" || campo === "longitude") && xyAuto) {
        const r = novo.latitude.trim() && novo.longitude.trim()
          ? geoParaUtm(Number(novo.latitude), Number(novo.longitude)) : null;
        novo.x = r ? String(r.x) : "";
        novo.y = r ? String(r.y) : "";
      }
      return novo;
    });
    if (campo === "x" || campo === "y") setXyAuto(false);
  }

  function recalcularXY() {
    setXyAuto(true);
    if (utm) setForm((actual) => ({ ...actual, x: String(utm.x), y: String(utm.y) }));
  }

  function numeroOuNulo(valor: string): number | null {
    return valor.trim() === "" ? null : Number(valor);
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const base = {
      ...(form.codigo.trim() ? { codigo: form.codigo.trim() } : {}),
      nome: form.nome.trim() || null,
      tipo: form.tipo,
      estado: form.estado,
      latitude: numeroOuNulo(form.latitude),
      longitude: numeroOuNulo(form.longitude),
      x: numeroOuNulo(form.x),
      y: numeroOuNulo(form.y),
      z: numeroOuNulo(form.z),
      azimute: numeroOuNulo(form.azimute),
      inclinacao: numeroOuNulo(form.inclinacao),
      profundidade_prevista: numeroOuNulo(form.profundidade_prevista),
      profundidade_final: numeroOuNulo(form.profundidade_final),
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      sonda: form.sonda.trim() || null,
      notas: form.notas.trim() || null,
    };
    try {
      if (editando) {
        await api.patch(`/drill-holes/${editando.id}`, base);
        toast.sucesso("Furo actualizado.");
      } else {
        await api.post("/drill-holes", { ...base, project_id: form.project_id });
        toast.sucesso("Furo registado.");
      }
      setModal(false);
      recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setAApagar(true);
    try {
      await api.delete(`/drill-holes/${aEliminar.id}`);
      toast.sucesso("Furo eliminado.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Furo>[] = [
    {
      chave: "codigo",
      cabecalho: "Furo",
      render: (furo) => (
        <div>
          <div className="table__primary">{furo.codigo}</div>
          <div className="table__secondary">{furo.nome ?? "Sem designação"}</div>
        </div>
      ),
    },
    { chave: "tipo", cabecalho: "Tipo", render: (furo) => rotuloEstado(furo.tipo) },
    { chave: "estado", cabecalho: "Estado", render: (furo) => <EstadoBadge estado={furo.estado} /> },
    {
      chave: "profundidade",
      cabecalho: "Profundidade",
      alinhar: "right",
      render: (furo) => (
        <div>
          <div className="table__primary">{formatarMetros(furo.profundidade_final)}</div>
          <div className="table__secondary">prev. {formatarMetros(furo.profundidade_prevista)}</div>
        </div>
      ),
    },
    {
      chave: "orientacao",
      cabecalho: "Orientação",
      render: (furo) => (
        <span className="mono muted">
          {furo.azimute ?? "—"}° / {furo.inclinacao ?? "—"}°
        </span>
      ),
    },
    {
      chave: "local",
      cabecalho: "Coordenadas",
      render: (furo) =>
        furo.latitude !== null && furo.longitude !== null ? (
          <span className="mono muted">{furo.latitude.toFixed(4)}, {furo.longitude.toFixed(4)}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (furo) => (
        <div className="table__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => navegar(`/sondagens/${furo.id}`)}>
            Abrir <ArrowUpRight size={13} />
          </button>
          {pode("drill_holes", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(furo)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("drill_holes", "delete") && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={() => setAEliminar(furo)}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Exploração"
        titulo="Sondagens"
        sub="Registo de furos, orientação, profundidades e execução no terreno."
        acoes={
          pode("drill_holes", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo furo</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Furos listados" valor={formatarNumero(dados?.total)} icone={<Mountain size={18} />} rodape="Total na selecção actual" />
        <Kpi rotulo="Metros na página" valor={formatarMetros(metros)} icone={<Ruler size={18} />} variante="accent" rodape="Profundidade final registada" />
        <Kpi rotulo="Concluídos" valor={formatarNumero(concluidos)} icone={<Compass size={18} />} variante="success" rodape="Furos terminados" />
        <Kpi rotulo="Em sondagem" valor={formatarNumero(emCurso)} icone={<MapPin size={18} />} variante="info" rodape="Execução em curso" />
      </div>

      <Card flush>
        <CardHead
          titulo="Carteira de furos"
          hint="Filtre por projecto, estado ou código"
          acoes={<Badge tom="teal">{formatarNumero(dados?.total ?? 0)} registos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar por código ou nome…" />
            </div>
            <select className="select" style={{ maxWidth: 240 }} value={projecto} onChange={(e) => { setProjecto(e.target.value); setPagina(0); }}>
              <option value="">Todos os projectos</option>
              {projetos?.items.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 180 }} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar sondagens…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum furo encontrado"
            descricao="Ajuste os filtros ou registe o primeiro furo de sondagem."
            icone={<Mountain size={24} />}
            accao={pode("drill_holes", "create") ? <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo furo</button> : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={items} chaveDe={(furo) => furo.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar furo" : "Novo furo de sondagem"}
        descricao="Profundidade final não pode exceder a prevista."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Registar furo"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Projecto" required className="span-2">
              <select className="select" value={form.project_id} onChange={(e) => actualizar("project_id", e.target.value)} disabled={Boolean(editando)}>
                <option value="">Seleccionar projecto…</option>
                {projetos?.items.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}
              </select>
            </Field>
            <Field
              label="Código"
              required={Boolean(editando)}
              hint={editando ? undefined : codigoSugerido ? `Vazio = automático (${codigoSugerido})` : "Vazio = automático"}
            >
              <input
                className="input"
                value={form.codigo}
                onChange={(e) => actualizar("codigo", e.target.value)}
                placeholder={editando ? "" : codigoSugerido || "Automático"}
              />
            </Field>
            <Field label="Nome">
              <input className="input" value={form.nome} onChange={(e) => actualizar("nome", e.target.value)} />
            </Field>
            <Field label="Tipo">
              <select className="select" value={form.tipo} onChange={(e) => actualizar("tipo", e.target.value)}>
                {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{rotuloEstado(tipo)}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className="select" value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                {ESTADOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
              </select>
            </Field>
            <Field label="Latitude">
              <input className="input" type="number" step="0.000001" value={form.latitude} onChange={(e) => actualizar("latitude", e.target.value)} placeholder="-12.500000" />
            </Field>
            <Field label="Longitude">
              <input className="input" type="number" step="0.000001" value={form.longitude} onChange={(e) => actualizar("longitude", e.target.value)} placeholder="15.700000" />
            </Field>
            <Field
              label="X — Este (m)"
              hint={xyAuto && utm ? `Automático · UTM ${utm.zona}${utm.hemisferio} (WGS84)` : undefined}
            >
              <input className="input" type="number" step="0.01" value={form.x} onChange={(e) => actualizar("x", e.target.value)} placeholder="Calculado da lat/long" />
            </Field>
            <Field
              label="Y — Norte (m)"
            >
              <input className="input" type="number" step="0.01" value={form.y} onChange={(e) => actualizar("y", e.target.value)} placeholder="Calculado da lat/long" />
            </Field>
            <Field label="Z — Cota (m)" hint="Altitude do colar (GPS ou topografia)">
              <input className="input" type="number" step="0.01" value={form.z} onChange={(e) => actualizar("z", e.target.value)} placeholder="Ex.: 850" />
            </Field>
            <div className="span-2" style={{ fontSize: 12, display: "grid", gap: 6, alignSelf: "end" }}>
              {!xyAuto && utm && (
                <button type="button" className="btn btn--ghost btn--sm" style={{ justifySelf: "start" }} onClick={recalcularXY}>
                  Recalcular X/Y a partir da latitude/longitude
                </button>
              )}
              {foraDeAngola && (
                <div className="alert alert--warn" style={{ margin: 0 }}>
                  Esta latitude/longitude fica fora de Angola. Em Angola a latitude é negativa (ex.: -8,8) e a longitude fica entre 11,6 e 24,1.
                </div>
              )}
            </div>
            <Field label="Azimute (°)">
              <input className="input" type="number" min="0" max="360" step="0.1" value={form.azimute} onChange={(e) => actualizar("azimute", e.target.value)} />
            </Field>
            <Field label="Inclinação (°)">
              <input className="input" type="number" min="-90" max="90" step="0.1" value={form.inclinacao} onChange={(e) => actualizar("inclinacao", e.target.value)} />
            </Field>
            <Field label="Profundidade prevista (m)">
              <input className="input" type="number" min="0" step="0.1" value={form.profundidade_prevista} onChange={(e) => actualizar("profundidade_prevista", e.target.value)} />
            </Field>
            <Field label="Profundidade final (m)">
              <input className="input" type="number" min="0" step="0.1" value={form.profundidade_final} onChange={(e) => actualizar("profundidade_final", e.target.value)} />
            </Field>
            <Field label="Data de início">
              <input className="input" type="date" value={form.data_inicio} onChange={(e) => actualizar("data_inicio", e.target.value)} />
            </Field>
            <Field label="Data de fim">
              <input className="input" type="date" value={form.data_fim} onChange={(e) => actualizar("data_fim", e.target.value)} />
            </Field>
            <Field label="Sonda" className="span-2">
              <input className="input" value={form.sonda} onChange={(e) => actualizar("sonda", e.target.value)} placeholder="Equipamento / contratante" />
            </Field>
            <Field label="Notas" className="span-2">
              <textarea className="textarea" value={form.notas} onChange={(e) => actualizar("notas", e.target.value)} />
            </Field>
          </div>
          {editando && (
            <p className="muted" style={{ fontSize: 11.5 }}>
              Criado em {formatarData(editando.criado_em)} · actualizado em {formatarData(editando.actualizado_em)}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar furo"
        mensagem={`Eliminar o furo "${aEliminar?.codigo}"? O registo fica marcado como eliminado e deixa de aparecer nas listagens.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
