/** Sino de notificações: avisos para quem tem de agir no passo seguinte do fluxo. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/app/services/api";
import { tempoRelativo } from "@/app/services/format";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida_em: string | null;
  criado_em: string;
}

const INTERVALO_MS = 60_000;

export function Sino({ empresaId }: { empresaId?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<{ nao_lidas: number; items: Notificacao[] }>({ nao_lidas: 0, items: [] });
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();
  const local = useLocation();

  const carregar = useCallback(async () => {
    try {
      setDados(await api.get("/notifications?limit=20"));
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  // ao entrar, ao mudar de empresa ou de página, e a cada minuto
  useEffect(() => { void carregar(); }, [carregar, empresaId, local.pathname]);
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) void carregar(); }, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  async function abrir(n: Notificacao) {
    setAberto(false);
    if (!n.lida_em) {
      setDados((d) => ({ nao_lidas: Math.max(0, d.nao_lidas - 1), items: d.items.map((x) => x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x) }));
      void api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    }
    if (n.link) navegar(n.link);
  }

  async function lerTodas() {
    setDados((d) => ({ nao_lidas: 0, items: d.items.map((x) => ({ ...x, lida_em: x.lida_em ?? new Date().toISOString() })) }));
    await api.post("/notifications/read-all").catch(() => undefined);
  }

  const n = dados.nao_lidas;
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn keep" aria-label={n ? `Notificações: ${n} por ler` : "Notificações"} title="Notificações"
        aria-expanded={aberto} onClick={() => { setAberto((a) => !a); if (!aberto) void carregar(); }}>
        <Bell size={18} />
        {n > 0 && <span className="sino__contador">{n > 99 ? "99+" : n}</span>}
      </button>
      {aberto && (
        <div className="menu sino">
          <div className="sino__cab">
            <strong>Notificações</strong>
            {n > 0 && <button type="button" className="sino__todas" onClick={() => void lerTodas()}><CheckCheck size={14} /> Marcar todas como lidas</button>}
          </div>
          {erro && <p className="sino__vazio">Não foi possível carregar as notificações.</p>}
          {!erro && dados.items.length === 0 && (
            <p className="sino__vazio">Sem notificações. Quando houver um passo à sua espera (amostra para analisar, resultado para validar…), aparece aqui.</p>
          )}
          <ul className="sino__lista">
            {dados.items.map((item) => (
              <li key={item.id}>
                <button type="button" className={`sino__item${item.lida_em ? "" : " is-nova"}`} onClick={() => void abrir(item)}>
                  <span className="sino__titulo">{item.titulo}</span>
                  {item.mensagem && <span className="sino__msg">{item.mensagem}</span>}
                  <span className="sino__quando">{tempoRelativo(item.criado_em)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
