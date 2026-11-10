import { useEffect, useMemo, useState } from "react";
import {
  Activity, Database, Download, Eye, RefreshCw, ScrollText, ShieldCheck, UsersRound,
} from "lucide-react";
import { api, mensagemErro, qs } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Auditoria, Pagina, Tom } from "@/app/services/types";
import {
  formatarDataHora, rotuloAccao, rotuloEntidade,
} from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, DataTable, DetailRow, EmptyState, ErrorBox,
  Kpi, Loading, Modal, PageHeader, Pagination, type Coluna,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

const ENTIDADES = [
  "project", "project_area", "drill_hole", "drill_survey", "drill_interval", "sample",
  "laboratory", "assay_result", "geological_model", "geological_domain", "model_version",
  "resource_estimate", "company", "company_user", "user", "role", "lithology",
];

const ACCOES = [
  "criar", "actualizar", "eliminar", "validar", "desactivar", "importar", "alterar_senha",
];

const TONS_ACCAO: Record<string, Tom> = {
  criar: "ok",
  actualizar: "info",
  eliminar: "danger",
  validar: "teal",
  desactivar: "warn",
  importar: "copper",
  alterar_senha: "neutral",
};

function tomAccao(accao: string): Tom {
  return TONS_ACCAO[accao] ?? "neutral";
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "object") return JSON.stringify(valor);
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

interface Alteracao {
  campo: string;
  antes: unknown;
  depois: unknown;
}

function calcularAlteracoes(registo: Auditoria): Alteracao[] {
  const antes = registo.dados_antes ?? {};
  const depois = registo.dados_depois ?? {};
  const chaves = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)]));
  return chaves
    .filter((campo) => JSON.stringify(antes[campo]) !== JSON.stringify(depois[campo]))
    .map((campo) => ({ campo, antes: antes[campo], depois: depois[campo] }));
}

