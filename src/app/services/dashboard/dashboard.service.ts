import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import { AtividadeAgoraDTO, DashboardProdutividadeDTO, GetProdutividadeParams } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getProdutividade(params: GetProdutividadeParams): Observable<DashboardProdutividadeDTO> {
    let p = new HttpParams().set('periodo', params.periodo ?? 'hoje');
    if (params.idUsuario)         p = p.set('idUsuario', params.idUsuario);
    if (params.idUsuarioTimeline != null) p = p.set('idUsuarioTimeline', String(params.idUsuarioTimeline));
    if (params.dataInicio)        p = p.set('dataInicio', params.dataInicio);
    if (params.dataFim)           p = p.set('dataFim', params.dataFim);

    return this.http.get<DashboardProdutividadeDTO>('/dashboard/produtividade', {
      params: p,
      context: new HttpContext().set(SKIP_LOADING, true),
    });
  }

  getOnlineAgora(): Observable<{ atividadeAgora: AtividadeAgoraDTO[]; usuariosAtivos: number }> {
    return this.http.get<{ atividadeAgora: AtividadeAgoraDTO[]; usuariosAtivos: number }>(
      '/dashboard/online-agora',
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }
}
