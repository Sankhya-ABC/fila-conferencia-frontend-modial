import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Usuario } from './usuario.model';
import { Perfil } from '../auth/auth.model';
import { SKIP_LOADING } from '../../core/interceptors/skip-loading.token';

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
}

export interface AtualizarUsuarioPayload {
  nome?: string;
  email?: string;
  perfil?: Perfil;
  senha?: string;
  resetarSenha?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  constructor(private http: HttpClient) {}

  getUsuarios(params: any, options: { skipLoading?: boolean } = {}) {
    const context = options.skipLoading
      ? new HttpContext().set(SKIP_LOADING, true)
      : undefined;
    return this.http.get<{ data: Usuario[]; total: number }>('/usuarios', {
      params,
      ...(context ? { context } : {}),
    });
  }

  criarUsuario(payload: CriarUsuarioPayload) {
    return this.http.post<Usuario>('/usuarios', payload);
  }

  atualizarUsuario(codigo: number, payload: AtualizarUsuarioPayload) {
    return this.http.put<Usuario>(`/usuarios/${codigo}`, payload);
  }

  deletarUsuario(codigo: number) {
    return this.http.delete<{ message: string }>(`/usuarios/${codigo}`);
  }

  toggleStatus(codigo: number) {
    return this.http.patch(`/usuarios/${codigo}/status`, {});
  }

  redefinirAtivarLote(emails: string[]) {
    return this.http.post(`/usuarios/redefinir-ativar-lote`, { emails });
  }

  alterarSenha(codigo: number, novaSenha: string) {
    return this.http.patch(`/usuarios/${codigo}/senha`, { novaSenha });
  }
}
