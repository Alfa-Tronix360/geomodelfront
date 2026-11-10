/** Tipos partilhados, alinhados com os esquemas Pydantic do backend. */

export interface Pagina<T> {
  total: number;
  items: T[];
}

export interface EmpresaResumo {
  id: string;
  nome: string;
  slug: string;
}

export interface Empresa extends EmpresaResumo {
  nif: string | null;
  pais: string;
  provincia: string | null;
  cidade: string | null;
  moeda: string;
  fuso_horario: string;
  activa: boolean;
  criado_em: string;
  actualizado_em: string;
}

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  activo: boolean;
  superadmin: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
}

export interface Sessao {
  access_token: string;
  token_type: string;
  utilizador: Utilizador;
  empresas: EmpresaResumo[];
  empresa_actual: EmpresaResumo | null;
}

export interface PerfilSessao {
  utilizador: Utilizador;
  empresas: EmpresaResumo[];
  empresa_actual: EmpresaResumo | null;
  papel: string | null;
  permissoes: string[];
}

export interface Membro {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role_id: string;
  role_codigo: string;
  role_nome: string;
  activo: boolean;
  criado_em: string;
}

export interface Perfil {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  sistema: boolean;
  permissoes: string[];
}

export interface Permissao {
  id: string;
  modulo: string;
  accao: string;
  descricao: string | null;
}

export interface Projecto {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  mineral: string | null;
  concessao: string | null;
  pais: string;
  provincia: string | null;
  municipio: string | null;
  area_km2: number | null;
  geometria: GeoJSON | null;
  estado: string;
  data_inicio: string | null;
  data_fim: string | null;
  gestor_id: string | null;
  criado_em: string;
  actualizado_em: string;
  eliminado_em: string | null;
}

export interface GeoJSON {
  type: string;
  coordinates?: unknown;
}

export interface AreaProjecto {
  id: string;
  company_id: string;
  project_id: string;
  nome: string;
  descricao: string | null;
  area_km2: number | null;
  geometria: GeoJSON | null;
  criado_em: string;
  actualizado_em: string;
}

export interface Litologia {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  activo: boolean;
  criado_em: string;
  actualizado_em: string;
}

export interface Furo {
  id: string;
  company_id: string;
  project_id: string;
  codigo: string;
  nome: string | null;
  tipo: string;
  estado: string;
  x: number | null;
  y: number | null;
  z: number | null;
  latitude: number | null;
  longitude: number | null;
  azimute: number | null;
  inclinacao: number | null;
  profundidade_prevista: number | null;
  profundidade_final: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  sonda: string | null;
  geologo_id: string | null;
  notas: string | null;
  criado_em: string;
  actualizado_em: string;
  eliminado_em: string | null;
}

export interface FuroDetalhe extends Furo {
  projecto_codigo: string | null;
  projecto_nome: string | null;
  num_surveys: number;
  num_intervalos: number;
  num_amostras: number;
}

export interface Survey {
  id: string;
  company_id: string;
  drill_hole_id: string;
  profundidade: number;
  azimute: number;
  inclinacao: number;
  metodo: string | null;
  criado_em: string;
}

export interface Intervalo {
  id: string;
  company_id: string;
  drill_hole_id: string;
  de: number;
  ate: number;
  lithology_id: string | null;
  alteracao: string | null;
  descricao: string | null;
  recuperacao_pct: number | null;
  rqd_pct: number | null;
  criado_em: string;
  actualizado_em: string;
}

export interface PontoTrajectoria {
  profundidade: number;
  x: number;
  y: number;
  z: number;
}

export interface Trajectoria {
  drill_hole_id: string;
  collar: PontoTrajectoria | null;
  comprimento: number;
  pontos: PontoTrajectoria[];
}

/** Dados da visualização 3D de um projecto (GET /projects/{id}/scene-3d). */
export interface FuroCena {
  id: string;
  codigo: string;
  estado: string;
  tipo: string;
  profundidade: number;
  pontos: PontoTrajectoria[];
  intervalos: { de: number; ate: number; litologia_codigo: string | null; litologia_nome: string | null; cor: string | null }[];
  amostras: { id: string; codigo: string; de: number; ate: number; teores: Record<string, number> }[];
}

