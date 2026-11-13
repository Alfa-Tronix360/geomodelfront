import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight, CalendarDays, Compass, FolderKanban, MapPin, Pencil, Plus, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Pagina, Projecto } from "@/app/services/types";
import {
  corMineral, formatarArea, formatarData, formatarNumero, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, EmptyState, ErrorBox, EstadoBadge,
  Field, Loading, Modal, PageHeader, Pagination, SearchInput,
} from "@/app/components/ui";
import { EstadoAutomatico } from "@/app/components/campos";
import { ProjectMap } from "@/app/components/ProjectMap";
import { useToast } from "@/app/components/Toast";

interface FormProjecto {
  codigo: string;
  nome: string;
  descricao: string;
  mineral: string;
  concessao: string;
  pais: string;
  provincia: string;
  municipio: string;
  area_km2: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
}

const FORM_VAZIO: FormProjecto = {
  codigo: "", nome: "", descricao: "", mineral: "", concessao: "", pais: "Angola",
  provincia: "", municipio: "", area_km2: "", estado: "planeado", data_inicio: "", data_fim: "",
};

const MINERAIS = ["cobre", "ouro", "ferro", "diamante", "manganês", "grafite", "fosfato", "urânio", "níquel", "zinco"];
const ESTADOS = [
  { valor: "planeado", rotulo: "Planeado" },
  { valor: "activo", rotulo: "Activo" },
  { valor: "suspenso", rotulo: "Suspenso" },
  { valor: "encerrado", rotulo: "Encerrado" },
];

