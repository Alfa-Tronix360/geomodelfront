/**
 * Visualizador 3D de sondagens (three.js).
 *
 * Desenha cada furo como um tubo ao longo da trajectória calculada, colorido por litologia
 * ou pelo teor das amostras. Rodar: arrastar · Aproximar: roda do rato / pinça · Deslocar: botão
 * direito ou dois dedos. Este módulo é carregado sob pedido para não pesar no resto da aplicação.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Maximize2, Minimize2, RotateCcw, Rotate3d, Tag } from "lucide-react";
import type { CenaProjecto, FuroCena, PontoTrajectoria } from "@/app/services/types";

export interface Visualizador3DProps {
  cena: CenaProjecto;
  /** Furo a realçar (os restantes ficam esbatidos). */
  destaque?: string;
  altura?: number;
  aoAbrirFuro?: (id: string) => void;
}

type Modo = "litologia" | string; // string = parâmetro de teor

const SEM_DADOS = "#5b7177";
const PALETA_LITO = ["#e0a458", "#7bb662", "#c9ccd1", "#5aa9e6", "#c77dff", "#f2c14e", "#e76f51", "#2ec4b6"];
// rampa sequencial (baixo → alto teor)
const RAMPA = ["#2b4c7e", "#1f8a9c", "#3fb27f", "#c7d93b", "#f6b93b", "#e8553b"];

function corRampa(t: number): string {
  const v = Math.min(1, Math.max(0, t)) * (RAMPA.length - 1);
  const i = Math.floor(v);
  const a = new THREE.Color(RAMPA[i]);
  const b = new THREE.Color(RAMPA[Math.min(i + 1, RAMPA.length - 1)]);
  return `#${a.lerp(b, v - i).getHexString()}`;
}

/** Posição ao longo da trajectória para uma profundidade (interpolação linear). */
function posicaoEm(pontos: PontoTrajectoria[], d: number): PontoTrajectoria {
  if (d <= pontos[0].profundidade) return pontos[0];
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1];
    const b = pontos[i];
    if (d <= b.profundidade) {
      const t = (d - a.profundidade) / (b.profundidade - a.profundidade || 1);
      return { profundidade: d, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
  }
  return pontos[pontos.length - 1];
}

function troco(pontos: PontoTrajectoria[], de: number, ate: number): PontoTrajectoria[] {
  return [posicaoEm(pontos, de), ...pontos.filter((p) => p.profundidade > de && p.profundidade < ate), posicaoEm(pontos, ate)];
}

interface Troco { de: number; ate: number; cor: string; rotulo: string }

/** Divide o furo em troços coloridos, preenchendo as lacunas com cinzento. */
function trocos(furo: FuroCena, modo: Modo, gama: { minimo: number; maximo: number } | undefined,
                corLito: (codigo: string | null, cor: string | null) => string): Troco[] {
  const base: Troco[] = modo === "litologia"
    ? furo.intervalos.map((i) => ({
        de: i.de, ate: i.ate, cor: corLito(i.litologia_codigo, i.cor),
        rotulo: i.litologia_nome ? `${i.litologia_codigo} · ${i.litologia_nome}` : "Sem litologia",
      }))
    : furo.amostras.filter((a) => a.teores[modo] !== undefined).map((a) => {
        const v = a.teores[modo];
        const t = gama && gama.maximo > gama.minimo ? (v - gama.minimo) / (gama.maximo - gama.minimo) : 0.5;
        return { de: a.de, ate: a.ate, cor: corRampa(t), rotulo: `${a.codigo} · ${modo} ${v}` };
      });
  const ordenados = base.filter((t) => t.ate > t.de).sort((a, b) => a.de - b.de);
  const resultado: Troco[] = [];
  let cursor = 0;
  for (const t of ordenados) {
    if (t.de > cursor) resultado.push({ de: cursor, ate: t.de, cor: SEM_DADOS, rotulo: "Sem registo" });
    resultado.push({ ...t, de: Math.max(t.de, cursor) });
    cursor = Math.max(cursor, t.ate);
  }
  if (cursor < furo.profundidade) resultado.push({ de: cursor, ate: furo.profundidade, cor: SEM_DADOS, rotulo: "Sem registo" });
  return resultado;
}

