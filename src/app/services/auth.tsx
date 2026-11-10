import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, mensagemErro, sessao } from "./api";
import type { EmpresaResumo, PerfilSessao, Sessao, Utilizador } from "./types";

interface EstadoPendente {
  utilizador: Utilizador;
  empresas: EmpresaResumo[];
}

interface ContextoAuth {
  carregando: boolean;
  sessao: PerfilSessao | null;
  empresas: EmpresaResumo[];
  empresaActual: EmpresaResumo | null;
  pendente: EstadoPendente | null;
  erro: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  escolherEmpresa: (empresaId: string) => Promise<void>;
  mudarEmpresa: (empresaId: string) => Promise<void>;
  sair: () => void;
  pode: (modulo: string, accao?: string) => boolean;
  eSuperadmin: boolean;
  recarregar: () => Promise<void>;
}

const Contexto = createContext<ContextoAuth | null>(null);
const CHAVE_SESSAO = "geomodel.session";

function lerSessao(): { utilizador: Utilizador; empresas: EmpresaResumo[] } | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function guardarSessao(valor: { utilizador: Utilizador; empresas: EmpresaResumo[] } | null) {
  try {
    if (valor) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(valor));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* armazenamento indisponível */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilSessao | null>(null);
  const [pendente, setPendente] = useState<EstadoPendente | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregarPerfil = useCallback(async () => {
    const dados = await api.get<PerfilSessao>("/auth/me");
    setPerfil(dados);
    setPendente(null);
    guardarSessao({ utilizador: dados.utilizador, empresas: dados.empresas });
  }, []);

  useEffect(() => {
    sessao.aoExpirar(() => {
      setPerfil(null);
      setPendente(null);
      guardarSessao(null);
    });

    const arrancar = async () => {
      const token = sessao.token;
      if (!token) {
        setCarregando(false);
        return;
      }
      const guardada = lerSessao();
      const empresa = sessao.empresa;
      try {
        if (!empresa && guardada && guardada.empresas.length > 0) {
          if (guardada.empresas.length === 1 || guardada.utilizador.superadmin) {
            sessao.definirEmpresa(guardada.empresas[0].id);
          } else {
            setPendente({ utilizador: guardada.utilizador, empresas: guardada.empresas });
            return;
          }
        }
        await carregarPerfil();
      } catch (e) {
        if (e instanceof Error && e.message.includes("Sessão expirada")) {
          sessao.limpar();
          guardarSessao(null);
        } else {
          setErro(mensagemErro(e));
        }
      } finally {
        setCarregando(false);
      }
    };
    void arrancar();
  }, [carregarPerfil]);

  const entrar = useCallback(async (email: string, senha: string) => {
    setErro(null);
    const dados = await api.post<Sessao>("/auth/login", { email: email.trim(), senha });
    sessao.definirToken(dados.access_token);
    guardarSessao({ utilizador: dados.utilizador, empresas: dados.empresas });
    if (dados.empresa_actual) {
      sessao.definirEmpresa(dados.empresa_actual.id);
      await carregarPerfil();
      return;
    }
    if (dados.empresas.length > 0) {
      if (dados.empresas.length === 1 || dados.utilizador.superadmin) {
        sessao.definirEmpresa(dados.empresas[0].id);
        await carregarPerfil();
        return;
      }
      setPendente({ utilizador: dados.utilizador, empresas: dados.empresas });
      return;
    }
    await carregarPerfil();
  }, [carregarPerfil]);

  const escolherEmpresa = useCallback(async (empresaId: string) => {
    sessao.definirEmpresa(empresaId);
    await carregarPerfil();
  }, [carregarPerfil]);

  const mudarEmpresa = useCallback(async (empresaId: string) => {
    sessao.definirEmpresa(empresaId);
    setCarregando(true);
    try {
      await carregarPerfil();
    } finally {
      setCarregando(false);
    }
  }, [carregarPerfil]);

  const sair = useCallback(() => {
    sessao.limpar();
    guardarSessao(null);
    setPerfil(null);
    setPendente(null);
    setErro(null);
  }, []);

  const pode = useCallback(
    (modulo: string, accao = "view") => {
      if (!perfil) return false;
      if (perfil.permissoes.includes("*")) return true;
      return perfil.permissoes.includes(`${modulo}:${accao}`);
    },
    [perfil],
  );

  const valor = useMemo<ContextoAuth>(
    () => ({
      carregando,
      sessao: perfil,
      empresas: perfil?.empresas ?? pendente?.empresas ?? [],
      empresaActual: perfil?.empresa_actual ?? null,
      pendente,
      erro,
      entrar,
      escolherEmpresa,
      mudarEmpresa,
      sair,
      pode,
      eSuperadmin: Boolean(perfil?.utilizador.superadmin),
      recarregar: carregarPerfil,
    }),
    [carregando, perfil, pendente, erro, entrar, escolherEmpresa, mudarEmpresa, sair, pode, carregarPerfil],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return contexto;
}
