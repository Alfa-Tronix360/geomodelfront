import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowUpRight, CalendarDays, Compass, FlaskConical, Layers, Mountain,
  Pencil, Plus, Ruler, Trash2,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type {
  Amostra, FuroDetalhe, Intervalo, Litologia, Pagina, Projecto, Survey, Trajectoria,
} from "@/app/services/types";
import {
  formatarData, formatarMetros, formatarNumero, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, DetailRow, EmptyState,
  ErrorBox, EstadoBadge, Field, InfoBox, Loading, Modal, PageHeader, Tabs,
  type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";
import { Cena3D } from "@/app/components/Cena3D";

interface FormSurvey {
  profundidade: string;
  azimute: string;
  inclinacao: string;
  metodo: string;
}

interface FormIntervalo {
  de: string;
  ate: string;
  lithology_id: string;
  alteracao: string;
  descricao: string;
  recuperacao_pct: string;
  rqd_pct: string;
}

const SURVEY_VAZIO: FormSurvey = { profundidade: "", azimute: "", inclinacao: "", metodo: "" };
const INTERVALO_VAZIO: FormIntervalo = {
  de: "", ate: "", lithology_id: "", alteracao: "", descricao: "", recuperacao_pct: "", rqd_pct: "",
};

export default function DrillHoleDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const toast = useToast();
  const { pode } = useAuth();
  const [aba, setAba] = useState("resumo");
  const [modalSurvey, setModalSurvey] = useState(false);
  const [surveyEdicao, setSurveyEdicao] = useState<Survey | null>(null);
  const [formSurvey, setFormSurvey] = useState<FormSurvey>(SURVEY_VAZIO);
  const [modalIntervalo, setModalIntervalo] = useState(false);
  const [intervaloEdicao, setIntervaloEdicao] = useState<Intervalo | null>(null);
  const [formIntervalo, setFormIntervalo] = useState<FormIntervalo>(INTERVALO_VAZIO);
  const [aEliminarSurvey, setAEliminarSurvey] = useState<Survey | null>(null);
  const [aEliminarIntervalo, setAEliminarIntervalo] = useState<Intervalo | null>(null);
  const [aGravar, setAGravar] = useState(false);
  const [aApagar, setAApagar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [modalEdicao, setModalEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState({
    estado: "planeado", profundidade_final: "", data_inicio: "", data_fim: "", sonda: "", notas: "",
  });

  const furo = useFetch<FuroDetalhe>(() => api.get(`/drill-holes/${id}`), [id]);
  const surveys = useFetch<Survey[]>(() => api.get(`/drill-holes/${id}/surveys`), [id]);
  const intervalos = useFetch<Intervalo[]>(() => api.get(`/drill-holes/${id}/intervals`), [id]);
  const traj = useFetch<Trajectoria>(() => api.get(`/drill-holes/${id}/trajectory`), [id]);
  const amostras = useFetch<Pagina<Amostra>>(() => api.get(`/samples?drill_hole_id=${id}&limit=100`), [id]);
  const litologias = useFetch<Litologia[]>(() => api.get("/lithologies"), []);

  const f = furo.dados;
  const projecto = useFetch<Projecto>(
    () => (f ? api.get(`/projects/${f.project_id}`) : Promise.reject(new Error("Sem projecto"))),
    [f?.project_id],
  );

  const mapaLitologias = useMemo(() => {
    const mapa = new Map<string, Litologia>();
    for (const litologia of litologias.dados ?? []) mapa.set(litologia.id, litologia);
    return mapa;
  }, [litologias.dados]);

  const comprimento = traj.dados?.comprimento ?? f?.profundidade_final ?? 0;
  const amostrasItems = amostras.dados?.items ?? [];

  function abrirNovoSurvey() {
    setSurveyEdicao(null);
    setFormSurvey({ ...SURVEY_VAZIO, profundidade: comprimento ? String(comprimento) : "" });
    setErroForm("");
    setModalSurvey(true);
  }

  function abrirEdicaoSurvey(survey: Survey) {
    setSurveyEdicao(survey);
    setFormSurvey({
      profundidade: String(survey.profundidade),
      azimute: String(survey.azimute),
      inclinacao: String(survey.inclinacao),
      metodo: survey.metodo ?? "",
    });
    setErroForm("");
    setModalSurvey(true);
  }

  async function gravarSurvey() {
    setErroForm("");
    setAGravar(true);
    const corpo = {
      profundidade: Number(formSurvey.profundidade),
      azimute: Number(formSurvey.azimute),
      inclinacao: Number(formSurvey.inclinacao),
      metodo: formSurvey.metodo.trim() || null,
    };
    try {
      if (surveyEdicao) {
        await api.patch(`/drill-holes/${id}/surveys/${surveyEdicao.id}`, corpo);
        toast.sucesso("Survey actualizado.");
      } else {
        await api.post(`/drill-holes/${id}/surveys`, corpo);
        toast.sucesso("Survey registado.");
      }
      setModalSurvey(false);
      surveys.recarregar();
      traj.recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function eliminarSurvey() {
    if (!aEliminarSurvey) return;
    setAApagar(true);
    try {
      await api.delete(`/drill-holes/${id}/surveys/${aEliminarSurvey.id}`);
      toast.sucesso("Survey apagado.");
      setAEliminarSurvey(null);
      surveys.recarregar();
      traj.recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  function abrirNovoIntervalo() {
    setIntervaloEdicao(null);
    setFormIntervalo(INTERVALO_VAZIO);
    setErroForm("");
    setModalIntervalo(true);
  }

  function abrirEdicaoIntervalo(intervalo: Intervalo) {
    setIntervaloEdicao(intervalo);
    setFormIntervalo({
      de: String(intervalo.de),
      ate: String(intervalo.ate),
      lithology_id: intervalo.lithology_id ?? "",
      alteracao: intervalo.alteracao ?? "",
      descricao: intervalo.descricao ?? "",
      recuperacao_pct: intervalo.recuperacao_pct === null ? "" : String(intervalo.recuperacao_pct),
      rqd_pct: intervalo.rqd_pct === null ? "" : String(intervalo.rqd_pct),
    });
    setErroForm("");
    setModalIntervalo(true);
  }

  async function gravarIntervalo() {
    setErroForm("");
    setAGravar(true);
    const corpo = {
      de: Number(formIntervalo.de),
      ate: Number(formIntervalo.ate),
      lithology_id: formIntervalo.lithology_id || null,
      alteracao: formIntervalo.alteracao.trim() || null,
      descricao: formIntervalo.descricao.trim() || null,
      recuperacao_pct: formIntervalo.recuperacao_pct === "" ? null : Number(formIntervalo.recuperacao_pct),
      rqd_pct: formIntervalo.rqd_pct === "" ? null : Number(formIntervalo.rqd_pct),
    };
    try {
      if (intervaloEdicao) {
        await api.patch(`/drill-holes/${id}/intervals/${intervaloEdicao.id}`, corpo);
        toast.sucesso("Intervalo actualizado.");
      } else {
        await api.post(`/drill-holes/${id}/intervals`, corpo);
        toast.sucesso("Intervalo registado.");
      }
      setModalIntervalo(false);
      intervalos.recarregar();
      traj.recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function eliminarIntervalo() {
    if (!aEliminarIntervalo) return;
    setAApagar(true);
    try {
      await api.delete(`/drill-holes/${id}/intervals/${aEliminarIntervalo.id}`);
      toast.sucesso("Intervalo apagado.");
      setAEliminarIntervalo(null);
      intervalos.recarregar();
      traj.recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  function abrirEdicaoFuro() {
    if (!f) return;
    setFormEdicao({
      estado: f.estado,
      profundidade_final: f.profundidade_final === null ? "" : String(f.profundidade_final),
      data_inicio: f.data_inicio ?? "",
      data_fim: f.data_fim ?? "",
      sonda: f.sonda ?? "",
      notas: f.notas ?? "",
    });
    setErroForm("");
    setModalEdicao(true);
  }

  async function gravarFuro() {
    setErroForm("");
    setAGravar(true);
    try {
      await api.patch(`/drill-holes/${id}`, {
        estado: formEdicao.estado,
        profundidade_final: formEdicao.profundidade_final === "" ? null : Number(formEdicao.profundidade_final),
        data_inicio: formEdicao.data_inicio || null,
        data_fim: formEdicao.data_fim || null,
        sonda: formEdicao.sonda.trim() || null,
        notas: formEdicao.notas.trim() || null,
      });
      toast.sucesso("Furo actualizado.");
      setModalEdicao(false);
      furo.recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  const colunasSurveys: Coluna<Survey>[] = [
    { chave: "prof", cabecalho: "Profundidade", render: (s) => <span className="mono">{formatarMetros(s.profundidade)}</span> },
    { chave: "az", cabecalho: "Azimute", render: (s) => <span className="mono">{s.azimute}°</span> },
    { chave: "inc", cabecalho: "Inclinação", render: (s) => <span className="mono">{s.inclinacao}°</span> },
    { chave: "metodo", cabecalho: "Método", render: (s) => s.metodo ?? "—" },
    { chave: "criado", cabecalho: "Registado", render: (s) => formatarData(s.criado_em) },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (s) => (
        <div className="table__actions">
          {pode("drill_holes", "edit") && (
            <>
              <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicaoSurvey(s)}><Pencil size={13} /></button>
              <button className="btn btn--ghost btn--sm" aria-label="Apagar" onClick={() => setAEliminarSurvey(s)}><Trash2 size={13} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const colunasIntervalos: Coluna<Intervalo>[] = [
    {
      chave: "intervalo",
      cabecalho: "Intervalo",
      render: (i) => <span className="mono">{i.de}–{i.ate} m</span>,
    },
    {
      chave: "litologia",
      cabecalho: "Litologia",
      render: (i) => {
        const litologia = i.lithology_id ? mapaLitologias.get(i.lithology_id) : undefined;
        return litologia ? (
          <span className="row" style={{ gap: 6 }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, background: litologia.cor ?? "var(--primary)" }} />
            {litologia.codigo}
          </span>
        ) : (
          <span className="muted">—</span>
        );
      },
    },
    { chave: "alteracao", cabecalho: "Alteração", render: (i) => i.alteracao ?? "—" },
    {
      chave: "recuperacao",
      cabecalho: "Recuperação / RQD",
      render: (i) => (
        <span className="mono muted">
          {i.recuperacao_pct === null ? "—" : `${i.recuperacao_pct}%`} / {i.rqd_pct === null ? "—" : `${i.rqd_pct}%`}
        </span>
      ),
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (i) => (
        <div className="table__actions">
          {pode("drill_holes", "edit") && (
            <>
              <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicaoIntervalo(i)}><Pencil size={13} /></button>
              <button className="btn btn--ghost btn--sm" aria-label="Apagar" onClick={() => setAEliminarIntervalo(i)}><Trash2 size={13} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  const colunasAmostras: Coluna<Amostra>[] = [
    { chave: "codigo", cabecalho: "Amostra", render: (a) => <span className="table__primary">{a.codigo}</span> },
    { chave: "tipo", cabecalho: "Tipo", render: (a) => rotuloEstado(a.tipo) },
    { chave: "intervalo", cabecalho: "Intervalo", render: (a) => <span className="mono muted">{a.de ?? "—"}–{a.ate ?? "—"} m</span> },
    { chave: "peso", cabecalho: "Peso", alinhar: "right", render: (a) => (a.peso_kg === null ? "—" : `${formatarNumero(a.peso_kg, 2)} kg`) },
    { chave: "estado", cabecalho: "Estado", render: (a) => <EstadoBadge estado={a.estado} /> },
  ];

  if (furo.erro && !f) {
    return (
      <div className="page">
        <ErrorBox mensagem={furo.erro} aoTentar={furo.recarregar} />
        <Link className="btn btn--secondary" to="/sondagens" style={{ justifySelf: "start" }}>
          <ArrowLeft size={15} /> Voltar às sondagens
        </Link>
      </div>
    );
  }

  if (!f) return <Loading texto="A carregar furo…" />;

  return (
    <div className="page">
      <div className="row" style={{ fontSize: 12.5 }}>
        <Link to="/sondagens" className="row muted" style={{ gap: 5 }}><ArrowLeft size={14} /> Sondagens</Link>
        <span className="muted">/</span>
        <span className="mono muted">{f.codigo}</span>
      </div>

      <PageHeader
        eyebrow={projecto.dados ? `${projecto.dados.codigo} · ${projecto.dados.nome}` : "Sondagem"}
        titulo={f.nome ?? f.codigo}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <EstadoBadge estado={f.estado} />
            <span className="row muted" style={{ gap: 5 }}><Mountain size={13} /> {rotuloEstado(f.tipo)}</span>
            <span className="row muted" style={{ gap: 5 }}><Ruler size={13} /> {formatarMetros(f.profundidade_final)}</span>
            <span className="row muted" style={{ gap: 5 }}><CalendarDays size={13} /> {formatarData(f.data_inicio)} — {formatarData(f.data_fim)}</span>
          </span>
        }
        acoes={
          <>
            <button className="btn btn--secondary" onClick={() => navegar(`/amostras?projecto=${f.project_id}&novo=1`)}><FlaskConical size={15} /> Nova amostra</button>
            {pode("drill_holes", "edit") && <button className="btn btn--primary" onClick={abrirEdicaoFuro}><Pencil size={15} /> Editar furo</button>}
          </>
        }
      />

      <div className="grid grid--kpis">
        <InfoBox rotulo="Profundidade final">{formatarMetros(f.profundidade_final)}</InfoBox>
        <InfoBox rotulo="Profundidade prevista">{formatarMetros(f.profundidade_prevista)}</InfoBox>
        <InfoBox rotulo="Surveys">{formatarNumero(f.num_surveys)}</InfoBox>
        <InfoBox rotulo="Intervalos">{formatarNumero(f.num_intervalos)}</InfoBox>
        <InfoBox rotulo="Amostras">{formatarNumero(f.num_amostras)}</InfoBox>
        <InfoBox rotulo="Comprimento 3D">{formatarMetros(traj.dados?.comprimento)}</InfoBox>
      </div>

      <Tabs
        activo={aba}
        aoMudar={setAba}
        opcoes={[
          { id: "resumo", rotulo: "Resumo" },
          { id: "trajectoria", rotulo: "Trajectória", contagem: surveys.dados?.length },
          { id: "surveys", rotulo: "Surveys", contagem: surveys.dados?.length },
          { id: "intervalos", rotulo: "Intervalos", contagem: intervalos.dados?.length },
          { id: "amostras", rotulo: "Amostras", contagem: amostras.dados?.total },
        ]}
      />

      {aba === "resumo" && (
        <div className="grid grid--detail">
          <div className="stack">
            <Card>
              <CardHead titulo="Dados do furo" hint="Collar, orientação e execução" />
              <CardBody>
                <dl className="detail-list">
                  <DetailRow rotulo="Código">{f.codigo}</DetailRow>
                  <DetailRow rotulo="Projecto">{projecto.dados ? `${projecto.dados.codigo} · ${projecto.dados.nome}` : "—"}</DetailRow>
                  <DetailRow rotulo="Tipo">{rotuloEstado(f.tipo)}</DetailRow>
                  <DetailRow rotulo="Estado"><EstadoBadge estado={f.estado} /></DetailRow>
                  <DetailRow rotulo="Coordenadas">
                    {f.latitude !== null && f.longitude !== null
                      ? `${f.latitude.toFixed(5)}, ${f.longitude.toFixed(5)}`
                      : f.x !== null && f.y !== null
                        ? `X ${f.x} · Y ${f.y} · Z ${f.z ?? "—"}`
                        : "Não indicadas"}
                  </DetailRow>
                  <DetailRow rotulo="Azimute / inclinação">{f.azimute ?? "—"}° / {f.inclinacao ?? "—"}°</DetailRow>
                  <DetailRow rotulo="Profundidade prevista">{formatarMetros(f.profundidade_prevista)}</DetailRow>
                  <DetailRow rotulo="Profundidade final">{formatarMetros(f.profundidade_final)}</DetailRow>
                  <DetailRow rotulo="Sonda">{f.sonda ?? "—"}</DetailRow>
                  <DetailRow rotulo="Período">{formatarData(f.data_inicio)} — {formatarData(f.data_fim)}</DetailRow>
                  <DetailRow rotulo="Criado em">{formatarData(f.criado_em)}</DetailRow>
                </dl>
                {f.notas && (
                  <>
                    <div className="divider" />
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)" }}>{f.notas}</p>
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHead titulo="Coluna litológica" hint={`${intervalos.dados?.length ?? 0} intervalo(s) registados`} />
              <CardBody>
                <ColunaLitologica intervalos={intervalos.dados ?? []} mapa={mapaLitologias} comprimento={comprimento} />
              </CardBody>
            </Card>
          </div>

          <div className="stack">
            <Card>
              <CardHead titulo="Perfil do furo" hint="Projecção horizontal vs profundidade" />
              <CardBody>
                <PerfilFuro trajetoria={traj.dados} />
              </CardBody>
            </Card>
            <Card>
              <CardHead titulo="Progresso" hint="Estado dos dados associados" />
              <CardBody>
                <div className="stack" style={{ gap: 13 }}>
                  <Indicador rotulo="Surveys registados" valor={surveys.dados?.length ?? 0} total={Math.max(3, surveys.dados?.length ?? 0)} />
                  <Indicador rotulo="Intervalos descritos" valor={intervalos.dados?.length ?? 0} total={Math.max(5, intervalos.dados?.length ?? 0)} />
                  <Indicador rotulo="Amostras recolhidas" valor={amostras.dados?.total ?? 0} total={Math.max(8, amostras.dados?.total ?? 0)} />
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {aba === "trajectoria" && (
        <div className="stack">
        {f && (
          <Card>
            <CardHead titulo="Vista 3D" hint="Este furo em destaque, com os restantes furos do projecto como referência" />
            <CardBody>
              <Cena3D projectId={f.project_id} destaque={f.id} altura={440} />
            </CardBody>
          </Card>
        )}
        <div className="grid grid--detail">
          <Card flush>
            <CardHead titulo="Trajectória do furo" hint="Coordenadas calculadas a partir dos surveys" />
            <CardBody>
              <PerfilFuro trajetoria={traj.dados} altura={420} />
            </CardBody>
          </Card>
          <Card>
            <CardHead titulo="Pontos da trajectória" hint={`${traj.dados?.pontos.length ?? 0} ponto(s)`} />
            <CardBody>
              {traj.dados && traj.dados.pontos.length > 0 ? (
                <dl className="detail-list">
                  {traj.dados.pontos.map((ponto) => (
                    <DetailRow key={ponto.profundidade} rotulo={`${ponto.profundidade} m`}>
                      <span className="mono">X {ponto.x.toFixed(2)} · Y {ponto.y.toFixed(2)} · Z {ponto.z.toFixed(2)}</span>
                    </DetailRow>
                  ))}
                </dl>
              ) : (
                <EmptyState titulo="Sem trajectória" descricao="Registe surveys para calcular a trajectória 3D do furo." icone={<Compass size={24} />} />
              )}
            </CardBody>
          </Card>
        </div>
        </div>
      )}

      {aba === "surveys" && (
        <Card flush>
          <CardHead
            titulo="Surveys"
            hint="Medições de azimute e inclinação por profundidade"
            acoes={pode("drill_holes", "edit") && <button className="btn btn--primary btn--sm" onClick={abrirNovoSurvey}><Plus size={14} /> Novo survey</button>}
          />
          {surveys.erro ? (
            <CardBody><ErrorBox mensagem={surveys.erro} aoTentar={surveys.recarregar} /></CardBody>
          ) : (
            <DataTable
              colunas={colunasSurveys}
              linhas={surveys.dados ?? []}
              chaveDe={(s) => s.id}
              vazio={<EmptyState titulo="Sem surveys" descricao="Adicione a primeira medição de orientação do furo." icone={<Compass size={24} />} />}
            />
          )}
        </Card>
      )}

      {aba === "intervalos" && (
        <Card flush>
          <CardHead
            titulo="Intervalos geológicos"
            hint="Descrição litológica e recuperação por profundidade"
            acoes={pode("drill_holes", "edit") && <button className="btn btn--primary btn--sm" onClick={abrirNovoIntervalo}><Plus size={14} /> Novo intervalo</button>}
          />
          {intervalos.erro ? (
            <CardBody><ErrorBox mensagem={intervalos.erro} aoTentar={intervalos.recarregar} /></CardBody>
          ) : (
            <DataTable
              colunas={colunasIntervalos}
              linhas={intervalos.dados ?? []}
              chaveDe={(i) => i.id}
              vazio={<EmptyState titulo="Sem intervalos" descricao="Descreva os intervalos geológicos atravessados pelo furo." icone={<Layers size={24} />} />}
            />
          )}
        </Card>
      )}

      {aba === "amostras" && (
        <Card flush>
          <CardHead
            titulo="Amostras do furo"
            hint={`${amostras.dados?.total ?? 0} amostra(s)`}
            acoes={<button className="btn btn--secondary btn--sm" onClick={() => navegar(`/amostras?projecto=${f.project_id}`)}>Ver todas <ArrowUpRight size={14} /></button>}
          />
          {amostras.erro ? (
            <CardBody><ErrorBox mensagem={amostras.erro} aoTentar={amostras.recarregar} /></CardBody>
          ) : (
            <DataTable
              colunas={colunasAmostras}
              linhas={amostrasItems}
              chaveDe={(a) => a.id}
              vazio={<EmptyState titulo="Sem amostras" descricao="As amostras recolhidas neste furo aparecem aqui." icone={<FlaskConical size={24} />} />}
            />
          )}
        </Card>
      )}

      <Modal
        aberto={modalSurvey}
        aoFechar={() => setModalSurvey(false)}
        titulo={surveyEdicao ? "Editar survey" : "Novo survey"}
        descricao="A profundidade não pode exceder a profundidade final do furo."
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalSurvey(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarSurvey()} disabled={aGravar}>{aGravar ? "A gravar…" : "Guardar"}</button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Profundidade (m)" required><input className="input" type="number" min="0" step="0.1" value={formSurvey.profundidade} onChange={(e) => setFormSurvey({ ...formSurvey, profundidade: e.target.value })} /></Field>
            <Field label="Método"><input className="input" value={formSurvey.metodo} onChange={(e) => setFormSurvey({ ...formSurvey, metodo: e.target.value })} placeholder="Ex.: gyro" /></Field>
            <Field label="Azimute (°)" required><input className="input" type="number" min="0" max="360" step="0.1" value={formSurvey.azimute} onChange={(e) => setFormSurvey({ ...formSurvey, azimute: e.target.value })} /></Field>
            <Field label="Inclinação (°)" required><input className="input" type="number" min="-90" max="90" step="0.1" value={formSurvey.inclinacao} onChange={(e) => setFormSurvey({ ...formSurvey, inclinacao: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalIntervalo}
        aoFechar={() => setModalIntervalo(false)}
        titulo={intervaloEdicao ? "Editar intervalo" : "Novo intervalo geológico"}
        descricao="O fim tem de ser maior do que o início e não pode sobrepor-se a outro intervalo."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalIntervalo(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarIntervalo()} disabled={aGravar}>{aGravar ? "A gravar…" : "Guardar"}</button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="De (m)" required><input className="input" type="number" min="0" step="0.1" value={formIntervalo.de} onChange={(e) => setFormIntervalo({ ...formIntervalo, de: e.target.value })} /></Field>
            <Field label="Até (m)" required><input className="input" type="number" min="0" step="0.1" value={formIntervalo.ate} onChange={(e) => setFormIntervalo({ ...formIntervalo, ate: e.target.value })} /></Field>
            <Field label="Litologia">
              <select className="select" value={formIntervalo.lithology_id} onChange={(e) => setFormIntervalo({ ...formIntervalo, lithology_id: e.target.value })}>
                <option value="">Sem litologia</option>
                {litologias.dados?.map((litologia) => <option key={litologia.id} value={litologia.id}>{litologia.codigo} · {litologia.nome}</option>)}
              </select>
            </Field>
            <Field label="Alteração"><input className="input" value={formIntervalo.alteracao} onChange={(e) => setFormIntervalo({ ...formIntervalo, alteracao: e.target.value })} /></Field>
            <Field label="Recuperação (%)"><input className="input" type="number" min="0" max="100" step="0.1" value={formIntervalo.recuperacao_pct} onChange={(e) => setFormIntervalo({ ...formIntervalo, recuperacao_pct: e.target.value })} /></Field>
            <Field label="RQD (%)"><input className="input" type="number" min="0" max="100" step="0.1" value={formIntervalo.rqd_pct} onChange={(e) => setFormIntervalo({ ...formIntervalo, rqd_pct: e.target.value })} /></Field>
            <Field label="Descrição" className="span-2"><textarea className="textarea" value={formIntervalo.descricao} onChange={(e) => setFormIntervalo({ ...formIntervalo, descricao: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalEdicao}
        aoFechar={() => setModalEdicao(false)}
        titulo="Editar furo"
        descricao="Actualize o estado e os dados de execução."
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalEdicao(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarFuro()} disabled={aGravar}>{aGravar ? "A gravar…" : "Guardar"}</button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Estado">
              <select className="select" value={formEdicao.estado} onChange={(e) => setFormEdicao({ ...formEdicao, estado: e.target.value })}>
                <option value="planeado">Planeado</option>
                <option value="em_sondagem">Em sondagem</option>
                <option value="concluido">Concluído</option>
                <option value="abandonado">Abandonado</option>
              </select>
            </Field>
            <Field label="Profundidade final (m)"><input className="input" type="number" min="0" step="0.1" value={formEdicao.profundidade_final} onChange={(e) => setFormEdicao({ ...formEdicao, profundidade_final: e.target.value })} /></Field>
            <Field label="Data de início"><input className="input" type="date" value={formEdicao.data_inicio} onChange={(e) => setFormEdicao({ ...formEdicao, data_inicio: e.target.value })} /></Field>
            <Field label="Data de fim"><input className="input" type="date" value={formEdicao.data_fim} onChange={(e) => setFormEdicao({ ...formEdicao, data_fim: e.target.value })} /></Field>
            <Field label="Sonda" className="span-2"><input className="input" value={formEdicao.sonda} onChange={(e) => setFormEdicao({ ...formEdicao, sonda: e.target.value })} /></Field>
            <Field label="Notas" className="span-2"><textarea className="textarea" value={formEdicao.notas} onChange={(e) => setFormEdicao({ ...formEdicao, notas: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminarSurvey !== null}
        titulo="Apagar survey"
        mensagem="Esta acção remove definitivamente a medição de orientação seleccionada."
        aoConfirmar={eliminarSurvey}
        aoCancelar={() => setAEliminarSurvey(null)}
        ocupado={aApagar}
        rotuloConfirmar="Apagar"
      />
      <ConfirmDialog
        aberto={aEliminarIntervalo !== null}
        titulo="Apagar intervalo"
        mensagem="Esta acção remove definitivamente o intervalo geológico seleccionado."
        aoConfirmar={eliminarIntervalo}
        aoCancelar={() => setAEliminarIntervalo(null)}
        ocupado={aApagar}
        rotuloConfirmar="Apagar"
      />
    </div>
  );
}

function Indicador({ rotulo, valor, total }: { rotulo: string; valor: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{rotulo}</span>
        <span className="mono">{valor}</span>
      </div>
      <div className="progress" style={{ height: 7 }}><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ColunaLitologica({
  intervalos,
  mapa,
  comprimento,
}: {
  intervalos: Intervalo[];
  mapa: Map<string, Litologia>;
  comprimento: number;
}) {
  if (intervalos.length === 0) {
    return <p className="muted" style={{ fontSize: 12.5 }}>Sem intervalos descritos.</p>;
  }
  const base = Math.max(comprimento, ...intervalos.map((i) => i.ate), 1);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", height: 190 }}>
        <div style={{ display: "grid", alignContent: "space-between", fontSize: 10, color: "var(--muted)", width: 38, textAlign: "right" }}>
          <span>0 m</span>
          <span>{base.toFixed(0)} m</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
          {intervalos.map((intervalo) => {
            const litologia = intervalo.lithology_id ? mapa.get(intervalo.lithology_id) : undefined;
            const altura = Math.max(4, ((intervalo.ate - intervalo.de) / base) * 100);
            return (
              <div
                key={intervalo.id}
                title={`${intervalo.de}–${intervalo.ate} m${litologia ? ` · ${litologia.nome}` : ""}`}
                style={{
                  height: `${altura}%`,
                  background: litologia?.cor ?? "var(--surface-3)",
                  opacity: litologia ? 0.85 : 1,
                  borderBottom: "1px solid rgba(255,255,255,.25)",
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="row" style={{ gap: 7 }}>
        {Array.from(mapa.values()).slice(0, 8).map((litologia) => (
          <Badge key={litologia.id} tom="neutral" plain>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: litologia.cor ?? "var(--primary)" }} />
            {litologia.codigo}
          </Badge>
        ))}
        {mapa.size === 0 && <span className="muted" style={{ fontSize: 11.5 }}>Sem litologias na empresa.</span>}
      </div>
    </div>
  );
}

function PerfilFuro({ trajetoria, altura = 260 }: { trajetoria: Trajectoria | null; altura?: number }) {
  const largura = 360;
  const pontos = trajetoria?.pontos ?? [];
  if (pontos.length === 0) {
    return (
      <div className="trajectory" style={{ minHeight: altura, display: "grid", placeItems: "center" }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Sem trajectória calculada.</span>
      </div>
    );
  }
  const profundidades = pontos.map((p) => p.profundidade);
  const xs = pontos.map((p) => p.x);
  const maxProf = Math.max(...profundidades, 1);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const spanX = maxX - minX || 1;
  const margem = { topo: 16, fundo: 26, esq: 34, dir: 16 };
  const utilLargura = largura - margem.esq - margem.dir;
  const utilAltura = altura - margem.topo - margem.fundo;
  const px = (x: number) => margem.esq + ((x - minX) / spanX) * utilLargura;
  const py = (prof: number) => margem.topo + (prof / maxProf) * utilAltura;
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)} ${py(p.profundidade).toFixed(1)}`).join(" ");

  return (
    <div className="trajectory">
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Perfil do furo">
        <g stroke="var(--line)" strokeDasharray="3 5">
          {[0, 0.25, 0.5, 0.75, 1].map((fracao) => (
            <line key={fracao} x1={margem.esq} x2={largura - margem.dir} y1={margem.topo + fracao * utilAltura} y2={margem.topo + fracao * utilAltura} />
          ))}
        </g>
        <text x={margem.esq - 6} y={margem.topo + 4} textAnchor="end" fill="var(--muted)" style={{ font: "10px var(--font)" }}>0 m</text>
        <text x={margem.esq - 6} y={altura - margem.fundo + 4} textAnchor="end" fill="var(--muted)" style={{ font: "10px var(--font)" }}>{maxProf.toFixed(0)} m</text>
        <path d={linha} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pontos.map((ponto, indice) => (
          <circle key={indice} cx={px(ponto.x)} cy={py(ponto.profundidade)} r="3.2" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
            <title>{`${ponto.profundidade} m · X ${ponto.x.toFixed(2)} · Z ${ponto.z.toFixed(2)}`}</title>
          </circle>
        ))}
        <text x={largura - margem.dir} y={altura - 6} textAnchor="end" fill="var(--muted)" style={{ font: "10px var(--font)" }}>
          deslocamento horizontal
        </text>
      </svg>
    </div>
  );
}
