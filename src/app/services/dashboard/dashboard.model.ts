export interface AtividadeAgoraDTO {
  idUsuario: number;
  nomeUsuario: string;
  numeroConferencia: number;
  nomeParceiro: string;
  minutosAtivo: number;
}

export interface RankingItemDTO {
  idUsuario: number;
  nomeUsuario: string;
  totalConferencias: number;
  tempoMedioSegundos: number;
  totalItens: number;
  totalBipagens: number;
  totalCubagens: number;
  totalLogins: number;
}

export interface PicoDTO {
  hora: number;
  total: number;
}

export interface LinhaDoTempoDTO {
  numeroConferencia: number;
  nomeParceiro: string;
  dtAbertura: string;
  dtFechamento: string | null;
  duracaoSegundos: number;
  totalItens: number;
  totalVolumes: number;
  abandonada: boolean;
}

export interface HeatmapCell {
  dia: number;  // 0=Seg … 4=Sex
  hora: number; // 0-23
  total: number;
}

export interface DashboardProdutividadeDTO {
  usuariosAtivos: number;
  totalConferencias: number;
  tempoMedioSegundos: number;
  totalItensPorHora: number;
  pesoTotalKg: number;
  atividadeAgora: AtividadeAgoraDTO[];
  ranking: RankingItemDTO[];
  picos: PicoDTO[];
  linhaDoTempo: LinhaDoTempoDTO[];
  heatmap?: HeatmapCell[];
}

export interface GetProdutividadeParams {
  periodo?: string;
  idUsuario?: string | null;
  idUsuarioTimeline?: number | string | null;
  dataInicio?: string;
  dataFim?: string;
}
