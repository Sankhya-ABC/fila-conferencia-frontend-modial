import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import {
  MasterService,
  TenantItem,
  CriarTenantPayload,
  AtualizarTenantPayload,
  SNK_MODULOS_TODOS,
} from '../../services/master/master.service';

@Component({
  selector: 'app-master-tenants',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './master-tenants.component.html',
  styleUrls: ['./master-tenants.component.scss'],
})
export class MasterTenantsComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private authService: AuthService,
    private router: Router,
  ) {}

  tenants: TenantItem[] = [];
  carregando = false;

  /* modal */
  modalAberto = false;
  modalModo: 'criar' | 'editar' = 'criar';
  modalForm!: FormGroup;
  modalCarregando = false;
  modalErro = '';
  slugEditando = '';

  /* sync */
  sincronizando: Record<string, boolean> = {};
  syncResultado: Record<string, string> = {};

  readonly todosModulos = SNK_MODULOS_TODOS;

  modulosAtivos(snkModulos: string): string[] {
    return (snkModulos ?? '').split(',').map(m => m.trim()).filter(Boolean);
  }

  toggleModulo(modulo: string): void {
    const ctrl = this.modalForm.get('snkModulosArr');
    if (!ctrl) return;
    const val: string[] = [...(ctrl.value ?? [])];
    const idx = val.indexOf(modulo);
    idx >= 0 ? val.splice(idx, 1) : val.push(modulo);
    ctrl.setValue(val);
  }

  isModuloAtivo(modulo: string): boolean {
    return (this.modalForm.get('snkModulosArr')?.value ?? []).includes(modulo);
  }

  private modulosParaString(arr: string[]): string {
    return arr.join(',');
  }

  nomeUsuario = this.authService.getUser().nome;

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.masterService.listar().subscribe({
      next: (data) => { this.tenants = data; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  /* Modal criar */
  abrirCriar() {
    this.modalModo = 'criar';
    this.slugEditando = '';
    this.modalErro = '';
    this.modalForm = this.fb.group({
      slug:           ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      nome:           ['', Validators.required],
      snkHost:        ['https://api.sankhya.com.br', Validators.required],
      snkGateway:     ['gateway/v1', Validators.required],
      snkXToken:      ['', Validators.required],
      snkClientId:    ['', Validators.required],
      snkClientSecret:['', Validators.required],
      dbDialect:      ['SQLSERVER', Validators.required],
      snkModulosArr:  [['AD_NUMTALAO', 'AD_TIPOENTREGA', 'AD_CUBAGEM']],
    });
    this.modalAberto = true;
  }

  /* Modal editar */
  abrirEditar(t: TenantItem) {
    this.modalModo = 'editar';
    this.slugEditando = t.slug;
    this.modalErro = '';
    this.modalCarregando = true;
    this.modalAberto = true;
    this.masterService.buscar(t.slug).subscribe({
      next: (full) => {
        this.modalForm = this.fb.group({
          nome:           [full.nome, Validators.required],
          snkHost:        [full.snkHost, Validators.required],
          snkGateway:     [full.snkGateway, Validators.required],
          snkXToken:      [full.snkXToken ?? '', Validators.required],
          snkClientId:    [full.snkClientId, Validators.required],
          snkClientSecret:[full.snkClientSecret ?? '', Validators.required],
          dbDialect:      [full.dbDialect ?? 'SQLSERVER', Validators.required],
          snkModulosArr:  [this.modulosAtivos(full.snkModulos)],
        });
        this.modalCarregando = false;
      },
      error: () => {
        this.modalErro = 'Erro ao carregar dados do tenant.';
        this.modalCarregando = false;
      },
    });
  }

  fecharModal() {
    if (this.modalCarregando) return;
    this.modalAberto = false;
  }

  salvar() {
    if (!this.modalForm || this.modalForm.invalid || this.modalCarregando) return;
    this.modalCarregando = true;
    this.modalErro = '';

    if (this.modalModo === 'criar') {
      const v = this.modalForm.value;
      const payload: CriarTenantPayload = { ...v, snkModulos: this.modulosParaString(v.snkModulosArr ?? []) };
      delete (payload as any).snkModulosArr;
      this.masterService.criar(payload).subscribe({
        next: () => { this.modalCarregando = false; this.modalAberto = false; this.carregar(); },
        error: (err) => { this.modalCarregando = false; this.modalErro = err?.error?.message ?? 'Erro ao criar tenant.'; },
      });
    } else {
      const v = this.modalForm.value;
      const payload: AtualizarTenantPayload = { ...v, snkModulos: this.modulosParaString(v.snkModulosArr ?? []) };
      delete (payload as any).snkModulosArr;
      this.masterService.atualizar(this.slugEditando, payload).subscribe({
        next: () => { this.modalCarregando = false; this.modalAberto = false; this.carregar(); },
        error: (err) => { this.modalCarregando = false; this.modalErro = err?.error?.message ?? 'Erro ao atualizar tenant.'; },
      });
    }
  }

  toggleAtivo(t: TenantItem) {
    this.masterService.atualizar(t.slug, { ativo: !t.ativo }).subscribe({
      next: () => { t.ativo = !t.ativo; },
    });
  }

  sincronizar(t: TenantItem) {
    this.sincronizando[t.slug] = true;
    this.syncResultado[t.slug] = '';
    this.masterService.sincronizar(t.slug).subscribe({
      next: (res) => {
        this.sincronizando[t.slug] = false;
        const prod = res.produtos;
        if (prod?.erro) {
          this.syncResultado[t.slug] = `Erro: ${prod.erro}`;
        } else {
          this.syncResultado[t.slug] = `✔ ${prod?.produtos ?? 0} produtos, ${prod?.imagens ?? 0} imagens`;
        }
      },
      error: (err) => {
        this.sincronizando[t.slug] = false;
        this.syncResultado[t.slug] = `Erro: ${err?.error?.message ?? 'falha na sync'}`;
      },
    });
  }

  logout() {
    this.authService.logout();
  }
}
