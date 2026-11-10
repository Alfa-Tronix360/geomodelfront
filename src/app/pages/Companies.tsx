import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, BadgeCheck, Building2, Coins, Globe2, Pencil, Plus, Trash2,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Empresa, Pagina } from "@/app/services/types";
import { formatarData } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  Field, Kpi, Loading, Modal, PageHeader, Pagination, SearchInput, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormEmpresa {
  nome: string;
  slug: string;
  nif: string;
  pais: string;
  provincia: string;
  cidade: string;
  moeda: string;
  fuso_horario: string;
  activa: boolean;
}

const FORM_VAZIO: FormEmpresa = {
  nome: "", slug: "", nif: "", pais: "Angola", provincia: "", cidade: "",
  moeda: "AOA", fuso_horario: "Africa/Luanda", activa: true,
};

function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function CompaniesPage() {
  const { eSuperadmin, empresaActual, mudarEmpresa } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState<FormEmpresa>(FORM_VAZIO);
  const [slugManual, setSlugManual] = useState(false);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Empresa | null>(null);
  const [aApagar, setAApagar] = useState(false);
  const [aAbrir, setAAbrir] = useState<string | null>(null);
  const limite = 12;

  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Empresa>>(
    () => api.get(`/companies${qs({ skip: pagina * limite, limit: limite })}`),
    [pagina],
  );

  const empresas = dados?.items ?? [];
  const termo = pesquisa.trim().toLowerCase();
  const filtradas = termo
    ? empresas.filter((empresa) =>
        empresa.nome.toLowerCase().includes(termo)
        || empresa.slug.toLowerCase().includes(termo)
        || (empresa.nif ?? "").toLowerCase().includes(termo))
    : empresas;
  const activas = empresas.filter((empresa) => empresa.activa).length;
  const paises = new Set(empresas.map((empresa) => empresa.pais).filter(Boolean)).size;
  const emKwanza = empresas.filter((empresa) => empresa.moeda === "AOA").length;

  function abrirNova() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setSlugManual(false);
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(empresa: Empresa) {
    setEditando(empresa);
    setForm({
      nome: empresa.nome,
      slug: empresa.slug,
      nif: empresa.nif ?? "",
      pais: empresa.pais,
      provincia: empresa.provincia ?? "",
      cidade: empresa.cidade ?? "",
      moeda: empresa.moeda,
      fuso_horario: empresa.fuso_horario,
      activa: empresa.activa,
    });
    setSlugManual(true);
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormEmpresa>(campo: K, valor: FormEmpresa[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function alterarNome(valor: string) {
    setForm((actual) => ({
      ...actual,
      nome: valor,
      slug: editando || slugManual ? actual.slug : gerarSlug(valor),
    }));
  }

  function validar(): string {
    if (form.nome.trim().length < 2) return "Indique o nome da empresa.";
    if (!editando && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "O slug deve conter apenas minúsculas, números e hífenes (ex.: clacs-angola).";
    }
    return "";
  }

  async function gravar() {
    const problema = validar();
    if (problema) {
      setErroForm(problema);
      return;
    }
    setErroForm("");
    setAGravar(true);
    try {
      const base = {
        nome: form.nome.trim(),
        nif: form.nif.trim() || null,
        pais: form.pais.trim() || "Angola",
        provincia: form.provincia.trim() || null,
        cidade: form.cidade.trim() || null,
        moeda: form.moeda.trim() || "AOA",
        fuso_horario: form.fuso_horario.trim() || "Africa/Luanda",
      };
      if (editando) {
        await api.patch(`/companies/${editando.id}`, { ...base, activa: form.activa });
        toast.sucesso("Empresa actualizada.");
      } else {
        await api.post("/companies", { ...base, slug: form.slug.trim() });
        toast.sucesso("Empresa criada com os perfis padrão.");
      }
      setModal(false);
      recarregar();
    } catch (e) {
      setErroForm(mensagemErro(e));
    } finally {
      setAGravar(false);
    }
  }

  async function abrirEmpresa(empresa: Empresa) {
    if (empresa.id === empresaActual?.id) {
      navegar("/");
      return;
    }
    setAAbrir(empresa.id);
    try {
      await mudarEmpresa(empresa.id);
      navegar("/");
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAAbrir(null);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setAApagar(true);
    try {
      await api.delete(`/companies/${aEliminar.id}`);
      toast.sucesso("Empresa desactivada.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Empresa>[] = [
    {
      chave: "empresa",
      cabecalho: "Empresa",
      render: (empresa) => (
        <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
          <span className="quick__icon"><Building2 size={16} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="table__primary">{empresa.nome}</div>
            <div className="table__secondary mono">{empresa.slug}</div>
          </div>
        </div>
      ),
    },
    {
      chave: "localizacao",
      cabecalho: "Localização",
      render: (empresa) => (
        <div>
          <div style={{ fontSize: 12.5 }}>{empresa.pais}</div>
          <div className="table__secondary">
            {[empresa.provincia, empresa.cidade].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    {
      chave: "nif",
      cabecalho: "NIF",
      render: (empresa) => <span className="mono">{empresa.nif ?? "—"}</span>,
    },
    {
      chave: "moeda",
      cabecalho: "Moeda",
      render: (empresa) => <Badge tom={empresa.moeda === "AOA" ? "copper" : "neutral"} plain>{empresa.moeda}</Badge>,
    },
    {
      chave: "estado",
      cabecalho: "Estado",
      render: (empresa) => (
        <div className="row" style={{ gap: 5 }}>
          <Badge tom={empresa.activa ? "ok" : "neutral"}>{empresa.activa ? "Activa" : "Inactiva"}</Badge>
          {empresa.id === empresaActual?.id && <Badge tom="teal" plain>Sessão actual</Badge>}
        </div>
      ),
    },
    {
      chave: "criada",
      cabecalho: "Criada",
      render: (empresa) => <span className="muted" style={{ fontSize: 12 }}>{formatarData(empresa.criado_em)}</span>,
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (empresa) => (
        <div className="table__actions">
          <button
            className="btn btn--ghost btn--sm"
            aria-label="Abrir empresa"
            title={empresa.id === empresaActual?.id ? "Já está na empresa actual" : "Mudar para esta empresa"}
            onClick={() => void abrirEmpresa(empresa)}
            disabled={aAbrir !== null || !empresa.activa}
          >
            <ArrowUpRight size={14} />
          </button>
          {eSuperadmin && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar empresa" onClick={() => abrirEdicao(empresa)}>
              <Pencil size={13} />
            </button>
          )}
          {eSuperadmin && (
            <button
              className="btn btn--ghost btn--sm"
              aria-label="Desactivar empresa"
              title={empresa.id === empresaActual?.id ? "Não é possível desactivar a empresa da sessão actual" : "Desactivar empresa"}
              onClick={() => setAEliminar(empresa)}
              disabled={empresa.id === empresaActual?.id}
            >
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
        eyebrow="Administração"
        titulo="Empresas"
        sub="Gestão das empresas clientes da plataforma. Cada empresa tem os seus próprios dados, perfis e registo de auditoria."
        acoes={
          eSuperadmin && (
            <button className="btn btn--primary" onClick={abrirNova}><Plus size={16} /> Nova empresa</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Empresas" valor={dados?.total ?? 0} icone={<Building2 size={18} />} rodape="Clientes registados" />
        <Kpi rotulo="Activas" valor={activas} icone={<BadgeCheck size={18} />} variante="success" rodape="Na página actual" />
        <Kpi rotulo="Países" valor={paises} icone={<Globe2 size={18} />} variante="info" rodape="Cobertura geográfica" />
        <Kpi rotulo="Em kwanzas" valor={emKwanza} icone={<Coins size={18} />} variante="accent" rodape="Empresas com moeda AOA" />
      </div>

      <Card flush>
        <CardHead
          titulo="Carteira de empresas"
          hint="Pesquise por nome, slug ou NIF. A mudança de empresa altera o contexto de toda a aplicação."
          acoes={<Badge tom="teal">{filtradas.length} de {empresas.length}</Badge>}
        />
        <CardBody>
          <div style={{ maxWidth: 420 }}>
            <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar empresa…" />
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar empresas…" />
      ) : filtradas.length === 0 ? (
        <Card>
          <EmptyState
            titulo={empresas.length === 0 ? "Nenhuma empresa registada" : "Nenhum resultado"}
            descricao={
              empresas.length === 0
                ? "Crie a primeira empresa para começar a operar na plataforma."
                : "Ajuste a pesquisa para encontrar a empresa pretendida."
            }
            icone={<Building2 size={24} />}
            accao={eSuperadmin && empresas.length === 0 ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNova}><Plus size={14} /> Nova empresa</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={filtradas} chaveDe={(empresa) => empresa.id} />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar empresa" : "Nova empresa"}
        descricao={
          editando
            ? "Actualize os dados cadastrais e fiscais da empresa."
            : "Ao criar a empresa, são gerados automaticamente os perfis padrão de acesso."
        }
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Criar empresa"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Nome" required className="span-2">
              <input
                className="input"
                value={form.nome}
                onChange={(e) => alterarNome(e.target.value)}
                placeholder="Ex.: CLACS — Consultoria Geológica"
              />
            </Field>
            <Field
              label="Slug"
              required={!editando}
              className="span-2"
              hint={editando ? "O slug é estável e não pode ser alterado." : "Identificador único na plataforma (minúsculas e hífenes)."}
            >
              <input
                className="input mono"
                value={form.slug}
                onChange={(e) => { setSlugManual(true); actualizar("slug", e.target.value); }}
                placeholder="clacs-angola"
                disabled={Boolean(editando)}
              />
            </Field>
            <Field label="NIF">
              <input className="input" value={form.nif} onChange={(e) => actualizar("nif", e.target.value)} placeholder="Número de identificação fiscal" />
            </Field>
            <Field label="País">
              <input className="input" value={form.pais} onChange={(e) => actualizar("pais", e.target.value)} />
            </Field>
            <Field label="Província">
              <input className="input" value={form.provincia} onChange={(e) => actualizar("provincia", e.target.value)} placeholder="Ex.: Huíla" />
            </Field>
            <Field label="Cidade">
              <input className="input" value={form.cidade} onChange={(e) => actualizar("cidade", e.target.value)} placeholder="Ex.: Lubango" />
            </Field>
            <Field label="Moeda" hint="Código ISO 4217 (ex.: AOA, USD)">
              <input className="input mono" value={form.moeda} onChange={(e) => actualizar("moeda", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Fuso horário">
              <input className="input mono" value={form.fuso_horario} onChange={(e) => actualizar("fuso_horario", e.target.value)} placeholder="Africa/Luanda" />
            </Field>
            {editando && (
              <label className="checkbox span-2">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => actualizar("activa", e.target.checked)}
                />
                Empresa activa e disponível para os utilizadores
              </label>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Desactivar empresa"
        mensagem={`Desactivar "${aEliminar?.nome}"? A empresa deixa de estar disponível, mas os dados são preservados por soft delete.`}
        rotuloConfirmar="Desactivar"
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
