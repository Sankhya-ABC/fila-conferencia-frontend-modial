import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { UsuarioService } from '../../services/usuario/usuario.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  page = 0;
  perPage = 25;
  total = 0;
  carregando = false;
  filtroAberto = false;

  listPerfil: CodigoDescricao[] = [
    { codigo: null, descricao: 'Todos' },
    ...Object.values(Perfil).map(p => ({ codigo: p, descricao: p })),
  ];

  listStatus: CodigoDescricao[] = [
    { codigo: null, descricao: 'Todos' },
    { codigo: true,  descricao: 'Ativo' },
    { codigo: false, descricao: 'Inativo' },
  ];

  filters!: FormGroup;

  get totalPages(): number {
    return Math.max(Math.ceil(this.total / this.perPage), 1);
  }

  get activeFilterCount(): number {
    const v = this.filters?.value ?? {};
    return [v.nomeEmail, v.perfil, v.status != null ? v.status : null]
      .filter(x => x !== null && x !== undefined && x !== '').length;
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
    this.page = 0;
    this.filtroAberto = false;
    this.applyFilter();
  }

  applyFilter(): void {
    this.carregando = true;
    this.dataSource.data = [];
    const { nomeEmail, perfil, status } = this.filters.value;

    const params: any = { page: this.page, perPage: this.perPage };
    if (nomeEmail) params.nomeEmail = nomeEmail;
    if (perfil)    params.perfil    = perfil;
    if (status != null) params.status = status;

    this.usuarioService.getUsuarios(params).subscribe({
      next: (resp: any) => {
        this.dataSource.data = resp.data;
        this.total = resp.total;
        this.carregando = false;
      },
      error: () => { this.carregando = false; },
    });
  }

  prevPage(): void {
    if (this.page > 0) { this.page--; this.applyFilter(); }
  }

  nextPage(): void {
    if ((this.page + 1) * this.perPage < this.total) { this.page++; this.applyFilter(); }
  }

  onPerPageChange(value: number): void {
    this.perPage = Number(value);
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
    return (nome || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
