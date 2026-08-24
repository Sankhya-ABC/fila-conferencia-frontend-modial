import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export type DbDialect = 'SQLSERVER' | 'ORACLE';

export const SNK_MODULOS_TODOS = ['AD_NUMTALAO', 'AD_TIPOENTREGA', 'AD_CUBAGEM', 'CONFERENCIA_PARCIAL'] as const;
export type SnkModulo = typeof SNK_MODULOS_TODOS[number];

export interface TenantItem {
  slug: string;
  nome: string;
  ativo: boolean;
  snkHost: string;
  snkGateway: string;
  snkXToken: string;
  snkClientId: string;
  snkClientSecret: string;
  dbUrl: string;
  dbDialect: DbDialect;
  snkModulos: string;
  criadoEm: string;
}

export interface CriarTenantPayload {
  slug: string;
  nome: string;
  snkHost: string;
  snkGateway: string;
  snkXToken: string;
  snkClientId: string;
  snkClientSecret: string;
  dbDialect?: DbDialect;
  snkModulos?: string;
}

export interface AtualizarTenantPayload {
  nome?: string;
  snkHost?: string;
  snkGateway?: string;
  snkXToken?: string;
  snkClientId?: string;
  snkClientSecret?: string;
  ativo?: boolean;
  dbDialect?: DbDialect;
  snkModulos?: string;
}

@Injectable({ providedIn: 'root' })
export class MasterService {
  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<TenantItem[]>('/master/tenants');
  }

  buscar(slug: string) {
    return this.http.get<TenantItem>(`/master/tenants/${slug}`);
  }

  criar(payload: CriarTenantPayload) {
    return this.http.post<TenantItem>('/master/tenants', payload);
  }

  atualizar(slug: string, payload: AtualizarTenantPayload) {
    return this.http.patch<TenantItem>(`/master/tenants/${slug}`, payload);
  }

  sincronizar(slug: string) {
    return this.http.post<any>(`/master/tenants/${slug}/sync`, {});
  }
}
