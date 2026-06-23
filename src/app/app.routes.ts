import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { FilaConferenciaComponent } from './pages/fila-conferencia/fila-conferencia.component';
import { LoginComponent } from './pages/login/login.component';
import { RedefinirSenhaComponent } from './pages/redefinir-senha/redefinir-senha.component';
import { SeparacaoComponent } from './pages/separacao/separacao.component';
import { adminGuard } from './core/guards/admin.guard';
import { masterGuard } from './core/guards/master.guard';
import { UsuarioComponent } from './pages/usuario/usuario.component';
import { MasterTenantsComponent } from './pages/master/master-tenants.component';
import { RedefinirUsuarioComponent } from './pages/redefinir-usuario/redefinir-usuario.component';
import { DashboardProdutividadeComponent } from './pages/dashboard-produtividade/dashboard-produtividade.component';
import { ImpressaoEtiquetasComponent } from './pages/impressao-etiquetas/impressao-etiquetas.component';
import { BalancaComponent } from './pages/balanca/balanca.component';

export const routes: Routes = [
  {
    canActivate: [masterGuard],
    path: 'master/tenants',
    component: MasterTenantsComponent,
  },
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
    canActivate: [adminGuard],
    path: 'balancas',
    component: BalancaComponent,
  },
  {
    canActivate: [authGuard],
    path: 'impressao-etiquetas',
    component: ImpressaoEtiquetasComponent,
  },
  {
    path: '',
    redirectTo: '/fila-conferencia',
    pathMatch: 'full',
  },
];