export default function ProjectsPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const [pesquisa, setPesquisa] = useState(params.get("q") ?? "");
  const [termo, setTermo] = useState(params.get("q") ?? "");
  const [estado, setEstado] = useState("");
  const [mineral, setMineral] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Projecto | null>(null);
  const [form, setForm] = useState<FormProjecto>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Projecto | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const [codigoSugerido, setCodigoSugerido] = useState("");
  const limite = 12;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setTermo(pesquisa);
      setPagina(0);
    }, 320);
    return () => window.clearTimeout(temporizador);
  }, [pesquisa]);

  useEffect(() => {
    if (params.get("novo")) {
      abrirNovo();
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Projecto>>(
    () => api.get(`/projects${qs({ q: termo, estado, mineral, skip: pagina * limite, limit: limite })}`),
    [termo, estado, mineral, pagina],
  );

  const items = dados?.items ?? [];
  const totalArea = items.reduce((soma, projeto) => soma + (projeto.area_km2 ?? 0), 0);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setCodigoSugerido("");
    api.get<{ codigo: string }>("/projects/proximo-codigo")
      .then((r) => setCodigoSugerido(r.codigo))
      .catch(() => setCodigoSugerido(""));
    setErroForm("");
    setModalAberto(true);
  }

  function abrirEdicao(projeto: Projecto) {
    setEditando(projeto);
    setForm({
      codigo: projeto.codigo,
      nome: projeto.nome,
      descricao: projeto.descricao ?? "",
      mineral: projeto.mineral ?? "",
      concessao: projeto.concessao ?? "",
      pais: projeto.pais,
      provincia: projeto.provincia ?? "",
      municipio: projeto.municipio ?? "",
      area_km2: projeto.area_km2 === null ? "" : String(projeto.area_km2),
      estado: projeto.estado,
      data_inicio: projeto.data_inicio ?? "",
      data_fim: projeto.data_fim ?? "",
    });
    setErroForm("");
    setModalAberto(true);
  }

  function actualizar(campo: keyof FormProjecto, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function payload() {
    return {
      ...(form.codigo.trim() ? { codigo: form.codigo.trim() } : {}),
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      mineral: form.mineral.trim() || null,
      concessao: form.concessao.trim() || null,
      pais: form.pais.trim() || "Angola",
      provincia: form.provincia.trim() || null,
      municipio: form.municipio.trim() || null,
      area_km2: form.area_km2 === "" ? null : Number(form.area_km2),
      estado: form.estado,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
    };
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    try {
      if (editando) {
        await api.patch(`/projects/${editando.id}`, payload());
        toast.sucesso("Projecto actualizado com sucesso.");
      } else {
        await api.post("/projects", payload());
        toast.sucesso("Projecto criado com sucesso.");
      }
      setModalAberto(false);
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
      await api.delete(`/projects/${aEliminar.id}`);
      toast.sucesso("Projecto eliminado.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Exploração"
        titulo="Projectos mineiros"
        sub="Áreas de concessão, commodity principal, estado de execução e equipa responsável."
        acoes={
          pode("projects", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo projecto</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Card className="kpi" style={{ padding: 16 }}>
          <div className="kpi__label">Projectos listados</div>
          <div className="kpi__value">{dados?.total ?? 0}</div>
        </Card>
        <Card className="kpi" style={{ padding: 16 }}>
          <div className="kpi__label">Área na página</div>
          <div className="kpi__value">{formatarArea(totalArea)}</div>
        </Card>
        <Card className="kpi" style={{ padding: 16 }}>
          <div className="kpi__label">Activos na página</div>
          <div className="kpi__value">{items.filter((p) => p.estado === "activo").length}</div>
        </Card>
        <Card className="kpi" style={{ padding: 16 }}>
          <div className="kpi__label">Minerais distintos</div>
          <div className="kpi__value">{new Set(items.map((p) => p.mineral).filter(Boolean)).size}</div>
        </Card>
      </div>

      <Card flush>
        <CardHead
          titulo="Carteira de projectos"
          hint="Pesquise por código ou nome, filtre por estado e mineral"
          acoes={<Badge tom="teal">{formatarNumero(dados?.total ?? 0)} registos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar por código ou nome…" />
            </div>
            <select className="select" style={{ maxWidth: 190 }} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 190 }} value={mineral} onChange={(e) => { setMineral(e.target.value); setPagina(0); }}>
              <option value="">Todos os minerais</option>
              {MINERAIS.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar projectos…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum projecto encontrado"
            descricao="Ajuste os filtros ou crie o primeiro projecto da empresa."
            icone={<FolderKanban size={24} />}
            accao={pode("projects", "create") ? <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo projecto</button> : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid--main">
            <div className="project-grid">
              {items.map((projeto) => (
                <article
                  key={projeto.id}
                  className="card project-card"
                  onClick={() => navegar(`/projectos/${projeto.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="project-card__band" style={{ background: `linear-gradient(90deg, ${corMineral(projeto.mineral)}, var(--accent))` }} />
                  <div className="project-card__body">
                    <div className="project-card__top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="project-card__code">{projeto.codigo}</div>
                        <h3 className="project-card__name">{projeto.nome}</h3>
                      </div>
                      <EstadoBadge estado={projeto.estado} />
                    </div>
                    <div className="row muted" style={{ fontSize: 12, marginTop: 8, gap: 6 }}>
                      <MapPin size={13} /> {projeto.provincia ?? projeto.pais}{projeto.municipio ? ` · ${projeto.municipio}` : ""}
                    </div>
                    <div className="project-card__meta">
                      <div className="meta-item">
                        <span>Mineral</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <i style={{ width: 8, height: 8, borderRadius: 3, background: corMineral(projeto.mineral) }} />
                          {projeto.mineral ?? "—"}
                        </strong>
                      </div>
                      <div className="meta-item">
                        <span>Área</span>
                        <strong>{formatarArea(projeto.area_km2)}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Concessão</span>
                        <strong className="truncate">{projeto.concessao ?? "—"}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Início</span>
                        <strong>{formatarData(projeto.data_inicio)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="project-card__foot">
                    <span className="row muted" style={{ fontSize: 11.5, gap: 5 }}>
                      <CalendarDays size={13} /> {rotuloEstado(projeto.estado)}
                    </span>
                    <span className="spacer" />
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => { e.stopPropagation(); navegar(`/projectos/${projeto.id}`); }}
                    >
                      Abrir <ArrowUpRight size={14} />
                    </button>
                    {pode("projects", "edit") && (
                      <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={(e) => { e.stopPropagation(); abrirEdicao(projeto); }}>
                        <Pencil size={14} />
                      </button>
                    )}
                    {pode("projects", "delete") && (
                      <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); setAEliminar(projeto); }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="stack">
              <Card flush>
                <CardHead titulo="Distribuição geográfica" hint="Pontos aproximados por geometria" />
                <ProjectMap projetos={items} altura={300} />
              </Card>
              <Card>
                <CardHead titulo="Resumo da selecção" hint="Indicadores da página actual" />
                <CardBody>
                  <dl className="detail-list">
                    <div className="detail-list__row"><dt>Projectos</dt><dd>{items.length}</dd></div>
                    <div className="detail-list__row"><dt>Área total</dt><dd>{formatarArea(totalArea)}</dd></div>
                    <div className="detail-list__row"><dt>Activos</dt><dd>{items.filter((p) => p.estado === "activo").length}</dd></div>
                    <div className="detail-list__row"><dt>Com concessão</dt><dd>{items.filter((p) => p.concessao).length}</dd></div>
                  </dl>
                  <div className="divider" />
                  <div className="row muted" style={{ fontSize: 11.5 }}>
                    <Compass size={14} /> Os projectos alimentam sondagens, amostras e modelos.
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
          </Card>
        </>
      )}

      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo={editando ? "Editar projecto" : "Novo projecto"}
        descricao="Os campos marcados com * são obrigatórios."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalAberto(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Criar projecto"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
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
            <Field label="Nome" required>
              <input className="input" value={form.nome} onChange={(e) => actualizar("nome", e.target.value)} placeholder="Nome do projecto" />
            </Field>
            <Field label="Mineral principal">
              <input className="input" list="lista-minerais" value={form.mineral} onChange={(e) => actualizar("mineral", e.target.value)} placeholder="Ex.: cobre" />
              <datalist id="lista-minerais">
                {MINERAIS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
            <Field label="Concessão">
              <input className="input" value={form.concessao} onChange={(e) => actualizar("concessao", e.target.value)} placeholder="Nº da concessão mineira" />
            </Field>
            <Field label="País">
              <input className="input" value={form.pais} onChange={(e) => actualizar("pais", e.target.value)} />
            </Field>
            <Field label="Província">
              <input className="input" value={form.provincia} onChange={(e) => actualizar("provincia", e.target.value)} placeholder="Ex.: Huíla" />
            </Field>
            <Field label="Município">
              <input className="input" value={form.municipio} onChange={(e) => actualizar("municipio", e.target.value)} />
            </Field>
            <Field label="Área (km²)">
              <input className="input" type="number" min="0" step="0.01" value={form.area_km2} onChange={(e) => actualizar("area_km2", e.target.value)} />
            </Field>
            <EstadoAutomatico tipo="projecto" valor={form.estado} actual={editando?.estado} aoMudar={(v) => actualizar("estado", v)} />
            <Field label="Data de início">
              <input className="input" type="date" value={form.data_inicio} onChange={(e) => actualizar("data_inicio", e.target.value)} />
            </Field>
            <Field label="Data de fim">
              <input className="input" type="date" value={form.data_fim} onChange={(e) => actualizar("data_fim", e.target.value)} />
            </Field>
            <Field label="Descrição" className="span-2">
              <textarea className="textarea" value={form.descricao} onChange={(e) => actualizar("descricao", e.target.value)} placeholder="Objectivo, contexto geológico e notas relevantes." />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar projecto"
        mensagem={`Tem a certeza que pretende eliminar "${aEliminar?.nome}"? O projecto fica marcado como eliminado (soft delete) e deixa de aparecer nas listagens.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
