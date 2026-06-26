import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { interval, Subscription } from 'rxjs';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import {
  AtividadeAgoraDTO,
  DashboardProdutividadeDTO,
  PicoDTO,
  RankingItemDTO,
} from '../../services/dashboard/dashboard.model';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { DuracaoPipe } from '../../shared/pipes/duracao.pipe';
import { IniciaisPipe } from '../../shared/pipes/iniciais.pipe';

export type PeriodoType = 'hoje' | 'semana' | 'mes' | 'custom';
export type StatusSeparador = 'online' | 'inativo' | 'offline';

@Component({
  selector: 'app-dashboard-produtividade',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatSelectModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule,
    DuracaoPipe, IniciaisPipe, DecimalPipe,
  ],
  templateUrl: './dashboard-produtividade.component.html',
  styleUrl: './dashboard-produtividade.component.scss',
})
export class DashboardProdutividadeComponent implements OnInit, OnDestroy {

  // ── Período ──
  periodo: PeriodoType = 'hoje';
  dataInicio: Date | null = null;
  dataFim: Date | null = null;
  datePickerAberto = false;
  formDate!: FormGroup;

  // ── Dados ──
  dados: DashboardProdutividadeDTO | null = null;
  carregando = true;
  separadores: { id: string; nome: string }[] = [];

  // ── Online agora (polling rápido) ──
  atividadeAgora: AtividadeAgoraDTO[] = [];
  usuariosAtivos = 0;
  atualizandoOnline = false;
  private onlineSub?: Subscription;
  private dadosSub?: Subscription;

  // ── Drawer ──
  drawerAberto = false;
  drawerSeparador: RankingItemDTO | null = null;

  // ── Auxiliares ──
  diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  horas = Array.from({ length: 24 }, (_, i) => i);

  constructor(
    private dashboardService: DashboardService,
    private usuarioService: UsuarioService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.formDate = this.fb.group({ dataInicio: [null], dataFim: [null] });
    this.carregarSeparadores();
    this.carregarDados();
    this.dadosSub = interval(60000).subscribe(() => this.carregarDados(true));
    this.carregarOnlineAgora();
    this.onlineSub = interval(10000).subscribe(() => this.carregarOnlineAgora());
  }

  ngOnDestroy(): void {
    this.dadosSub?.unsubscribe();
    this.onlineSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  fecharDrawer() {
    this.drawerAberto = false;
    this.drawerSeparador = null;
  }

  private carregarOnlineAgora() {
    this.atualizandoOnline = true;
    this.dashboardService.getOnlineAgora().subscribe({
      next: res => {
        this.atividadeAgora = res.atividadeAgora;
        this.usuariosAtivos = res.usuariosAtivos;
        this.atualizandoOnline = false;
      },
      error: () => { this.atualizandoOnline = false; },
    });
  }

  setPeriodo(p: PeriodoType) {
    this.periodo = p;
    if (p !== 'custom') { this.dataInicio = null; this.dataFim = null; }
    this.carregarDados();
  }

  get periodoLabel(): string {
    if (this.periodo === 'custom' && this.dataInicio && this.dataFim) {
      const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${fmt(this.dataInicio)} – ${fmt(this.dataFim)}`;
    }
    return 'Período';
  }

  abrirDatePicker() { this.datePickerAberto = !this.datePickerAberto; }

  aplicarDateRange() {
    const v = this.formDate.value;
    if (v.dataInicio && v.dataFim) {
      this.dataInicio = v.dataInicio;
      this.dataFim = v.dataFim;
      this.periodo = 'custom';
      this.carregarDados();
    }
    this.datePickerAberto = false;
  }

  abrirDrawer(r: RankingItemDTO) {
    this.drawerSeparador = r;
    this.drawerAberto = true;
    this.carregarDados(true);
  }

  carregarDados(silencioso = false) {
    if (!silencioso) this.carregando = true;
    const params: any = { periodo: this.periodo };
    if (this.drawerSeparador) params.idUsuarioTimeline = this.drawerSeparador.idUsuario;
    if (this.periodo === 'custom' && this.dataInicio && this.dataFim) {
      params.dataInicio = this.dataInicio.toISOString().split('T')[0];
      params.dataFim = this.dataFim.toISOString().split('T')[0];
    }
    this.dashboardService.getProdutividade(params).subscribe({
      next: dados => { this.dados = dados; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  private carregarSeparadores() {
    this.usuarioService.getUsuarios({ perfil: 'SEPARADOR' }, { skipLoading: true }).subscribe({
      next: res => { this.separadores = res.data.map((u: any) => ({ id: u.id, nome: u.nome })); },
    });
  }

  // ── Helpers de status ──

  getStatus(idUsuario: number): StatusSeparador {
    const hb = this.atividadeAgora.find(a => a.idUsuario === idUsuario);
    if (!hb) return 'offline';
    if (hb.minutosAtivo > 20 && !hb.numeroConferencia) return 'inativo';
    return 'online';
  }

  getAtividadeSeparador(idUsuario: number): AtividadeAgoraDTO | undefined {
    return this.atividadeAgora.find(a => a.idUsuario === idUsuario);
  }

  isOnline(idUsuario: number): boolean {
    return this.atividadeAgora.some(a => a.idUsuario === idUsuario);
  }

  // ── Helpers de heatmap e picos ──

  get maxPico(): number {
    return Math.max(...(this.dados?.picos?.map(p => p.total) ?? [1]), 1);
  }

  getPicoHora(): number {
    if (!this.dados?.picos?.length) return 0;
    return this.dados.picos.reduce((max, p) => p.total > max.total ? p : max).hora;
  }

  heatmapCores(valor: number, max: number): string {
    if (!valor || !max) return 'rgba(34,197,94,0.06)';
    const ratio = valor / max;
    if (ratio < 0.2) return 'rgba(34,197,94,0.15)';
    if (ratio < 0.4) return 'rgba(34,197,94,0.30)';
    if (ratio < 0.6) return 'rgba(34,197,94,0.50)';
    if (ratio < 0.8) return 'rgba(34,197,94,0.72)';
    return '#16a34a';
  }

  getHeatmapCell(dia: number, hora: number): number {
    return this.dados?.heatmap?.find(h => h.dia === dia && h.hora === hora)?.total ?? 0;
  }

  get maxHeatmap(): number {
    return Math.max(...(this.dados?.heatmap?.map(h => h.total) ?? [1]), 1);
  }

  // ── Picos do separador selecionado (derivados da timeline) ──

  get picosSeparador(): PicoDTO[] {
    const map = new Map<number, number>();
    for (const t of this.dados?.linhaDoTempo ?? []) {
      if (!t.dtAbertura || t.abandonada) continue;
      const hora = new Date(t.dtAbertura).getHours();
      map.set(hora, (map.get(hora) ?? 0) + 1);
    }
    return Array.from({ length: 24 }, (_, h) => ({ hora: h, total: map.get(h) ?? 0 }));
  }

  get maxPicoSeparador(): number {
    return Math.max(...this.picosSeparador.map(p => p.total), 1);
  }

  get producaoUltimaHoraSeparador(): number {
    const horaAtual = new Date().getHours();
    return this.picosSeparador.find(p => p.hora === horaAtual)?.total ?? 0;
  }

  trackByIdx(i: number) { return i; }
}
