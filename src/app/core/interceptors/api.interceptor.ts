import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export function apiInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
): Observable<HttpEvent<any>> {
  // URLs absolutas (ex: http://localhost:8765) não passam pelo gateway de API
  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'HEAD';
  const apiReq = req.clone({
    url: `${environment.API_GATEWAY}/api${req.url}`,
    ...(hasBody ? { setHeaders: { 'Content-Type': 'application/json' } } : {}),
  });

  return next(apiReq).pipe(
    catchError((error) => {
      return throwError(() => error);
    }),
  );
}
