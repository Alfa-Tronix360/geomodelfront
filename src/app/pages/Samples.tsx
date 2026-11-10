import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FlaskConical, Mountain, Pencil, Plus, Scale, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Amostra, Furo, Pagina, Projecto } from "@/app/services/types";
import {
  formatarData, formatarNumero, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  EstadoBadge, Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput,
  type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormAmostra {
  project_id: string;
  drill_hole_id: string;
  codigo: string;
  tipo: string;
  de: string;
  ate: string;
  peso_kg: string;
  estado: string;
  data_recolha: string;
  recolhido_por: string;
  notas: string;
}

const FORM_VAZIO: FormAmostra = {
  project_id: "", drill_hole_id: "", codigo: "", tipo: "testemunho", de: "", ate: "",
  peso_kg: "", estado: "registada", data_recolha: "", recolhido_por: "", notas: "",
};

const TIPOS = ["testemunho", "rocha", "solo", "sedimento", "outro"];
const ESTADOS = [
  { valor: "registada", rotulo: "Registada" },
  { valor: "enviada", rotulo: "Enviada" },
  { valor: "recebida", rotulo: "Recebida" },
  { valor: "analisada", rotulo: "Analisada" },
  { valor: "rejeitada", rotulo: "Rejeitada" },
];

export default function SamplesPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [projecto, setProjecto] = useState(params.get("projecto") ?? "");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Amostra | null>(null);
  const [form, setForm] = useState<FormAmostra>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Amostra | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const limite = 16;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setTermo(pesquisa);
      setPagina(0);
    }, 320);
    return () => window.clearTimeout(temporizador);
  }, [pesquisa]);

  const { dados: projetos } = useFetch<Pagina<Projecto>>(() => api.get("/projects?limit=200"), []);
  const { dados: furos } = useFetch<Pagina<Furo>>(
    () => api.get(`/drill-holes${qs({ project_id: projecto || form.project_id, limit: 500 })}`),
    [projecto, form.project_id],
  );
  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Amostra>>(
    () => api.get(`/samples${qs({ project_id: projecto, estado, tipo, q: termo, skip: pagina * limite, limit: limite })}`),
    [projecto, estado, tipo, termo, pagina],
  );

  useEffect(() => {
    if (params.get("novo")) {
      abrirNovo();
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const items = dados?.items ?? [];
  const pesoTotal = items.reduce((soma, amostra) => soma + (amostra.peso_kg ?? 0), 0);
  const analisadas = items.filter((amostra) => amostra.estado === "analisada").length;
  const comFuro = items.filter((amostra) => amostra.drill_hole_id).length;

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, project_id: projecto || projetos?.items[0]?.id || "" });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(amostra: Amostra) {
    setEditando(amostra);
    setForm({
      project_id: amostra.project_id,
      drill_hole_id: amostra.drill_hole_id ?? "",
      codigo: amostra.codigo,
      tipo: amostra.tipo,
      de: amostra.de === null ? "" : String(amostra.de),
      ate: amostra.ate === null ? "" : String(amostra.ate),
      peso_kg: amostra.peso_kg === null ? "" : String(amostra.peso_kg),
      estado: amostra.estado,
      data_recolha: amostra.data_recolha ?? "",
      recolhido_por: amostra.recolhido_por ?? "",
      notas: amostra.notas ?? "",
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar(campo: keyof FormAmostra, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function numeroOuNulo(valor: string): number | null {
    return valor.trim() === "" ? null : Number(valor);
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const base = {
      drill_hole_id: form.drill_hole_id || null,
      codigo: form.codigo.trim(),
      tipo: form.tipo,
      de: numeroOuNulo(form.de),
      ate: numeroOuNulo(form.ate),
      peso_kg: numeroOuNulo(form.peso_kg),
      estado: form.estado,
      data_recolha: form.data_recolha || null,
      recolhido_por: form.recolhido_por.trim() || null,
      notas: form.notas.trim() || null,
    };
    try {
      if (editando) {
        await api.patch(`/samples/${editando.id}`, base);
        toast.sucesso("Amostra actualizada.");
      } else {
        await api.post("/samples", { ...base, project_id: form.project_id });
        toast.sucesso("Amostra registada.");
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
      await api.delete(`/samples/${aEliminar.id}`);
      toast.sucesso("Amostra eliminada.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Amostra>[] = [
    {
      chave: "codigo",
      cabecalho: "Amostra",
      render: (amostra) => (
        <div>
          <div className="table__primary">{amostra.codigo}</div>
          <div className="table__secondary">{formatarData(amostra.data_recolha)}</div>
        </div>
      ),
    },
    { chave: "tipo", cabecalho: "Tipo", render: (amostra) => rotuloEstado(amostra.tipo) },
    {
      chave: "intervalo",
      cabecalho: "Intervalo",
      render: (amostra) => <span className="mono muted">{amostra.de ?? "—"}–{amostra.ate ?? "—"} m</span>,
    },
    {
      chave: "peso",
      cabecalho: "Peso",
      alinhar: "right",
      render: (amostra) => (amostra.peso_kg === null ? "—" : `${formatarNumero(amostra.peso_kg, 2)} kg`),
    },
    { chave: "estado", cabecalho: "Estado", render: (amostra) => <EstadoBadge estado={amostra.estado} /> },
    {
      chave: "recolha",
      cabecalho: "Recolha",
      render: (amostra) => (
        <div>
          <div style={{ fontSize: 12.5 }}>{amostra.recolhido_por ?? "—"}</div>
          <div className="table__secondary">{amostra.drill_hole_id ? "Associada a furo" : "Sem furo"}</div>
        </div>
      ),
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (amostra) => (
        <div className="table__actions">
          {pode("samples", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(amostra)}><Pencil size={13} /></button>
          )}
          {pode("samples", "delete") && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={() => setAEliminar(amostra)}><Trash2 size={13} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Exploração"
        titulo="Amostras"
        sub="Recolha, rastreio e estado das amostras geológicas por projecto e furo."
        acoes={
          pode("samples", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Nova amostra</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Amostras listadas" valor={formatarNumero(dados?.total)} icone={<FlaskConical size={18} />} rodape="Total na selecção" />
        <Kpi rotulo="Peso na página" valor={`${formatarNumero(pesoTotal, 1)} kg`} icone={<Scale size={18} />} variante="accent" rodape="Soma das amostras visíveis" />
        <Kpi rotulo="Analisadas" valor={formatarNumero(analisadas)} icone={<FlaskConical size={18} />} variante="success" rodape="Estado analisada" />
        <Kpi rotulo="Com furo associado" valor={formatarNumero(comFuro)} icone={<Mountain size={18} />} variante="info" rodape="Rastreabilidade no terreno" />
      </div>

      <Card flush>
        <CardHead
          titulo="Registo de amostras"
          hint="Pesquise por código ou notas, filtre por projecto, tipo e estado"
          acoes={<Badge tom="teal">{formatarNumero(dados?.total ?? 0)} registos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar por código ou notas…" />
            </div>
            <select className="select" style={{ maxWidth: 240 }} value={projecto} onChange={(e) => { setProjecto(e.target.value); setPagina(0); }}>
              <option value="">Todos os projectos</option>
              {projetos?.items.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 170 }} value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(0); }}>
              <option value="">Todos os tipos</option>
              {TIPOS.map((valor) => <option key={valor} value={valor}>{rotuloEstado(valor)}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 170 }} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar amostras…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhuma amostra encontrada"
            descricao="Ajuste os filtros ou registe a primeira amostra."
            icone={<FlaskConical size={24} />}
            accao={pode("samples", "create") ? <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Nova amostra</button> : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={items} chaveDe={(amostra) => amostra.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar amostra" : "Nova amostra"}
        descricao="O intervalo deve estar dentro da profundidade final do furo, quando associado."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Registar amostra"}
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
            <Field label="Furo associado" className="span-2">
              <select className="select" value={form.drill_hole_id} onChange={(e) => actualizar("drill_hole_id", e.target.value)}>
                <option value="">Sem furo associado</option>
                {furos?.items.map((furo) => <option key={furo.id} value={furo.id}>{furo.codigo} · {furo.nome ?? rotuloEstado(furo.tipo)}</option>)}
              </select>
            </Field>
            <Field label="Código" required><input className="input" value={form.codigo} onChange={(e) => actualizar("codigo", e.target.value)} placeholder="Ex.: AM-001" /></Field>
            <Field label="Tipo">
              <select className="select" value={form.tipo} onChange={(e) => actualizar("tipo", e.target.value)}>
                {TIPOS.map((valor) => <option key={valor} value={valor}>{rotuloEstado(valor)}</option>)}
              </select>
            </Field>
            <Field label="De (m)"><input className="input" type="number" min="0" step="0.1" value={form.de} onChange={(e) => actualizar("de", e.target.value)} /></Field>
            <Field label="Até (m)"><input className="input" type="number" min="0" step="0.1" value={form.ate} onChange={(e) => actualizar("ate", e.target.value)} /></Field>
            <Field label="Peso (kg)"><input className="input" type="number" min="0" step="0.01" value={form.peso_kg} onChange={(e) => actualizar("peso_kg", e.target.value)} /></Field>
            <Field label="Estado">
              <select className="select" value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                {ESTADOS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
              </select>
            </Field>
            <Field label="Data de recolha"><input className="input" type="date" value={form.data_recolha} onChange={(e) => actualizar("data_recolha", e.target.value)} /></Field>
            <Field label="Recolhido por"><input className="input" value={form.recolhido_por} onChange={(e) => actualizar("recolhido_por", e.target.value)} /></Field>
            <Field label="Notas" className="span-2"><textarea className="textarea" value={form.notas} onChange={(e) => actualizar("notas", e.target.value)} /></Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar amostra"
        mensagem={`Eliminar a amostra "${aEliminar?.codigo}"? O registo fica marcado como eliminado.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
