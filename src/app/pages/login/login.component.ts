import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatError,
    MatIcon,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private http: HttpClient,
  ) {}

  // esqueci minha senha
  @ViewChild('modalEsqueciMinhaSenha')
  modalEsqueciMinhaSenhaTpl!: TemplateRef<any>;

  loadingEsqueciMinhaSenha = false;

  formEsqueciMinhaSenha = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  abrirModalEsqueciMinhaSenha() {
    this.formEsqueciMinhaSenha.reset();

    this.dialog.open(ModalComponent, {
      data: {
        template: this.modalEsqueciMinhaSenhaTpl,
      },
    });
  }

  enviarEsqueciMinhaSenha(fechar: () => void) {
    if (this.formEsqueciMinhaSenha.invalid) return;

    this.loadingEsqueciMinhaSenha = true;

    this.authService
      .esqueciMinhaSenha(this.formEsqueciMinhaSenha.getRawValue())
      .subscribe({
        next: () => {
          this.loadingEsqueciMinhaSenha = false;
          fechar();
        },
        error: () => {
          this.loadingEsqueciMinhaSenha = false;
        },
      });
  }

  // login
  loading = false;

  form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    senha: ['', Validators.required],
  });

  login(): void {
    if (this.form.invalid) return;

    this.loading = true;

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.perfil === 'MASTER') {
          this.router.navigate(['/master/tenants']);
        } else {
          this.router.navigate(['/fila-conferencia']);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
      },
    });
  }
}
