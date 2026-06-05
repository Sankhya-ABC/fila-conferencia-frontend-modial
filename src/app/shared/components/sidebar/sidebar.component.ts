import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth/auth.service';
import { Perfil } from '../../../services/auth/auth.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  constructor(
    public router: Router,
    private authService: AuthService,
  ) {}

  get isAdmin(): boolean {
    return this.authService.getUser()?.perfil === Perfil.ADMINISTRADOR;
  }

  get nomeUsuario(): string {
    return this.authService.getUser()?.nome || '';
  }

  get iniciaisUsuario(): string {
    return this.nomeUsuario
      .split(' ').slice(0, 2)
      .map(w => w[0]).join('').toUpperCase();
  }

  logout() {
    this.authService.logout();
  }
}
