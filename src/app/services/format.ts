import type { Tom } from "@/app/services/types";

const LOCALE = "pt-PT";

export function formatarNumero(valor: number | null | undefined, decimais?: number): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: decimais ?? 2,
    minimumFractionDigits: decimais ?? 0,
  }).format(valor);
}

export function formatarCompacto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000_000) return `${formatarNumero(valor / 1_000_000_000, 2)} G`;
  if (abs >= 1_000_000) return `${formatarNumero(valor / 1_000_000, 2)} M`;
  if (abs >= 1_000) return `${formatarNumero(valor / 1_000, 1)} mil`;
  return formatarNumero(valor);
}

export function formatarArea(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${formatarNumero(valor, 2)} km²`;
}

export function formatarToneladas(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  if (valor >= 1_000_000) return `${formatarNumero(valor / 1_000_000, 2)} Mt`;
  if (valor >= 1_000) return `${formatarNumero(valor / 1_000, 1)} kt`;
  return `${formatarNumero(valor, 1)} t`;
}

export function formatarMetal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return formatarNumero(valor, valor < 1 ? 4 : 2);
}

export function formatarMetros(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${formatarNumero(valor, 1)} m`;
}

export function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  const data = new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric" }).format(data);
}

export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function tempoRelativo(valor: string | null | undefined): string {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  const segundos = Math.round((data.getTime() - Date.now()) / 1000);
  const divisores: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const formato = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  for (const [unidade, divisor] of divisores) {
    if (Math.abs(segundos) >= divisor || unidade === "second") {
      return formato.format(Math.round(segundos / divisor), unidade);
    }
  }
  return "—";
}

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function capitalizar(texto: string | null | undefined): string {
  if (!texto) return "—";
  return texto.charAt(0).toUpperCase() + texto.slice(1).replaceAll("_", " ");
}

const ROTULOS_ESTADO: Record<string, string> = {
  planeado: "Planeado",
  activo: "Activo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  em_sondagem: "Em sondagem",
  concluido: "Concluído",
  abandonado: "Abandonado",
  registada: "Registada",
  enviada: "Enviada",
  recebida: "Recebida",
  analisada: "Analisada",
  rejeitada: "Rejeitada",
  preliminar: "Preliminar",
  validado: "Validado",
  rejeitado: "Rejeitado",
  rascunho: "Rascunho",
  arquivado: "Arquivado",
  aprovado: "Aprovado",
  diamantado: "Diamantado",
  rc: "RC",
  percussao: "Percussão",
  rotativo: "Rotativo",
  outro: "Outro",
  testemunho: "Testemunho",
  rocha: "Rocha",
  solo: "Solo",
  sedimento: "Sedimento",
  superficie: "Superfície",
  solido: "Sólido",
  bloco: "Bloco",
  combinado: "Combinado",
  idw: "IDW",
  kriging: "Kriging",
  vizinho_mais_proximo: "Vizinho mais próximo",
  manual: "Manual",
  pendente: "Pendente",
  em_curso: "Em curso",
};

export function rotuloEstado(estado: string | null | undefined): string {
  if (!estado) return "—";
  return ROTULOS_ESTADO[estado] ?? capitalizar(estado);
}

const TONS_ESTADO: Record<string, Tom> = {
  activo: "ok",
  concluido: "ok",
  validado: "ok",
  aprovado: "ok",
  analisada: "ok",
  planeado: "info",
  em_sondagem: "warn",
  em_curso: "warn",
  suspenso: "warn",
  rascunho: "neutral",
  registada: "neutral",
  enviada: "info",
  recebida: "info",
  preliminar: "warn",
  pendente: "warn",
  rejeitado: "danger",
  rejeitada: "danger",
  abandonado: "danger",
  encerrado: "neutral",
  arquivado: "neutral",
};

export function tomEstado(estado: string | null | undefined): Tom {
  if (!estado) return "neutral";
  return TONS_ESTADO[estado] ?? "neutral";
}

const ROTULOS_ENTIDADE: Record<string, string> = {
  project: "Projecto",
  project_area: "Área do projecto",
  drill_hole: "Furo",
  drill_survey: "Survey",
  drill_interval: "Intervalo",
  sample: "Amostra",
  laboratory: "Laboratório",
  assay_result: "Resultado",
  geological_model: "Modelo",
  geological_domain: "Domínio",
  model_version: "Versão",
  resource_estimate: "Estimativa",
  company: "Empresa",
  company_user: "Membro",
  user: "Utilizador",
  role: "Perfil",
  lithology: "Litologia",
};

export function rotuloEntidade(entidade: string | null | undefined): string {
  if (!entidade) return "—";
  return ROTULOS_ENTIDADE[entidade] ?? capitalizar(entidade);
}

const ROTULOS_ACCAO: Record<string, string> = {
  criar: "Criou",
  actualizar: "Actualizou",
  eliminar: "Eliminou",
  validar: "Validou",
  desactivar: "Desactivou",
  importar: "Importou",
  alterar_senha: "Alterou a senha",
};

export function rotuloAccao(accao: string | null | undefined): string {
  if (!accao) return "—";
  return ROTULOS_ACCAO[accao] ?? capitalizar(accao);
}

const CORES_MINERAL: Record<string, string> = {
  cobre: "#d97706",
  ouro: "#eab308",
  ferro: "#b45309",
  diamante: "#38bdf8",
  manganês: "#a855f7",
  manganes: "#a855f7",
  grafite: "#475569",
  fosfato: "#22c55e",
  urânio: "#84cc16",
  uranio: "#84cc16",
  chumbo: "#64748b",
  zinco: "#94a3b8",
  níquel: "#14b8a6",
  niquel: "#14b8a6",
};

export function corMineral(mineral: string | null | undefined): string {
  if (!mineral) return "#64748b";
  return CORES_MINERAL[mineral.toLowerCase()] ?? "#0f766e";
}

export function percentagem(parte: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((parte / total) * 100)));
}
