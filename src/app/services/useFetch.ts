import { useCallback, useEffect, useRef, useState } from "react";
import { mensagemErro } from "./api";

interface EstadoFetch<T> {
  dados: T | null;
  erro: string | null;
  carregando: boolean;
  recarregar: () => void;
}

/**
 * Executa uma consulta à API e expõe dados, erro e recarregamento.
 * As dependências controlam quando a consulta é repetida.
 */
export function useFetch<T>(
  consulta: () => Promise<T>,
  dependencias: unknown[],
  opcoes: { manterDados?: boolean } = {},
): EstadoFetch<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tick, setTick] = useState(0);
  const consultaRef = useRef(consulta);
  consultaRef.current = consulta;
  const manterRef = useRef(opcoes.manterDados ?? false);
  manterRef.current = opcoes.manterDados ?? false;

  useEffect(() => {
    let activo = true;
    setCarregando(true);
    setErro(null);
    if (!manterRef.current) setDados(null);
    consultaRef
      .current()
      .then((resultado) => {
        if (activo) setDados(resultado);
      })
      .catch((e) => {
        if (activo) setErro(mensagemErro(e));
      })
      .finally(() => {
        if (activo) setCarregando(false);
      });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, tick]);

  const recarregar = useCallback(() => setTick((t) => t + 1), []);
  return { dados, erro, carregando, recarregar };
}