export default function AuditPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const [accao, setAccao] = useState("");
  const [entidade, setEntidade] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(0);
  const [selecionado, setSelecionado] = useState<Auditoria | null>(null);
  const [aExportar, setAExportar] = useState(false);
  const limite = 20;

  useEffect(() => {
    setPagina(0);
  }, [accao, entidade, desde, ate]);

  const { dados, carregando, erro, recarregar } = useFetch<Pagina<Auditoria>>(
    () => api.get(`/audit${qs({ accao, entidade, desde, ate, skip: pagina * limite, limit: limite })}`),
    [accao, entidade, desde, ate, pagina],
  );

  const registos = dados?.items ?? [];
  const hoje = new Date().toISOString().slice(0, 10);
  const registosHoje = registos.filter((registo) => registo.criado_em.slice(0, 10) === hoje).length;
  const accoesDistintas = new Set(registos.map((registo) => registo.accao)).size;
  const entidadesDistintas = new Set(registos.map((registo) => registo.entidade)).size;
  const alteracoes = useMemo(
    () => (selecionado ? calcularAlteracoes(selecionado) : []),
    [selecionado],
  );

  const filtros = { accao, entidade, desde, ate };

  function limparFiltros() {
    setAccao("");
    setEntidade("");
    setDesde("");
    setAte("");
  }

  async function exportar() {
    setAExportar(true);
    try {
      await api.descarregar(`/audit/export${qs(filtros)}`, "auditoria.csv");
      toast.sucesso("Exportação CSV concluída.", "Auditoria");
    } catch (e) {
      toast.erro(mensagemErro(e));
    } finally {
      setAExportar(false);
    }
  }

  const colunas: Coluna<Auditoria>[] = [
    {
      chave: "data",
      cabecalho: "Data e hora",
      render: (registo) => (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{formatarDataHora(registo.criado_em)}</div>
          <div className="table__secondary mono">{registo.ip ?? "IP não registado"}</div>
        </div>
      ),
    },
    {
      chave: "accao",
      cabecalho: "Acção",
      render: (registo) => <Badge tom={tomAccao(registo.accao)}>{rotuloAccao(registo.accao)}</Badge>,
    },
    {
      chave: "entidade",
      cabecalho: "Entidade",
      render: (registo) => (
        <div>
          <div className="table__primary">{rotuloEntidade(registo.entidade)}</div>
          <div className="table__secondary mono">
            {registo.entidade_id ? registo.entidade_id.slice(0, 8) : "sem identificador"}
          </div>
        </div>
      ),
    },
    {
      chave: "utilizador",
      cabecalho: "Utilizador",
      render: (registo) => (
        <span className="row" style={{ gap: 5, fontSize: 12 }}>
          <UsersRound size={13} className="muted" />
          {registo.user_id ? registo.user_id.slice(0, 8) : "Sistema"}
        </span>
      ),
    },
    {
      chave: "alteracoes",
      cabecalho: "Alterações",
      render: (registo) => {
        const total = calcularAlteracoes(registo).length;
        return total > 0
          ? <Badge tom="neutral" plain>{total} campo(s)</Badge>
          : <span className="muted" style={{ fontSize: 11.5 }}>—</span>;
      },
    },
    {
      chave: "acoes",
      cabecalho: "",
      alinhar: "right",
      render: (registo) => (
        <button
          className="btn btn--ghost btn--sm"
          aria-label="Ver detalhe"
          onClick={(evento) => {
            evento.stopPropagation();
            setSelecionado(registo);
          }}
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administração"
        titulo="Auditoria"
        sub="Registo imutável das operações realizadas na empresa: quem fez, quando, sobre que entidade e com que alterações."
        acoes={
          <>
            <button className="btn btn--secondary" onClick={recarregar} disabled={carregando}>
              <RefreshCw size={15} /> Actualizar
            </button>
            {pode("audit", "export") && (
              <button className="btn btn--primary" onClick={() => void exportar()} disabled={aExportar}>
                <Download size={15} /> {aExportar ? "A exportar…" : "Exportar CSV"}
              </button>
            )}
          </>
        }
      />

      <div className="grid grid--kpis">
        <Kpi rotulo="Registos" valor={dados?.total ?? 0} icone={<ScrollText size={18} />} rodape="Total com os filtros actuais" />
        <Kpi rotulo="Hoje" valor={registosHoje} icone={<Activity size={18} />} variante="accent" rodape="Na página actual" />
        <Kpi rotulo="Acções" valor={accoesDistintas} icone={<ShieldCheck size={18} />} variante="info" rodape="Tipos distintos na página" />
        <Kpi rotulo="Entidades" valor={entidadesDistintas} icone={<Database size={18} />} variante="success" rodape="Módulos afectados" />
      </div>

      <Card flush>
        <CardHead
          titulo="Filtros de auditoria"
          hint="Combine acção, entidade e intervalo de datas para localizar operações"
          acoes={<Badge tom="teal">{registos.length} registos visíveis</Badge>}
        />
        <CardBody>
          <div className="row" style={{ gap: 10 }}>
            <select className="select" style={{ flex: 1, minWidth: 160 }} value={accao} onChange={(e) => setAccao(e.target.value)}>
              <option value="">Todas as acções</option>
              {ACCOES.map((item) => <option key={item} value={item}>{rotuloAccao(item)}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 180 }} value={entidade} onChange={(e) => setEntidade(e.target.value)}>
              <option value="">Todas as entidades</option>
              {ENTIDADES.map((item) => <option key={item} value={item}>{rotuloEntidade(item)}</option>)}
            </select>
            <label className="field" style={{ minWidth: 140 }}>
              <span className="field__label">Desde</span>
              <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="field" style={{ minWidth: 140 }}>
              <span className="field__label">Até</span>
              <input className="input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </label>
            <button
              className="btn btn--ghost"
              style={{ alignSelf: "flex-end" }}
              onClick={limparFiltros}
              disabled={!accao && !entidade && !desde && !ate}
            >
              Limpar
            </button>
          </div>
        </CardBody>
      </Card>

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}
      {carregando && !dados ? (
        <Loading texto="A carregar registo de auditoria…" />
      ) : registos.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sem registos de auditoria"
            descricao="As operações realizadas na plataforma aparecerão aqui automaticamente."
            icone={<ScrollText size={24} />}
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable
            colunas={colunas}
            linhas={registos}
            chaveDe={(registo) => registo.id}
            aoClicar={(registo) => setSelecionado(registo)}
          />
          <Pagination total={dados?.total ?? 0} pagina={pagina} porPagina={limite} aoMudar={setPagina} />
        </Card>
      )}

      <Modal
        aberto={selecionado !== null}
        aoFechar={() => setSelecionado(null)}
        titulo="Detalhe da operação"
        descricao="Informação completa do registo de auditoria, incluindo valores anteriores e posteriores."
        largo
      >
        {selecionado && (
          <div className="stack">
            <div className="import-summary">
              <div className="info-box">
                <span>Acção</span>
                <strong><Badge tom={tomAccao(selecionado.accao)}>{rotuloAccao(selecionado.accao)}</Badge></strong>
              </div>
              <div className="info-box">
                <span>Entidade</span>
                <strong>{rotuloEntidade(selecionado.entidade)}</strong>
              </div>
              <div className="info-box">
                <span>Data</span>
                <strong style={{ fontSize: 12.5 }}>{formatarDataHora(selecionado.criado_em)}</strong>
              </div>
              <div className="info-box">
                <span>Alterações</span>
                <strong>{alteracoes.length}</strong>
              </div>
            </div>

            <dl className="detail-list">
              <DetailRow rotulo="Identificador">{selecionado.id}</DetailRow>
              <DetailRow rotulo="Entidade ID">{selecionado.entidade_id ?? "—"}</DetailRow>
              <DetailRow rotulo="Empresa">{selecionado.company_id ?? "Global"}</DetailRow>
              <DetailRow rotulo="Utilizador">{selecionado.user_id ?? "Sistema"}</DetailRow>
              <DetailRow rotulo="Endereço IP">{selecionado.ip ?? "—"}</DetailRow>
            </dl>

            {alteracoes.length > 0 ? (
              <div className="preview-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Antes</th>
                      <th>Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alteracoes.map((alteracao) => (
                      <tr key={alteracao.campo}>
                        <td className="mono">{alteracao.campo}</td>
                        <td style={{ color: "var(--danger)" }}>{formatarValor(alteracao.antes)}</td>
                        <td style={{ color: "var(--success)" }}>{formatarValor(alteracao.depois)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert--info">
                <ShieldCheck size={16} style={{ flex: "none", marginTop: 1 }} />
                <span>Este registo não contém valores comparáveis antes/depois.</span>
              </div>
            )}

            {(selecionado.dados_antes || selecionado.dados_depois) && (
              <details>
                <summary className="muted" style={{ cursor: "pointer", fontSize: 12.5 }}>
                  Ver payload técnico (JSON)
                </summary>
                <pre className="mono" style={{
                  marginTop: 9, padding: 12, background: "var(--surface-2)", border: "1px solid var(--line)",
                  borderRadius: 10, overflow: "auto", maxHeight: 260, fontSize: 11,
                }}>
{JSON.stringify({ antes: selecionado.dados_antes, depois: selecionado.dados_depois }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
