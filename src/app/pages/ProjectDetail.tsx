import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Compass, Cuboid, FlaskConical,
  Gem, Layers, MapPin, Mountain, Pencil, Plus, Ruler, Trash2,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type {
  Amostra, AreaProjecto, Estimativa, Furo, Litologia, Modelo, Pagina, Projecto,
} from "@/app/services/types";
import {
  corMineral, formatarArea, formatarData, formatarMetal, formatarMetros, formatarNumero,
  formatarToneladas, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, DetailRow, EmptyState,
  ErrorBox, EstadoBadge, Field, InfoBox, Loading, Modal, PageHeader, Progress, Tabs,
  type Coluna,
} from "@/app/components/ui";
import { EstadoAutomatico } from "@/app/components/campos";
import { ProjectMap } from "@/app/components/ProjectMap";
import { Cena3D } from "@/app/components/Cena3D";
import { useToast } from "@/app/components/Toast";

interface FormProjecto {
  codigo: string;
  nome: string;
  descricao: string;
  mineral: string;
  concessao: string;
  provincia: string;
  municipio: string;
  area_km2: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
}

export default function ProjectDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const toast = useToast();
  const { pode } = useAuth();
  const [aba, setAba] = useState("resumo");
  const [modalProjecto, setModalProjecto] = useState(false);
  const [modalArea, setModalArea] = useState(false);
  const [aEliminarArea, setAEliminarArea] = useState<AreaProjecto | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [form, setForm] = useState<FormProjecto>({
    codigo: "", nome: "", descricao: "", mineral: "", concessao: "", provincia: "",
    municipio: "", area_km2: "", estado: "planeado", data_inicio: "", data_fim: "",
  });
  const [formArea, setFormArea] = useState({ nome: "", descricao: "", area_km2: "" });

  const projecto = useFetch<Projecto>(() => api.get(`/projects/${id}`), [id]);
  const areas = useFetch<AreaProjecto[]>(() => api.get(`/projects/${id}/areas`), [id]);
  const furos = useFetch<Pagina<Furo>>(() => api.get(`/drill-holes?project_id=${id}&limit=100`), [id]);
  const amostras = useFetch<Pagina<Amostra>>(() => api.get(`/samples?project_id=${id}&limit=8`), [id]);
  const modelos = useFetch<Pagina<Modelo>>(() => api.get(`/models?project_id=${id}&limit=50`), [id]);
  const recursos = useFetch<Pagina<Estimativa>>(() => api.get(`/resources?project_id=${id}&limit=50`), [id]);
  const litologias = useFetch<Litologia[]>(() => api.get("/lithologies"), []);

  const p = projecto.dados;
  const totalTonelagem = (recursos.dados?.items ?? []).reduce((soma, r) => soma + (r.tonelagem ?? 0), 0);
  const totalMetal = (recursos.dados?.items ?? []).reduce((soma, r) => soma + (r.metal_contido ?? 0), 0);

  function recarregarTudo() {
    projecto.recarregar();
    areas.recarregar();
    furos.recarregar();
    amostras.recarregar();
    modelos.recarregar();
    recursos.recarregar();
  }

  function abrirEdicao() {
    if (!p) return;
    setForm({
      codigo: p.codigo,
      nome: p.nome,
      descricao: p.descricao ?? "",
      mineral: p.mineral ?? "",
      concessao: p.concessao ?? "",
      provincia: p.provincia ?? "",
      municipio: p.municipio ?? "",
      area_km2: p.area_km2 === null ? "" : String(p.area_km2),
      estado: p.estado,
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
    });
    setErroForm("");
    setModalProjecto(true);
  }

  async function gravarProjecto() {
    setAGravar(true);
    setErroForm("");
    try {
      await api.patch(`/projects/${id}`, {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        mineral: form.mineral.trim() || null,
        concessao: form.concessao.trim() || null,
        provincia: form.provincia.trim() || null,
        municipio: form.municipio.trim() || null,
        area_km2: form.area_km2 === "" ? null : Number(form.area_km2),
        estado: form.estado,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
      });
      toast.sucesso("Projecto actualizado.");
      setModalProjecto(false);
      recarregarTudo();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function gravarArea() {
    setAGravar(true);
    setErroForm("");
    try {
      await api.post(`/projects/${id}/areas`, {
        nome: formArea.nome.trim(),
        descricao: formArea.descricao.trim() || null,
        area_km2: formArea.area_km2 === "" ? null : Number(formArea.area_km2),
      });
      toast.sucesso("Área criada.");
      setModalArea(false);
      setFormArea({ nome: "", descricao: "", area_km2: "" });
      areas.recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function eliminarArea() {
    if (!aEliminarArea) return;
    setAApagar(true);
    try {
      await api.delete(`/projects/${id}/areas/${aEliminarArea.id}`);
      toast.sucesso("Área eliminada.");
      setAEliminarArea(null);
      areas.recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunasFuros: Coluna<Furo>[] = [
    {
      chave: "codigo",
      cabecalho: "Furo",
      render: (furo) => (
        <div>
          <div className="table__primary">{furo.codigo}</div>
          <div className="table__secondary">{furo.nome ?? furo.tipo.replaceAll("_", " ")}</div>
        </div>
      ),
    },
    { chave: "tipo", cabecalho: "Tipo", render: (furo) => rotuloEstado(furo.tipo) },
    { chave: "estado", cabecalho: "Estado", render: (furo) => <EstadoBadge estado={furo.estado} /> },
    { chave: "prof", cabecalho: "Profundidade", alinhar: "right", render: (furo) => formatarMetros(furo.profundidade_final) },
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
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (furo) => (
        <button className="btn btn--ghost btn--sm" onClick={() => navegar(`/sondagens/${furo.id}`)}>
          Abrir <ArrowUpRight size={13} />
        </button>
      ),
    },
  ];

  const colunasAmostras: Coluna<Amostra>[] = [
    { chave: "codigo", cabecalho: "Amostra", render: (a) => <span className="table__primary">{a.codigo}</span> },
    { chave: "tipo", cabecalho: "Tipo", render: (a) => rotuloEstado(a.tipo) },
    {
      chave: "intervalo",
      cabecalho: "Intervalo",
      render: (a) => <span className="mono muted">{a.de ?? "—"}–{a.ate ?? "—"} m</span>,
    },
    { chave: "peso", cabecalho: "Peso", alinhar: "right", render: (a) => (a.peso_kg === null ? "—" : `${formatarNumero(a.peso_kg, 2)} kg`) },
    { chave: "estado", cabecalho: "Estado", render: (a) => <EstadoBadge estado={a.estado} /> },
  ];

  const colunasRecursos: Coluna<Estimativa>[] = [
    {
      chave: "nome",
      cabecalho: "Estimativa",
      render: (r) => (
        <div>
          <div className="table__primary">{r.nome}</div>
          <div className="table__secondary">{r.commodity} · {rotuloEstado(r.metodo)}</div>
        </div>
      ),
    },
    { chave: "ton", cabecalho: "Tonelagem", alinhar: "right", render: (r) => formatarToneladas(r.tonelagem) },
    { chave: "metal", cabecalho: "Metal contido", alinhar: "right", render: (r) => formatarMetal(r.metal_contido) },
    { chave: "estado", cabecalho: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (r) => (
        <div className="table__actions">
          {r.estado !== "validado" && pode("resources", "validate") && (
            <button
              className="btn btn--ghost btn--sm"
              title="Validar estimativa"
              onClick={async () => {
                try {
                  await api.post(`/resources/${r.id}/validate`);
                  toast.sucesso("Estimativa validada.");
                  recursos.recarregar();
                } catch (e) {
                  toast.erro(mensagemErro(e));
                }
              }}
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={() => navegar("/recursos")}>
            <ArrowUpRight size={14} />
          </button>
        </div>
      ),
    },
  ];

  if (projecto.erro && !p) {
    return (
      <div className="page">
        <ErrorBox mensagem={projecto.erro} aoTentar={projecto.recarregar} />
        <Link className="btn btn--secondary" to="/projectos" style={{ justifySelf: "start" }}>
          <ArrowLeft size={15} /> Voltar aos projectos
        </Link>
      </div>
    );
  }

  if (!p) return <Loading texto="A carregar projecto…" />;

  return (
    <div className="page">
      <div className="row" style={{ fontSize: 12.5 }}>
        <Link to="/projectos" className="row muted" style={{ gap: 5 }}><ArrowLeft size={14} /> Projectos</Link>
        <span className="muted">/</span>
        <span className="mono muted">{p.codigo}</span>
      </div>

      <PageHeader
        eyebrow={`${p.pais}${p.provincia ? ` · ${p.provincia}` : ""}`}
        titulo={p.nome}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <EstadoBadge estado={p.estado} />
            <span className="row muted" style={{ gap: 5 }}><MapPin size={13} /> {p.municipio ?? p.provincia ?? "Localização não indicada"}</span>
            <span className="row muted" style={{ gap: 5 }}><CalendarDays size={13} /> {formatarData(p.data_inicio)} — {formatarData(p.data_fim)}</span>
          </span>
        }
        acoes={
          <>
            <button className="btn btn--secondary" onClick={() => navegar(`/sondagens?projecto=${p.id}&novo=1`)}><Mountain size={15} /> Nova sondagem</button>
            <button className="btn btn--secondary" onClick={() => navegar(`/amostras?projecto=${p.id}&novo=1`)}><FlaskConical size={15} /> Nova amostra</button>
            {pode("projects", "edit") && <button className="btn btn--primary" onClick={abrirEdicao}><Pencil size={15} /> Editar</button>}
          </>
        }
      />

      <div className="grid grid--kpis">
        <InfoBox rotulo="Área do projecto">{formatarArea(p.area_km2)}</InfoBox>
        <InfoBox rotulo="Sondagens">{formatarNumero(furos.dados?.total ?? 0)}</InfoBox>
        <InfoBox rotulo="Amostras">{formatarNumero(amostras.dados?.total ?? 0)}</InfoBox>
        <InfoBox rotulo="Modelos 3D">{formatarNumero(modelos.dados?.total ?? 0)}</InfoBox>
        <InfoBox rotulo="Tonelagem estimada">{formatarToneladas(totalTonelagem)}</InfoBox>
        <InfoBox rotulo="Metal contido">{formatarMetal(totalMetal)}</InfoBox>
      </div>

      <Tabs
        activo={aba}
        aoMudar={setAba}
        opcoes={[
          { id: "resumo", rotulo: "Resumo" },
          { id: "areas", rotulo: "Áreas", contagem: areas.dados?.length },
          { id: "sondagens", rotulo: "Sondagens", contagem: furos.dados?.total },
          { id: "vista3d", rotulo: "Vista 3D" },
          { id: "amostras", rotulo: "Amostras", contagem: amostras.dados?.total },
          { id: "modelos", rotulo: "Modelos", contagem: modelos.dados?.total },
          { id: "recursos", rotulo: "Recursos", contagem: recursos.dados?.total },
        ]}
      />

      {aba === "resumo" && (
        <div className="grid grid--detail">
          <div className="stack">
            <Card>
              <CardHead titulo="Informação do projecto" hint="Dados administrativos e geológicos" />
              <CardBody>
                <dl className="detail-list">
                  <DetailRow rotulo="Código">{p.codigo}</DetailRow>
                  <DetailRow rotulo="Mineral principal">
                    <span className="row" style={{ gap: 7 }}>
                      <i style={{ width: 9, height: 9, borderRadius: 3, background: corMineral(p.mineral) }} />
                      {p.mineral ?? "—"}
                    </span>
                  </DetailRow>
                  <DetailRow rotulo="Concessão">{p.concessao ?? "—"}</DetailRow>
                  <DetailRow rotulo="Localização">{[p.municipio, p.provincia, p.pais].filter(Boolean).join(" · ")}</DetailRow>
                  <DetailRow rotulo="Área">{formatarArea(p.area_km2)}</DetailRow>
                  <DetailRow rotulo="Período">{formatarData(p.data_inicio)} — {formatarData(p.data_fim)}</DetailRow>
                  <DetailRow rotulo="Estado"><EstadoBadge estado={p.estado} /></DetailRow>
                  <DetailRow rotulo="Gestor">{p.gestor_id ? <span className="mono">{p.gestor_id.slice(0, 8)}…</span> : "Não atribuído"}</DetailRow>
                  <DetailRow rotulo="Criado em">{formatarData(p.criado_em)}</DetailRow>
                  <DetailRow rotulo="Actualizado em">{formatarData(p.actualizado_em)}</DetailRow>
                </dl>
                {p.descricao && (
                  <>
                    <div className="divider" />
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)" }}>{p.descricao}</p>
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHead
                titulo="Avanço do projecto"
                hint="Indicadores operacionais consolidados"
              />
              <CardBody>
                <div className="grid grid--3">
                  <div>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span>Sondagens concluídas</span>
                      <strong>{furos.dados?.items.filter((f) => f.estado === "concluido").length ?? 0}/{furos.dados?.total ?? 0}</strong>
                    </div>
                    <Progress valor={furos.dados?.total ? ((furos.dados.items.filter((f) => f.estado === "concluido").length / furos.dados.total) * 100) : 0} />
                  </div>
                  <div>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span>Amostras analisadas</span>
                      <strong>{amostras.dados?.items.filter((a) => a.estado === "analisada").length ?? 0}/{amostras.dados?.total ?? 0}</strong>
                    </div>
                    <Progress valor={amostras.dados?.total ? ((amostras.dados.items.filter((a) => a.estado === "analisada").length / amostras.dados.total) * 100) : 0} />
                  </div>
                  <div>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span>Modelos validados</span>
                      <strong>{modelos.dados?.items.filter((m) => m.estado === "validado").length ?? 0}/{modelos.dados?.total ?? 0}</strong>
                    </div>
                    <Progress valor={modelos.dados?.total ? ((modelos.dados.items.filter((m) => m.estado === "validado").length / modelos.dados.total) * 100) : 0} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="stack">
            <Card flush>
              <CardHead titulo="Localização" hint="Geometria e enquadramento" />
              <ProjectMap projetos={[p]} altura={300} />
            </Card>
            <Card>
              <CardHead titulo="Litologias da empresa" hint={`${litologias.dados?.length ?? 0} tipo(s) registados`} />
              <CardBody>
                {litologias.dados && litologias.dados.length > 0 ? (
                  <div className="row" style={{ gap: 7 }}>
                    {litologias.dados.slice(0, 12).map((litologia) => (
                      <Badge key={litologia.id} tom="neutral" plain>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: litologia.cor ?? "var(--primary)" }} />
                        {litologia.codigo}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 12.5 }}>Sem litologias registadas.</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {aba === "areas" && (
        <Card flush>
          <CardHead
            titulo="Áreas do projecto"
            hint="Subdivisões operacionais e polígonos GeoJSON"
            acoes={pode("projects", "create") && <button className="btn btn--primary btn--sm" onClick={() => { setErroForm(""); setModalArea(true); }}><Plus size={14} /> Nova área</button>}
          />
          {areas.erro ? (
            <CardBody><ErrorBox mensagem={areas.erro} aoTentar={areas.recarregar} /></CardBody>
          ) : (areas.dados?.length ?? 0) === 0 ? (
            <EmptyState titulo="Sem áreas definidas" descricao="Divida o projecto em áreas para organizar a exploração." icone={<Layers size={24} />} />
          ) : (
            <div className="project-grid" style={{ padding: 16 }}>
              {areas.dados?.map((area) => (
                <div className="card card--pad" key={area.id}>
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="table__primary">{area.nome}</div>
                      <div className="table__secondary">{formatarArea(area.area_km2)}</div>
                    </div>
                    {pode("projects", "delete") && (
                      <button className="btn btn--ghost btn--sm" onClick={() => setAEliminarArea(area)} aria-label="Eliminar área"><Trash2 size={14} /></button>
                    )}
                  </div>
                  {area.descricao && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{area.descricao}</p>}
                  <div className="divider" />
                  <span className="muted" style={{ fontSize: 11 }}>{area.geometria ? "Geometria GeoJSON definida" : "Sem geometria"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {aba === "sondagens" && (
        <Card flush>
          <CardHead
            titulo="Sondagens do projecto"
            hint={`${furos.dados?.total ?? 0} furo(s)`}
            acoes={<button className="btn btn--primary btn--sm" onClick={() => navegar(`/sondagens?projecto=${p.id}&novo=1`)}><Plus size={14} /> Registar furo</button>}
          />
          {furos.erro ? (
            <CardBody><ErrorBox mensagem={furos.erro} aoTentar={furos.recarregar} /></CardBody>
          ) : (
            <DataTable colunas={colunasFuros} linhas={furos.dados?.items ?? []} chaveDe={(f) => f.id} vazio={<EmptyState titulo="Sem sondagens" descricao="Registe o primeiro furo deste projecto." icone={<Mountain size={24} />} />} />
          )}
        </Card>
      )}

      {aba === "vista3d" && (
        <Card>
          <CardHead
            titulo="Vista 3D das sondagens"
            hint="Furos posicionados pelas coordenadas do collar e orientados pelos surveys. Clique num furo para ver detalhes."
          />
          <CardBody>
            <Cena3D projectId={p.id} />
          </CardBody>
        </Card>
      )}

      {aba === "amostras" && (
        <Card flush>
          <CardHead
            titulo="Amostras recentes"
            hint="Últimas amostras registadas no projecto"
            acoes={<button className="btn btn--secondary btn--sm" onClick={() => navegar(`/amostras?projecto=${p.id}`)}>Ver todas <ArrowUpRight size={14} /></button>}
          />
          {amostras.erro ? (
            <CardBody><ErrorBox mensagem={amostras.erro} aoTentar={amostras.recarregar} /></CardBody>
          ) : (
            <DataTable colunas={colunasAmostras} linhas={amostras.dados?.items ?? []} chaveDe={(a) => a.id} vazio={<EmptyState titulo="Sem amostras" descricao="As amostras registadas aparecem aqui." icone={<FlaskConical size={24} />} />} />
          )}
        </Card>
      )}

      {aba === "modelos" && (
        <Card flush>
          <CardHead
            titulo="Modelos geológicos"
            hint={`${modelos.dados?.total ?? 0} modelo(s)`}
            acoes={<button className="btn btn--primary btn--sm" onClick={() => navegar(`/modelos?projecto=${p.id}&novo=1`)}><Plus size={14} /> Novo modelo</button>}
          />
          {(modelos.dados?.items.length ?? 0) === 0 ? (
            <EmptyState titulo="Sem modelos" descricao="Crie um modelo para organizar domínios e versões." icone={<Cuboid size={24} />} />
          ) : (
            <div className="project-grid" style={{ padding: 16 }}>
              {modelos.dados?.items.map((modelo) => (
                <div className="card card--pad" key={modelo.id} style={{ cursor: "pointer" }} onClick={() => navegar(`/modelos/${modelo.id}`)}>
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="table__primary">{modelo.nome}</div>
                      <div className="table__secondary">{rotuloEstado(modelo.tipo)} · versão {modelo.versao_actual}</div>
                    </div>
                    <EstadoBadge estado={modelo.estado} />
                  </div>
                  {modelo.descricao && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{modelo.descricao}</p>}
                  <div className="divider" />
                  <span className="row muted" style={{ fontSize: 11.5, gap: 5 }}>Abrir modelo <ArrowUpRight size={13} /></span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {aba === "recursos" && (
        <Card flush>
          <CardHead
            titulo="Estimativas de recursos"
            hint={`Tonelagem total ${formatarToneladas(totalTonelagem)} · metal ${formatarMetal(totalMetal)}`}
            acoes={<button className="btn btn--primary btn--sm" onClick={() => navegar(`/recursos?projecto=${p.id}&novo=1`)}><Plus size={14} /> Nova estimativa</button>}
          />
          {recursos.erro ? (
            <CardBody><ErrorBox mensagem={recursos.erro} aoTentar={recursos.recarregar} /></CardBody>
          ) : (
            <DataTable colunas={colunasRecursos} linhas={recursos.dados?.items ?? []} chaveDe={(r) => r.id} vazio={<EmptyState titulo="Sem estimativas" descricao="Crie uma estimativa a partir do volume e do teor de corte." icone={<Gem size={24} />} />} />
          )}
        </Card>
      )}

      <div className="row muted" style={{ fontSize: 11.5 }}>
        <Compass size={13} /> {p.pais} · <Ruler size={13} /> {formatarArea(p.area_km2)} · <Layers size={13} /> {areas.dados?.length ?? 0} área(s)
      </div>

      <Modal
        aberto={modalProjecto}
        aoFechar={() => setModalProjecto(false)}
        titulo="Editar projecto"
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalProjecto(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarProjecto()} disabled={aGravar}>{aGravar ? "A gravar…" : "Guardar alterações"}</button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Código" required><input className="input" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Field>
            <Field label="Nome" required><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="Mineral"><input className="input" value={form.mineral} onChange={(e) => setForm({ ...form, mineral: e.target.value })} /></Field>
            <Field label="Concessão"><input className="input" value={form.concessao} onChange={(e) => setForm({ ...form, concessao: e.target.value })} /></Field>
            <Field label="Província"><input className="input" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></Field>
            <Field label="Município"><input className="input" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></Field>
            <Field label="Área (km²)"><input className="input" type="number" min="0" step="0.01" value={form.area_km2} onChange={(e) => setForm({ ...form, area_km2: e.target.value })} /></Field>
            <EstadoAutomatico tipo="projecto" valor={form.estado} actual={p.estado} aoMudar={(v) => setForm({ ...form, estado: v })} />
            <Field label="Data de início"><input className="input" type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></Field>
            <Field label="Data de fim"><input className="input" type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></Field>
            <Field label="Descrição" className="span-2"><textarea className="textarea" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalArea}
        aoFechar={() => setModalArea(false)}
        titulo="Nova área do projecto"
        descricao="Subdivisão operacional do projecto."
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalArea(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarArea()} disabled={aGravar}>{aGravar ? "A gravar…" : "Criar área"}</button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <Field label="Nome" required><input className="input" value={formArea.nome} onChange={(e) => setFormArea({ ...formArea, nome: e.target.value })} /></Field>
          <Field label="Área (km²)"><input className="input" type="number" min="0" step="0.01" value={formArea.area_km2} onChange={(e) => setFormArea({ ...formArea, area_km2: e.target.value })} /></Field>
          <Field label="Descrição"><textarea className="textarea" value={formArea.descricao} onChange={(e) => setFormArea({ ...formArea, descricao: e.target.value })} /></Field>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminarArea !== null}
        titulo="Eliminar área"
        mensagem={`Eliminar a área "${aEliminarArea?.nome}"? Esta acção remove a subdivisão do projecto.`}
        aoConfirmar={eliminarArea}
        aoCancelar={() => setAEliminarArea(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
