import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST, SKIP_LOADING } from '../../core/interceptors/skip-loading.token';
import {
  BalancaAtivaDTO, BalancaDTO, CapturarPesoResponse, CriarBalancaParams,
  PesoAtualResponse, StatusBalancaResponse, TestarDiretoParams, TesteResultado,
} from './balanca.model';

const SKIP = { context: new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_TOAST, true) };

@Injectable({ providedIn: 'root' })
export class BalancaService {
  constructor(private http: HttpClient) {}

  listar(): Observable<BalancaDTO[]> {
    return this.http.get<BalancaDTO[]>('/balancas', SKIP);
  }

  listarAtivas(): Observable<BalancaAtivaDTO[]> {
    return this.http.get<BalancaAtivaDTO[]>('/balancas/ativas', SKIP);
  }

  listarMinhas(): Observable<BalancaDTO[]> {
    return this.http.get<BalancaDTO[]>('/balancas/minhas', SKIP);
  }

  verificarStatus(id: string): Observable<StatusBalancaResponse> {
    return this.http.get<StatusBalancaResponse>(`/balancas/${id}/status`, SKIP);
  }

  criar(body: CriarBalancaParams): Observable<BalancaDTO> {
    return this.http.post<BalancaDTO>('/balancas', body);
  }

  atualizar(id: string, body: Partial<CriarBalancaParams>): Observable<BalancaDTO> {
    return this.http.put<BalancaDTO>(`/balancas/${id}`, body);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`/balancas/${id}`);
  }

  listarPortasCOM(): Observable<string[]> {
    return this.http.get<string[]>('/balancas/portas-com', SKIP);
  }

  testarConexaoDireta(params: TestarDiretoParams): Observable<TesteResultado> {
    return this.http.post<TesteResultado>('/balancas/testar-direto', params, SKIP);
  }

  iniciarLeitura(id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`/balancas/${id}/iniciar-leitura`, {}, SKIP);
  }

  pararLeitura(id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`/balancas/${id}/parar-leitura`, {}, SKIP);
  }

  pesoAtual(id: string): Observable<PesoAtualResponse> {
    return this.http.get<PesoAtualResponse>(`/balancas/${id}/peso-atual`, SKIP);
  }

  simularPeso(id: string): Observable<{ peso: number }> {
    return this.http.post<{ peso: number }>(`/balancas/${id}/simular-peso`, {}, SKIP);
  }

  capturarPeso(id: string): Observable<CapturarPesoResponse> {
    return this.http.get<CapturarPesoResponse>(`/balancas/${id}/capturar-peso`, SKIP);
  }
}
