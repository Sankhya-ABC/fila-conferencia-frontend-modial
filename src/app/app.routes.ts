import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { FilaConferenciaComponent } from './pages/fila-conferencia/fila-conferencia.component';
import { LoginComponent } from './pages/login/login.component';
import { RedefinirSenhaComponent } from './pages/redefinir-senha/redefinir-senha.component';
import { SeparacaoComponent } from './pages/separacao/separacao.component';
import { adminGuard } from './core/guards/admin.guard';
import { UsuarioComponent } from './pages/usuario/usuario.component';
import { RedefinirUsuarioComponent } from './pages/redefinir-usuario/redefinir-usuario.component';

export const routes: Routes = [
  {
    canActivate: [loginGuard],
    path: 'login',
    title: 'Fila de Conferência',
    component: LoginComponent,
  },
  {
    path: 'redefinir-senha',
    title: 'Fila de Conferência',
    component: RedefinirSenhaComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'usuario',
    title: 'Fila de Conferência',
    component: UsuarioComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'redefinir-usuario',
    title: 'Fila de Conferência',
    component: RedefinirUsuarioComponent,
  },
  {
    canActivate: [authGuard],
    path: 'fila-conferencia',
    title: 'Fila de Conferência',
    component: FilaConferenciaComponent,
  },
  {
    canActivate: [authGuard],
    path: 'separacao/:numeroUnico',
    title: 'Fila de Conferência',
    component: SeparacaoComponent,
  },
  {
    path: '',
    redirectTo: '/fila-conferencia',
    pathMatch: 'full',
  },
];
