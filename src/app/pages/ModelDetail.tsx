import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, Cuboid, FileText, Layers, Pencil, Plus,
  ShieldCheck, Trash2,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Dominio, Litologia, Modelo, Pagina, Projecto, Versao } from "@/app/services/types";
import {
  formatarData, formatarDataHora, rotuloEstado,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, DetailRow, EmptyState,
  ErrorBox, EstadoBadge, Field, InfoBox, Kpi, Loading, Modal, PageHeader, Tabs, type Coluna,
} from "@/app/components/ui";
import { SeletorCor } from "@/app/components/campos";
import { useToast } from "@/app/components/Toast";

interface FormDominio {
  codigo: string;
  nome: string;
  descricao: string;
  cor: string;
  lithology_id: string;
}

interface FormVersao {
  numero_versao: string;
  nome: string;
  descricao: string;
  estado: string;
  ficheiro_chave: string;
  ficheiro_url: string;
  formato: string;
}

interface FormModelo {
  nome: string;
  descricao: string;
  tipo: string;
  estado: string;
}

const DOMINIO_VAZIO: FormDominio = { codigo: "", nome: "", descricao: "", cor: "#0f766e", lithology_id: "" };
const VERSAO_VAZIA: FormVersao = {
  numero_versao: "", nome: "", descricao: "", estado: "rascunho", ficheiro_chave: "",
  ficheiro_url: "", formato: "",
};

const TIPOS_MODELO = ["superficie", "solido", "bloco", "combinado"];
const ESTADOS_MODELO = ["rascunho", "validado", "arquivado"];
const FORMATOS = ["obj", "stl", "las", "geojson", "dxf", "shp", "outro"];

