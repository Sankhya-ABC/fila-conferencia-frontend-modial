export interface Dimensoes {
  largura: number | null;
  comprimento: number | null;
  altura: number | null;
  peso: number | null;
}

export interface VolumeItemDTO {
  idProduto: number;
  descricaoProduto: string;
  imagem: string | null;
  quantidadeConvertida: number;
  quantidadeBase: number;
  unidade: string;
  controle?: string;
}

export interface VolumeDTO extends Dimensoes {
  quantidadeLote?: number;
  numeroVolume: number;
  itens: VolumeItemDTO[];

  largura: number | null;
  comprimento: number | null;
  altura: number | null;
  peso: number | null;
}

export interface VolumeFrontDTO extends VolumeDTO {
  ativo?: boolean;
}

export interface PostAtualizarDimensoesVolumeDetalhadoParams extends Dimensoes {
  numeroConferencia: number;
  numeroVolume: number | null;
}

export interface PostAtualizarDimensoesVolumeNaoDetalhadoLoteParams extends PostAtualizarDimensoesVolumeDetalhadoParams {
  alturaAntiga?: number;
  larguraAntiga?: number;
  comprimentoAntigo?: number;
  pesoAntigo?: number;
}

export interface PostAtualizarDimensoesVolumeParams extends PostAtualizarDimensoesVolumeNaoDetalhadoLoteParams {
  qtdVol?: number;
}

export interface GerarVolumesLoteParams extends Omit<
  PostAtualizarDimensoesVolumeDetalhadoParams,
  'numeroVolume'
> {
  quantidadeLote: number;
}

export interface DeletarVolumesLoteParams extends Omit<
  PostAtualizarDimensoesVolumeDetalhadoParams,
  'numeroVolume'
> {}

export interface PostSalvarGrupoSimplificadoParams {
  numeroConferencia: number;
  qtdVol: number;
  largura: number;
  comprimento: number;
  altura: number;
  peso: number;
}
