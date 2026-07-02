import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';

export function authInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
): Observable<HttpEvent<any>> {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getUser().token;

  // Não adiciona token em requests locais (balanças, agente local)
  const isLocal = req.url.startsWith('http://localhost') || req.url.startsWith('https://localhost');
  const authReq = token && !isLocal
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/auths/login')) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
}
