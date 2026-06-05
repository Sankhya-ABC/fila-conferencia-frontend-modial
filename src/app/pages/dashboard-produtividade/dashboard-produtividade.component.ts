import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
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
  DashboardProdutividadeDTO,
  RankingItemDTO,
} from '../../services/dashboard/dashboard.model';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { DuracaoPipe } from '../../shared/pipes/duracao.pipe';
import { IniciaisPipe } from '../../shared/pipes/iniciais.pipe';

export type TabType = 'visao' | 'separadores' | 'atividade';
export type PeriodoType = 'hoje' | 'semana' | 'mes' | 'custom';

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

  // ── Navegação ──
  tabAtiva: TabType = 'visao';
  periodo: PeriodoType = 'hoje';
  dataInicio: Date | null = null;
  dataFim: Date | null = null;
  datePickerAberto = false;
  formDate!: FormGroup;

  // ── Dados ──
  dados: DashboardProdutividadeDTO | null = null;
  carregando = true;
  separadores: { id: string; nome: string }[] = [];
  usuarioSelecionado: RankingItemDTO | null = null;

  // ── Carrossel ──
  carrosselPausado = false;
  carrosselProgresso = 0;
  private readonly CARROSSEL_DURACAO = 60000;
  private carrosselSub?: Subscription;
  private dadosSub?: Subscription;

  diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  horas = Array.from({ length: 24 }, (_, i) => i);

  constructor(
    private dashboardService: DashboardService,
    private usuarioService: UsuarioService,
    private fb: FormBuilder,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.formDate = this.fb.group({ dataInicio: [null], dataFim: [null] });
    this.carregarSeparadores();
    this.carregarDados();
    this.dadosSub = interval(60000).subscribe(() => this.carregarDados(true));
    this.iniciarCarrossel();
  }

  ngOnDestroy(): void {
    this.carrosselSub?.unsubscribe();
    this.dadosSub?.unsubscribe();
  }

  setTab(tab: TabType) {
    this.tabAtiva = tab;
    this.pausarCarrossel();
    this.carrosselProgresso = 0;
  }

  setPeriodo(p: PeriodoType) {
    this.periodo = p;
    if (p !== 'custom') { this.dataInicio = null; this.dataFim = null; }
    this.carregarDados();
    this.pausarCarrossel();
  }

  get periodoLabel(): string {
    if (this.periodo === 'custom' && this.dataInicio && this.dataFim) {
      const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${fmt(this.dataInicio)} – ${fmt(this.dataFim)}`;
    }
    return 'Período';
  }

  abrirDatePicker() {
    this.datePickerAberto = !this.datePickerAberto;
    this.pausarCarrossel();
  }

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

  selecionarSeparador(r: RankingItemDTO) {
    this.usuarioSelecionado = this.usuarioSelecionado?.idUsuario === r.idUsuario ? null : r;
    this.pausarCarrossel();
    this.carregarDados(true);
  }

  private iniciarCarrossel() {
    const tick = 200;
    const steps = this.CARROSSEL_DURACAO / tick;
    this.carrosselSub = interval(tick).subscribe(() => {
      if (this.carrosselPausado) return;
      this.carrosselProgresso += 100 / steps;
      if (this.carrosselProgresso >= 100) {
        this.carrosselProgresso = 0;
        this.avancarTab();
      }
    });
  }

  private avancarTab() {
    const ordem: TabType[] = ['visao', 'separadores', 'atividade'];
    this.tabAtiva = ordem[(ordem.indexOf(this.tabAtiva) + 1) % ordem.length];
  }

  pausarCarrossel() { this.carrosselPausado = true; this.carrosselProgresso = 0; }

  toggleCarrossel() {
    this.carrosselPausado = !this.carrosselPausado;
    if (!this.carrosselPausado) this.carrosselProgresso = 0;
  }

  carregarDados(silencioso = false) {
    if (!silencioso) this.carregando = true;
    const params: any = { periodo: this.periodo };
    if (this.usuarioSelecionado) params.idUsuarioTimeline = this.usuarioSelecionado.idUsuario;
    if (this.periodo === 'custom' && this.dataInicio && this.dataFim) {
      params.dataInicio = this.dataInicio.toISOString().split('T')[0];
      params.dataFim = this.dataFim.toISOString().split('T')[0];
    }
    this.dashboardService.getProdutividade(params).subscribe({
      next: dados => {
        this.dados = { ...dados, totalItensPorHora: Math.round(dados.totalItensPorHora) || 0 };
        this.carregando = false;
      },
      error: () => { this.carregando = false; },
    });
  }

  private carregarSeparadores() {
    this.usuarioService.getUsuarios({ perfil: 'SEPARADOR' }).subscribe({
      next: res => { this.separadores = res.data.map((u: any) => ({ id: u.id, nome: u.nome })); },
    });
  }

  get maxPico(): number {
    return Math.max(...(this.dados?.picos?.map(p => p.total) ?? [1]), 1);
  }

  isOnline(idUsuario: number): boolean {
    return this.dados?.atividadeAgora?.some(a => a.idUsuario === idUsuario) ?? false;
  }

  getPicoHora(): number {
    if (!this.dados?.picos?.length) return 0;
    return this.dados.picos.reduce((max, p) => p.total > max.total ? p : max).hora;
  }

  heatmapCores(valor: number, max: number): string {
    if (!valor || !max) return 'rgba(0,0,0,0.04)';
    const ratio = valor / max;
    if (ratio < 0.2) return 'rgba(17,24,39,0.08)';
    if (ratio < 0.4) return 'rgba(17,24,39,0.18)';
    if (ratio < 0.6) return 'rgba(17,24,39,0.35)';
    if (ratio < 0.8) return 'rgba(17,24,39,0.55)';
    return '#111827';
  }

  getHeatmapCell(dia: number, hora: number): number {
    return this.dados?.heatmap?.find(h => h.dia === dia && h.hora === hora)?.total ?? 0;
  }

  get maxHeatmap(): number {
    return Math.max(...(this.dados?.heatmap?.map(h => h.total) ?? [1]), 1);
  }

  trackByIdx(i: number) { return i; }
}
