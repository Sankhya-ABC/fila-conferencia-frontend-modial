import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST, SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import {
  GravarPesoItemParams,
  ItemPedidoDTO,
  ItensConferidosResponse,
  MoverItemVolumeParams,
  PostDevolverItemConferidoParams,
  PostItemConferidoVolumeParams,
  PostRemoverVolumeParams,
  ResolverCodigoBarrasResponse,
} from './separacao.model';

@Injectable({
  providedIn: 'root',
})
export class SeparacaoService {
  constructor(private http: HttpClient) {}

  getItensPedido(numeroUnico: number): Observable<ItemPedidoDTO[]> {
    return this.http.get<ItemPedidoDTO[]>('/separacoes/itens-pedidos', {
      params: { numeroUnico },
    });
  }

  // SKIP_LOADING: carregamento silencioso em background após a lista renderizar
  getImagensItens(numeroUnico: number): Observable<{ idProduto: number; imagem: string }[]> {
    return this.http.get<{ idProduto: number; imagem: string }[]>(
      '/separacoes/imagens-itens',
      {
        params: { numeroUnico },
        context: new HttpContext().set(SKIP_LOADING, true),
      },
    );
  }

  getItensConferidos(
    numeroConferencia: number,
  ): Observable<ItensConferidosResponse[]> {
    return this.http.get<ItensConferidosResponse[]>(
      '/separacoes/itens-conferidos',
      { params: { numeroConferencia } },
    );
  }

  postItemConferidoVolume(
    body: PostItemConferidoVolumeParams,
  ): Observable<null> {
    return this.http.post<null>('/separacoes/item-conferido-volume', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  postRemoverVolume(body: PostRemoverVolumeParams): Observable<null> {
    return this.http.post<null>('/separacoes/remover-volume', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  moverItemVolume(body: MoverItemVolumeParams): Observable<null> {
    return this.http.post<null>('/separacoes/mover-item-volume', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  postDevolverItemConferido(
    body: PostDevolverItemConferidoParams,
  ): Observable<null> {
    return this.http.post<null>('/separacoes/devolver-item-conferido', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  patchItemPeso(body: GravarPesoItemParams): Observable<null> {
    return this.http.patch<null>('/separacoes/item-peso', body, {
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  resolverCodigoBarras(
    numeroConferencia: number,
    codigoBarras: string,
  ): Observable<ResolverCodigoBarrasResponse> {
    return this.http.post<ResolverCodigoBarrasResponse>(
      '/separacoes/resolver-codigo-barras',
      { numeroConferencia, codigoBarras },
      { context: new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_TOAST, true) },
    );
  }
}
