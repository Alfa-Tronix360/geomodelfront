/** Campos de formulário partilhados: estado automático (furos/projectos) e escolha de cor sem códigos. */
import { useId } from "react";
import { EstadoBadge } from "@/app/components/ui";

/* ------------------------------------------------------------------ estado automático */
const REGRAS = {
  projecto: {
    manual: "suspenso",
    rotuloManual: "Projecto suspenso",
    ajuda: "Planeado até começar; Activo quando a data de início chega ou um furo entra em sondagem; Encerrado quando a data de fim chega.",
    ajudaManual: "Marque se os trabalhos pararam temporariamente. Desmarque para voltar ao estado automático.",
  },
  furo: {
    manual: "abandonado",
    rotuloManual: "Furo abandonado",
    ajuda: "Planeado até haver dados; Em sondagem com data de início, profundidade final, surveys, intervalos ou amostras; Concluído quando tem data de fim.",
    ajudaManual: "Marque se o furo foi interrompido e não vai ser terminado.",
  },
} as const;

export function EstadoAutomatico({ tipo, valor, actual, aoMudar }: {
  tipo: keyof typeof REGRAS;
  valor: string;            // valor no formulário
  actual?: string | null;   // estado gravado (em edição)
  aoMudar: (estado: string) => void;
}) {
  const r = REGRAS[tipo];
  const manual = valor === r.manual;
  return (
    <div className="field span-2">
      <span className="field__label">Estado</span>
      <div className="estado-auto">
        <div className="estado-auto__linha">
          {manual ? <EstadoBadge estado={r.manual} /> : actual ? <EstadoBadge estado={actual} /> : <span className="badge badge--neutral">Calculado ao gravar</span>}
          <span className="estado-auto__tag">{manual ? "definido manualmente" : "automático"}</span>
        </div>
        <p className="estado-auto__ajuda">{r.ajuda}</p>
        <label className="checkbox">
          <input type="checkbox" checked={manual} onChange={(e) => aoMudar(e.target.checked ? r.manual : "planeado")} />
          <span><strong>{r.rotuloManual}</strong> · {r.ajudaManual}</span>
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ cor por nome */
export const PALETA: { nome: string; cor: string }[] = [
  { nome: "Vermelho", cor: "#c0392b" }, { nome: "Laranja", cor: "#e67e22" }, { nome: "Ocre", cor: "#b5541c" },
  { nome: "Dourado", cor: "#d4a017" }, { nome: "Amarelo", cor: "#f1c40f" }, { nome: "Bege", cor: "#f2e6c9" },
  { nome: "Verde-claro", cor: "#7fa36b" }, { nome: "Verde", cor: "#2e7d32" }, { nome: "Turquesa", cor: "#0f766e" },
  { nome: "Azul", cor: "#2471a3" }, { nome: "Roxo", cor: "#7d3c98" }, { nome: "Rosa", cor: "#e8a0a0" },
  { nome: "Castanho", cor: "#6e4b2a" }, { nome: "Cinzento", cor: "#8c8c8c" }, { nome: "Grafite", cor: "#4a4a4a" },
  { nome: "Preto", cor: "#1c1c1c" },
];

export function nomeDaCor(cor: string | null | undefined): string {
  if (!cor) return "Sem cor";
  return PALETA.find((p) => p.cor.toLowerCase() === cor.toLowerCase())?.nome ?? "Cor personalizada";
}

/** Escolha de cor por quadrados com nome; "Outra cor…" abre o selector do sistema. Nunca pede o código. */
export function SeletorCor({ valor, aoMudar, rotulo = "Cor" }: { valor: string; aoMudar: (cor: string) => void; rotulo?: string }) {
  const id = useId();
  return (
    <div className="field span-2">
      <span className="field__label">{rotulo}</span>
      <div className="cores" role="radiogroup" aria-label={rotulo}>
        {PALETA.map((p) => {
          const activa = valor.toLowerCase() === p.cor;
          return (
            <button key={p.cor} type="button" role="radio" aria-checked={activa} title={p.nome} aria-label={p.nome}
              className={`cores__amostra${activa ? " is-activa" : ""}`} style={{ background: p.cor }} onClick={() => aoMudar(p.cor)} />
          );
        })}
        <label htmlFor={id} className="cores__outra" title="Escolher outra cor">
          <input id={id} type="color" value={valor || "#0f766e"} onChange={(e) => aoMudar(e.target.value)} />
          Outra cor…
        </label>
      </div>
      <span className="field__hint">
        <i className="cores__actual" style={{ background: valor || "transparent" }} /> Escolhida: <strong>{nomeDaCor(valor)}</strong>
      </span>
    </div>
  );
}