export interface CenaProjecto {
  project_id: string;
  furos: FuroCena[];
  sem_coordenadas: string[];
  parametros: { parametro: string; unidade: string; minimo: number; maximo: number }[];
}

export interface Amostra {
  id: string;
  company_id: string;
  project_id: string;
  drill_hole_id: string | null;
  drill_interval_id: string | null;
  codigo: string;
  tipo: string;
  de: number | null;
  ate: number | null;
  peso_kg: number | null;
  estado: string;
  data_recolha: string | null;
  recolhido_por: string | null;
  notas: string | null;
  criado_em: string;
  actualizado_em: string;
  eliminado_em: string | null;
}

export interface Laboratorio {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  contacto: string | null;
  email: string | null;
  telefone: string | null;
  pais: string | null;
  acreditacao: string | null;
  activo: boolean;
  criado_em: string;
  actualizado_em: string;
}

export interface Resultado {
  id: string;
  company_id: string;
  sample_id: string;
  laboratory_id: string;
  parametro: string;
  valor: number;
  unidade: string;
  metodo: string | null;
  limite_deteccao: number | null;
  data_resultado: string | null;
  estado: string;
  validado_por: string | null;
  validado_em: string | null;
  criado_em: string;
  actualizado_em: string;
}

export interface Modelo {
  id: string;
  company_id: string;
  project_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  estado: string;
  versao_actual: number;
  criado_por: string | null;
  criado_em: string;
  actualizado_em: string;
  eliminado_em: string | null;
}

export interface Dominio {
  id: string;
  company_id: string;
  model_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  lithology_id: string | null;
  criado_em: string;
  actualizado_em: string;
}

export interface Versao {
  id: string;
  company_id: string;
  model_id: string;
  numero_versao: number;
  nome: string | null;
  descricao: string | null;
  estado: string;
  ficheiro_chave: string | null;
  ficheiro_url: string | null;
  formato: string | null;
  metadados: Record<string, unknown> | null;
  criado_por: string | null;
  validado_por: string | null;
  validado_em: string | null;
  criado_em: string;
  actualizado_em: string;
}

export interface Estimativa {
  id: string;
  company_id: string;
  project_id: string;
  model_id: string | null;
  nome: string;
  metodo: string;
  commodity: string;
  teor_corte: number | null;
  unidade_teor: string;
  densidade: number | null;
  estado: string;
  volume_m3: number | null;
  tonelagem: number | null;
  metal_contido: number | null;
  parametros: Record<string, unknown> | null;
  versao: number;
  criado_por: string | null;
  validado_por: string | null;
  validado_em: string | null;
  criado_em: string;
  actualizado_em: string;
}

export interface Auditoria {
  id: string;
  company_id: string | null;
  user_id: string | null;
  accao: string;
  entidade: string;
  entidade_id: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  ip: string | null;
  criado_em: string;
}

export interface Dashboard {
  projectos_activos: number;
  area_explorada_km2: number;
  sondagens: number;
  metros_perfurados: number;
  amostras: number;
  resultados_laboratoriais: number;
  resultados_validados: number;
  modelos_geologicos: number;
  estimativas: number;
  tonelagem_total: number;
  metal_contido_total: number;
  por_estado_sondagem: Record<string, number>;
  por_mineral: { mineral: string; projectos: number; area_km2: number }[];
}

export interface EntidadeImportacao {
  entidade: string;
  rotulo: string;
  campos: string[];
  aliases: Record<string, string[]>;
  formatos: string[];
}

export interface ErroImportacao {
  linha: number;
  mensagem: string;
}

export interface ResultadoImportacao {
  validos: number;
  criados: number;
  ignorados: number;
  previa: Record<string, unknown>[];
  erros: ErroImportacao[];
}

export type Tom = "ok" | "warn" | "danger" | "info" | "neutral" | "copper" | "teal";
