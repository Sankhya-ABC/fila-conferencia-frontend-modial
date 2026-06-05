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
import { DashboardProdutividadeComponent } from './pages/dashboard-produtividade/dashboard-produtividade.component';

export const routes: Routes = [
  {
    canActivate: [loginGuard],
    path: 'login',
    title: 'Fila de Conferência',
    component: LoginComponent,
  },
  {
    path: 'redefinir-senha',
    component: RedefinirSenhaComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'usuario',
    component: UsuarioComponent,
  },
  {
    canActivate: [adminGuard],
    path: 'redefinir-usuario',
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
    canActivate: [adminGuard],
    path: 'dashboard-produtividade',
    component: DashboardProdutividadeComponent,
  },
  {
    path: '',
    redirectTo: '/fila-conferencia',
    pathMatch: 'full',
  },
];
