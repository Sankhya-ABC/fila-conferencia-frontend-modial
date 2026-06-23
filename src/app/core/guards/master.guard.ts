import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

export const masterGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.getUser().perfil !== 'MASTER') return router.createUrlTree(['/fila-conferencia']);

  return true;
};
