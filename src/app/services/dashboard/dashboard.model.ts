export interface AtividadeAgoraDTO {
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
}

export interface GetProdutividadeParams {
  periodo: 'hoje' | 'semana' | 'mes';
  idUsuario?: string | null;
  idUsuarioTimeline?: number | null;
}
