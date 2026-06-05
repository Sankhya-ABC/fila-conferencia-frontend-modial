import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import { DashboardProdutividadeDTO, GetProdutividadeParams } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getProdutividade(params: GetProdutividadeParams): Observable<DashboardProdutividadeDTO> {
    let httpParams = new HttpParams().set('periodo', params.periodo);
    if (params.idUsuario) httpParams = httpParams.set('idUsuario', params.idUsuario);
    if (params.idUsuarioTimeline != null) httpParams = httpParams.set('idUsuarioTimeline', String(params.idUsuarioTimeline));

    return this.http.get<DashboardProdutividadeDTO>('/dashboard/produtividade', {
      params: httpParams,
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }
}
