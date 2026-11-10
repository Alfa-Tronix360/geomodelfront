/** Gráficos SVG próprios, leves e responsivos, sem dependências externas. */
import { useId } from "react";

/* ------------------------------------------------------------------ sparkline */
export function Sparkline({
  dados,
  cor = "var(--primary)",
  altura = 42,
}: {
  dados: number[];
  cor?: string;
  altura?: number;
}) {
  const largura = 120;
  const valores = dados.length > 1 ? dados : [0, dados[0] ?? 0];
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const intervalo = max - min || 1;
  const pontos = valores.map((valor, indice) => {
    const x = (indice / (valores.length - 1)) * largura;
    const y = altura - ((valor - min) / intervalo) * (altura - 6) - 3;
    return [x, y] as const;
  });
  const linha = pontos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${linha} L${largura} ${altura} L0 ${altura} Z`;
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} style={{ width: "100%", height: altura }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cor} stopOpacity=".28" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pontos[pontos.length - 1][0]} cy={pontos[pontos.length - 1][1]} r="2.6" fill={cor} />
    </svg>
  );
}

/* ------------------------------------------------------------------ área / linhas */
export interface SerieGrafico {
  rotulo: string;
  cor: string;
  valores: number[];
}

export function AreaChart({
  rotulos,
  series,
  altura = 220,
  formatarValor = (v: number) => String(v),
}: {
  rotulos: string[];
  series: SerieGrafico[];
  altura?: number;
  formatarValor?: (valor: number) => string;
}) {
  const id = useId().replace(/:/g, "");
  const largura = 640;
  const margem = { topo: 14, direita: 12, fundo: 30, esquerda: 42 };
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.fundo;
  const todos = series.flatMap((s) => s.valores);
  const max = Math.max(...todos, 1);
  const escalaMax = Math.ceil(max / 4) * 4 || 4;
  const x = (indice: number) => margem.esquerda + (rotulos.length <= 1 ? larguraUtil / 2 : (indice / (rotulos.length - 1)) * larguraUtil);
  const y = (valor: number) => margem.topo + alturaUtil - (valor / escalaMax) * alturaUtil;
  const linhasGrelha = 4;

  return (
    <svg className="chart" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Gráfico de evolução">
      <defs>
        {series.map((serie, indice) => (
          <linearGradient key={serie.rotulo} id={`area-${id}-${indice}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={serie.cor} stopOpacity=".26" />
            <stop offset="1" stopColor={serie.cor} stopOpacity=".02" />
          </linearGradient>
        ))}
      </defs>
      <g className="chart__grid">
        {Array.from({ length: linhasGrelha + 1 }, (_, i) => {
          const valor = (escalaMax / linhasGrelha) * i;
          return (
            <g key={i}>
              <line x1={margem.esquerda} x2={largura - margem.direita} y1={y(valor)} y2={y(valor)} />
              <text className="chart__axis" x={margem.esquerda - 7} y={y(valor) + 3} textAnchor="end">
                {formatarValor(valor)}
              </text>
            </g>
          );
        })}
      </g>
      {series.map((serie, indice) => {
        const pontos = serie.valores.map((valor, i) => [x(i), y(valor)] as const);
        const linha = pontos.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
        const area = `${linha} L${x(serie.valores.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
        return (
          <g key={serie.rotulo}>
            <path d={area} fill={`url(#area-${id}-${indice})`} />
            <path d={linha} fill="none" stroke={serie.cor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {pontos.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r="3.2" fill="var(--surface)" stroke={serie.cor} strokeWidth="2">
                <title>{`${serie.rotulo} · ${rotulos[i]}: ${formatarValor(serie.valores[i])}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {rotulos.map((rotulo, i) => (
        <text key={rotulo + i} className="chart__axis" x={x(i)} y={altura - 9} textAnchor="middle">
          {rotulo}
        </text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ donut */
export interface SegmentoDonut {
  rotulo: string;
  valor: number;
  cor: string;
}

export function Donut({
  segmentos,
  centro,
  subcentro,
  tamanho = 168,
}: {
  segmentos: SegmentoDonut[];
  centro: string;
  subcentro: string;
  tamanho?: number;
}) {
  const total = segmentos.reduce((soma, s) => soma + s.valor, 0);
  const raio = 54;
  const perimetro = 2 * Math.PI * raio;
  let acumulado = 0;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: tamanho, height: tamanho }}>
        <svg viewBox="0 0 140 140" width={tamanho} height={tamanho} role="img" aria-label={`${centro} ${subcentro}`}>
          <circle cx="70" cy="70" r={raio} fill="none" stroke="var(--surface-3)" strokeWidth="17" />
          {total > 0 &&
            segmentos.map((segmento) => {
              const fracao = segmento.valor / total;
              const dash = fracao * perimetro;
              const offset = -acumulado * perimetro;
              acumulado += fracao;
              return (
                <circle
                  key={segmento.rotulo}
                  cx="70"
                  cy="70"
                  r={raio}
                  fill="none"
                  stroke={segmento.cor}
                  strokeWidth="17"
                  strokeLinecap="butt"
                  strokeDasharray={`${Math.max(dash - 2, 0)} ${perimetro - Math.max(dash - 2, 0)}`}
                  strokeDashoffset={offset}
                  transform="rotate(-90 70 70)"
                >
                  <title>{`${segmento.rotulo}: ${segmento.valor}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="donut__center">
          <strong>{centro}</strong>
          <span>{subcentro}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 130, display: "grid", gap: 8 }}>
        {segmentos.map((segmento) => (
          <div key={segmento.rotulo} className="legend__item">
            <span className="legend__dot" style={{ background: segmento.cor }} />
            <span>{segmento.rotulo}</span>
            <span className="legend__value">{segmento.valor}</span>
          </div>
        ))}
        {segmentos.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Sem dados.</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ barras horizontais */
export interface ItemBarra {
  rotulo: string;
  valor: number;
  cor?: string;
  detalhe?: string;
}

export function BarList({
  itens,
  formatarValor = (v: number) => String(v),
  vazio = "Sem dados.",
}: {
  itens: ItemBarra[];
  formatarValor?: (valor: number) => string;
  vazio?: string;
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  if (itens.length === 0) return <p className="muted" style={{ fontSize: 12.5 }}>{vazio}</p>;
  return (
    <div style={{ display: "grid", gap: 13 }}>
      {itens.map((item) => (
        <div key={item.rotulo}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{item.rotulo}</span>
            <span className="mono" style={{ color: "var(--ink-2)" }}>
              {formatarValor(item.valor)}
              {item.detalhe && <span className="muted"> · {item.detalhe}</span>}
            </span>
          </div>
          <div className="progress" style={{ height: 7 }}>
            <i style={{ width: `${(item.valor / max) * 100}%`, background: item.cor ?? "linear-gradient(90deg, var(--primary), var(--accent))" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ medidor */
export function Gauge({
  valor,
  max = 100,
  rotulo,
  cor = "var(--primary)",
}: {
  valor: number;
  max?: number;
  rotulo: string;
  cor?: string;
}) {
  const percentagem = Math.max(0, Math.min(100, (valor / (max || 1)) * 100));
  const raio = 46;
  const perimetro = Math.PI * raio;
  const dash = (percentagem / 100) * perimetro;
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 120 70" style={{ width: "100%", maxWidth: 160 }} role="img" aria-label={`${rotulo}: ${percentagem}%`}>
        <path d="M14 60a46 46 0 0 1 92 0" fill="none" stroke="var(--surface-3)" strokeWidth="11" strokeLinecap="round" />
        <path
          d="M14 60a46 46 0 0 1 92 0"
          fill="none"
          stroke={cor}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${perimetro}`}
        />
        <text x="60" y="54" textAnchor="middle" fill="var(--ink)" style={{ font: "700 19px var(--font)" }}>
          {Math.round(percentagem)}%
        </text>
      </svg>
      <span className="muted" style={{ fontSize: 11.5 }}>{rotulo}</span>
    </div>
  );
}
