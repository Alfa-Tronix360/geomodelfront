import { useEffect, useState } from "react";
import {
  Activity, CheckCircle2, FlaskConical, Microscope, Pencil, Plus, ShieldCheck, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Amostra, Laboratorio, Pagina, Resultado } from "@/app/services/types";
import { formatarData, formatarNumero, rotuloEstado } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  EstadoBadge, Field, Kpi, Loading, Modal, PageHeader, Pagination, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormResultado {
  sample_id: string;
  laboratory_id: string;
  parametro: string;
  valor: string;
  unidade: string;
  metodo: string;
  limite_deteccao: string;
  data_resultado: string;
  estado: string;
}

const FORM_VAZIO: FormResultado = {
  sample_id: "", laboratory_id: "", parametro: "", valor: "", unidade: "ppm", metodo: "",
  limite_deteccao: "", data_resultado: "", estado: "preliminar",
};

const ESTADOS = [
  { valor: "preliminar", rotulo: "Preliminar" },
  { valor: "validado", rotulo: "Validado" },
  { valor: "rejeitado", rotulo: "Rejeitado" },
];

const PARAMETROS = ["Cu", "Au", "Fe", "Mn", "Zn", "Pb", "Ni", "Co", "Ag", "Pt", "P", "SiO2", "Al2O3"];

