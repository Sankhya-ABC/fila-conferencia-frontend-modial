import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SESSION_KEYS } from '../../core/session';
import {
  EsqueciMinhaSenhaParams,
  LoginRequest,
  RedefinirSenhaParams,
  SessionData,
} from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<SessionData | null>(
    this.getUserStorage(),
  );

  user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private getUserStorage(): SessionData | null {
    const data = localStorage.getItem(SESSION_KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  }

  esqueciMinhaSenha(body: EsqueciMinhaSenhaParams): Observable<null> {
    return this.http.post<null>('/auths/esqueci-minha-senha', body, {
      headers: { 'x-show-success': 'true' },
    });
  }

  redefinirSenha(body: RedefinirSenhaParams): Observable<null> {
    return this.http.post<null>('/auths/redefinir-senha', body);
  }

  login(body: LoginRequest): Observable<SessionData> {
    return this.http.post<SessionData>('/auths/login', body).pipe(
      tap((resp) => {
        localStorage.setItem(SESSION_KEYS.AUTH_USER, JSON.stringify(resp));
        this.userSubject.next(resp);
      }),
    );
  }

  logout(): void {
    const token = this.getUser()?.token;
    if (token) {
      this.http.post('/auths/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({ error: () => {} });
    }
    localStorage.removeItem(SESSION_KEYS.AUTH_USER);
    window.location.href = '/login';
  }

  getUser(): SessionData {
    return this.userSubject.value || ({} as SessionData);
  }

  isAuthenticated(): boolean {
    return !!this.getUser()?.token;
  }

  hasModulo(modulo: string): boolean {
    const lista = this.getUser()?.snkModulos ?? '';
    return lista.split(',').map(m => m.trim()).includes(modulo);
  }
}
