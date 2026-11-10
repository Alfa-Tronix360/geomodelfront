import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/app/services/auth";
import { AppLayout, SeletorEmpresa } from "@/app/layouts/AppLayout";
import { BrandMark, Card, EmptyState, PageHeader } from "@/app/components/ui";
import Login from "@/app/pages/Login";
import NotFound from "@/app/pages/NotFound";
import DashboardPage from "@/app/pages/Dashboard";
import ProjectsPage from "@/app/pages/Projects";
import ProjectDetailPage from "@/app/pages/ProjectDetail";
import DrillHolesPage from "@/app/pages/DrillHoles";
import DrillHoleDetailPage from "@/app/pages/DrillHoleDetail";
import SamplesPage from "@/app/pages/Samples";
import LaboratoriesPage from "@/app/pages/Laboratories";
import AssaysPage from "@/app/pages/Assays";
import ModelsPage from "@/app/pages/Models";
import ModelDetailPage from "@/app/pages/ModelDetail";
import ResourcesPage from "@/app/pages/Resources";
import ImportsPage from "@/app/pages/Imports";
import UsersPage from "@/app/pages/Users";
import RolesPage from "@/app/pages/Roles";
import AuditPage from "@/app/pages/Audit";
import CompaniesPage from "@/app/pages/Companies";
import SettingsPage from "@/app/pages/Settings";

/* ------------------------------------------------------------------ ecrãs de contexto */
function EcraCarregamento() {
  return (
    <div className="auth" style={{ gridTemplateColumns: "1fr" }}>
      <div className="auth__panel">
        <div className="auth__form" style={{ justifyItems: "center", textAlign: "center" }}>
          <BrandMark tamanho={54} />
          <div>
            <strong style={{ display: "block", fontSize: 18, letterSpacing: "-0.02em" }}>CLACS GeoModel</strong>
            <span className="muted" style={{ fontSize: 12 }}>A preparar a sua sessão…</span>
          </div>
          <span className="spinner" style={{ width: 22, height: 22 }} />
        </div>
      </div>
    </div>
  );
}

function SemAcesso({ modulo }: { modulo: string }) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Acesso restrito"
        titulo="Sem permissão de acesso"
        sub="O seu perfil não inclui a permissão necessária para abrir este módulo. Peça a um administrador para ajustar o perfil."
      />
      <Card>
        <EmptyState
          titulo="Módulo indisponível para o seu perfil"
          descricao={`É necessária a permissão "${modulo}:view" para consultar esta área.`}
          icone={<ShieldX size={24} />}
        />
      </Card>
    </div>
  );
}

function Protegido({ children }: { children: ReactNode }) {
  const { sessao, carregando, pendente } = useAuth();
  const localizacao = useLocation();

  if (carregando) return <EcraCarregamento />;
  if (pendente) return <SeletorEmpresa />;
  if (!sessao) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ de: `${localizacao.pathname}${localizacao.search}` }}
      />
    );
  }
  return <>{children}</>;
}

function ComPermissao({ modulo, children }: { modulo: string; children: ReactNode }) {
  const { pode } = useAuth();
  if (!pode(modulo)) return <SemAcesso modulo={modulo} />;
  return <>{children}</>;
}

function ApenasSuperadmin({ children }: { children: ReactNode }) {
  const { eSuperadmin } = useAuth();
  if (!eSuperadmin) return <SemAcesso modulo="companies" />;
  return <>{children}</>;
}

function Entrada() {
  const { sessao, carregando, pendente } = useAuth();
  if (carregando) return <EcraCarregamento />;
  if (pendente) return <SeletorEmpresa />;
  if (sessao) return <Navigate to="/" replace />;
  return <Login />;
}

/* ------------------------------------------------------------------ rotas */
export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrada />} />

      <Route
        path="/"
        element={
          <Protegido>
            <AppLayout />
          </Protegido>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="projectos"
          element={
            <ComPermissao modulo="projects">
              <ProjectsPage />
            </ComPermissao>
          }
        />
        <Route
          path="projectos/:id"
          element={
            <ComPermissao modulo="projects">
              <ProjectDetailPage />
            </ComPermissao>
          }
        />

        <Route
          path="sondagens"
          element={
            <ComPermissao modulo="drill_holes">
              <DrillHolesPage />
            </ComPermissao>
          }
        />
        <Route
          path="sondagens/:id"
          element={
            <ComPermissao modulo="drill_holes">
              <DrillHoleDetailPage />
            </ComPermissao>
          }
        />

        <Route
          path="amostras"
          element={
            <ComPermissao modulo="samples">
              <SamplesPage />
            </ComPermissao>
          }
        />
        <Route
          path="laboratorios"
          element={
            <ComPermissao modulo="laboratories">
              <LaboratoriesPage />
            </ComPermissao>
          }
        />
        <Route
          path="resultados"
          element={
            <ComPermissao modulo="assays">
              <AssaysPage />
            </ComPermissao>
          }
        />

        <Route
          path="modelos"
          element={
            <ComPermissao modulo="models">
              <ModelsPage />
            </ComPermissao>
          }
        />
        <Route
          path="modelos/:id"
          element={
            <ComPermissao modulo="models">
              <ModelDetailPage />
            </ComPermissao>
          }
        />
        <Route
          path="recursos"
          element={
            <ComPermissao modulo="resources">
              <ResourcesPage />
            </ComPermissao>
          }
        />

        <Route
          path="importacao"
          element={
            <ComPermissao modulo="imports">
              <ImportsPage />
            </ComPermissao>
          }
        />

        <Route
          path="utilizadores"
          element={
            <ComPermissao modulo="users">
              <UsersPage />
            </ComPermissao>
          }
        />
        <Route
          path="perfis"
          element={
            <ComPermissao modulo="users">
              <RolesPage />
            </ComPermissao>
          }
        />
        <Route
          path="auditoria"
          element={
            <ComPermissao modulo="audit">
              <AuditPage />
            </ComPermissao>
          }
        />

        <Route
          path="empresas"
          element={
            <ApenasSuperadmin>
              <CompaniesPage />
            </ApenasSuperadmin>
          }
        />

        <Route path="definicoes" element={<SettingsPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
