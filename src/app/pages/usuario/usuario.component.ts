import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Perfil } from '../../services/auth/auth.model';
import { CodigoDescricao } from '../../services/dominio/dominio.model';
import {
  UsuarioService,
  CriarUsuarioPayload,
  AtualizarUsuarioPayload,
} from '../../services/usuario/usuario.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatBadgeModule,
  ],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.scss'],
})
export class UsuarioComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
  ) {}

  dataSource = new MatTableDataSource<any>([]);
  total = 0;
  carregando = false;
  filtroAberto = false;

  /* Paginação */
  page = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  listPerfil: CodigoDescricao[] = [
    { codigo: null, descricao: 'Todos' },
    ...Object.values(Perfil).map((p) => ({ codigo: p, descricao: p })),
  ];

  listPerfilModal: CodigoDescricao[] = Object.values(Perfil).map((p) => ({
    codigo: p,
    descricao: p === 'ADMINISTRADOR' ? 'Administrador' : 'Separador',
  }));

  listStatus: CodigoDescricao[] = [
    { codigo: null, descricao: 'Todos' },
    { codigo: true, descricao: 'Ativo' },
    { codigo: false, descricao: 'Inativo' },
  ];

  filters!: FormGroup;

  /* Modal criar/editar */
  modalAberto = false;
  modalModo: 'criar' | 'editar' = 'criar';
  modalForm!: FormGroup;
  modalCarregando = false;
  modalErro = '';
  private codigoEditando: number | null = null;

  /* Confirmação de exclusão */
  deleteInfo: { codigo: number; nome: string } | null = null;
  deleteCarregando = false;

  get activeFilterCount(): number {
    const v = this.filters?.value ?? {};
    return [v.nomeEmail, v.perfil, v.status != null ? v.status : null].filter(
      (x) => x !== null && x !== undefined && x !== '',
    ).length;
  }

  private criarForm(): void {
    this.filters = this.fb.group({ nomeEmail: [], perfil: [], status: [] });
  }

  ngOnInit(): void {
    this.criarForm();
    this.applyFilter();
  }

  onLimparCampos(): void {
    this.criarForm();
  }

  onPesquisar(): void {
    this.filtroAberto = false;
    this.page = 0;
    this.applyFilter();
  }

  applyFilter(): void {
    this.carregando = true;
    this.dataSource.data = [];
    const { nomeEmail, perfil, status } = this.filters.value;

    const params: any = { page: this.page, perPage: this.pageSize };
    if (nomeEmail) params.nomeEmail = nomeEmail;
    if (perfil) params.perfil = perfil;
    if (status != null) params.status = status;

    this.usuarioService.getUsuarios(params).subscribe({
      next: (resp: any) => {
        this.dataSource.data = Array.isArray(resp) ? resp : (resp?.data ?? []);
        this.total = resp?.total ?? this.dataSource.data.length;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  goToPrevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.applyFilter();
    }
  }

  goToNextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.applyFilter();
    }
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 0;
    this.applyFilter();
  }

  atualizarStatus(usuario: any): void {
    this.usuarioService.toggleStatus(usuario.codigo).subscribe(() => {
      usuario.ativo = !usuario.ativo;
    });
  }

  redefinirAtivarLote(emails: string[]): void {
    this.usuarioService.redefinirAtivarLote(emails).subscribe();
  }

  iniciais(nome: string): string {
    return (nome || '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  /* ── Modal criar/editar ── */

  abrirModalCriar(): void {
    this.modalModo = 'criar';
    this.codigoEditando = null;
    this.modalErro = '';
    this.modalForm = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      perfil: ['', Validators.required],
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.modalAberto = true;
  }

  abrirModalEditar(u: any): void {
    this.modalModo = 'editar';
    this.codigoEditando = u.codigo;
    this.modalErro = '';
    this.modalForm = this.fb.group({
      nome: [u.nome, Validators.required],
      email: [u.email, [Validators.required, Validators.email]],
      perfil: [u.perfil, Validators.required],
      senha: ['', Validators.minLength(6)],
      resetarSenha: [u.resetarSenha ?? false],
    });
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (this.modalCarregando) return;
    this.modalAberto = false;
  }

  salvarModal(): void {
    if (this.modalForm.invalid || this.modalCarregando) return;
    this.modalCarregando = true;
    this.modalErro = '';

    if (this.modalModo === 'criar') {
      const payload: CriarUsuarioPayload = this.modalForm.value;
      this.usuarioService.criarUsuario(payload).subscribe({
        next: () => {
          this.modalCarregando = false;
          this.modalAberto = false;
          this.applyFilter();
        },
        error: (err: any) => {
          this.modalCarregando = false;
          this.modalErro =
            err?.error?.message ?? 'Erro ao criar usuário. Tente novamente.';
        },
      });
    } else {
      const v = this.modalForm.value;
      const payload: AtualizarUsuarioPayload = {
        nome: v.nome,
        email: v.email,
        perfil: v.perfil,
        resetarSenha: v.resetarSenha,
      };
      if (v.senha) payload.senha = v.senha;

      this.usuarioService
        .atualizarUsuario(this.codigoEditando!, payload)
        .subscribe({
          next: () => {
            this.modalCarregando = false;
            this.modalAberto = false;
            this.applyFilter();
          },
          error: (err: any) => {
            this.modalCarregando = false;
            this.modalErro =
              err?.error?.message ??
              'Erro ao atualizar usuário. Tente novamente.';
          },
        });
    }
  }

  /* ── Exclusão ── */

  pedirDelete(u: any): void {
    this.deleteInfo = { codigo: u.codigo, nome: u.nome };
  }

  cancelarDelete(): void {
    if (this.deleteCarregando) return;
    this.deleteInfo = null;
  }

  confirmarDelete(): void {
    if (!this.deleteInfo || this.deleteCarregando) return;
    this.deleteCarregando = true;
    this.usuarioService.deletarUsuario(this.deleteInfo.codigo).subscribe({
      next: () => {
        this.deleteCarregando = false;
        this.deleteInfo = null;
        this.applyFilter();
      },
      error: () => {
        this.deleteCarregando = false;
      },
    });
  }
}
