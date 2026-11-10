import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type TipoToast = "ok" | "err" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensagem?: string;
}

interface ContextoToast {
  sucesso: (mensagem: string, titulo?: string) => void;
  erro: (mensagem: string, titulo?: string) => void;
  info: (mensagem: string, titulo?: string) => void;
}

const Contexto = createContext<ContextoToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const contador = useRef(0);

  const remover = useCallback((id: number) => {
    setToasts((actuais) => actuais.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo: TipoToast, mensagem: string, titulo?: string) => {
      const id = ++contador.current;
      const toast: Toast = {
        id,
        tipo,
        titulo: titulo ?? (tipo === "ok" ? "Operação concluída" : tipo === "err" ? "Não foi possível" : "Informação"),
        mensagem,
      };
      setToasts((actuais) => [...actuais.slice(-3), toast]);
      window.setTimeout(() => remover(id), 5200);
    },
    [remover],
  );

  const valor = useMemo<ContextoToast>(
    () => ({
      sucesso: (mensagem, titulo) => adicionar("ok", mensagem, titulo),
      erro: (mensagem, titulo) => adicionar("err", mensagem, titulo),
      info: (mensagem, titulo) => adicionar("info", mensagem, titulo),
    }),
    [adicionar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tipo}`}>
            <span className="toast__icon">
              {toast.tipo === "ok" ? <CheckCircle2 size={18} /> : toast.tipo === "err" ? <AlertTriangle size={18} /> : <Info size={18} />}
            </span>
            <div className="toast__body">
              <strong>{toast.titulo}</strong>
              {toast.mensagem && <span>{toast.mensagem}</span>}
            </div>
            <button className="toast__close" onClick={() => remover(toast.id)} aria-label="Fechar">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return contexto;
}
