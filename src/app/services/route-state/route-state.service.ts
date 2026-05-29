import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RouteStateService {
  private routesToHideContainer = ['login', 'redefinir-senha', 'erro', 'separacao'];
  private _hideContainer$ = new BehaviorSubject<boolean>(false);
  public hideContainer$ = this._hideContainer$.asObservable();

  private _routeTitle$ = new BehaviorSubject<string>('');
  public routeTitle$ = this._routeTitle$.asObservable();

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => {
        const currentSnapshot = this.getDeepestChild(
          this.router.routerState.snapshot.root,
        );

        const currentPath = currentSnapshot.url.map((u) => u.path).join('/');

        const hide = this.routesToHideContainer.some((route) =>
          currentPath.startsWith(route),
        );
        this._hideContainer$.next(hide);

        const title = currentSnapshot?.['title'] ?? '';
        this._routeTitle$.next(title);
      });
  }

  public hideContainer(): boolean {
    return this._hideContainer$.value;
  }

  private getDeepestChild(
    snapshot: ActivatedRouteSnapshot,
  ): ActivatedRouteSnapshot {
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    return snapshot;
  }
}
