import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight, Boxes, Cuboid, Layers, Pencil, Plus, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Modelo, Pagina, Projecto } from "@/app/services/types";
import { formatarData, rotuloEstado } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  EstadoBadge, Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormModelo {
  project_id: string;
  nome: string;
  descricao: string;
  tipo: string;
  estado: string;
}

const FORM_VAZIO: FormModelo = {
  project_id: "", nome: "", descricao: "", tipo: "combinado", estado: "rascunho",
};

const TIPOS = ["superficie", "solido", "bloco", "combinado"];
const ESTADOS = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "validado", rotulo: "Validado" },
  { valor: "arquivado", rotulo: "Arquivado" },
];

export default function ModelsPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [projecto, setProjecto] = useState(params.get("projecto") ?? "");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [form, setForm] = useState<FormModelo>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Modelo | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const limite = 12;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setTermo(pesquisa);
      setPagina(0);
    }, 320);
    return () => window.clearTimeout(temporizador);
  }, [pesquisa]);

  const { dados: projetos } = useFetch<Pagina<Projecto>>(() => api.get("/projects?limit=200"), []);
  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Modelo>>(
    () => api.get(`/models${qs({ project_id: projecto, estado, q: termo, skip: pagina * limite, limit: limite })}`),
    [projecto, estado, termo, pagina],
  );

  const items = dados?.items ?? [];
  const mapaProjectos = new Map((projetos?.items ?? []).map((item) => [item.id, item]));
  const validados = items.filter((item) => item.estado === "validado").length;
  const rascunhos = items.filter((item) => item.estado === "rascunho").length;
  const totalVersoes = items.reduce((soma, item) => soma + item.versao_actual, 0);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, project_id: projecto || projetos?.items[0]?.id || "" });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(modelo: Modelo) {
    setEditando(modelo);
    setForm({
      project_id: modelo.project_id,
      nome: modelo.nome,
      descricao: modelo.descricao ?? "",
      tipo: modelo.tipo,
      estado: modelo.estado,
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormModelo>(campo: K, valor: FormModelo[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const base = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      estado: form.estado,
    };
    try {
      if (editando) {
        await api.patch(`/models/${editando.id}`, base);
        toast.sucesso("Modelo actualizado.");
      } else {
        await api.post("/models", { ...base, project_id: form.project_id });
        toast.sucesso("Modelo criado.");
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
      await api.delete(`/models/${aEliminar.id}`);
      toast.sucesso("Modelo eliminado.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Modelo>[] = [
    {
      chave: "modelo",
      cabecalho: "Modelo geológico",
      render: (modelo) => (
        <div>
          <div className="table__primary">{modelo.nome}</div>
          <div className="table__secondary">
            {mapaProjectos.get(modelo.project_id)?.codigo ?? "Projecto"} · {rotuloEstado(modelo.tipo)}
          </div>
        </div>
      ),
    },
    {
      chave: "projecto",
      cabecalho: "Projecto",
      render: (modelo) => {
        const projectoActual = mapaProjectos.get(modelo.project_id);
        return projectoActual ? (
          <Link to={`/projectos/${projectoActual.id}`} style={{ color: "var(--primary)", fontWeight: 600, fontSize: 12.5 }}>
            {projectoActual.nome}
          </Link>
        ) : <span className="muted">—</span>;
      },
    },
    {
      chave: "versao",
      cabecalho: "Versão",
      alinhar: "center",
      render: (modelo) => <Badge tom="teal" plain>v{modelo.versao_actual}</Badge>,
    },
    { chave: "estado", cabecalho: "Estado", render: (modelo) => <EstadoBadge estado={modelo.estado} /> },
    {
      chave: "actualizado",
      cabecalho: "Actualizado",
      render: (modelo) => <span className="muted" style={{ fontSize: 12 }}>{formatarData(modelo.actualizado_em)}</span>,
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (modelo) => (
        <div className="table__actions">
          <Link className="btn btn--ghost btn--sm" to={`/modelos/${modelo.id}`} aria-label="Abrir modelo">
            <ArrowUpRight size={14} />
          </Link>
          {pode("models", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(modelo)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("models", "delete") && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={() => setAEliminar(modelo)}>
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
        eyebrow="Modelação e recursos"
        titulo="Modelos 3D"
        sub="Modelos geológicos por projecto, com domínios, versões de ficheiro e validação técnica."
        acoes={
          pode("models", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo modelo</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Modelos" valor={dados?.total ?? 0} icone={<Cuboid size={18} />} rodape="Total na selecção" />
        <Kpi rotulo="Validados" valor={validados} icone={<Layers size={18} />} variante="success" rodape="Aprovados tecnicamente" />
        <Kpi rotulo="Rascunhos" valor={rascunhos} icone={<Boxes size={18} />} variante="accent" rodape="Em construção" />
        <Kpi rotulo="Versões acumuladas" valor={totalVersoes} icone={<Layers size={18} />} variante="info" rodape="Na página actual" />
      </div>

      <Card flush>
        <CardHead
          titulo="Catálogo de modelos"
          hint="Filtre por projecto, estado ou nome do modelo"
          acoes={<Badge tom="teal">{dados?.total ?? 0} modelos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar modelo…" />
            </div>
            <select className="select" style={{ maxWidth: 250 }} value={projecto} onChange={(e) => { setProjecto(e.target.value); setPagina(0); }}>
              <option value="">Todos os projectos</option>
              {projetos?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 170 }} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar modelos…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum modelo encontrado"
            descricao="Crie um modelo geológico para organizar domínios, versões e estimativas de recursos."
            icone={<Cuboid size={24} />}
            accao={pode("models", "create") ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo modelo</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={items} chaveDe={(modelo) => modelo.id} aoClicar={(modelo) => navegar(`/modelos/${modelo.id}`)} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar modelo" : "Novo modelo geológico"}
        descricao="O nome do modelo é único dentro do projecto seleccionado."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Criar modelo"}
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
                {projetos?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
              </select>
            </Field>
            <Field label="Nome" required className="span-2">
              <input className="input" value={form.nome} onChange={(e) => actualizar("nome", e.target.value)} placeholder="Ex.: Modelo geológico do sector norte" />
            </Field>
            <Field label="Tipo">
              <select className="select" value={form.tipo} onChange={(e) => actualizar("tipo", e.target.value)}>
                {TIPOS.map((item) => <option key={item} value={item}>{rotuloEstado(item)}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className="select" value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                {ESTADOS.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
              </select>
            </Field>
            <Field label="Descrição" className="span-2">
              <textarea className="textarea" value={form.descricao} onChange={(e) => actualizar("descricao", e.target.value)} placeholder="Objectivo, método e âmbito do modelo…" />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar modelo"
        mensagem={`Eliminar o modelo "${aEliminar?.nome}"? Domínios e versões deixam de estar disponíveis na listagem.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