export default function AssaysPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const podeValidar = pode("assays", "validate");
  const [laboratorio, setLaboratorio] = useState("");
  const [amostra, setAmostra] = useState("");
  const [estado, setEstado] = useState("");
  const [parametro, setParametro] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Resultado | null>(null);
  const [form, setForm] = useState<FormResultado>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Resultado | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const [aValidar, setAValidar] = useState<string | null>(null);
  const limite = 14;

  const { dados: laboratorios } = useFetch<Pagina<Laboratorio>>(
    () => api.get("/laboratories?activo=true&limit=200"),
    [],
  );
  const { dados: amostras } = useFetch<Pagina<Amostra>>(
    () => api.get("/samples?limit=500"),
    [],
  );
  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Resultado>>(
    () => api.get(`/assays${qs({
      sample_id: amostra,
      laboratory_id: laboratorio,
      parametro,
      estado,
      skip: pagina * limite,
      limit: limite,
    })}`),
    [amostra, laboratorio, parametro, estado, pagina],
  );

  useEffect(() => {
    setPagina(0);
  }, [amostra, laboratorio, parametro, estado]);

  const items = dados?.items ?? [];
  const validados = items.filter((item) => item.estado === "validado").length;
  const preliminares = items.filter((item) => item.estado === "preliminar").length;
  const mapaLabs = new Map((laboratorios?.items ?? []).map((item) => [item.id, item]));
  const mapaAmostras = new Map((amostras?.items ?? []).map((item) => [item.id, item]));

  function abrirNovo() {
    setEditando(null);
    setForm({
      ...FORM_VAZIO,
      sample_id: amostra || amostras?.items[0]?.id || "",
      laboratory_id: laboratorio || laboratorios?.items[0]?.id || "",
    });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(resultado: Resultado) {
    setEditando(resultado);
    setForm({
      sample_id: resultado.sample_id,
      laboratory_id: resultado.laboratory_id,
      parametro: resultado.parametro,
      valor: String(resultado.valor),
      unidade: resultado.unidade,
      metodo: resultado.metodo ?? "",
      limite_deteccao: resultado.limite_deteccao === null ? "" : String(resultado.limite_deteccao),
      data_resultado: resultado.data_resultado ?? "",
      estado: resultado.estado,
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormResultado>(campo: K, valor: FormResultado[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const base = {
      parametro: form.parametro.trim(),
      valor: form.valor === "" ? 0 : Number(form.valor),
      unidade: form.unidade.trim(),
      metodo: form.metodo.trim() || null,
      limite_deteccao: form.limite_deteccao === "" ? null : Number(form.limite_deteccao),
      data_resultado: form.data_resultado || null,
    };
    try {
      if (editando) {
        const corpo: Record<string, unknown> = { ...base };
        if (form.estado !== editando.estado) corpo.estado = form.estado;
        await api.patch(`/assays/${editando.id}`, corpo);
        toast.sucesso("Resultado actualizado.");
      } else {
        await api.post("/assays", {
          ...base,
          sample_id: form.sample_id,
          laboratory_id: form.laboratory_id,
          estado: form.estado,
        });
        toast.sucesso("Resultado registado.");
      }
      setModal(false);
      recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function validar(resultado: Resultado) {
    setAValidar(resultado.id);
    try {
      await api.post(`/assays/${resultado.id}/validate`);
      toast.sucesso("Resultado validado.");
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAValidar(null);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setAApagar(true);
    try {
      await api.delete(`/assays/${aEliminar.id}`);
      toast.sucesso("Resultado eliminado.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Resultado>[] = [
    {
      chave: "amostra",
      cabecalho: "Amostra",
      render: (resultado) => {
        const item = mapaAmostras.get(resultado.sample_id);
        return (
          <div>
            <div className="table__primary">{item?.codigo ?? resultado.sample_id.slice(0, 8)}</div>
            <div className="table__secondary">{formatarData(resultado.data_resultado)}</div>
          </div>
        );
      },
    },
    {
      chave: "parametro",
      cabecalho: "Parâmetro",
      render: (resultado) => (
        <div>
          <div className="table__primary">{resultado.parametro}</div>
          <div className="table__secondary">{resultado.metodo ?? "método não indicado"}</div>
        </div>
      ),
    },
    {
      chave: "valor",
      cabecalho: "Resultado",
      alinhar: "right",
      render: (resultado) => (
        <div>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>{formatarNumero(resultado.valor, 4)}</span>
          <span className="muted" style={{ marginLeft: 4, fontSize: 11.5 }}>{resultado.unidade}</span>
          {resultado.limite_deteccao !== null && (
            <div className="table__secondary">LD {formatarNumero(resultado.limite_deteccao, 4)}</div>
          )}
        </div>
      ),
    },
    {
      chave: "laboratorio",
      cabecalho: "Laboratório",
      render: (resultado) => {
        const lab = mapaLabs.get(resultado.laboratory_id);
        return (
          <div>
            <div style={{ fontSize: 12.5 }}>{lab?.nome ?? "—"}</div>
            <div className="table__secondary mono">{lab?.codigo ?? resultado.laboratory_id.slice(0, 8)}</div>
          </div>
        );
      },
    },
    { chave: "estado", cabecalho: "Estado", render: (resultado) => <EstadoBadge estado={resultado.estado} /> },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (resultado) => (
        <div className="table__actions">
          {podeValidar && resultado.estado !== "validado" && (
            <button
              className="btn btn--ghost btn--sm"
              aria-label="Validar"
              title="Validar resultado"
              onClick={() => void validar(resultado)}
              disabled={aValidar === resultado.id}
            >
              <ShieldCheck size={14} />
            </button>
          )}
          {pode("assays", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(resultado)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("assays", "delete") && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar" onClick={() => setAEliminar(resultado)}>
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
        eyebrow="Laboratório"
        titulo="Resultados laboratoriais"
        sub="Registo, correcção e validação dos ensaios analíticos por amostra, laboratório e parâmetro."
        acoes={
          pode("assays", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo resultado</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Resultados" valor={dados?.total ?? 0} icone={<Activity size={18} />} rodape="Total na selecção" />
        <Kpi rotulo="Validados" valor={validados} icone={<CheckCircle2 size={18} />} variante="success" rodape="Prontos para modelação" />
        <Kpi rotulo="Preliminares" valor={preliminares} icone={<FlaskConical size={18} />} variante="accent" rodape="A aguardar validação" />
        <Kpi rotulo="Laboratórios activos" valor={laboratorios?.total ?? 0} icone={<Microscope size={18} />} variante="info" rodape="Disponíveis para ensaios" />
      </div>

      <Card flush>
        <CardHead
          titulo="Registo analítico"
          hint="Combine filtros de amostra, laboratório, parâmetro e estado"
          acoes={<Badge tom="teal">{dados?.total ?? 0} registos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <select className="select" style={{ flex: 1, minWidth: 210 }} value={amostra} onChange={(e) => setAmostra(e.target.value)}>
              <option value="">Todas as amostras</option>
              {amostras?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 190 }} value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)}>
              <option value="">Todos os laboratórios</option>
              {laboratorios?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
            </select>
            <input
              className="input"
              style={{ maxWidth: 150 }}
              placeholder="Parâmetro"
              value={parametro}
              onChange={(e) => setParametro(e.target.value)}
              list="lista-parametros"
              aria-label="Filtrar por parâmetro"
            />
            <datalist id="lista-parametros">
              {PARAMETROS.map((item) => <option key={item} value={item} />)}
            </datalist>
            <select className="select" style={{ maxWidth: 165 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos os estados</option>
              {ESTADOS.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar resultados…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum resultado encontrado"
            descricao="Ajuste os filtros ou registe o primeiro resultado laboratorial."
            icone={<Activity size={24} />}
            accao={pode("assays", "create") ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo resultado</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={items} chaveDe={(resultado) => resultado.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar resultado" : "Novo resultado laboratorial"}
        descricao="A combinação amostra, laboratório, parâmetro e método deve ser única."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Registar resultado"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Amostra" required className="span-2">
              <select className="select" value={form.sample_id} onChange={(e) => actualizar("sample_id", e.target.value)} disabled={Boolean(editando)}>
                <option value="">Seleccionar amostra…</option>
                {amostras?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo}</option>)}
              </select>
            </Field>
            <Field label="Laboratório" required className="span-2">
              <select className="select" value={form.laboratory_id} onChange={(e) => actualizar("laboratory_id", e.target.value)} disabled={Boolean(editando)}>
                <option value="">Seleccionar laboratório…</option>
                {laboratorios?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
              </select>
            </Field>
            <Field label="Parâmetro" required>
              <input className="input" value={form.parametro} onChange={(e) => actualizar("parametro", e.target.value)} list="parametros-form" placeholder="Ex.: Cu" />
              <datalist id="parametros-form">
                {PARAMETROS.map((item) => <option key={item} value={item} />)}
              </datalist>
            </Field>
            <Field label="Método" hint="Ex.: AAS, ICP-MS, FRX">
              <input className="input" value={form.metodo} onChange={(e) => actualizar("metodo", e.target.value)} placeholder="Método analítico" />
            </Field>
            <Field label="Valor" required>
              <input className="input" type="number" min="0" step="any" value={form.valor} onChange={(e) => actualizar("valor", e.target.value)} />
            </Field>
            <Field label="Unidade" required>
              <input className="input" value={form.unidade} onChange={(e) => actualizar("unidade", e.target.value)} placeholder="ppm, %, g/t…" />
            </Field>
            <Field label="Limite de detecção">
              <input className="input" type="number" min="0" step="any" value={form.limite_deteccao} onChange={(e) => actualizar("limite_deteccao", e.target.value)} />
            </Field>
            <Field label="Data do resultado">
              <input className="input" type="date" value={form.data_resultado} onChange={(e) => actualizar("data_resultado", e.target.value)} />
            </Field>
            <Field label="Estado" className="span-2" hint={podeValidar ? undefined : "A validação requer a permissão específica de validação."}>
              <select className="select" value={form.estado} onChange={(e) => actualizar("estado", e.target.value)}>
                {ESTADOS.map((item) => (
                  <option key={item.valor} value={item.valor} disabled={item.valor === "validado" && !podeValidar}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {form.parametro && form.valor !== "" && (
            <div className="alert alert--info">
              <FlaskConical size={16} />
              <span>
                {form.parametro} = <strong>{formatarNumero(Number(form.valor), 4)} {form.unidade}</strong> — estado {rotuloEstado(form.estado).toLowerCase()}.
              </span>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar resultado"
        mensagem={`Eliminar o resultado de ${aEliminar?.parametro ?? "parâmetro"} com o valor ${aEliminar ? formatarNumero(aEliminar.valor, 4) : ""} ${aEliminar?.unidade ?? ""}? Esta operação é definitiva.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
