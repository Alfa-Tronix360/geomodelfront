import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Calculator, Gem, Pencil, Plus, ShieldCheck, Trash2, TrendingUp,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Estimativa, Modelo, Pagina, Projecto } from "@/app/services/types";
import {
  corMineral, formatarMetal, formatarNumero, formatarToneladas, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  EstadoBadge, Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormEstimativa {
  project_id: string;
  model_id: string;
  nome: string;
  metodo: string;
  commodity: string;
  teor_corte: string;
  unidade_teor: string;
  densidade: string;
  volume_m3: string;
  estado: string;
}

const FORM_VAZIO: FormEstimativa = {
  project_id: "", model_id: "", nome: "", metodo: "idw", commodity: "", teor_corte: "",
  unidade_teor: "ppm", densidade: "", volume_m3: "", estado: "rascunho",
};

const METODOS = ["idw", "kriging", "vizinho_mais_proximo", "manual"];
const ESTADOS = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "validado", rotulo: "Validado" },
  { valor: "aprovado", rotulo: "Aprovado" },
  { valor: "rejeitado", rotulo: "Rejeitado" },
];
const UNIDADES = ["ppm", "g/t", "%", "ppb", "kg/t"];
const COMMODITIES = ["Cu", "Au", "Fe", "Mn", "Zn", "Pb", "Ni", "Co", "Ag", "Pt", "Diamante", "Fosfato"];

function calcularMetal(tonelagem: number | null, teor: number | null, unidade: string): number | null {
  if (tonelagem === null || teor === null) return null;
  const valor = unidade.trim().toLowerCase();
  if (valor === "%") return tonelagem * teor / 100;
  if (valor === "ppm" || valor === "g/t" || valor === "gt") return tonelagem * teor / 1_000_000;
  if (valor === "ppb") return tonelagem * teor / 1_000_000_000;
  return tonelagem * teor;
}

