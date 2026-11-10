import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Info, RefreshCw, Upload,
} from "lucide-react";
import { api, mensagemErro } from "@/app/services/api";
import { useAuth } from "@/app/services/auth";
import { useFetch } from "@/app/services/useFetch";
import type { EntidadeImportacao, ResultadoImportacao } from "@/app/services/types";
import { formatarNumero } from "@/app/services/format";
import {
  Badge, Card, CardBody, CardHead, ErrorBox, Loading, PageHeader,
} from "@/app/components/ui";
import { useToast } from "@/app/components/Toast";

export default function ImportsPage() {
  const { pode } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entidade, setEntidade] = useState("");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [aProcessar, setAProcessar] = useState<"previa" | "importar" | null>(null);
  const [erro, setErro] = useState("");
  const [sobre, setSobre] = useState(false);

  const { dados, carregando, erro: erroEntidades, recarregar } = useFetch<EntidadeImportacao[]>(
    () => api.get("/imports/entities"),
    [],
  );

  useEffect(() => {
    if (!entidade && dados && dados.length > 0) setEntidade(dados[0].entidade);
  }, [dados, entidade]);

  const entidadeActual = (dados ?? []).find((item) => item.entidade === entidade) ?? null;
  const podeImportar = pode("imports", "import");
  const podeVer = pode("imports", "view");

  function limparSeleccao() {
    setFicheiro(null);
    setPrevia(null);
    setResultado(null);
    setErro("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function escolherFicheiro(selecionado: File | null) {
    setFicheiro(selecionado);
    setPrevia(null);
    setResultado(null);
    setErro("");
  }

  async function executarPreview() {
    if (!ficheiro || !entidade) return;
    setErro("");
    setAProcessar("previa");
    try {
      const resposta = await api.upload<ResultadoImportacao>(`/imports/preview/${entidade}`, ficheiro);
      setPrevia(resposta);
      setResultado(null);
      if (resposta.erros.length === 0) {
        toast.sucesso(`${resposta.validos} linha(s) válida(s) prontas a importar.`, "Pré-visualização concluída");
      } else {
        toast.erro(`${resposta.erros.length} linha(s) com erros. Corrija o ficheiro antes de gravar.`, "Validação com erros");
      }
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setAProcessar(null);
    }
  }

  async function executarImportacao() {
    if (!ficheiro || !entidade) return;
    setErro("");
    setAProcessar("importar");
    try {
      const resposta = await api.upload<ResultadoImportacao>(`/imports/${entidade}`, ficheiro);
      setResultado(resposta);
      setPrevia(resposta);
      toast.sucesso(`${resposta.criados} registo(s) importado(s) com sucesso.`, "Importação concluída");
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setAProcessar(null);
    }
  }

  function descarregarModelo() {
    if (!entidadeActual) return;
    const conteudo = `\uFEFF${entidadeActual.campos.join(";")}\n`;
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `modelo-${entidadeActual.entidade}.csv`,
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }

  function aoLargar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setSobre(false);
    const selecionado = evento.dataTransfer.files?.[0];
    if (selecionado) escolherFicheiro(selecionado);
  }

  const colunasPrevia = previa && previa.previa.length > 0 ? Object.keys(previa.previa[0]) : [];

  if (carregando && !dados) return <Loading texto="A carregar entidades de importação…" />;
  if (erroEntidades) {
    return (
      <div className="page">
        <PageHeader eyebrow="Dados" titulo="Importação" />
        <ErrorBox mensagem={erroEntidades} aoTentar={recarregar} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dados"
        titulo="Importação de dados"
        sub="Carregue sondagens, amostras, resultados e litologias a partir de CSV ou Excel, com pré-visualização e validação linha a linha."
        acoes={entidadeActual && (
          <button className="btn btn--secondary" onClick={descarregarModelo}><Download size={15} /> Modelo CSV</button>
        )}
      />

      <div className="grid grid--detail">
        <div className="stack">
          <Card>
            <CardHead
              titulo="1. Escolher entidade"
              hint="Cada entidade tem campos obrigatórios e aliases próprios"
            />
            <CardBody>
              <div className="quick-grid">
                {(dados ?? []).map((item) => (
                  <button
                    key={item.entidade}
                    className="quick"
                    style={{
                      borderColor: entidade === item.entidade ? "var(--primary)" : undefined,
                      background: entidade === item.entidade ? "var(--primary-soft)" : undefined,
                    }}
                    onClick={() => { setEntidade(item.entidade); limparSeleccao(); }}
                  >
                    <span className="quick__icon"><FileSpreadsheet size={17} /></span>
                    <span style={{ textAlign: "left" }}>
                      <strong>{item.rotulo}</strong>
                      <span>{item.campos.length} campos · {item.formatos.join(" / ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              titulo="2. Carregar ficheiro"
              hint={entidadeActual ? `Entidade seleccionada: ${entidadeActual.rotulo}` : "Seleccione uma entidade acima"}
            />
            <CardBody>
              <label
                className={`dropzone${sobre ? " dropzone--over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
                onDragLeave={() => setSobre(false)}
                onDrop={aoLargar}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => escolherFicheiro(e.target.files?.[0] ?? null)}
                  disabled={!entidadeActual || !podeVer}
                />
                <div className="dropzone__icon"><Upload size={22} /></div>
                <strong>{ficheiro ? ficheiro.name : "Arraste o ficheiro para aqui"}</strong>
                <span>
                  {ficheiro
                    ? `${(ficheiro.size / 1024).toFixed(1)} KB · clique para substituir`
                    : "ou clique para seleccionar um CSV ou XLSX"}
                </span>
              </label>

              {ficheiro && (
                <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
                  <span className="file-pill">
                    <FileSpreadsheet size={15} /> {ficheiro.name}
                  </span>
                  <div className="row" style={{ gap: 7 }}>
                    <button className="btn btn--ghost btn--sm" onClick={limparSeleccao} disabled={aProcessar !== null}>
                      Remover
                    </button>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => void executarPreview()}
                      disabled={aProcessar !== null || !podeVer}
                    >
                      {aProcessar === "previa" ? <><RefreshCw size={14} /> A validar…</> : "Pré-visualizar"}
                    </button>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => void executarImportacao()}
                      disabled={aProcessar !== null || !podeImportar || !previa || previa.erros.length > 0 || previa.validos === 0}
                    >
                      {aProcessar === "importar" ? "A importar…" : "Importar e gravar"}
                    </button>
                  </div>
                </div>
              )}

              {erro && <div style={{ marginTop: 12 }}><ErrorBox mensagem={erro} /></div>}
            </CardBody>
          </Card>

          {previa && (
            <Card flush>
              <CardHead
                titulo="3. Resultado da validação"
                hint="A importação é atómica: com erros, nada é gravado"
                acoes={<Badge tom={previa.erros.length ? "danger" : "ok"}>{previa.erros.length ? "Com erros" : "Válido"}</Badge>}
              />
              <CardBody>
                <div className="import-summary">
                  <div className="info-box">
                    <span>Linhas válidas</span>
                    <strong>{formatarNumero(previa.validos)}</strong>
                  </div>
                  <div className="info-box">
                    <span>{resultado ? "Criados" : "A criar"}</span>
                    <strong>{formatarNumero(resultado ? resultado.criados : previa.validos)}</strong>
                  </div>
                  <div className="info-box">
                    <span>Ignorados</span>
                    <strong>{formatarNumero(previa.ignorados)}</strong>
                  </div>
                  <div className="info-box">
                    <span>Erros</span>
                    <strong style={{ color: previa.erros.length ? "var(--danger)" : undefined }}>{previa.erros.length}</strong>
                  </div>
                </div>

                {previa.erros.length > 0 && (
                  <div className="stack" style={{ marginTop: 14 }}>
                    {previa.erros.map((item, indice) => (
                      <div key={`${item.linha}-${indice}`} className="alert alert--danger">
                        <AlertTriangle size={15} style={{ flex: "none", marginTop: 1 }} />
                        <span><strong>Linha {item.linha}:</strong> {item.mensagem}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resultado && resultado.criados > 0 && (
                  <div className="alert alert--info" style={{ marginTop: 14 }}>
                    <CheckCircle2 size={16} style={{ flex: "none", marginTop: 1 }} />
                    <span>
                      Importação concluída: <strong>{resultado.criados}</strong> registo(s) criado(s).
                      Os dados já estão disponíveis nas listagens da plataforma.
                    </span>
                  </div>
                )}
              </CardBody>

              {previa.previa.length > 0 && (
                <div className="preview-table" style={{ margin: "0 18px 18px" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {colunasPrevia.map((coluna) => <th key={coluna}>{coluna}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previa.previa.map((linha, indice) => (
                        <tr key={indice}>
                          <td className="muted mono">{indice + 1}</td>
                          {colunasPrevia.map((coluna) => {
                            const valor = linha[coluna];
                            return (
                              <td key={coluna}>
                                {valor === null || valor === undefined || valor === ""
                                  ? <span className="muted">—</span>
                                  : String(valor)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="stack">
          <Card>
            <CardHead titulo="Campos suportados" hint={entidadeActual?.rotulo} />
            <CardBody>
              {entidadeActual ? (
                <div className="stack">
                  <div className="alert alert--info">
                    <Info size={16} style={{ flex: "none", marginTop: 1 }} />
                    <span>
                      Os cabeçalhos são reconhecidos por nome ou alias. A primeira linha do ficheiro deve conter os nomes das colunas.
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 7 }}>
                    {entidadeActual.campos.map((campo) => (
                      <div key={campo} className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                        <span className="mono">{campo}</span>
                        <span className="muted" style={{ fontSize: 11, textAlign: "right", maxWidth: 170 }}>
                          {entidadeActual.aliases[campo]?.slice(0, 3).join(", ") ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12.5 }}>Seleccione uma entidade para ver os campos suportados.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead titulo="Boas práticas" />
            <CardBody>
              <ul className="stack" style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65 }}>
                <li>Use datas no formato <span className="mono">AAAA-MM-DD</span>.</li>
                <li>Projectos, furos e litologias são referenciados pelo código.</li>
                <li>CSV com separador <span className="mono">;</span> ou <span className="mono">,</span> é detectado automaticamente.</li>
                <li>Corrija todos os erros antes de gravar; a operação é atómica.</li>
                <li>Descarregue o modelo CSV para garantir os cabeçalhos correctos.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
