export interface FilaConferenciaDTO {
  numeroUnico: number;
  numeroNota: number;
  numeroModial?: number | string;
  numTalao?: number | string;
  nroModial?: number | string;
  AD_NUMTALAO?: number | string;
  modial?: number | string;
  AD_TIPOENTREGA?: string;
  apelidoVendedor?: string;
  ordemCarga?: number | null;
  numeroConferencia: number;

  valorNota: string;
  volume: string;
  dataMovimento: string;

  codigoStatus: string;
  statusSankhya: string | null;
  emAndamentoNativo: boolean;
  descricaoStatus: string;

  codigoTipoMovimento: string;
  descricaoTipoMovimento: string;

  codigoTipoOperacao: string;
  descricaoTipoOperacao: string;

  codigoTipoEntrega: string;
  descricaoTipoEntrega: string;

  idEmpresa: string;
  nomeEmpresa: string;

  idParceiro: string;
  nomeParceiro: string;

  idVendedor: string;
  nomeVendedor: string;

  idUsuarioInclusao: string;
  nomeUsuarioInclusao: string;

  idUsuarioAlteracao: string;
  nomeUsuarioAlteracao: string;

  etapas?: { tipo: TipoEtapaConferencia; status: 'P' | 'A' | 'C'; idUsuarioConclusao: number | null }[];
}

export interface PaginationFilter {
  page?: number;
  perPage?: number;
}

export interface FilaConferenciaFilter extends PaginationFilter {
  codigoStatus?: string;
  numeroModial?: string;
  numeroNota?: string;
  numeroUnico?: string;
  dataInicio?: Date | string;
  dataFim?: Date | string;
  idParceiro?: string;
  codigoTipoMovimento?: string;
  codigoTipoOperacao?: string;
  codigoTipoEntrega?: string;
  ordemCarga?: string;
}

export interface DadosBasicosPedidoDTO {
  numeroUnico: number;
  numeroNota: number;
  numeroModial: number;
  numeroConferencia: number;

  codigoStatus: string;
  codigoTipoMovimento: string;
  descricaoTipoOperacao: string;
  formacaoVolumes?: 'N' | 'D' | 'T' | 'S';
  obterQtdBalanca?: 'B' | 'N' | 'S' | null;
  qtdAmaior?: 'C' | 'D' | null;
  fataoConcluir?: string | null;
  exibirProd?: string | null;
  exibirImgProd?: string | null;
  temCubagem?: boolean;

  idParceiro: number;
  nomeParceiro: string;

  idVendedor: number;
  nomeVendedor: string;
}

export interface PostIniciarConferenciaParams {
  idUsuario: number;
  numeroUnico: number;
}

export interface PostIniciarConferenciaResponse {
  numeroConferencia: number;
}

export interface PostFinalizarConferenciaParams {
  numeroConferencia: number;
  manterPendente?: boolean;
}

export interface TopFaturamento {
  codTipOper: number;
  descricao: string;
}

export interface FaturarNotaParams {
  nunota: number;
  codTipOper: number;
  serie?: string;
}

export type TipoEtapaConferencia = 'PESAVEL' | 'NAO_PESAVEL';

export interface SessaoEtapaDTO {
  tipo: TipoEtapaConferencia;
  status: 'P' | 'A' | 'C';
  idUsuarioInicio: number | null;
  idUsuarioConclusao: number | null;
  dtInicio: string | null;
  dtConclusao: string | null;
}

export interface ConcluirEtapaParams {
  numeroConferencia: number;
  tipo: TipoEtapaConferencia;
  manterPendente?: boolean;
}

export interface LiberacaoPendenteDTO {
  sequencia: number;
  produto: string | null;
  qtdPedido: number | null;
  unidadePedido: string | null;
  qtdConferida: number | null;
  unidadeConferida: string | null;
  diferenca: number | null;
}

export interface LiberarCorteParams {
  numeroConferencia: number;
  usuario: string;
  senha: string;
  liberar: 'S' | 'N';
  sequencias: number[];
  obs?: string;
}

export interface ValidarLiberadorParams {
  usuario: string;
  senha: string;
}
