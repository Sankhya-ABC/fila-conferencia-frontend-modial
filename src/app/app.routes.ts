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
    title: 'Login',
    component: LoginComponent,
  },
  {
    path: 'redefinir-senha',
    component: RedefinirSenhaComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'usuario',
    title: 'Usuários',
    component: UsuarioComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'redefinir-usuario',
    title: 'Redefinir Usuário',
    component: RedefinirUsuarioComponent,
  },
  {
    canActivate: [authGuard],
    path: 'fila-conferencia',
    component: FilaConferenciaComponent,
  },
  {
    canActivate: [authGuard],
    path: 'separacao/:numeroUnico',
    component: SeparacaoComponent,
  },
  {
    path: '',
    redirectTo: '/fila-conferencia',
    pathMatch: 'full',
  },
];
