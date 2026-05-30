import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import {
  DadosBasicosPedidoDTO,
  FilaConferenciaDTO,
  FilaConferenciaFilter,
  PostFinalizarConferenciaParams,
  PostIniciarConferenciaParams,
  PostIniciarConferenciaResponse,
} from './conferencia.model';

@Injectable({
  providedIn: 'root',
})
export class ConferenciaService {
  constructor(private http: HttpClient) {}

  getFilaConferencias(
    params?: FilaConferenciaFilter,
  ): Observable<{ data: FilaConferenciaDTO[]; total: number }> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, value as any);
        }
      });
    }

    return this.http.get<{ data: FilaConferenciaDTO[]; total: number }>(
      '/conferencias',
      { params: httpParams },
    );
  }

  getDadosBasicos(numeroUnico: number): Observable<DadosBasicosPedidoDTO> {
    return this.http.get<DadosBasicosPedidoDTO>('/conferencias/dados-basicos', {
      params: { numeroUnico },
    });
  }

  // SKIP_LOADING: polling silencioso — o robô local (preparandoSessao) cuida do feedback
  getSessaoPronta(numeroUnico: number): Observable<{ pronta: boolean }> {
    return this.http.get<{ pronta: boolean }>('/conferencias/sessao-pronta', {
      params: { numeroUnico },
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  postIniciarConferencia(
    body: PostIniciarConferenciaParams,
  ): Observable<PostIniciarConferenciaResponse> {
    return this.http.post<PostIniciarConferenciaResponse>(
      '/conferencias/iniciar-conferencia',
      body,
    );
  }

  postFinalizarConferencia(
    body: PostFinalizarConferenciaParams,
  ): Observable<null> {
    return this.http.post<null>('/conferencias/finalizar-conferencia', body);
  }
}
