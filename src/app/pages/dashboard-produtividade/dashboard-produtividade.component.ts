import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, Subscription } from 'rxjs';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { DashboardProdutividadeDTO, RankingItemDTO } from '../../services/dashboard/dashboard.model';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { DuracaoPipe } from '../../shared/pipes/duracao.pipe';
import { IniciaisPipe } from '../../shared/pipes/iniciais.pipe';

@Component({
  selector: 'app-dashboard-produtividade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DuracaoPipe,
    IniciaisPipe,
  ],
  templateUrl: './dashboard-produtividade.component.html',
  styleUrl: './dashboard-produtividade.component.scss',
})
export class DashboardProdutividadeComponent implements OnInit, OnDestroy {
  periodo: 'hoje' | 'semana' | 'mes' = 'hoje';
  idUsuarioFiltro: string | null = null;
  dados: DashboardProdutividadeDTO | null = null;
  carregando = true;
  usuarioSelecionado: RankingItemDTO | null = null;
  separadores: { id: string; nome: string }[] = [];

  private refreshSub?: Subscription;

  constructor(
    private dashboardService: DashboardService,
    private usuarioService: UsuarioService,
  ) {}

  ngOnInit(): void {
    this.carregarSeparadores();
    this.carregarDados();
    this.refreshSub = interval(30000).subscribe(() => this.carregarDados(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  get maxConferencias(): number {
    return Math.max(...(this.dados?.ranking?.map(r => r.totalConferencias) ?? [1]), 1);
  }

  get maxPico(): number {
    return Math.max(...(this.dados?.picos?.map(p => p.total) ?? [1]), 1);
  }

  setPeriodo(p: 'hoje' | 'semana' | 'mes') {
    this.periodo = p;
    this.carregarDados();
  }

  selecionarSeparador(r: RankingItemDTO) {
    this.usuarioSelecionado = this.usuarioSelecionado?.idUsuario === r.idUsuario ? null : r;
    this.carregarDados(true);
  }

  carregarDados(silencioso = false) {
    if (!silencioso) this.carregando = true;
    this.dashboardService.getProdutividade({
      periodo: this.periodo,
      idUsuario: this.idUsuarioFiltro,
      idUsuarioTimeline: this.usuarioSelecionado?.idUsuario ?? null,
    }).subscribe({
      next: dados => {
        this.dados = {
          ...dados,
          totalItensPorHora: Math.round(dados.totalItensPorHora) || 0,
        };
        this.carregando = false;
      },
      error: () => { this.carregando = false; },
    });
  }

  private carregarSeparadores() {
    this.usuarioService.getUsuarios({ perfil: 'SEPARADOR' }).subscribe({
      next: res => {
        this.separadores = res.data.map(u => ({ id: u.id, nome: u.nome }));
      },
    });
  }
}
