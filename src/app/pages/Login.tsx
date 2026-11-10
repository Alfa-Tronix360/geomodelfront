import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import hero from "@/assets/hero-geology.svg";
import { useAuth } from "@/app/services/auth";
import { mensagemErro } from "@/app/services/api";
import { BrandMark } from "@/app/components/ui";

/** As credenciais de demonstração só aparecem em desenvolvimento ou quando
 *  VITE_MOSTRAR_DEMO=true — nunca num build de produção por omissão. */
const MOSTRAR_DEMO = import.meta.env.DEV || import.meta.env.VITE_MOSTRAR_DEMO === "true";
const DEMO = { email: "gestor@clacs.ao", senha: "Demo12345" };

export default function Login() {
  const { entrar, sessao, carregando } = useAuth();
  const navegar = useNavigate();
  const destino = (useLocation().state as { de?: string } | null)?.de ?? "/";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (!carregando && sessao) return <Navigate to="/" replace />;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado) return;
    setErro("");
    setOcupado(true);
    try {
      await entrar(email, senha);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  function verificarCaps(evento: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(evento.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <div className="auth">
      <aside className="auth__art">
        <img src={hero} alt="" aria-hidden />
        <div className="auth__art-top">
          <BrandMark tamanho={40} />
          <div className="auth__art-brand">
            <strong>CLACS GeoModel</strong>
            <span>Geologia mineira</span>
          </div>
        </div>
        <div className="auth__art-content">
          <span className="hero__badge"><i /> Plataforma de geologia mineira</span>
          <h1>Do testemunho à reserva, num só lugar.</h1>
          <p>
            Centralize projectos, sondagens, amostras, resultados laboratoriais e modelos 3D.
            Decida com dados validados e auditáveis.
          </p>
          <dl className="auth__stats">
            <div className="auth__stat"><dd>20</dd><dt>Módulos</dt></div>
            <div className="auth__stat"><dd>100%</dd><dt>Rastreável</dt></div>
            <div className="auth__stat"><dd>Kz</dd><dt>Moeda local</dt></div>
          </dl>
        </div>
      </aside>

      <main className="auth__panel">
        <form className="auth__form" onSubmit={submeter}>
          <header className="auth__head">
            <div className="auth__brand">
              <BrandMark />
              <div>
                <strong>CLACS GeoModel</strong>
                <span>Acesso à plataforma</span>
              </div>
            </div>
            <h2>Iniciar sessão</h2>
            <p className="sub">Entre com as credenciais da sua empresa para continuar.</p>
          </header>

          {erro && (
            <div className="alert alert--danger" role="alert" aria-live="assertive">
              <AlertCircle size={16} style={{ flex: "none", marginTop: 1 }} />
              <span>{erro}</span>
            </div>
          )}

          <div className="auth__field">
            <label htmlFor="login-email">E-mail</label>
            <div className="auth-input">
              <Mail size={17} aria-hidden />
              <input
                id="login-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.ao"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="auth__field">
            <label htmlFor="login-senha">Senha</label>
            <div className="auth-input">
              <KeyRound size={17} aria-hidden />
              <input
                id="login-senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyUp={verificarCaps}
                onKeyDown={verificarCaps}
                onBlur={() => setCapsLock(false)}
                placeholder="A sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-input__toggle"
                onClick={() => setMostrarSenha((visivel) => !visivel)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={mostrarSenha}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {capsLock && <span className="auth__hint auth__hint--warn">Caps Lock está activado.</span>}
          </div>

          <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={ocupado}>
            {ocupado ? (
              <><span className="spinner spinner--light" aria-hidden /> A entrar…</>
            ) : (
              <>Entrar na plataforma <ArrowRight size={17} /></>
            )}
          </button>

          <p className="auth__help">
            Esqueceu a senha ou não tem acesso? Contacte o administrador da sua empresa.
          </p>

          {MOSTRAR_DEMO && (
            <div className="auth__demo">
              <div>
                <strong>Conta de demonstração</strong>
                <span><code>{DEMO.email}</code> · <code>{DEMO.senha}</code></span>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => { setEmail(DEMO.email); setSenha(DEMO.senha); }}
              >
                Preencher
              </button>
            </div>
          )}

          <footer className="auth__foot">
            <span><Lock size={12} aria-hidden /> Ligação protegida</span>
            <span>© {new Date().getFullYear()} CLACS</span>
          </footer>
        </form>
      </main>
    </div>
  );
}
