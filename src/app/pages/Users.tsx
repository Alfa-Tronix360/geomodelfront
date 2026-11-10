import { useMemo, useState } from "react";
import {
  BadgeCheck, KeyRound, Pencil, Plus, Power, ShieldCheck, UserPlus, UsersRound,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Membro, Perfil } from "@/app/services/types";
import { formatarData } from "@/app/services/format";
import {
  Avatar, Badge, Card, CardBody, CardHead, ConfirmDialog, DataTable, EmptyState,
  ErrorBox, Field, Kpi, Loading, Modal, PageHeader, SearchInput, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

interface FormMembro {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  role_id: string;
  activo: boolean;
  superadmin: boolean;
}

const FORM_VAZIO: FormMembro = {
  nome: "", email: "", senha: "", telefone: "", role_id: "", activo: true, superadmin: false,
};

export default function UsersPage() {
  const { pode, eSuperadmin } = useAuth();
  const toast = useToast();
  const [pesquisa, setPesquisa] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState("");
  const [estado, setEstado] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Membro | null>(null);
  const [form, setForm] = useState<FormMembro>(FORM_VAZIO);
  const [aGravar, setAGravar] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aDesactivar, setADesactivar] = useState<Membro | null>(null);
  const [aProcessar, setAProcessar] = useState(false);

  const { dados, carregando, erro, recarregar } = useFetch<Membro[]>(
    () => api.get(`/users${qs({ activo: estado || undefined })}`),
    [estado],
  );
  const { dados: perfis } = useFetch<Perfil[]>(() => api.get("/roles"), []);

  const membros = dados ?? [];
  const listaPerfis = perfis ?? [];
  const mapaPerfis = useMemo(
    () => new Map(listaPerfis.map((perfil) => [perfil.id, perfil])),
    [listaPerfis],
  );

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return membros.filter((membro) => {
      if (perfilFiltro && membro.role_id !== perfilFiltro) return false;
      if (!termo) return true;
      return membro.nome.toLowerCase().includes(termo) || membro.email.toLowerCase().includes(termo);
    });
  }, [membros, pesquisa, perfilFiltro]);

  const activos = membros.filter((membro) => membro.activo).length;
  const perfisAtribuidos = new Set(membros.map((membro) => membro.role_id)).size;
  const administradores = membros.filter(
    (membro) => membro.role_codigo === "company_admin" || membro.role_codigo === "super_admin",
  ).length;

  function abrirNovo() {
    setEditando(null);
    setForm({
      ...FORM_VAZIO,
      role_id: listaPerfis.find((perfil) => perfil.codigo === "viewer")?.id ?? listaPerfis[0]?.id ?? "",
    });
    setErroForm("");
    setModal(true);
  }

  function abrirEdicao(membro: Membro) {
    setEditando(membro);
    setForm({
      nome: membro.nome,
      email: membro.email,
      senha: "",
      telefone: "",
      role_id: membro.role_id,
      activo: membro.activo,
      superadmin: false,
    });
    setErroForm("");
    setModal(true);
  }

  function actualizar<K extends keyof FormMembro>(campo: K, valor: FormMembro[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function validar(): string {
    if (form.nome.trim().length < 2) return "Indique o nome completo do utilizador.";
    if (!editando && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return "Indique um e-mail válido.";
    }
    if (!form.role_id) return "Seleccione um perfil de acesso.";
    if (!editando && form.senha.length < 8) return "A senha inicial deve ter pelo menos 8 caracteres.";
    if (editando && form.senha && form.senha.length < 8) {
      return "A nova senha deve ter pelo menos 8 caracteres.";
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
      if (editando) {
        const corpo: Record<string, unknown> = {
          nome: form.nome.trim(),
          activo: form.activo,
        };
        if (form.telefone.trim()) corpo.telefone = form.telefone.trim();
        if (form.senha) corpo.senha = form.senha;
        await api.patch(`/users/${editando.user_id}`, corpo);
        await api.patch(`/users/${editando.user_id}/membro`, {
          role_id: form.role_id,
          activo: form.activo,
        });
        toast.sucesso("Utilizador actualizado.");
      } else {
        await api.post("/users", {
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          telefone: form.telefone.trim() || null,
          role_id: form.role_id,
          activo: form.activo,
          superadmin: form.superadmin,
        });
        toast.sucesso("Utilizador adicionado à empresa.");
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
      await api.delete(`/users/${aDesactivar.user_id}`);
      toast.sucesso("Utilizador desactivado nesta empresa.");
      setADesactivar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAProcessar(false);
    }
  }

  const colunas: Coluna<Membro>[] = [
    {
      chave: "utilizador",
      cabecalho: "Utilizador",
      render: (membro) => (
        <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
          <Avatar nome={membro.nome} pequeno />
          <div style={{ minWidth: 0 }}>
            <div className="table__primary truncate">{membro.nome}</div>
            <div className="table__secondary truncate">{membro.email}</div>
          </div>
        </div>
      ),
    },
    {
      chave: "perfil",
      cabecalho: "Perfil",
      render: (membro) => {
        const perfil = mapaPerfis.get(membro.role_id);
        return (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{membro.role_nome}</div>
            <div className="table__secondary mono">{membro.role_codigo}</div>
            {perfil && (
              <div className="muted" style={{ fontSize: 10.5, marginTop: 1 }}>
                {perfil.permissoes.length} permissões
              </div>
            )}
          </div>
        );
      },
    },
    {
      chave: "estado",
      cabecalho: "Estado",
      render: (membro) => (
        <Badge tom={membro.activo ? "ok" : "neutral"}>
          {membro.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      chave: "desde",
      cabecalho: "Membro desde",
      render: (membro) => (
        <span className="muted" style={{ fontSize: 12 }}>{formatarData(membro.criado_em)}</span>
      ),
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (membro) => (
        <div className="table__actions">
          {pode("users", "edit") && (
            <button className="btn btn--ghost btn--sm" aria-label="Editar utilizador" onClick={() => abrirEdicao(membro)}>
              <Pencil size={13} />
            </button>
          )}
          {pode("users", "delete") && membro.activo && (
            <button
              className="btn btn--ghost btn--sm"
              aria-label="Desactivar utilizador"
              title="Desactivar nesta empresa"
              onClick={() => setADesactivar(membro)}
            >
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
        eyebrow="Administração"
        titulo="Utilizadores"
        sub="Membros da empresa, perfis de acesso e estado das contas. As permissões efectivas resultam do perfil atribuído."
        acoes={
          pode("users", "create") && (
            <button className="btn btn--primary" onClick={abrirNovo} disabled={listaPerfis.length === 0}>
              <UserPlus size={16} /> Novo utilizador
            </button>
          )
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Membros" valor={membros.length} icone={<UsersRound size={18} />} rodape="Na empresa activa" />
        <Kpi rotulo="Activos" valor={activos} icone={<BadgeCheck size={18} />} variante="success" rodape="Com acesso à plataforma" />
        <Kpi rotulo="Perfis atribuídos" valor={perfisAtribuidos} icone={<ShieldCheck size={18} />} variante="info" rodape={`${listaPerfis.length} perfis disponíveis`} />
        <Kpi rotulo="Administradores" valor={administradores} icone={<KeyRound size={18} />} variante="accent" rodape="Perfis de gestão" />
      </div>

      <Card flush>
        <CardHead
          titulo="Equipa da empresa"
          hint="Pesquise por nome ou e-mail e combine com o perfil e o estado da conta"
          acoes={<Badge tom="teal">{filtrados.length} de {membros.length}</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <SearchInput valor={pesquisa} aoMudar={setPesquisa} placeholder="Pesquisar utilizador…" />
            </div>
            <select
              className="select"
              style={{ maxWidth: 230 }}
              value={perfilFiltro}
              onChange={(e) => setPerfilFiltro(e.target.value)}
            >
              <option value="">Todos os perfis</option>
              {listaPerfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>
              ))}
            </select>
            <select
              className="select"
              style={{ maxWidth: 170 }}
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
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
        <Loading texto="A carregar utilizadores…" />
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState
            titulo={membros.length === 0 ? "Nenhum membro registado" : "Nenhum resultado"}
            descricao={
              membros.length === 0
                ? "Adicione o primeiro utilizador para começar a colaborar na plataforma."
                : "Ajuste a pesquisa ou os filtros para encontrar o utilizador pretendido."
            }
            icone={<UsersRound size={24} />}
            accao={pode("users", "create") && membros.length === 0 ? (
              <button className="btn btn--primary btn--sm" onClick={abrirNovo} disabled={listaPerfis.length === 0}>
                <Plus size={14} /> Novo utilizador
              </button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable colunas={colunas} linhas={filtrados} chaveDe={(membro) => membro.id} />
        </Card>
      )}

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={editando ? "Editar utilizador" : "Novo utilizador"}
        descricao={
          editando
            ? "Actualize os dados da conta, o perfil de acesso e o estado nesta empresa."
            : "O utilizador recebe acesso imediato à empresa com o perfil seleccionado."
        }
        largo
        rodape={
          <>
            <button className="btn btn--secondary" onClick={() => setModal(false)} disabled={aGravar}>Cancelar</button>
            <button className="btn btn--primary" onClick={() => void gravar()} disabled={aGravar}>
              {aGravar ? "A gravar…" : editando ? "Guardar alterações" : "Adicionar utilizador"}
            </button>
          </>
        }
      >
        <div className="stack">
          {erroForm && <div className="alert alert--danger">{erroForm}</div>}
          <div className="form-grid">
            <Field label="Nome completo" required className="span-2">
              <input
                className="input"
                value={form.nome}
                onChange={(e) => actualizar("nome", e.target.value)}
                placeholder="Ex.: Ana Domingos"
                autoComplete="name"
              />
            </Field>
            <Field label="E-mail" required={!editando} hint={editando ? "O e-mail de acesso não pode ser alterado aqui." : undefined}>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => actualizar("email", e.target.value)}
                placeholder="nome@empresa.ao"
                disabled={Boolean(editando)}
                autoComplete="email"
              />
            </Field>
            <Field label="Telefone" hint={editando ? "Deixe vazio para manter o número actual." : undefined}>
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => actualizar("telefone", e.target.value)}
                placeholder="+244 …"
                autoComplete="tel"
              />
            </Field>
            <Field label="Perfil de acesso" required className="span-2">
              <select className="select" value={form.role_id} onChange={(e) => actualizar("role_id", e.target.value)}>
                <option value="">Seleccionar perfil…</option>
                {listaPerfis.map((perfil) => (
                  <option key={perfil.id} value={perfil.id}>
                    {perfil.nome} · {perfil.permissoes.length} permissões
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={editando ? "Nova senha" : "Senha inicial"}
              required={!editando}
              className="span-2"
              hint={editando ? "Preencha apenas se pretender repor a senha do utilizador." : "Mínimo de 8 caracteres. O utilizador poderá alterá-la depois."}
            >
              <input
                className="input"
                type="password"
                value={form.senha}
                onChange={(e) => actualizar("senha", e.target.value)}
                placeholder={editando ? "Manter a senha actual" : "Definir senha de acesso"}
                autoComplete="new-password"
              />
            </Field>
            <label className="checkbox span-2">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => actualizar("activo", e.target.checked)}
              />
              Conta activa e com acesso à empresa
            </label>
            {!editando && eSuperadmin && (
              <label className="checkbox span-2">
                <input
                  type="checkbox"
                  checked={form.superadmin}
                  onChange={(e) => actualizar("superadmin", e.target.checked)}
                />
                Conceder privilégios de super administrador (acesso a todas as empresas)
              </label>
            )}
          </div>
          {form.role_id && mapaPerfis.get(form.role_id) && (
            <div className="alert alert--info">
              <ShieldCheck size={16} style={{ flex: "none", marginTop: 1 }} />
              <span>
                O perfil <strong>{mapaPerfis.get(form.role_id)?.nome}</strong> concede{" "}
                <strong>{mapaPerfis.get(form.role_id)?.permissoes.length}</strong> permissões. Pode consultar a
                matriz completa em <strong>Perfis e permissões</strong>.
              </span>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        aberto={aDesactivar !== null}
        titulo="Desactivar utilizador"
        mensagem={`Desactivar ${aDesactivar?.nome ?? "este utilizador"} nesta empresa? A conta global não é apagada e o histórico de auditoria é preservado.`}
        rotuloConfirmar="Desactivar"
        aoConfirmar={desactivar}
        aoCancelar={() => setADesactivar(null)}
        ocupado={aProcessar}
      />
    </div>
  );
}
