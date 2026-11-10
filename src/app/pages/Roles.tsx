import { useMemo, useState } from "react";
import {
  Layers, LockKeyhole, Pencil, Plus, ShieldCheck, Sparkles, Trash2, UsersRound,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Membro, Perfil, Permissao } from "@/app/services/types";
import { percentagem } from "@/app/services/format";
import {
  Badge, Card, CardHead, ConfirmDialog, DataTable, EmptyState, ErrorBox,
  Field, Kpi, Loading, Modal, PageHeader, Progress, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

const MODULOS = [
  { id: "companies", rotulo: "Empresas" },
  { id: "users", rotulo: "Utilizadores e permissões" },
  { id: "projects", rotulo: "Projectos" },
  { id: "drill_holes", rotulo: "Sondagens" },
  { id: "samples", rotulo: "Amostras" },
  { id: "laboratories", rotulo: "Laboratórios" },
  { id: "assays", rotulo: "Resultados laboratoriais" },
  { id: "models", rotulo: "Modelação 3D" },
  { id: "resources", rotulo: "Estimativa de recursos" },
  { id: "dashboard", rotulo: "Dashboard" },
  { id: "audit", rotulo: "Auditoria" },
  { id: "imports", rotulo: "Importação de dados" },
];

const ACCOES = [
  { id: "view", rotulo: "Ver" },
  { id: "create", rotulo: "Criar" },
  { id: "edit", rotulo: "Editar" },
  { id: "delete", rotulo: "Apagar" },
  { id: "validate", rotulo: "Validar" },
  { id: "import", rotulo: "Importar" },
  { id: "export", rotulo: "Exportar" },
];

const TOTAL_POSSIVEL = MODULOS.length * ACCOES.length;

interface FormPerfil {
  codigo: string;
  nome: string;
  descricao: string;
}

const FORM_VAZIO: FormPerfil = { codigo: "", nome: "", descricao: "" };

export default function RolesPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [form, setForm] = useState<FormPerfil>(FORM_VAZIO);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aEliminar, setAEliminar] = useState<Perfil | null>(null);
  const [aApagar, setAApagar] = useState(false);

  const { dados, carregando, erro, recarregar } = useFetch<Perfil[]>(() => api.get("/roles"), []);
  const { dados: catalogo } = useFetch<Permissao[]>(() => api.get("/permissions"), []);
  const { dados: membros } = useFetch<Membro[]>(() => api.get("/users"), []);

  const perfis = dados ?? [];
  const totalPermissoes = catalogo?.length ?? TOTAL_POSSIVEL;
  const mapaMembros = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const membro of membros ?? []) {
      mapa.set(membro.role_id, (mapa.get(membro.role_id) ?? 0) + 1);
    }
    return mapa;
  }, [membros]);
  const mapaPermissoes = useMemo(
    () => new Map((catalogo ?? []).map((permissao) => [`${permissao.modulo}:${permissao.accao}`, permissao.descricao])),
    [catalogo],
  );

  const sistema = perfis.filter((perfil) => perfil.sistema).length;
  const personalizados = perfis.length - sistema;

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setSeleccionadas(["dashboard:view", "projects:view", "drill_holes:view", "samples:view"]);
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(perfil: Perfil) {
    setEditando(perfil);
    setForm({ codigo: perfil.codigo, nome: perfil.nome, descricao: perfil.descricao ?? "" });
    setSeleccionadas(perfil.permissoes);
    setErroForm("");
    setModal(true);
  }

  function temPermissao(codigo: string): boolean {
    return seleccionadas.includes(codigo);
  }

  function alternarPermissao(codigo: string) {
    setSeleccionadas((actuais) =>
      actuais.includes(codigo) ? actuais.filter((item) => item !== codigo) : [...actuais, codigo],
    );
  }

  function alternarModulo(modulo: string) {
    const codigos = ACCOES.map((accao) => `${modulo}:${accao.id}`);
    const todos = codigos.every((codigo) => seleccionadas.includes(codigo));
    setSeleccionadas((actuais) => {
      if (todos) return actuais.filter((codigo) => !codigos.includes(codigo));
      return Array.from(new Set([...actuais, ...codigos]));
    });
  }

  function moduloCompleto(modulo: string): boolean {
    return ACCOES.every((accao) => seleccionadas.includes(`${modulo}:${accao.id}`));
  }

  function seleccionarTudo() {
    setSeleccionadas(MODULOS.flatMap((modulo) => ACCOES.map((accao) => `${modulo.id}:${accao.id}`)));
  }

  function limparTudo() {
    setSeleccionadas([]);
  }

  function validar(): string {
    if (!editando && !/^[a-z0-9_]{2,60}$/.test(form.codigo.trim())) {
      return "O código deve ter entre 2 e 60 caracteres e usar apenas letras minúsculas, números e _.";
    }
    if (form.nome.trim().length < 2) return "Indique o nome do perfil.";
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
      if (editando) {
        await api.patch(`/roles/${editando.id}`, {
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          permissoes: seleccionadas,
        });
        toast.sucesso("Perfil e permissões actualizados.");
      } else {
        await api.post("/roles", {
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          permissoes: seleccionadas,
        });
        toast.sucesso("Perfil criado.");
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
      await api.delete(`/roles/${aEliminar.id}`);
      toast.sucesso("Perfil eliminado.");
      setAEliminar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAApagar(false);
    }
  }

  const colunas: Coluna<Perfil>[] = [
    {
      chave: "perfil",
      cabecalho: "Perfil",
      render: (perfil) => (
        <div>
          <div className="table__primary">{perfil.nome}</div>
          <div className="table__secondary mono">{perfil.codigo}</div>
        </div>
      ),
    },
    {
      chave: "tipo",
      cabecalho: "Tipo",
      render: (perfil) => perfil.sistema
        ? <Badge tom="teal"><LockKeyhole size={11} /> Sistema</Badge>
        : <Badge tom="neutral">Personalizado</Badge>,
    },
    {
      chave: "permissoes",
      cabecalho: "Cobertura de permissões",
      render: (perfil) => {
        const cobertura = percentagem(perfil.permissoes.length, totalPermissoes);
        return (
          <div style={{ minWidth: 150 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{perfil.permissoes.length} permissões</span>
              <span className="muted" style={{ fontSize: 11 }}>{cobertura}%</span>
            </div>
            <div style={{ marginTop: 5 }}><Progress valor={cobertura} /></div>
          </div>
        );
      },
    },
    {
      chave: "membros",
      cabecalho: "Membros",
      alinhar: "center",
      render: (perfil) => {
        const total = mapaMembros.get(perfil.id) ?? 0;
        return (
          <span className="row" style={{ justifyContent: "center", gap: 5, fontSize: 12.5 }}>
            <UsersRound size={13} className="muted" /> {total}
          </span>
        );
      },
    },
    {
      chave: "descricao",
      cabecalho: "Descrição",
      render: (perfil) => (
        <span className="muted" style={{ fontSize: 12 }}>{perfil.descricao ?? "—"}</span>
      ),
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (perfil) => (
        <div className="table__actions">
          {pode("users", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar perfil" onClick={() => abrirEdicao(perfil)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("users", "edit") && !perfil.sistema && (
            <button className="btn btn--ghost btn--sm" aria-label="Eliminar perfil" onClick={() => setAEliminar(perfil)}>
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
        titulo="Perfis e permissões"
        sub="Defina o que cada perfil pode consultar, criar, editar, validar, importar e exportar. As alterações aplicam-se de imediato aos membros."
        acoes={
          pode("users", "edit") && (
            <button className="btn btn--primary" onClick={abrirNovo}><Plus size={16} /> Novo perfil</button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Perfis" valor={perfis.length} icone={<ShieldCheck size={18} />} rodape="Na empresa activa" />
        <Kpi rotulo="De sistema" valor={sistema} icone={<LockKeyhole size={18} />} variante="info" rodape="Protegidos contra eliminação" />
        <Kpi rotulo="Personalizados" valor={personalizados} icone={<Sparkles size={18} />} variante="accent" rodape="Criados pela empresa" />
        <Kpi rotulo="Permissões" valor={totalPermissoes} icone={<Layers size={18} />} variante="success" rodape="No catálogo da plataforma" />
      </div>

      <Card flush>
        <CardHead
          titulo="Matriz de perfis"
          hint="Os perfis de sistema não podem ser apagados; podem ser ajustados conforme a política da empresa"
          acoes={<Badge tom="teal">{perfis.length} perfis</Badge>}
        />
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar perfis…" />
      ) : perfis.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Nenhum perfil encontrado"
            descricao="Crie um perfil personalizado para atribuir um conjunto próprio de permissões."
            icone={<ShieldCheck size={24} />}
            accao={pode("users", "edit") ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo}><Plus size={14} /> Novo perfil</button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={perfis} chaveDe={(perfil) => perfil.id} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar perfil" : "Novo perfil de acesso"}
        descricao="Marque as acções permitidas por módulo. O perfil pode ser atribuído a utilizadores da empresa."
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar permissões" : "Criar perfil"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          {editando?.sistema && (
            <div className="alert alert--warn">
              <LockKeyhole size={16} style={{ flex: "none", marginTop: 1 }} />
              <span>Este é um perfil de sistema. A alteração da matriz afecta todos os membros associados.</span>
            </div>
          )}
          <div className="form-grid">
            <Field
              label="Código"
              required={!editando}
              hint={editando ? "O código não pode ser alterado." : "Apenas minúsculas, números e _"}
            >
              <input
                className="input mono"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ex.: geologo_senior"
                disabled={Boolean(editando)}
              />
            </Field>
            <Field label="Nome" required>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Geólogo sénior"
              />
            </Field>
            <Field label="Descrição" className="span-2">
              <textarea
                className="textarea"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Responsabilidades e âmbito de aplicação deste perfil…"
              />
            </Field>
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="section-title" style={{ marginBottom: 2 }}>Matriz de permissões</div>
              <span className="muted" style={{ fontSize: 11.5 }}>
                {seleccionadas.length} de {TOTAL_POSSIVEL} permissões seleccionadas
              </span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn--ghost btn--sm" onClick={limparTudo} type="button">Limpar</button>
              <button className="btn btn--secondary btn--sm" onClick={seleccionarTudo} type="button">Seleccionar tudo</button>
            </div>
          </div>

          <div className="perm-grid">
            <div className="perm-row perm-row--head">
              <span>Módulo</span>
              {ACCOES.map((accao) => <span key={accao.id} style={{ textAlign: "center" }}>{accao.rotulo}</span>)}
            </div>
            {MODULOS.map((modulo) => (
              <div className="perm-row" key={modulo.id}>
                <button
                  type="button"
                  className="perm-row__module"
                  onClick={() => alternarModulo(modulo.id)}
                  style={{
                    background: "none", border: 0, textAlign: "left", padding: 0, cursor: "pointer",
                    color: moduloCompleto(modulo.id) ? "var(--primary)" : "var(--ink)",
                  }}
                  title={moduloCompleto(modulo.id) ? "Remover todas as acções do módulo" : "Seleccionar todas as acções do módulo"}
                >
                  {modulo.rotulo}
                </button>
                {ACCOES.map((accao) => {
                  const codigo = `${modulo.id}:${accao.id}`;
                  const descricao = mapaPermissoes.get(codigo);
                  return (
                    <label className="perm-cell" key={codigo} title={descricao ?? codigo}>
                      <input
                        type="checkbox"
                        checked={temPermissao(codigo)}
                        onChange={() => alternarPermissao(codigo)}
                        aria-label={`${modulo.rotulo} — ${accao.rotulo}`}
                      />
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aEliminar !== null}
        titulo="Eliminar perfil"
        mensagem={`Eliminar o perfil "${aEliminar?.nome}"? Só é possível se não estiver atribuído a nenhum utilizador.`}
        aoConfirmar={eliminar}
        aoCancelar={() => setAEliminar(null)}
        ocupado={aApagar}
      />
    </div>
  );
}
