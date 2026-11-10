import { useEffect, useState } from "react";
import {
  BadgeCheck, Globe2, Mail, Microscope, Pencil, Phone, Plus, Power, UserRound,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Laboratorio, Pagina } from "@/app/services/types";
import { formatarData } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormLaboratorio {
  codigo: string;
  nome: string;
  contacto: string;
  email: string;
  telefone: string;
  pais: string;
  acreditacao: string;
  activo: boolean;
}

const FORM_VAZIO: FormLaboratorio = {
  codigo: "", nome: "", contacto: "", email: "", telefone: "", pais: "Angola",
  acreditacao: "", activo: true,
};

export default function LaboratoriesPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const [pesquisa, setPesquisa] = useState("");
  const [termo, setTermo] = useState("");
  const [activo, setActivo] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Laboratorio | null>(null);
  const [form, setForm] = useState<FormLaboratorio>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aDesactivar, setADesactivar] = useState<Laboratorio | null>(null);
  const [aProcessar, setAProcessar] = useState(false);
  const limite = 12;

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setTermo(pesquisa);
      setPagina(0);
    }, 320);
    return () => window.clearTimeout(temporizador);
  }, [pesquisa]);

  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Laboratorio>>(
    () => api.get(`/laboratories${qs({ q: termo, activo: activo || undefined, skip: pagina * limite, limit: limite })}`),
    [termo, activo, pagina],
  );

  const items = dados?.items ?? [];
  const activos = items.filter((item) => item.activo).length;
  const acreditados = items.filter((item) => item.acreditacao).length;
  const paises = new Set(items.map((item) => item.pais).filter(Boolean)).size;

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(laboratorio: Laboratorio) {
    setEditando(laboratorio);
    setForm({
      codigo: laboratorio.codigo,
      nome: laboratorio.nome,
      contacto: laboratorio.contacto ?? "",
      email: laboratorio.email ?? "",
      telefone: laboratorio.telefone ?? "",
      pais: laboratorio.pais ?? "",
      acreditacao: laboratorio.acreditacao ?? "",
      activo: laboratorio.activo,
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormLaboratorio>(campo: K, valor: FormLaboratorio[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function gravar() {
    setErroForm("");
    setAGravar(true);
    const corpo = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      contacto: form.contacto.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      pais: form.pais.trim() || null,
      acreditacao: form.acreditacao.trim() || null,
      activo: form.activo,
    };
    try {
      if (editando) {
        await api.patch(`/laboratories/${editando.id}`, corpo);
        toast.sucesso("Laboratório actualizado.");
      } else {
        await api.post("/laboratories", corpo);
        toast.sucesso("Laboratório registado.");
      }
      setModal(false);
      recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function desactivar() {
    if (!aDesactivar) return;
    setAProcessar(true);
    try {
      await api.delete(`/laboratories/${aDesactivar.id}`);
      toast.sucesso("Laboratório desactivado.");
      setADesactivar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAProcessar(false);
    }
  }

  const colunas: Coluna<Laboratorio>[] = [
    {
      chave: "laboratorio",
      cabecalho: "Laboratório",
      render: (laboratorio) => (
        <div>
          <div className="table__primary">{laboratorio.nome}</div>
          <div className="table__secondary mono">{laboratorio.codigo}</div>
        </div>
      ),
    },
    {
      chave: "contacto",
      cabecalho: "Contacto",
      render: (laboratorio) => (
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
            <UserRound size={12} className="muted" /> {laboratorio.contacto ?? "—"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }} className="muted">
            <Mail size={12} /> {laboratorio.email ?? "sem email"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }} className="muted">
            <Phone size={12} /> {laboratorio.telefone ?? "sem telefone"}
          </span>
        </div>
      ),
    },
    {
      chave: "pais",
      cabecalho: "Localização",
      render: (laboratorio) => (
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Globe2 size={13} className="muted" /> {laboratorio.pais ?? "—"}
        </span>
      ),
    },
    {
      chave: "acreditacao",
      cabecalho: "Acreditação",
      render: (laboratorio) => laboratorio.acreditacao
        ? <Badge tom="teal"><BadgeCheck size={12} /> {laboratorio.acreditacao}</Badge>
        : <span className="muted">—</span>,
    },
    {
      chave: "estado",
      cabecalho: "Estado",
      render: (laboratorio) => (
        <Badge tom={laboratorio.activo ? "ok" : "neutral"}>{laboratorio.activo ? "Activo" : "Inactivo"}</Badge>
      ),
    },
    {
      chave: "criado",
      cabecalho: "Registado",
      render: (laboratorio) => <span className="muted" style={{ fontSize: 12 }}>{formatarData(laboratorio.criado_em)}</span>,
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (laboratorio) => (
        <div className="table__actions">
          {pode("laboratories", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar" onClick={() => abrirEdicao(laboratorio)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("laboratories", "delete") && laboratorio.activo && (
            <button className="btn btn--ghost btn--sm" aria-label="Desactivar" onClick={() => setADesactivar(laboratorio)}>
              <Power size={13} />
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
        titulo="Laboratórios"
        sub="Rede de laboratórios acreditados, contactos e capacidade analítica associada à empresa."
        acoes={
          pode("laboratories", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo laboratório</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Laboratórios" valor={dados?.total ?? 0} icone={<Microscope size={18} />} rodape="Total na selecção" />
        <Kpi rotulo="Activos" valor={activos} icone={<BadgeCheck size={18} />} variante="success" rodape="Disponíveis para ensaios" />
        <Kpi rotulo="Acreditados" valor={acreditados} icone={<BadgeCheck size={18} />} variante="accent" rodape="Com acreditação registada" />
        <Kpi rotulo="Países" valor={paises} icone={<Globe2 size={18} />} variante="info" rodape="Cobertura geográfica" />
      </div>

      <Card flush>
        <CardHead
          titulo="Rede de laboratórios"
          hint="Pesquise por código ou nome e filtre pelo estado do laboratório"
          acoes={<Badge tom="teal">{dados?.total ?? 0} registos</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar laboratório…" />
            </div>
            <select
              className="select"
              style={{ maxWidth: 190 }}
              value={activo}
              onChange={(e) => { setActivo(e.target.value); setPagina(0); }}
            >
              <option value="">Todos os estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar laboratórios…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum laboratório encontrado"
            descricao="Registe o primeiro laboratório para começar a associar resultados analíticos."
            icone={<Microscope size={24} />}
            accao={pode("laboratories", "create") ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo laboratório</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={items} chaveDe={(laboratorio) => laboratorio.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar laboratório" : "Novo laboratório"}
        descricao="O código é único por empresa e identifica o laboratório em toda a plataforma."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Registar laboratório"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Código" required>
              <input className="input" value={form.codigo} onChange={(e) => actualizar("codigo", e.target.value)} placeholder="Ex.: LAB-LDA-01" />
            </Field>
            <Field label="Nome" required>
              <input className="input" value={form.nome} onChange={(e) => actualizar("nome", e.target.value)} placeholder="Nome do laboratório" />
            </Field>
            <Field label="Contacto">
              <input className="input" value={form.contacto} onChange={(e) => actualizar("contacto", e.target.value)} placeholder="Pessoa de contacto" />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={(e) => actualizar("email", e.target.value)} placeholder="laboratorio@empresa.ao" />
            </Field>
            <Field label="Telefone">
              <input className="input" value={form.telefone} onChange={(e) => actualizar("telefone", e.target.value)} placeholder="+244 …" />
            </Field>
            <Field label="País">
              <input className="input" value={form.pais} onChange={(e) => actualizar("pais", e.target.value)} />
            </Field>
            <Field label="Acreditação" className="span-2" hint="Referência da certificação ou norma aplicável">
              <input className="input" value={form.acreditacao} onChange={(e) => actualizar("acreditacao", e.target.value)} placeholder="Ex.: ISO/IEC 17025" />
            </Field>
            <label className="checkbox span-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => actualizar("activo", e.target.checked)} />
              Laboratório activo e disponível para novos ensaios
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aDesactivar !== null}
        titulo="Desactivar laboratório"
        mensagem={`Desactivar "${aDesactivar?.nome}"? O histórico é mantido, mas deixa de aceitar novos resultados.`}
        rotuloConfirmar="Desactivar"
        aoConfirmar={desactivar}
        aoCancelar={() => setADesactivar(null)}
        ocupado={aProcessar}
      />
    </div>
  );
}
