import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { LoadingService } from '../../services/loading/loading.service';
import { SKIP_LOADING } from './skip-loading.token';

@Injectable()
export class HttpLoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (req.context.get(SKIP_LOADING)) {
      return next.handle(req);
    }

    this.loading.start();

    return next.handle(req).pipe(
      finalize(() => {
        this.loading.stop();
      }),
    );
  }
}
