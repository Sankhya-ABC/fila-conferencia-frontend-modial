import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../services/toast/toast.service';
import { SKIP_ERROR_TOAST } from './skip-loading.token';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(private toast: ToastService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status >= 400 && error.status < 600 && !req.context.get(SKIP_ERROR_TOAST)) {
          const response = error.error;

          let title = response?.error || 'Erro';
          let message = response?.message || 'Erro inesperado';

          if (Array.isArray(message)) {
            message = message.join(', ');
          }

          this.toast.open(title, message, 'error');
        }

        return throwError(() => error);
      }),
    );
  }
}
