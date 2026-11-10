import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, FolderKanban, LayoutDashboard } from "lucide-react";
import { BrandMark, Card } from "@/app/components/ui";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="page">
      <Card>
        <div
          className="stack"
          style={{ alignItems: "center", textAlign: "center", padding: "34px 18px 28px", gap: 0 }}
        >
          <div className="row" style={{ gap: 11, marginBottom: 18 }}>
            <BrandMark tamanho={38} />
            <strong style={{ letterSpacing: "-0.02em" }}>CLACS GeoModel</strong>
          </div>

          <div
            style={{
              width: 116,
              height: 116,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "var(--primary-soft)",
              border: "1px solid var(--line)",
              color: "var(--primary)",
              marginBottom: 18,
            }}
            aria-hidden
          >
            <Compass size={52} strokeWidth={1.4} />
          </div>

          <span className="eyebrow" style={{ marginBottom: 6 }}>Erro 404</span>
          <h1 className="page-title" style={{ fontSize: "clamp(26px, 4vw, 38px)" }}>
            Esta página não foi encontrada
          </h1>
          <p className="page-sub" style={{ maxWidth: 520 }}>
            O endereço <span className="mono">{pathname}</span> não existe ou foi movido. Verifique o link ou
            regresse a uma área da plataforma.
          </p>

          <div className="row" style={{ justifyContent: "center", gap: 9, marginTop: 22 }}>
            <Link className="btn btn--primary" to="/">
              <LayoutDashboard size={15} /> Ir para o dashboard
            </Link>
            <Link className="btn btn--secondary" to="/projectos">
              <FolderKanban size={15} /> Ver projectos
            </Link>
            <button className="btn btn--ghost" type="button" onClick={() => history.back()}>
              <ArrowLeft size={15} /> Voltar
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
