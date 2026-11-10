/** Mapa estilizado de projectos: usa coordenadas GeoJSON quando existem. */
import type { Projecto } from "@/app/services/types";
import { corMineral, rotuloEstado } from "@/app/services/format";

interface PontoMapa {
  x: number;
  y: number;
  projeto: Projecto;
  cor: string;
}

const LARGURA = 620;
const ALTURA = 360;

function extrairCoordenadas(geometria: Projecto["geometria"]): [number, number][] {
  if (!geometria || !("coordinates" in geometria)) return [];
  const resultado: [number, number][] = [];
  const visitar = (valor: unknown) => {
    if (!Array.isArray(valor)) return;
    if (valor.length >= 2 && typeof valor[0] === "number" && typeof valor[1] === "number") {
      resultado.push([valor[0], valor[1]]);
      return;
    }
    for (const item of valor) visitar(item);
  };
  visitar(geometria.coordinates);
  return resultado;
}

function posicoes(projetos: Projecto[]): PontoMapa[] {
  const comCoordenadas = projetos
    .map((projeto) => ({ projeto, pontos: extrairCoordenadas(projeto.geometria) }))
    .filter((item) => item.pontos.length > 0);

  if (comCoordenadas.length > 0) {
    const todas = comCoordenadas.flatMap((item) => item.pontos);
    const lons = todas.map((p) => p[0]);
    const lats = todas.map((p) => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const spanLon = maxLon - minLon || 1;
    const spanLat = maxLat - minLat || 1;
    return comCoordenadas.map(({ projeto, pontos }) => {
      const lon = pontos.reduce((s, p) => s + p[0], 0) / pontos.length;
      const lat = pontos.reduce((s, p) => s + p[1], 0) / pontos.length;
      return {
        projeto,
        cor: corMineral(projeto.mineral),
        x: 50 + ((lon - minLon) / spanLon) * (LARGURA - 100),
        y: 44 + ((maxLat - lat) / spanLat) * (ALTURA - 100),
      };
    });
  }

  // Sem geometria: distribuição determinística em espiral dourada.
  return projetos.map((projeto, indice) => {
    const angulo = indice * 2.399963;
    const raio = 38 + Math.sqrt(indice + 1) * 30;
    return {
      projeto,
      cor: corMineral(projeto.mineral),
      x: LARGURA / 2 + Math.cos(angulo) * raio * 1.35,
      y: ALTURA / 2 + Math.sin(angulo) * raio * 0.72,
    };
  });
}

export function ProjectMap({ projetos, altura = 340 }: { projetos: Projecto[]; altura?: number }) {
  const pontos = posicoes(projetos);
  return (
    <div className="map-card" style={{ minHeight: altura }}>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa de projectos">
        <defs>
          <radialGradient id="map-glow" cx="50%" cy="42%" r="70%">
            <stop offset="0" stopColor="#14b8a6" stopOpacity=".18" />
            <stop offset="1" stopColor="#0b2b33" stopOpacity="0" />
          </radialGradient>
          <pattern id="map-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M46 0H0V46" fill="none" stroke="#7dd3c7" strokeOpacity=".06" />
          </pattern>
          <filter id="map-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <rect width={LARGURA} height={ALTURA} fill="#0a2830" />
        <rect width={LARGURA} height={ALTURA} fill="url(#map-grid)" />
        <rect width={LARGURA} height={ALTURA} fill="url(#map-glow)" />

        <g fill="none" stroke="#5eead4" strokeOpacity=".13" strokeWidth="1.2">
          <path d="M-20 80c80-26 150-14 220 10s150 30 230 6 140-16 210 12" />
          <path d="M-20 120c84-22 154-8 224 18s148 24 228 2 142-12 212 16" />
          <path d="M-20 164c88-18 158-2 228 24s146 18 226-2 144-8 214 20" />
          <path d="M-20 212c92-14 162 4 232 30s144 12 224-6 146-4 216 24" />
          <path d="M-20 264c96-10 166 10 236 34s142 6 222-10 148 0 218 28" />
          <path d="M-20 318c100-6 170 16 240 34s140 0 220-14 150 4 220 30" />
        </g>

        {/* massa terrestre estilizada */}
        <path
          d="M96 58c58-26 118-30 176-14s106 16 160 2 92-6 128 20l-18 74c-12 44-46 72-96 92l-54 24c-42 18-88 20-134 8l-66-18c-50-14-82-44-96-88l-16-58c-8-24 0-42 16-42z"
          fill="#0e3940"
          stroke="#2dd4bf"
          strokeOpacity=".28"
          strokeWidth="1.6"
        />
        <path
          d="M96 58c58-26 118-30 176-14s106 16 160 2 92-6 128 20l-18 74c-12 44-46 72-96 92l-54 24c-42 18-88 20-134 8l-66-18c-50-14-82-44-96-88l-16-58c-8-24 0-42 16-42z"
          fill="none"
          stroke="#f59e0b"
          strokeOpacity=".16"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          transform="translate(14 10) scale(.955)"
        />

        {/* rios */}
        <g fill="none" stroke="#38bdf8" strokeOpacity=".28" strokeWidth="1.8" strokeLinecap="round">
          <path d="M170 92c30 46 22 92 58 132s58 62 62 106" />
          <path d="M370 74c-12 40 18 64 10 104s-30 54-22 96" />
        </g>

        {pontos.map((ponto, indice) => (
          <g key={ponto.projeto.id} transform={`translate(${ponto.x} ${ponto.y})`}>
            <circle r="22" fill={ponto.cor} opacity=".14" filter="url(#map-soft)" />
            <circle r="14" fill="none" stroke={ponto.cor} strokeOpacity=".35" />
            <circle r="6.5" fill={ponto.cor} stroke="#071a20" strokeWidth="2">
              <title>{`${ponto.projeto.nome} · ${ponto.projeto.mineral ?? "—"} · ${rotuloEstado(ponto.projeto.estado)}`}</title>
            </circle>
            <text
              x="0"
              y={indice % 2 === 0 ? -18 : 26}
              textAnchor="middle"
              fill="#d9f2ec"
              style={{ font: "600 9.5px var(--font)" }}
            >
              {ponto.projeto.codigo}
            </text>
          </g>
        ))}

        {pontos.length === 0 && (
          <text x={LARGURA / 2} y={ALTURA / 2} textAnchor="middle" fill="#9fc4bf" style={{ font: "500 13px var(--font)" }}>
            Sem projectos com localização
          </text>
        )}

        <g transform={`translate(${LARGURA - 54} 34)`} opacity=".7">
          <circle r="17" fill="none" stroke="#5eead4" strokeOpacity=".4" />
          <path d="M0-12 4 0 0 12-4 0z" fill="#f59e0b" />
          <text y="-20" textAnchor="middle" fill="#bdf5e8" style={{ font: "700 9px var(--font)", letterSpacing: 2 }}>N</text>
        </g>
      </svg>
      <div className="map-card__overlay">
        <strong>Projectos no território</strong>
        <span>{pontos.length} projecto{pontos.length === 1 ? "" : "s"} · Angola</span>
      </div>
      <div className="map-legend">
        <span><i style={{ background: "#d97706" }} /> Cobre</span>
        <span><i style={{ background: "#eab308" }} /> Ouro</span>
        <span><i style={{ background: "#38bdf8" }} /> Diamante</span>
        <span><i style={{ background: "#14b8a6" }} /> Outros</span>
      </div>
    </div>
  );
}