export default function ModelDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const toast = useToast();
  const { pode } = useAuth();
  const [aba, setAba] = useState("dominios");
  const [modalModelo, setModalModelo] = useState(false);
  const [modalDominio, setModalDominio] = useState(false);
  const [modalVersao, setModalVersao] = useState(false);
  const [editandoDominio, setEditandoDominio] = useState<Dominio | null>(null);
  const [formModelo, setFormModelo] = useState<FormModelo>({ nome: "", descricao: "", tipo: "combinado", estado: "rascunho" });
  const [formDominio, setFormDominio] = useState<FormDominio>(DOMINIO_VAZIO);
  const [formVersao, setFormVersao] = useState<FormVersao>(VERSAO_VAZIA);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminarDominio, setAEliminarDominio] = useState<Dominio | null>(null);
  const [aEliminarVersao, setAEliminarVersao] = useState<Versao | null>(null);
  const [aApagar, setAApagar] = useState(false);

  const modelo = useFetch<Modelo>(() => api.get(`/models/${id}`), [id]);
  const dominios = useFetch<Dominio[]>(() => api.get(`/models/${id}/domains`), [id]);
  const versoes = useFetch<Versao[]>(() => api.get(`/models/${id}/versions`), [id]);
  const litologias = useFetch<Litologia[]>(() => api.get("/lithologies"), []);
  const projetos = useFetch<Pagina<Projecto>>(() => api.get("/projects?limit=200"), []);

  const m = modelo.dados;
  const listaDominios = dominios.dados ?? [];
  const listaVersoes = versoes.dados ?? [];
  const projecto = (projetos.dados?.items ?? []).find((item) => item.id === m?.project_id);
  const mapaLitologias = new Map((litologias.dados ?? []).map((item) => [item.id, item]));

  function recarregarTudo() {
    modelo.recarregar();
    dominios.recarregar();
    versoes.recarregar();
  }

  function abrirEdicaoModelo() {
    if (!m) return;
    setFormModelo({ nome: m.nome, descricao: m.descricao ?? "", tipo: m.tipo, estado: m.estado });
    setErroForm("");
    setModalModelo(true);
  }

  function abrirNovoDominio() {
    setEditandoDominio(null);
    setFormDominio(DOMINIO_VAZIO);
    setErroForm("");
    setModalDominio(true);
  }

  function abrirEdicaoDominio(dominio: Dominio) {
    setEditandoDominio(dominio);
    setFormDominio({
      codigo: dominio.codigo,
      nome: dominio.nome,
      descricao: dominio.descricao ?? "",
      cor: dominio.cor ?? "#0f766e",
      lithology_id: dominio.lithology_id ?? "",
    });
    setErroForm("");
    setModalDominio(true);
  }

  function abrirNovaVersao() {
    setFormVersao({ ...VERSAO_VAZIA, numero_versao: String((m?.versao_actual ?? 0) + 1) });
    setErroForm("");
    setModalVersao(true);
  }

  async function gravarModelo() {
    setAGravar(true);
    setErroForm("");
    try {
      await api.patch(`/models/${id}`, {
        nome: formModelo.nome.trim(),
        descricao: formModelo.descricao.trim() || null,
        tipo: formModelo.tipo,
        estado: formModelo.estado,
      });
      toast.sucesso("Modelo actualizado.");
      setModalModelo(false);
      recarregarTudo();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function gravarDominio() {
    setAGravar(true);
    setErroForm("");
    const corpo = {
      codigo: formDominio.codigo.trim(),
      nome: formDominio.nome.trim(),
      descricao: formDominio.descricao.trim() || null,
      cor: formDominio.cor.trim() || null,
      lithology_id: formDominio.lithology_id || null,
    };
    try {
      if (editandoDominio) {
        await api.patch(`/models/${id}/domains/${editandoDominio.id}`, corpo);
        toast.sucesso("Domínio actualizado.");
      } else {
        await api.post(`/models/${id}/domains`, corpo);
        toast.sucesso("Domínio criado.");
      }
      setModalDominio(false);
      dominios.recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function gravarVersao() {
    setAGravar(true);
    setErroForm("");
    try {
      await api.post(`/models/${id}/versions`, {
        numero_versao: formVersao.numero_versao === "" ? null : Number(formVersao.numero_versao),
        nome: formVersao.nome.trim() || null,
        descricao: formVersao.descricao.trim() || null,
        estado: formVersao.estado,
        ficheiro_chave: formVersao.ficheiro_chave.trim() || null,
        ficheiro_url: formVersao.ficheiro_url.trim() || null,
        formato: formVersao.formato || null,
      });
      toast.sucesso("Versão criada.");
      setModalVersao(false);
      recarregarTudo();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function validarVersao(versao: Versao) {
    try {
      await api.post(`/models/${id}/versions/${versao.id}/validate`);
      toast.sucesso(`Versão ${versao.numero_versao} validada.`);
      recarregarTudo();
    } catch (e) {
      toast.erro(mensagemErro(e));
    }
  }

  async function eliminarDominio() {
    if (!aEliminarDominio) return;
    setAApagar(true);
    try {
      await api.delete(`/models/${id}/domains/${aEliminarDominio.id}`);
      toast.sucesso("Domínio eliminado.");
      setAEliminarDominio(null);
      dominios.recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  async function eliminarVersao() {
    if (!aEliminarVersao) return;
    setAApagar(true);
    try {
      await api.delete(`/models/${id}/versions/${aEliminarVersao.id}`);
      toast.sucesso("Versão eliminada.");
      setAEliminarVersao(null);
      recarregarTudo();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunasDominios: Coluna<Dominio>[] = [
    {
      chave: "dominio",
      cabecalho: "Domínio",
      render: (dominio) => (
        <div className="row" style={{ gap: 9 }}>
          <span style={{
            width: 12, height: 12, borderRadius: 4, flex: "none",
            background: dominio.cor ?? "var(--surface-3)",
            border: "1px solid var(--line-strong)",
          }} />
          <div>
            <div className="table__primary">{dominio.nome}</div>
            <div className="table__secondary mono">{dominio.codigo}</div>
          </div>
        </div>
      ),
    },
    {
      chave: "litologia",
      cabecalho: "Litologia",
      render: (dominio) => dominio.lithology_id
        ? <Badge tom="teal" plain>{mapaLitologias.get(dominio.lithology_id)?.nome ?? "Associada"}</Badge>
        : <span className="muted">—</span>,
    },
    {
      chave: "descricao",
      cabecalho: "Descrição",
      render: (dominio) => <span className="muted" style={{ fontSize: 12 }}>{dominio.descricao ?? "—"}</span>,
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (dominio) => (
        <div className="table__actions">
          {pode("models", "edit") && (
            <>
              <button className="btn btn--ghost btn--sm" aria-label="Editar domínio" onClick={() => abrirEdicaoDominio(dominio)}>
                <Pencil size={13} />
              </button>
              <button className="btn btn--ghost btn--sm" aria-label="Eliminar domínio" onClick={() => setAEliminarDominio(dominio)}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const colunasVersoes: Coluna<Versao>[] = [
    {
      chave: "versao",
      cabecalho: "Versão",
      render: (versao) => (
        <div>
          <div className="table__primary">v{versao.numero_versao}</div>
          <div className="table__secondary">{versao.nome ?? "Sem designação"}</div>
        </div>
      ),
    },
    { chave: "estado", cabecalho: "Estado", render: (versao) => <EstadoBadge estado={versao.estado} /> },
    {
      chave: "formato",
      cabecalho: "Formato",
      render: (versao) => versao.formato ? <Badge tom="neutral" plain>{versao.formato.toUpperCase()}</Badge> : <span className="muted">—</span>,
    },
    {
      chave: "ficheiro",
      cabecalho: "Ficheiro",
      render: (versao) => versao.ficheiro_url ? (
        <a href={versao.ficheiro_url} target="_blank" rel="noreferrer" className="row" style={{ gap: 5, color: "var(--primary)", fontSize: 12.5 }}>
          <FileText size={13} /> Abrir <ArrowUpRight size={12} />
        </a>
      ) : (
        <span className="muted" style={{ fontSize: 12 }}>{versao.ficheiro_chave ?? "Sem ficheiro"}</span>
      ),
    },
    {
      chave: "criado",
      cabecalho: "Criado",
      render: (versao) => <span className="muted" style={{ fontSize: 12 }}>{formatarData(versao.criado_em)}</span>,
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (versao) => (
        <div className="table__actions">
          {pode("models", "validate") && versao.estado !== "validado" && (
            <button className="btn btn--ghost btn--sm" aria-label="Validar versão" title="Validar versão" onClick={() => void validarVersao(versao)}>
              <ShieldCheck size={14} />
            </button>
          )}
          {pode("models", "delete") && versao.estado !== "validado" && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar versão" onClick={() => setAEliminarVersao(versao)}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (modelo.carregando && !m) return <Loading texto="A carregar modelo…" />;
  if (modelo.erro || !m) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Modelação"
          titulo="Modelo não encontrado"
          acoes={<button className="btn btn--secondary" onClick={() => navegar("/modelos")}><ArrowLeft size={15} /> Voltar</button>}
        />
        <ErrorBox mensagem={modelo.erro ?? "O modelo indicado não existe ou foi eliminado."} aoTentar={modelo.recarregar} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link to="/modelos" className="btn btn--ghost btn--sm"><ArrowLeft size={15} /> Modelos</Link>
        <div className="row" style={{ gap: 7 }}>
          {projecto && (
            <Link to={`/projectos/${projecto.id}`} className="btn btn--secondary btn--sm">
              <ArrowUpRight size={14} /> {projecto.codigo}
            </Link>
          )}
          {pode("models", "edit") && (
            <button className="btn btn--secondary btn--sm" onClick={abrirEdicaoModelo}><Pencil size={14} /> Editar modelo</button>
          )}
        </div>
      </div>

      <PageHeader
        eyebrow={projecto ? `${projecto.codigo} · ${projecto.nome}` : "Modelação geológica"}
        titulo={m.nome}
        sub={m.descricao ?? "Modelo geológico com domínios, versões de ficheiro e validação técnica."}
        acoes={<EstadoBadge estado={m.estado} />}
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Versão actual" valor={`v${m.versao_actual}`} icone={<Cuboid size={18} />} rodape="Última versão registada" />
        <Kpi rotulo="Domínios" valor={listaDominios.length} icone={<Layers size={18} />} variante="accent" rodape="Unidades geológicas definidas" />
        <Kpi rotulo="Versões" valor={listaVersoes.length} icone={<FileText size={18} />} variante="info" rodape="Histórico de ficheiros" />
        <Kpi rotulo="Validadas" valor={listaVersoes.filter((item) => item.estado === "validado").length} icone={<CheckCircle2 size={18} />} variante="success" rodape="Versões aprovadas" />
      </div>

      <div className="grid grid--detail">
        <div className="stack">
          <Card flush>
            <CardHead
              titulo="Estrutura do modelo"
              hint="Domínios geológicos e versões de ficheiro associados"
              acoes={
                aba === "dominios"
                  ? pode("models", "edit") && <button className="btn btn--primary btn--sm" onClick={abrirNovoDominio}><Plus size={14} /> Domínio</button>
                  : pode("models", "edit") && <button className="btn btn--primary btn--sm" onClick={abrirNovaVersao}><Plus size={14} /> Versão</button>
              }
            />
            <div style={{ padding: "0 16px" }}>
              <Tabs
                opcoes={[
                  { id: "dominios", rotulo: "Domínios", contagem: listaDominios.length },
                  { id: "versoes", rotulo: "Versões", contagem: listaVersoes.length },
                ]}
                activo={aba}
                aoMudar={setAba}
              />
            </div>
            {aba === "dominios" ? (
              listaDominios.length === 0 ? (
                <EmptyState titulo="Sem domínios" descricao="Crie domínios para representar as unidades geológicas do modelo." icone={<Layers size={24} />} />
              ) : (
                <DataTable colunas={colunasDominios} linhas={listaDominios} chaveDe={(dominio) => dominio.id} />
              )
            ) : listaVersoes.length === 0 ? (
              <EmptyState titulo="Sem versões" descricao="Registe a primeira versão do modelo com o respectivo ficheiro e formato." icone={<FileText size={24} />} />
            ) : (
              <DataTable colunas={colunasVersoes} linhas={listaVersoes} chaveDe={(versao) => versao.id} />
            )}
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHead titulo="Ficha do modelo" />
            <CardBody>
              <dl className="detail-list">
                <DetailRow rotulo="Projecto">{projecto ? <Link to={`/projectos/${projecto.id}`} style={{ color: "var(--primary)" }}>{projecto.nome}</Link> : "—"}</DetailRow>
                <DetailRow rotulo="Tipo">{rotuloEstado(m.tipo)}</DetailRow>
                <DetailRow rotulo="Estado"><EstadoBadge estado={m.estado} /></DetailRow>
                <DetailRow rotulo="Versão actual"><Badge tom="teal" plain>v{m.versao_actual}</Badge></DetailRow>
                <DetailRow rotulo="Criado em">{formatarDataHora(m.criado_em)}</DetailRow>
                <DetailRow rotulo="Actualizado">{formatarDataHora(m.actualizado_em)}</DetailRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHead titulo="Indicadores" />
            <CardBody>
              <div className="info-grid">
                <InfoBox rotulo="Domínios">{listaDominios.length}</InfoBox>
                <InfoBox rotulo="Versões">{listaVersoes.length}</InfoBox>
                <InfoBox rotulo="Com ficheiro">{listaVersoes.filter((item) => item.ficheiro_url || item.ficheiro_chave).length}</InfoBox>
                <InfoBox rotulo="Validadas">{listaVersoes.filter((item) => item.estado === "validado").length}</InfoBox>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        aberto={modalModelo}
        aoFechar={() => setModalModelo(false)}
        titulo="Editar modelo geológico"
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalModelo(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarModelo()} disabled={aGravar}>
              {aGravar ? "A gravar…" : "Guardar alterações"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Nome" required className="span-2">
              <input className="input" value={formModelo.nome} onChange={(e) => setFormModelo({ ...formModelo, nome: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <select className="select" value={formModelo.tipo} onChange={(e) => setFormModelo({ ...formModelo, tipo: e.target.value })}>
                {TIPOS_MODELO.map((item) => <option key={item} value={item}>{rotuloEstado(item)}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className="select" value={formModelo.estado} onChange={(e) => setFormModelo({ ...formModelo, estado: e.target.value })}>
                {ESTADOS_MODELO.map((item) => <option key={item} value={item}>{rotuloEstado(item)}</option>)}
              </select>
            </Field>
            <Field label="Descrição" className="span-2">
              <textarea className="textarea" value={formModelo.descricao} onChange={(e) => setFormModelo({ ...formModelo, descricao: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalDominio}
        aoFechar={() => setModalDominio(false)}
        titulo={editandoDominio ? "Editar domínio" : "Novo domínio geológico"}
        descricao="O código do domínio é único dentro do modelo."
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalDominio(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarDominio()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editandoDominio ? "Guardar alterações" : "Criar domínio"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Código" required>
              <input className="input" value={formDominio.codigo} onChange={(e) => setFormDominio({ ...formDominio, codigo: e.target.value })} placeholder="Ex.: D1" />
            </Field>
            <Field label="Nome" required>
              <input className="input" value={formDominio.nome} onChange={(e) => setFormDominio({ ...formDominio, nome: e.target.value })} />
            </Field>
            <Field label="Litologia">
              <select className="select" value={formDominio.lithology_id} onChange={(e) => {
                // ao escolher a litologia, o domínio herda a cor dela (pode ser trocada a seguir)
                const lito = (litologias.dados ?? []).find((item) => item.id === e.target.value);
                setFormDominio({ ...formDominio, lithology_id: e.target.value, cor: lito?.cor || formDominio.cor });
              }}>
                <option value="">Sem litologia associada</option>
                {(litologias.dados ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}
              </select>
            </Field>
            <SeletorCor rotulo="Cor do domínio" valor={formDominio.cor} aoMudar={(cor) => setFormDominio({ ...formDominio, cor })} />
            <Field label="Descrição" className="span-2">
              <textarea className="textarea" value={formDominio.descricao} onChange={(e) => setFormDominio({ ...formDominio, descricao: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalVersao}
        aoFechar={() => setModalVersao(false)}
        titulo="Nova versão do modelo"
        descricao="Cada versão representa um conjunto de ficheiros e metadados do modelo."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModalVersao(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravarVersao()} disabled={aGravar}>
              {aGravar ? "A gravar…" : "Criar versão"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Número da versão" hint="Deixe vazio para usar a próxima sequência">
              <input className="input" type="number" min="1" value={formVersao.numero_versao} onChange={(e) => setFormVersao({ ...formVersao, numero_versao: e.target.value })} />
            </Field>
            <Field label="Formato">
              <select className="select" value={formVersao.formato} onChange={(e) => setFormVersao({ ...formVersao, formato: e.target.value })}>
                <option value="">Não indicado</option>
                {FORMATOS.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Designação" className="span-2">
              <input className="input" value={formVersao.nome} onChange={(e) => setFormVersao({ ...formVersao, nome: e.target.value })} placeholder="Ex.: Superfície topográfica consolidada" />
            </Field>
            <Field label="URL do ficheiro" className="span-2">
              <input className="input" value={formVersao.ficheiro_url} onChange={(e) => setFormVersao({ ...formVersao, ficheiro_url: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Chave do ficheiro" className="span-2" hint="Referência no armazenamento interno, quando aplicável">
              <input className="input" value={formVersao.ficheiro_chave} onChange={(e) => setFormVersao({ ...formVersao, ficheiro_chave: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className="select" value={formVersao.estado} onChange={(e) => setFormVersao({ ...formVersao, estado: e.target.value })}>
                {ESTADOS_MODELO.map((item) => (
                  <option key={item} value={item} disabled={item === "validado" && !pode("models", "validate")}>
                    {rotuloEstado(item)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição" className="span-2">
              <textarea className="textarea" value={formVersao.descricao} onChange={(e) => setFormVersao({ ...formVersao, descricao: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminarDominio !== null}
        titulo="Eliminar domínio"
        mensagem={`Eliminar o domínio "${aEliminarDominio?.nome}"? Esta operação é definitiva.`}
        aoConfirmar={eliminarDominio}
        aoCancelar={() => setAEliminarDominio(null)}
        ocupado={aApagar}
      />
      <ConfirmDialog
        aberto={aEliminarVersao !== null}
        titulo="Eliminar versão"
        mensagem={`Eliminar a versão v${aEliminarVersao?.numero_versao}? Versões validadas não podem ser eliminadas.`}
        aoConfirmar={eliminarVersao}
        aoCancelar={() => setAEliminarVersao(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
