import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatError,
  ],
  templateUrl: './redefinir-senha.component.html',
  styleUrl: './redefinir-senha.component.scss',
})
export class RedefinirSenhaComponent {
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,

    private router: Router,
    private authService: AuthService,
  ) {}

  token!: string;
  loading = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.router.navigate(['/erro']);
      }
    });
  }

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
    confirmarSenha: ['', Validators.required],
  });

  redefinirSenha(): void {
    if (this.form.invalid) return;

    this.loading = true;

    this.authService
      .redefinirSenha({
        email: this.form.value.email!,
        senha: this.form.value.senha!,
        token: this.token,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: () => {},
        complete: () => {
          this.loading = false;
        },
      });
  }
}
