import { Dimensoes } from '../volume/volume.model';

export interface ItemPedidoDTO {
  imagem?: string;

  idProduto: number;
  nomeProduto: string;

  codigoBarras?: string[];

  unidade: string;
  quantidadeBase: number;
  quantidadeConvertida: number;

  quantidadeBaseConferida: number;
  quantidadeConvertidaConferida: number;

  idMarca: number;
  nomeMarca: string;

  idFornecedor: number;
  nomeFornecedor: string;

  controle: string;
  complemento: string;
  lisControles?: string | null;
}

export interface ItensConferidosResponse {
  idProduto: number;
  controle?: string;
  quantidadeConvertida: number;
}

export interface PostItemConferidoVolumeParams {
  numeroConferencia: number;
  numeroVolume: number;
  idProduto: number;
  controle: string;
  quantidadeConvertida: number;
  unidade: string;
}

export interface PostRemoverVolumeParams {
  numeroConferencia: number;
  numeroVolume: number;
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
