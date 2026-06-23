export interface LoginRequest {
  usuario: string;
  senha: string;
}

export enum Perfil {
  ADMINISTRADOR = 'ADMINISTRADOR',
  SEPARADOR = 'SEPARADOR',
  MASTER = 'MASTER',
}

export interface SessionData {
  token: string;
  nome: string;
  idUsuario: number;
  perfil: Perfil;
  snkModulos?: string;
}

export interface RedefinirSenhaParams {
  senha: string;
  token: string;
  email: string;
}

export interface EsqueciMinhaSenhaParams {
  email: string;
}
