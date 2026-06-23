import { Dimensoes } from '../volume/volume.model';

export interface ItemPedidoDTO {
  imagem?: string;

  idProduto: number;
  nomeProduto: string;

  codigoBarras?: string[];

  unidadeComercial: string;
  unidadePadrao: string;
  quantidadeComercial: number;
  quantidadePadrao: number;

  quantidadeComercialConferida: number;
  quantidadePadraoConferida: number;

  idMarca: number;
  nomeMarca: string;

  idFornecedor: number;
  nomeFornecedor: string;

  controle: string;
  tipControle?: string | null;
  complemento: string;
  lisControles?: string | null;
  usaConfPeso?: boolean;
  pesavel?: boolean;
  sequencia?: number;
}

export interface GravarPesoItemParams {
  nunota: number;
  sequencia: number;
  pesobruto: number;
  pesoliq: number;
}

export interface ItensConferidosResponse {
  idProduto: number;
  controle?: string;
  quantidadePadrao: number;
}

export interface PostItemConferidoVolumeParams {
  numeroConferencia: number;
  numeroVolume: number;
  idProduto: number;
  controle: string;
  quantidadePadrao: number;
  unidade: string;
  peso?: number;
}

export interface PostRemoverVolumeParams {
  numeroConferencia: number;
  numeroVolume: number;
}

export interface UmaDTO {
  codUma: string;
  descricao: string;
  peso: number | null;
  codVol: string | null;
  codBarra: string | null;
  padrao: boolean;
}

export interface ResolverCodigoBarrasResponse {
  idProduto: number;
  nomeProduto: string;
  complemento: string | null;
  referencia: string | null;
  unidadeBase: string;
  codvol: string;
  controle: string;
  tipControle: string | null;
  decQtd: number;
  pesoBruto: number;
  fatorConv: number | null;
  divideMult: string | null;
  lisControles?: string | null;
  usaConfPeso?: boolean;
  pesavel?: boolean;
  umas?: UmaDTO[];
}

export interface PostDevolverItemConferidoParams {
  numeroConferencia: number;
  numeroUnico: number;
  idProduto: number;
  controle: string;
}

export interface MoverItemVolumeParams {
  numeroConferencia: number;
  idProduto: number;
  controle: string;
  seqVolOrigem?: number;
  seqVolDestino: number;
  qtd?: number;
}