export default function ResourcesPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [pesquisa, setPesquisa] = useState("");
  const [projecto, setProjecto] = useState(params.get("projecto") ?? "");
  const [estado, setEstado] = useState("");
  const [commodity, setCommodity] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Estimativa | null>(null);
  const [form, setForm] = useState<FormEstimativa>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Estimativa | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const limite = 12;

  const { dados: projetos } = useFetch<Pagina<Projecto>>(() => api.get("/projects?limit=200"), []);
  const { dados: modelos } = useFetch<Pagina<Modelo>>(() => api.get("/models?limit=500"), []);
  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Estimativa>>(
    () => api.get(`/resources${qs({
      project_id: projecto,
      estado,
      commodity,
      skip: pagina * limite,
      limit: limite,
    })}`),
    [projecto, estado, commodity, pagina],
  );

  const items = dados?.items ?? [];
  const mapaProjectos = new Map((projetos?.items ?? []).map((item) => [item.id, item]));
  const termo = pesquisa.trim().toLowerCase();
  const filtrados = termo
    ? items.filter((item) => {
        const projectoItem = mapaProjectos.get(item.project_id);
        return (
          item.nome.toLowerCase().includes(termo)
          || item.commodity.toLowerCase().includes(termo)
          || (projectoItem?.nome ?? "").toLowerCase().includes(termo)
          || (projectoItem?.codigo ?? "").toLowerCase().includes(termo)
        );
      })
    : items;
  const modelosDoProjecto = (modelos?.items ?? []).filter((item) => !form.project_id || item.project_id === form.project_id);
  const totalTonelagem = items.reduce((soma, item) => soma + (item.tonelagem ?? 0), 0);
  const totalMetal = items.reduce((soma, item) => soma + (item.metal_contido ?? 0), 0);
  const validados = items.filter((item) => item.estado === "validado" || item.estado === "aprovado").length;

  const volume = form.volume_m3 === "" ? null : Number(form.volume_m3);
  const densidade = form.densidade === "" ? null : Number(form.densidade);
  const teor = form.teor_corte === "" ? null : Number(form.teor_corte);
  const tonelagemPrevista = volume !== null && densidade !== null ? volume * densidade : null;
  const metalPrevisto = calcularMetal(tonelagemPrevista, teor, form.unidade_teor);

  function abrirNovo() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, project_id: projecto || projetos?.items[0]?.id || "" });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(estimativa: Estimativa) {
    setEditando(estimativa);
    setForm({
      project_id: estimativa.project_id,
      model_id: estimativa.model_id ?? "",
      nome: estimativa.nome,
      metodo: estimativa.metodo,
      commodity: estimativa.commodity,
      teor_corte: estimativa.teor_corte === null ? "" : String(estimativa.teor_corte),
      unidade_teor: estimativa.unidade_teor,
      densidade: estimativa.densidade === null ? "" : String(estimativa.densidade),
      volume_m3: estimativa.volume_m3 === null ? "" : String(estimativa.volume_m3),
      estado: estimativa.estado,
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormEstimativa>(campo: K, valor: FormEstimativa[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const base = {
      model_id: form.model_id || null,
      nome: form.nome.trim(),
      metodo: form.metodo,
      commodity: form.commodity.trim(),
      teor_corte: form.teor_corte === "" ? null : Number(form.teor_corte),
      unidade_teor: form.unidade_teor.trim(),
      densidade: form.densidade === "" ? null : Number(form.densidade),
      volume_m3: form.volume_m3 === "" ? null : Number(form.volume_m3),
      estado: form.estado,
    };
    try {
      if (editando) {
        await api.patch(`/resources/${editando.id}`, base);
        toast.sucesso("Estimativa actualizada.");
      } else {
        await api.post("/resources", { ...base, project_id: form.project_id });
        toast.sucesso("Estimativa criada.");
      }
      setModal(false);
      recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function validar(estimativa: Estimativa) {
    try {
      await api.post(`/resources/${estimativa.id}/validate`);
      toast.sucesso("Estimativa validada.");
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setAApagar(true);
    try {
      await api.delete(`/resources/${aEliminar.id}`);
      toast.sucesso("Estimativa eliminada.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Estimativa>[] = [
    {
      chave: "estimativa",
      cabecalho: "Estimativa",
      render: (estimativa) => (
        <div>
          <div className="table__primary">{estimativa.nome}</div>
          <div className="table__secondary">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <i style={{ width: 8, height: 8, borderRadius: 3, background: corMineral(estimativa.commodity) }} />
              {estimativa.commodity} · {rotuloEstado(estimativa.metodo)}
            </span>
          </div>
        </div>
      ),
    },
    {
      chave: "projecto",
      cabecalho: "Projecto",
      render: (estimativa) => {
        const item = mapaProjectos.get(estimativa.project_id);
        return item ? (
          <Link to={`/projectos/${item.id}`} style={{ color: "var(--primary)", fontWeight: 600, fontSize: 12.5 }}>{item.codigo}</Link>
        ) : <span className="muted">—</span>;
      },
    },
    {
      chave: "volume",
      cabecalho: "Volume",
      alinhar: "right",
      render: (estimativa) => <span className="mono">{formatarNumero(estimativa.volume_m3, 0)} m³</span>,
    },
    {
      chave: "tonelagem",
      cabecalho: "Tonelagem",
      alinhar: "right",
      render: (estimativa) => <span style={{ fontWeight: 700 }}>{formatarToneladas(estimativa.tonelagem)}</span>,
    },
    {
      chave: "metal",
      cabecalho: "Metal contido",
      alinhar: "right",
      render: (estimativa) => (
        <div>
          <span className="mono" style={{ fontWeight: 600 }}>{formatarMetal(estimativa.metal_contido)}</span>
          <div className="table__secondary">{estimativa.teor_corte ?? "—"} {estimativa.unidade_teor}</div>
        </div>
      ),
    },
    { chave: "estado", cabecalho: "Estado", render: (estimativa) => <EstadoBadge estado={estimativa.estado} /> },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (estimativa) => (
        <div className="table__actions">
          {pode("resources", "validate") && estimativa.estado !== "validado" && estimativa.estado !== "aprovado" && (
            <button className="btn btn--ghost btn--sm" aria-label="Validar" title="Validar estimativa" onClick={() => void validar(estimativa)}>
              <ShieldCheck size={14} />
            </button>
          )}
          {pode("resources", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(estimativa)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("resources", "delete") && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={() => setAEliminar(estimativa)}>
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
        titulo="Estimativa de recursos"
        sub="Cálculo de tonelagem e metal contido a partir de volume, densidade e teor de corte."
        acoes={
          pode("resources", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Nova estimativa</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Estimativas" valor={dados?.total ?? 0} icone={<Gem size={18} />} rodape="Total na selecção" />
        <Kpi rotulo="Tonelagem" valor={formatarToneladas(totalTonelagem)} icone={<Calculator size={18} />} variante="accent" rodape="Soma da página" />
        <Kpi rotulo="Metal contido" valor={formatarMetal(totalMetal)} icone={<TrendingUp size={18} />} variante="info" rodape="Soma da página" />
        <Kpi rotulo="Validadas / aprovadas" valor={validados} icone={<ShieldCheck size={18} />} variante="success" rodape="Prontas para relatório" />
      </div>

      <Card flush>
        <CardHead
          titulo="Carteira de estimativas"
          hint="Filtre por projecto, estado ou commodity"
          acoes={<Badge tom="teal">{dados?.total ?? 0} estimativas</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar estimativa…" />
            </div>
            <select className="select" style={{ maxWidth: 240 }} value={projecto} onChange={(e) => { setProjecto(e.target.value); setPagina(0); }}>
              <option value="">Todos os projectos</option>
              {projetos?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
            </select>
            <input
              className="input"
              style={{ maxWidth: 150 }}
              placeholder="Commodity"
              value={commodity}
              onChange={(e) => { setCommodity(e.target.value); setPagina(0); }}
              list="commodities-filtro"
              aria-label="Filtrar por commodity"
            />
            <datalist id="commodities-filtro">
              {COMMODITIES.map((item) => <option key={item} value={item} />)}
            </datalist>
            <select className="select" style={{ maxWidth: 170 }} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar estimativas…" />
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState
            titulo={items.length === 0 ? "Nenhuma estimativa encontrada" : "Nenhum resultado"}
            descricao={
              items.length === 0
                ? "Crie uma estimativa para calcular tonelagem e metal contido a partir dos parâmetros geológicos."
                : "Ajuste a pesquisa para encontrar a estimativa pretendida."
            }
            icone={<Gem size={24} />}
            accao={items.length === 0 && pode("resources", "create") ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Nova estimativa</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={filtrados} chaveDe={(estimativa) => estimativa.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar estimativa" : "Nova estimativa de recursos"}
        descricao="A tonelagem e o metal contido são recalculados automaticamente pelo servidor."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Criar estimativa"}
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
            <Field label="Modelo geológico" className="span-2">
              <select className="select" value={form.model_id} onChange={(e) => actualizar("model_id", e.target.value)}>
                <option value="">Sem modelo associado</option>
                {modelosDoProjecto.map((item) => <option key={item.id} value={item.id}>{item.nome} (v{item.versao_actual})</option>)}
              </select>
            </Field>
            <Field label="Nome" required className="span-2">
              <input className="input" value={form.nome} onChange={(e) => actualizar("nome", e.target.value)} placeholder="Ex.: Estimativa inicial — sector A" />
            </Field>
            <Field label="Commodity" required>
              <input className="input" value={form.commodity} onChange={(e) => actualizar("commodity", e.target.value)} list="commodities-form" placeholder="Ex.: Cu" />
              <datalist id="commodities-form">
                {COMMODITIES.map((item) => <option key={item} value={item} />)}
              </datalist>
            </Field>
            <Field label="Método">
              <select className="select" value={form.metodo} onChange={(e) => actualizar("metodo", e.target.value)}>
                {METODOS.map((item) => <option key={item} value={item}>{rotuloEstado(item)}</option>)}
              </select>
            </Field>
            <Field label="Volume (m³)">
              <input className="input" type="number" min="0" step="any" value={form.volume_m3} onChange={(e) => actualizar("volume_m3", e.target.value)} />
            </Field>
            <Field label="Densidade (t/m³)">
              <input className="input" type="number" min="0" step="any" value={form.densidade} onChange={(e) => actualizar("densidade", e.target.value)} />
            </Field>
            <Field label="Teor de corte">
              <input className="input" type="number" min="0" step="any" value={form.teor_corte} onChange={(e) => actualizar("teor_corte", e.target.value)} />
            </Field>
            <Field label="Unidade do teor">
              <select className="select" value={form.unidade_teor} onChange={(e) => actualizar("unidade_teor", e.target.value)}>
                {UNIDADES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Estado" className="span-2" hint={pode("resources", "validate") ? undefined : "Validar exige permissão específica de validação."}>
              <select className="select" value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                {ESTADOS.map((item) => (
                  <option key={item.valor} value={item.valor} disabled={(item.valor === "validado" || item.valor === "aprovado") && !pode("resources", "validate")}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="import-summary">
            <div className="info-box">
              <span>Tonelagem prevista</span>
              <strong>{formatarToneladas(tonelagemPrevista)}</strong>
            </div>
            <div className="info-box">
              <span>Metal contido previsto</span>
              <strong>{formatarMetal(metalPrevisto)}</strong>
            </div>
            <div className="info-box">
              <span>Fórmula</span>
              <strong style={{ fontSize: 12.5 }}>volume × densidade</strong>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar estimativa"
        mensagem={`Eliminar a estimativa "${aEliminar?.nome}"? Esta operação é definitiva.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
