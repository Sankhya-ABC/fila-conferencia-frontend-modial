import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST, SKIP_LOADING } from '../../core/interceptors/skip-loading.token';

@Injectable({ providedIn: 'root' })
export class SessaoService {
  constructor(private http: HttpClient) {}

  private ctx() {
    return new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_TOAST, true);
  }

  registrarAbertura(numeroUnico: number): Observable<void> {
    return this.http.post<void>(`/sessao/${numeroUnico}/abrir`, {}, { context: this.ctx() });
  }

  registrarFechamento(numeroUnico: number): Observable<void> {
    return this.http.post<void>(`/sessao/${numeroUnico}/fechar`, {}, { context: this.ctx() });
  }

  heartbeat(data: { numeroConferencia?: number }): Observable<void> {
    return this.http.post<void>('/sessao/heartbeat', data, { context: this.ctx() });
  }
}
