import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Usuario } from './usuario.model';
import { Perfil } from '../auth/auth.model';

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
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  constructor(private http: HttpClient) {}

  getUsuarios(params: any) {
    return this.http.get<{ data: Usuario[]; total: number }>('/usuarios', {
      params,
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
}
