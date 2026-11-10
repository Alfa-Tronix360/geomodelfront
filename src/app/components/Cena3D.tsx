/** Carrega os dados 3D de um projecto e mostra o visualizador (three.js carregado sob pedido). */
import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { api } from "@/app/services/api";
import { useFetch } from "@/app/services/useFetch";
import type { CenaProjecto } from "@/app/services/types";
import { EmptyState, ErrorBox, Loading } from "@/app/components/ui";

const Visualizador3D = lazy(() => import("./Visualizador3D"));

export function Cena3D({ projectId, destaque, altura = 520 }: { projectId: string; destaque?: string; altura?: number }) {
  const navegar = useNavigate();
  const cena = useFetch<CenaProjecto>(() => api.get(`/projects/${projectId}/scene-3d`), [projectId]);

  if (cena.carregando) return <div style={{ height: altura, display: "grid", placeItems: "center" }}><Loading texto="A preparar a vista 3D…" /></div>;
  if (cena.erro) return <ErrorBox mensagem={cena.erro} aoTentar={cena.recarregar} />;
  const dados = cena.dados!;

  return (
    <div className="stack" style={{ gap: 10 }}>
      {dados.furos.length === 0 ? (
        <EmptyState
          titulo="Sem furos para desenhar"
          descricao="Registe furos com coordenadas X, Y e Z (collar) para os ver em 3D."
          icone={<Box size={24} />}
        />
      ) : (
        <Suspense fallback={<div style={{ height: altura, display: "grid", placeItems: "center" }}><Loading texto="A carregar o motor 3D…" /></div>}>
          <Visualizador3D
            cena={dados}
            destaque={destaque}
            altura={altura}
            aoAbrirFuro={(id) => navegar(`/sondagens/${id}`)}
          />
        </Suspense>
      )}
      {dados.sem_coordenadas.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
          Não desenhados por falta de coordenadas do collar: {dados.sem_coordenadas.join(", ")}.
        </p>
      )}
    </div>
  );
}
