/** Cliente HTTP: token JWT, empresa activa, erros em português e download de ficheiros. */

const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const CHAVE_TOKEN = "geomodel.token";
const CHAVE_EMPRESA = "geomodel.company";

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function guardar(chave: string, valor: string | null) {
  try {
    if (valor) localStorage.setItem(chave, valor);
    else localStorage.removeItem(chave);
  } catch {
    /* armazenamento indisponível */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public campos?: Record<string, string>,
  ) {
    super(message);
  }
}

type Corpo = object | FormData | undefined;

let aoExpirar: () => void = () => {};

export const sessao = {
  get token() {
    return ler(CHAVE_TOKEN);
  },
  get empresa() {
    return ler(CHAVE_EMPRESA);
  },
  definirToken(token: string | null) {
    guardar(CHAVE_TOKEN, token);
  },
  definirEmpresa(empresaId: string | null) {
    guardar(CHAVE_EMPRESA, empresaId);
  },
  limpar() {
    guardar(CHAVE_TOKEN, null);
    guardar(CHAVE_EMPRESA, null);
  },
  aoExpirar(fn: () => void) {
    aoExpirar = fn;
  },
};

async function mensagemDeErro(r: Response): Promise<{ mensagem: string; campos?: Record<string, string> }> {
  try {
    const corpo = await r.json();
    const detalhe = corpo?.detail;
    if (typeof detalhe === "string") return { mensagem: detalhe };
    if (Array.isArray(detalhe)) {
      const campos: Record<string, string> = {};
      const partes: string[] = [];
      for (const erro of detalhe) {
        const campo = erro?.campo ?? (Array.isArray(erro?.loc) ? erro.loc.filter((p: unknown) => p !== "body").join(".") : "");
        const texto = erro?.mensagem ?? erro?.msg ?? "valor inválido";
        if (campo) campos[campo] = texto;
        partes.push(campo ? `${campo}: ${texto}` : texto);
      }
      return { mensagem: partes.join("; ") || "Dados inválidos", campos };
    }
  } catch {
    /* resposta sem JSON */
  }
  if (r.status === 401) return { mensagem: "Sessão expirada. Entre novamente." };
  if (r.status === 403) return { mensagem: "Não tem permissão para esta operação." };
  if (r.status === 404) return { mensagem: "Registo não encontrado." };
  return { mensagem: `Erro ${r.status}${r.statusText ? ` — ${r.statusText}` : ""}` };
}

async function pedido(metodo: string, caminho: string, corpo?: Corpo): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = sessao.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const empresa = sessao.empresa;
  if (empresa) headers["X-Company-ID"] = empresa;

  let body: BodyInit | undefined;
  if (corpo instanceof FormData) {
    body = corpo;
  } else if (corpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(corpo);
  }

  let resposta: Response;
  try {
    resposta = await fetch(BASE + caminho, { method: metodo, headers, body });
  } catch {
    throw new ApiError(0, "Não foi possível ligar ao servidor. Verifique se a API está a correr.");
  }

  if (resposta.status === 401 && caminho !== "/auth/login") {
    sessao.limpar();
    aoExpirar();
    throw new ApiError(401, "Sessão expirada. Entre novamente.");
  }
  if (!resposta.ok) {
    const { mensagem, campos } = await mensagemDeErro(resposta);
    throw new ApiError(resposta.status, mensagem, campos);
  }
  return resposta;
}

async function json<T>(metodo: string, caminho: string, corpo?: Corpo): Promise<T> {
  const resposta = await pedido(metodo, caminho, corpo);
  if (resposta.status === 204) return null as T;
  return (await resposta.json()) as T;
}

/** Constrói "?a=1&b=2" ignorando valores vazios. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== "" && valor !== null && valor !== undefined) p.set(chave, String(valor));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  get: <T>(caminho: string) => json<T>("GET", caminho),
  post: <T>(caminho: string, corpo: Corpo = {}) => json<T>("POST", caminho, corpo),
  patch: <T>(caminho: string, corpo: Corpo) => json<T>("PATCH", caminho, corpo),
  delete: <T = null>(caminho: string) => json<T>("DELETE", caminho),

  async upload<T>(caminho: string, ficheiro: File): Promise<T> {
    const dados = new FormData();
    dados.append("ficheiro", ficheiro);
    return json<T>("POST", caminho, dados);
  },

  /** Descarrega um ficheiro autenticado (CSV, Excel, PDF). */
  async descarregar(caminho: string, nomePadrao = "documento"): Promise<void> {
    const resposta = await pedido("GET", caminho);
    const nome =
      resposta.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ?? nomePadrao;
    const url = URL.createObjectURL(await resposta.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

/** Formata erros de forma consistente para mostrar em formulários. */
export function mensagemErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return "Ocorreu um erro inesperado.";
}
