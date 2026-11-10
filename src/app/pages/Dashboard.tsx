import { Link, useNavigate } from "react-router-dom";
import {
  Activity, ArrowUpRight, Boxes, CalendarDays, Compass, FileSpreadsheet, FlaskConical,
  FolderKanban, Gem, Mountain, RefreshCw, Upload, Users,
} from "lucide-react";
import { api } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { Auditoria, Dashboard, Pagina, Projecto } from "@/app/services/types";
import {
  formatarArea, formatarCompacto, formatarData, formatarMetros, formatarNumero,
  formatarToneladas, percentagem, rotuloAccao, rotuloEntidade, tempoRelativo,
} from "@/app/services/format";
import { Card, CardBody, CardHead, EmptyState, ErrorBox, Kpi, Loading, PageHeader } from "@/app/components/ui";
import { BarList, Donut } from "@/app/components/charts";
import { ProjectMap } from "@/app/components/ProjectMap";

const CORES_ESTADO: Record<string, string> = {
  planeado: "#38bdf8",
  em_sondagem: "#f59e0b",
  concluido: "#14b8a6",
  abandonado: "#f87171",
};

export default function DashboardPage() {
  const { sessao, empresaActual, pode } = useAuth();
  const navegar = useNavigate();

  const { dados, carregando, erro, recarregar } = useFetch<Dashboard>(() => api.get("/dashboard"), []);
  const { dados: projetos } = useFetch<Pagina<Projecto>>(() => api.get("/projects?limit=8"), []);
  const { dados: auditoria } = useFetch<Pagina<Auditoria>>(
    () => (pode("audit") ? api.get("/audit?limit=7") : Promise.resolve({ total: 0, items: [] })),
    [pode("audit")],
  );

  const nomeCurto = sessao?.utilizador.nome.split(" ")[0] ?? "geólogo";
  const estados = Object.entries(dados?.por_estado_sondagem ?? {});
  const totalEstados = estados.reduce((soma, [, valor]) => soma + valor, 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow={empresaActual?.nome ?? "CLACS GeoModel"}
        titulo={`Bom dia, ${nomeCurto}.`}
        sub={
          <>
            Visão consolidada da operação de exploração. {dados ? `${dados.projectos_activos} projecto(s) activo(s)` : "A carregar indicadores"}
            {" · "}
            <span className="muted">{formatarData(new Date().toISOString())}</span>
          </>
        }
        acoes={
          <>
            <button className="btn btn--secondary" onClick={recarregar} disabled={carregando}>
              <RefreshCw size={15} className={carregando ? "spinner" : ""} style={{ border: 0 }} /> Actualizar
            </button>
            <Link className="btn btn--secondary" to="/importacao"><Upload size={15} /> Importar dados</Link>
            <Link className="btn btn--primary" to="/projectos?novo=1"><FolderKanban size={15} /> Novo projecto</Link>
          </>
        }
      />

      {erro && <ErrorBox mensagem={erro} aoTentar={recarregar} />}

      <section className="hero">
        <div className="hero__content">
          <span className="hero__badge"><i /> Operação em tempo real</span>
          <h2>Dados geológicos que sustentam decisões de investimento.</h2>
          <p>
            Acompanhe a execução das sondagens, a validação laboratorial e a estimativa de recursos
            da sua empresa num único painel auditável.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--accent" to="/sondagens"><Mountain size={15} /> Ver sondagens</Link>
            <Link className="btn btn--secondary" to="/recursos"><Gem size={15} /> Estimativas de recursos</Link>
          </div>
        </div>
      </section>

      {carregando && !dados ? (
        <Loading texto="A calcular indicadores…" />
      ) : (
        <>
          <div className="grid grid--kpis">
            <Kpi
              rotulo="Projectos activos"
              valor={dados?.projectos_activos ?? 0}
              icone={<FolderKanban size={18} />}
              rodape={<><span className="trend trend--up"><ArrowUpRight size={13} /> em execução</span> · {formatarArea(dados?.area_explorada_km2)} explorados</>}
            />
            <Kpi
              rotulo="Sondagens"
              valor={formatarNumero(dados?.sondagens)}
              icone={<Mountain size={18} />}
              variante="accent"
              rodape={<>{formatarMetros(dados?.metros_perfurados)} perfurados</>}
            />
            <Kpi
              rotulo="Amostras registadas"
              valor={formatarNumero(dados?.amostras)}
              icone={<FlaskConical size={18} />}
              variante="info"
              rodape={<>{formatarNumero(dados?.resultados_laboratoriais)} resultados · {formatarNumero(dados?.resultados_validados)} validados</>}
            />
            <Kpi
              rotulo="Tonelagem estimada"
              valor={formatarToneladas(dados?.tonelagem_total)}
              icone={<Gem size={18} />}
              variante="success"
              rodape={<>{formatarNumero(dados?.estimativas)} estimativa(s) · {formatarCompacto(dados?.metal_contido_total)} metal contido</>}
            />
          </div>

          <div className="grid grid--main">
            <Card flush>
              <CardHead
                titulo="Mapa de projectos"
                hint="Distribuição territorial e commodity principal"
                acoes={<Link className="btn btn--secondary btn--sm" to="/projectos">Abrir projectos <ArrowUpRight size={14} /></Link>}
              />
              <ProjectMap projetos={projetos?.items ?? []} altura={340} />
            </Card>

            <div className="stack">
              <Card>
                <CardHead titulo="Estado das sondagens" hint={`${totalEstados} furo(s) registados`} />
                <CardBody>
                  <Donut
                    segmentos={estados.map(([estado, valor]) => ({
                      rotulo: estado.replaceAll("_", " "),
                      valor,
                      cor: CORES_ESTADO[estado] ?? "#64748b",
                    }))}
                    centro={String(totalEstados)}
                    subcentro="furos"
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHead titulo="Pipeline de dados" hint="Do registo à validação" />
                <CardBody>
                  <div className="stack" style={{ gap: 14 }}>
                    <Pipeline rotulo="Amostras" valor={dados?.amostras ?? 0} total={Math.max(dados?.amostras ?? 0, 1)} cor="#14b8a6" />
                    <Pipeline rotulo="Resultados" valor={dados?.resultados_laboratoriais ?? 0} total={Math.max(dados?.resultados_laboratoriais ?? 0, 1)} cor="#38bdf8" />
                    <Pipeline
                      rotulo="Resultados validados"
                      valor={dados?.resultados_validados ?? 0}
                      total={Math.max(dados?.resultados_laboratoriais ?? 0, 1)}
                      cor="#d97706"
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <div className="grid grid--2">
            <Card>
              <CardHead
                titulo="Projectos por mineral"
                hint="Área e número de projectos por commodity"
                acoes={<Link className="btn btn--ghost btn--sm" to="/projectos">Ver todos <ArrowUpRight size={14} /></Link>}
              />
              <CardBody>
                <BarList
                  itens={(dados?.por_mineral ?? []).map((item) => ({
                    rotulo: item.mineral ?? "Sem mineral",
                    valor: item.projectos,
                    detalhe: formatarArea(item.area_km2),
                  }))}
                  formatarValor={(valor) => `${valor} projecto${valor === 1 ? "" : "s"}`}
                  vazio="Ainda não existem projectos classificados por mineral."
                />
              </CardBody>
            </Card>

            <Card flush>
              <CardHead
                titulo="Actividade recente"
                hint="Últimos registos de auditoria"
                acoes={<Link className="btn btn--ghost btn--sm" to="/auditoria">Auditoria <ArrowUpRight size={14} /></Link>}
              />
              <CardBody>
                {auditoria && auditoria.items.length > 0 ? (
                  <div className="activity">
                    {auditoria.items.map((registo) => (
                      <div className="activity__item" key={registo.id}>
                        <span className="activity__dot"><Activity size={15} /></span>
                        <div className="activity__body">
                          <strong>{rotuloAccao(registo.accao)} {rotuloEntidade(registo.entidade).toLowerCase()}</strong>
                          <span>{registo.ip ? `IP ${registo.ip}` : "Registo de auditoria"}</span>
                        </div>
                        <span className="activity__time">{tempoRelativo(registo.criado_em)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    titulo="Sem actividade visível"
                    descricao={pode("audit") ? "Ainda não existem registos de auditoria nesta empresa." : "O seu perfil não tem acesso ao registo de auditoria."}
                    icone={<Activity size={24} />}
                  />
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHead titulo="Acesso rápido" hint="Atalhos para as tarefas mais frequentes" />
            <CardBody>
              <div className="quick-grid">
                <button className="quick" onClick={() => navegar("/projectos?novo=1")}>
                  <span className="quick__icon"><FolderKanban size={17} /></span>
                  <span><strong>Novo projecto</strong><span>Área, mineral e concessão</span></span>
                </button>
                <button className="quick" onClick={() => navegar("/sondagens?novo=1")}>
                  <span className="quick__icon"><Mountain size={17} /></span>
                  <span><strong>Registar sondagem</strong><span>Collar, azimute e inclinação</span></span>
                </button>
                <button className="quick" onClick={() => navegar("/amostras?novo=1")}>
                  <span className="quick__icon"><FlaskConical size={17} /></span>
                  <span><strong>Nova amostra</strong><span>Intervalo e peso</span></span>
                </button>
                <button className="quick" onClick={() => navegar("/resultados?novo=1")}>
                  <span className="quick__icon"><FileSpreadsheet size={17} /></span>
                  <span><strong>Lançar resultado</strong><span>Laboratório e parâmetro</span></span>
                </button>
                <button className="quick" onClick={() => navegar("/importacao")}>
                  <span className="quick__icon"><Upload size={17} /></span>
                  <span><strong>Importar CSV/XLSX</strong><span>Furos, amostras e análises</span></span>
                </button>
                <button className="quick" onClick={() => navegar("/utilizadores")}>
                  <span className="quick__icon"><Users size={17} /></span>
                  <span><strong>Equipa</strong><span>Perfis e permissões</span></span>
                </button>
              </div>
            </CardBody>
          </Card>

          <div className="row muted" style={{ fontSize: 11.5, justifyContent: "space-between" }}>
            <span><CalendarDays size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Sessão de {sessao?.utilizador.email}</span>
            <span className="row" style={{ gap: 6 }}>
              <Compass size={13} /> {empresaActual?.nome ?? "Sem empresa"} · <Boxes size={13} /> dados multiempresa
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Pipeline({ rotulo, valor, total, cor }: { rotulo: string; valor: number; total: number; cor: string }) {
  const pct = percentagem(valor, total);
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{rotulo}</span>
        <span className="mono">{formatarNumero(valor)} <span className="muted">({pct}%)</span></span>
      </div>
      <div className="progress" style={{ height: 7 }}>
        <i style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