export default function Visualizador3D({ cena, destaque, altura = 520, aoAbrirFuro }: Visualizador3DProps) {
  const contentor = useRef<HTMLDivElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const [modo, setModo] = useState<Modo>("litologia");
  const [rotulos, setRotulos] = useState(true);
  const [rodar, setRodar] = useState(false);
  const [ecraInteiro, setEcraInteiro] = useState(false);
  const [dica, setDica] = useState<{ x: number; y: number; furo: string; texto: string } | null>(null);
  const [seleccionado, setSeleccionado] = useState<FuroCena | null>(null);
  const rodarRef = useRef(rodar);
  rodarRef.current = rodar;
  const rotulosRef = useRef(rotulos);
  rotulosRef.current = rotulos;
  const cenaRef = useRef<THREE.Scene | null>(null);

  // cores estáveis por litologia: a cor registada ou uma da paleta
  const corLito = useMemo(() => {
    const atribuidas = new Map<string, string>();
    return (codigo: string | null, cor: string | null) => {
      if (cor) return cor;
      if (!codigo) return SEM_DADOS;
      if (!atribuidas.has(codigo)) atribuidas.set(codigo, PALETA_LITO[atribuidas.size % PALETA_LITO.length]);
      return atribuidas.get(codigo)!;
    };
  }, []);

  const legenda = useMemo(() => {
    if (modo !== "litologia") return null;
    const mapa = new Map<string, { cor: string; nome: string }>();
    for (const f of cena.furos) for (const i of f.intervalos) {
      const chave = i.litologia_codigo ?? "—";
      if (!mapa.has(chave)) mapa.set(chave, { cor: corLito(i.litologia_codigo, i.cor), nome: i.litologia_nome ?? "Sem litologia" });
    }
    return [...mapa.entries()];
  }, [cena, modo, corLito]);

  const gama = cena.parametros.find((p) => p.parametro === modo);

  useEffect(() => {
    const el = contentor.current;
    if (!el || cena.furos.length === 0) return;

    // --- referencial: centro dos collars, cota do collar mais alto no zero
    const collars = cena.furos.map((f) => f.pontos[0]);
    const cx = collars.reduce((s, p) => s + p.x, 0) / collars.length;
    const cy = collars.reduce((s, p) => s + p.y, 0) / collars.length;
    const cz = Math.max(...collars.map((p) => p.z));
    const v3 = (p: PontoTrajectoria) => new THREE.Vector3(p.x - cx, p.z - cz, -(p.y - cy));

    const todos = cena.furos.flatMap((f) => f.pontos.map(v3));
    const caixa = new THREE.Box3().setFromPoints(todos);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const extensao = Math.max(tamanho.x, tamanho.y, tamanho.z, 20);
    const raio = Math.max(extensao * 0.011, 0.5);

    // --- cena, câmara, renderizadores
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a1d24");
    scene.fog = new THREE.Fog("#0a1d24", extensao * 3, extensao * 7);
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, extensao / 1000, extensao * 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.domElement.setAttribute("aria-label", "Vista 3D das sondagens do projecto");
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);
    const etiquetas = new CSS2DRenderer();
    etiquetas.setSize(el.clientWidth, el.clientHeight);
    etiquetas.domElement.className = "v3d__labels";
    el.appendChild(etiquetas.domElement);

    scene.add(new THREE.HemisphereLight("#cfe8ff", "#20323a", 1.3));
    const sol = new THREE.DirectionalLight("#ffffff", 1.6);
    sol.position.set(extensao, extensao * 1.5, extensao * 0.6);
    scene.add(sol);

    // --- superfície de referência (cota do collar) com grelha
    const centro = caixa.getCenter(new THREE.Vector3());
    const lado = Math.ceil((Math.max(tamanho.x, tamanho.z) + extensao * 0.6) / 10) * 10;
    const grelha = new THREE.GridHelper(lado, 10, "#2f6b6a", "#1d3f45");
    grelha.position.set(centro.x, 0.01, centro.z);
    scene.add(grelha);
    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(lado, lado),
      new THREE.MeshBasicMaterial({ color: "#2dd4bf", transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(centro.x, 0, centro.z);
    scene.add(chao);

    // seta do Norte e escala
    const norte = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(centro.x - lado / 2, 0.05, centro.z + lado / 2),
      lado * 0.15, "#fbbf24", lado * 0.04, lado * 0.025);
    scene.add(norte);
    const n = document.createElement("span");
    n.className = "v3d__north";
    n.textContent = "N";
    const nObj = new CSS2DObject(n);
    nObj.position.set(centro.x - lado / 2, 0.05, centro.z + lado / 2 - lado * 0.18);
    scene.add(nObj);

    // --- furos
    const alvos: THREE.Object3D[] = [];
    for (const furo of cena.furos) {
      const esbatido = destaque !== undefined && furo.id !== destaque;
      const grupo = new THREE.Group();
      for (const t of trocos(furo, modo, gama, corLito)) {
        const pts = troco(furo.pontos, t.de, t.ate).map(v3);
        if (pts.length < 2 || pts[0].distanceTo(pts[pts.length - 1]) < 1e-3) continue;
        const caminho = new THREE.CurvePath<THREE.Vector3>();
        for (let i = 1; i < pts.length; i++) caminho.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
        const semRegisto = t.cor === SEM_DADOS;
        const r = semRegisto ? raio * 0.55 : raio;
        const malha = new THREE.Mesh(
          new THREE.TubeGeometry(caminho, Math.max(2, (pts.length - 1) * 2), r, 10, false),
          new THREE.MeshStandardMaterial({
            color: t.cor, roughness: 0.55, metalness: 0.05,
            transparent: esbatido, opacity: esbatido ? 0.22 : 1,
          }),
        );
        malha.userData = { furo, texto: `${t.de.toFixed(1)}–${t.ate.toFixed(1)} m · ${t.rotulo}` };
        grupo.add(malha);
        alvos.push(malha);
      }
      // collar
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(raio * 2.2, raio * 2.2, raio * 1.2, 20),
        new THREE.MeshStandardMaterial({ color: esbatido ? "#40585e" : "#e8f2ef", transparent: esbatido, opacity: esbatido ? 0.4 : 1 }),
      );
      collar.position.copy(v3(furo.pontos[0]));
      collar.userData = { furo, texto: `Collar · cota ${furo.pontos[0].z.toFixed(1)} m` };
      grupo.add(collar);
      alvos.push(collar);
      // etiqueta
      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = `v3d__tag${esbatido ? " is-dim" : ""}${furo.id === destaque ? " is-focus" : ""}`;
      tag.textContent = furo.codigo;
      tag.addEventListener("click", () => setSeleccionado(furo));
      const tagObj = new CSS2DObject(tag);
      tagObj.position.copy(v3(furo.pontos[0])).add(new THREE.Vector3(0, raio * 6, 0));
      tagObj.userData.etiqueta = true;
      grupo.add(tagObj);
      scene.add(grupo);
    }
    scene.traverse((o) => { if (o.userData.etiqueta) o.visible = rotulosRef.current; });
    cenaRef.current = scene;

    // --- câmara e controlos
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 0.8;
    const foco = destaque ? cena.furos.find((f) => f.id === destaque) : undefined;
    const alvoInicial = foco
      ? new THREE.Box3().setFromPoints(foco.pontos.map(v3)).getCenter(new THREE.Vector3())
      : centro.clone();
    const posInicial = alvoInicial.clone().add(new THREE.Vector3(extensao * 0.9, extensao * 0.65, extensao * 1.1));
    const repor = () => {
      camera.position.copy(posInicial);
      controls.target.copy(alvoInicial);
      controls.update();
    };
    repor();
    resetRef.current = repor;

    // --- interacção: dica ao passar e selecção ao clicar
    const raycaster = new THREE.Raycaster();
    const rato = new THREE.Vector2();
    let arrasto = 0;
    const tocar = (ev: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      rato.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(rato, camera);
      const hit = raycaster.intersectObjects(alvos, false)[0];
      return { hit, x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const mover = (ev: PointerEvent) => {
      if (ev.buttons) { arrasto++; setDica(null); return; }
      const { hit, x, y } = tocar(ev);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      setDica(hit ? { x, y, furo: (hit.object.userData.furo as FuroCena).codigo, texto: hit.object.userData.texto } : null);
    };
    const baixar = () => { arrasto = 0; };
    const levantar = (ev: PointerEvent) => {
      if (arrasto > 3) return;
      const { hit } = tocar(ev);
      setSeleccionado(hit ? (hit.object.userData.furo as FuroCena) : null);
    };
    const sair = () => setDica(null);
    renderer.domElement.addEventListener("pointermove", mover);
    renderer.domElement.addEventListener("pointerdown", baixar);
    renderer.domElement.addEventListener("pointerup", levantar);
    renderer.domElement.addEventListener("pointerleave", sair);

    // --- ciclo e redimensionamento
    let frame = 0;
    const ciclo = () => {
      controls.autoRotate = rodarRef.current;
      controls.update();
      renderer.render(scene, camera);
      etiquetas.render(scene, camera);
      frame = requestAnimationFrame(ciclo);
    };
    ciclo();
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      etiquetas.setSize(w, h);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", mover);
      renderer.domElement.removeEventListener("pointerdown", baixar);
      renderer.domElement.removeEventListener("pointerup", levantar);
      renderer.domElement.removeEventListener("pointerleave", sair);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      el.removeChild(etiquetas.domElement);
    };
  }, [cena, modo, destaque, gama, corLito]);

  useEffect(() => {
    cenaRef.current?.traverse((o) => { if (o.userData.etiqueta) o.visible = rotulos; });
  }, [rotulos]);

  // ecrã inteiro
  useEffect(() => {
    const mudar = () => setEcraInteiro(document.fullscreenElement === moldura.current);
    document.addEventListener("fullscreenchange", mudar);
    return () => document.removeEventListener("fullscreenchange", mudar);
  }, []);
  const alternarEcra = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void moldura.current?.requestFullscreen?.();
  };

  return (
    <div className={`v3d${ecraInteiro ? " is-full" : ""}`} ref={moldura}>
      <div className="v3d__bar">
        <label className="v3d__mode">
          <span>Cor</span>
          <select className="select" value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="litologia">Litologia</option>
            {cena.parametros.map((p) => (
              <option key={p.parametro} value={p.parametro}>Teor {p.parametro} ({p.unidade})</option>
            ))}
          </select>
        </label>
        <div className="row" style={{ gap: 4, marginLeft: "auto" }}>
          <button type="button" className={`btn btn--ghost btn--icon${rotulos ? " is-on" : ""}`} onClick={() => setRotulos((v) => !v)}
            aria-pressed={rotulos} title="Mostrar códigos dos furos" aria-label="Mostrar códigos dos furos"><Tag size={16} /></button>
          <button type="button" className={`btn btn--ghost btn--icon${rodar ? " is-on" : ""}`} onClick={() => setRodar((v) => !v)}
            aria-pressed={rodar} title="Rotação automática" aria-label="Rotação automática"><Rotate3d size={16} /></button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => resetRef.current()}
            title="Repor vista" aria-label="Repor vista"><RotateCcw size={16} /></button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={alternarEcra}
            title={ecraInteiro ? "Sair do ecrã inteiro" : "Ecrã inteiro"} aria-label="Ecrã inteiro">
            {ecraInteiro ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="v3d__stage" style={{ height: ecraInteiro ? undefined : altura }}>
        <div className="v3d__canvas" ref={contentor} />

        {dica && (
          <div className="v3d__tip" style={{ left: dica.x + 14, top: dica.y + 14 }}>
            <strong>{dica.furo}</strong>
            <span>{dica.texto}</span>
          </div>
        )}

        <div className="v3d__legend">
          {legenda ? (
            <>
              <span className="v3d__legend-title">Litologia</span>
              {legenda.map(([codigo, l]) => (
                <span key={codigo} className="v3d__legend-item"><i style={{ background: l.cor }} />{codigo !== "—" ? `${codigo} · ${l.nome}` : l.nome}</span>
              ))}
              <span className="v3d__legend-item"><i style={{ background: SEM_DADOS }} />Sem registo</span>
            </>
          ) : gama ? (
            <>
              <span className="v3d__legend-title">Teor {gama.parametro} ({gama.unidade})</span>
              <span className="v3d__ramp" style={{ background: `linear-gradient(90deg, ${RAMPA.join(",")})` }} />
              <span className="v3d__ramp-scale"><span>{gama.minimo}</span><span>{gama.maximo}</span></span>
              <span className="v3d__legend-item"><i style={{ background: SEM_DADOS }} />Sem análise</span>
            </>
          ) : null}
        </div>

        {seleccionado && (
          <div className="v3d__card">
            <div>
              <strong>{seleccionado.codigo}</strong>
              <span>{seleccionado.profundidade.toFixed(1)} m · {seleccionado.intervalos.length} intervalo(s) · {seleccionado.amostras.length} amostra(s)</span>
            </div>
            {aoAbrirFuro && seleccionado.id !== destaque && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => aoAbrirFuro(seleccionado.id)}>Abrir furo</button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSeleccionado(null)} aria-label="Fechar">✕</button>
          </div>
        )}

        <p className="v3d__help">Arrastar para rodar · roda do rato para aproximar · botão direito para deslocar</p>
      </div>
    </div>
  );
}
