import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { map } from 'rxjs/operators';
import { CodigoDescricao } from '../../services/dominio/dominio.model';
import { EmpresaDTO } from '../../services/empresa/empresa.model';
import { EmpresaService } from '../../services/empresa/empresa.service';
import {
  FilaConferenciaDTO,
} from '../../services/conferencia/conferencia.model';
import { ConferenciaService } from '../../services/conferencia/conferencia.service';
import { ParceiroDTO } from '../../services/parceiro/parceiro.model';
import { ParceiroService } from '../../services/parceiro/parceiro.service';
import { DominioService } from '../../services/dominio/dominio.service';
import { AuthService } from '../../services/auth/auth.service';

// Cópia simplificada de FilaConferenciaComponent: mesma UI de grid de
// cards, mas sempre filtrada em codigoStatus='C' (Aguardando liberação
// de corte) — não há seleção de status aqui, e o botão de ação só abre
// a conferência pra consulta (não inicia/retoma trabalho nela).
@Component({
  selector: 'app-liberacao-corte',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatBadgeModule,
    MatCardModule,
  ],
  templateUrl: './liberacao-corte.component.html',
  styleUrls: ['./liberacao-corte.component.scss'],
})
export class LiberacaoCorteComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private conferenciaService: ConferenciaService,
    private dominioService: DominioService,
    private parceiroService: ParceiroService,
    private empresaService: EmpresaService,
    private router: Router,
    private authService: AuthService,
  ) {}

  dataSource = new MatTableDataSource<FilaConferenciaDTO>([]);
  page = 0;
  perPage = 50;
  total = 0;
  get totalLabel(): string {
    return this._hasNextPage ? `${this.total}+` : `${this.total}`;
  }

  get temNumtalao(): boolean {
    return this.authService.hasModulo('AD_NUMTALAO');
  }

  get temConferenciaParcial(): boolean {
    return this.authService.hasModulo('CONFERENCIA_PARCIAL');
  }

  etapaStatus(item: FilaConferenciaDTO, tipo: 'PESAVEL' | 'NAO_PESAVEL'): 'PENDENTE' | 'CONCLUIDA' | 'NAO_APLICAVEL' {
    const e = item.etapas?.find((x) => x.tipo === tipo);
    if (!e) return 'NAO_APLICAVEL';
    if (e.status === 'C') return e.idUsuarioConclusao != null ? 'CONCLUIDA' : 'NAO_APLICAVEL';
    return 'PENDENTE';
  }
  filtroAberto = false;
  filtroAvancadoAberto = false;
  carregando = false;
  cardExpandido: number | null = null;
  private _hasNextPage = false;

  private readonly TIPO_ENTREGA_MAP: Record<string, string> = {
    '1': 'CIF', '2': 'FOB', '3': 'Por conta de terceiros',
    '4': 'Sem frete', '9': 'Sem cobrança',
    C: 'CIF', F: 'FOB', T: 'Terceiros',
    S: 'Sem frete', R: 'Remetente', D: 'Destinatário',
  };

  getTipoEntregaLabel(codigo: string | null | undefined): string {
    if (!codigo) return '—';
    return this.TIPO_ENTREGA_MAP[codigo] ?? codigo;
  }

  private readonly statusDescricoes: Record<string, string> = {
    C: 'Aguardando liberação de corte',
  };

  descricaoStatus(codigo: string): string {
    return this.statusDescricoes[(codigo ?? '').toUpperCase()] ?? codigo ?? '?';
  }

  // Auto-refresh
  autoRefreshAtivo = true;
  autoRefreshIntervalo = 60;
  autoRefreshProgresso = 0;
  private autoRefreshTimer: any;
  private autoRefreshTick: any;
  ultimaAtualizacao: Date | null = null;

  // selects
  listTipoOperacao: CodigoDescricao[] = [];
  listTipoEntrega: CodigoDescricao[] = [];
  listParceiro: ParceiroDTO[] = [];
  listEmpresa: EmpresaDTO[] = [];

  // filters
  filters!: FormGroup;

  // user
  user$ = this.authService.user$;
  nome$ = this.user$.pipe(
    map((user) => {
      const parts = (user?.nome || '').split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] || '';
    }),
  );
  initials$ = this.user$.pipe(
    map((user) => {
      const name = user?.nome || '';
      return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }),
  );
  perfil$ = this.user$.pipe(map((user) => user?.perfil || ''));

  ngOnInit(): void {
    this.criarForm();

    this.dominioService.getTipoOperacao().subscribe((data) => (this.listTipoOperacao = data));
    this.dominioService.getTipoEntrega().subscribe((data) => (this.listTipoEntrega = data));

    this.filters.get('idParceiro')!.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        if (!value || typeof value !== 'string') { this.listParceiro = []; return; }
        this.parceiroService.getParceiros({ search: value }).subscribe((resp) => (this.listParceiro = resp));
      });

    this.filters.get('idEmpresa')!.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        if (!value || typeof value !== 'string') { this.listEmpresa = []; return; }
        this.empresaService.getEmpresas({ search: value }).subscribe((resp) => (this.listEmpresa = resp));
      });

    this.applyFilter();
  }

  private criarForm(): void {
    this.filters = this.fb.group({
      tipoNegocio: [['VENDAS', 'COMPRAS']],
      numeroNota: [],
      numeroUnico: [],
      numeroModial: [],
      dataInicio: [],
      dataFim: [],
      idParceiro: [],
      idEmpresa: [],
      codigoTipoOperacao: [],
      codigoTipoEntrega: [],
      ordemCarga: [],
    });
  }

  toggleTipoNegocio(tipo: string): void {
    const ctrl = this.filters.get('tipoNegocio');
    if (!ctrl) return;
    const atual: string[] = ctrl.value ?? [];
    ctrl.setValue(
      atual.includes(tipo) ? atual.filter(t => t !== tipo) : [...atual, tipo]
    );
  }

  isTipoNegocioSelecionado(tipo: string): boolean {
    return (this.filters.get('tipoNegocio')?.value ?? []).includes(tipo);
  }

  get activeFilterCount(): number {
    const v = this.filters.value;
    let count = 0;
    const defaultNegocio = ['VENDAS', 'COMPRAS'];
    const negocioVal = v.tipoNegocio;
    if (negocioVal && JSON.stringify([...negocioVal].sort()) !== JSON.stringify([...defaultNegocio].sort())) count++;
    if (v.numeroNota) count++;
    if (v.numeroUnico) count++;
    if (v.numeroModial) count++;
    if (v.dataInicio) count++;
    if (v.dataFim) count++;
    if (v.idParceiro) count++;
    if (v.idEmpresa) count++;
    if (v.codigoTipoOperacao?.length) count++;
    if (v.codigoTipoEntrega?.length) count++;
    if (v.ordemCarga) count++;
    return count;
  }

  // paginator
  get totalPages(): number {
    return this.page + 1 + (this._hasNextPage ? 1 : 0);
  }

  get hasPrevPage(): boolean {
    return this.page > 0;
  }

  get hasNextPage(): boolean {
    return this._hasNextPage;
  }

  get pageStart(): number {
    if (this.dataSource.data.length === 0) return 0;
    return this.page * this.perPage + 1;
  }

  get pageEnd(): number {
    return this.page * this.perPage + this.dataSource.data.length;
  }

  prevPage(): void {
    if (!this.hasPrevPage) return;
    this.page--;
    this.applyFilter();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;
    this.page++;
    this.applyFilter();
  }

  onPerPageChange(value: number): void {
    this.perPage = Number(value);
    this.page = 0;
    this.applyFilter();
  }

  displayEmpresa(empresa?: EmpresaDTO): string {
    return empresa ? `${empresa.nome} - ${empresa.cpfCnpj}` : '';
  }

  displayParceiro(parceiro?: ParceiroDTO): string {
    return parceiro ? `${parceiro.nome} - ${parceiro.cpfCnpj}` : '';
  }

  onPesquisar(): void {
    this.page = 0;
    this.filtroAberto = false;
    this.applyFilter();
  }

  private iniciarAutoRefresh() {
    this.pararAutoRefresh();
    if (!this.autoRefreshAtivo) return;

    const totalMs = this.autoRefreshIntervalo * 1000;
    const tickMs = 200;
    let elapsed = 0;
    this.autoRefreshProgresso = 0;

    this.autoRefreshTick = setInterval(() => {
      elapsed += tickMs;
      this.autoRefreshProgresso = Math.min((elapsed / totalMs) * 100, 100);

      if (elapsed >= totalMs) {
        this.pararAutoRefresh();
        this.applyFilter(true);
      }
    }, tickMs);
  }

  private pararAutoRefresh() {
    clearInterval(this.autoRefreshTick);
    clearTimeout(this.autoRefreshTimer);
    this.autoRefreshProgresso = 0;
  }

  toggleAutoRefresh() {
    this.autoRefreshAtivo = !this.autoRefreshAtivo;
    if (this.autoRefreshAtivo) {
      this.iniciarAutoRefresh();
    } else {
      this.pararAutoRefresh();
    }
  }

  refreshAgora() {
    this.pararAutoRefresh();
    this.applyFilter(true);
  }

  get autoRefreshSegRestantes(): number {
    return Math.ceil(
      this.autoRefreshIntervalo * (1 - this.autoRefreshProgresso / 100),
    );
  }

  get ultimaAtualizacaoLabel(): string {
    if (!this.ultimaAtualizacao) return '';
    const diff = Math.floor((Date.now() - this.ultimaAtualizacao.getTime()) / 1000);
    if (diff < 60) return `há ${diff}s`;
    return `há ${Math.floor(diff / 60)}min`;
  }

  ngOnDestroy() {
    this.pararAutoRefresh();
  }

  applyFilter(silencioso = false): void {
    if (!silencioso) {
      this.dataSource.data = [];
      this.carregando = true;
    }

    const rawParams = this.filters.value;

    const tipoNegocio: string[] = rawParams.tipoNegocio ?? [];
    const movs: string[] = [];
    if (tipoNegocio.includes('VENDAS')) movs.push('V', 'P');
    if (tipoNegocio.includes('COMPRAS')) movs.push('O', 'C');
    const codigoTipoMovimento = movs.length > 0 && movs.length < 4 ? movs.join(',') : undefined;

    const params: any = {
      ...rawParams,
      codigoStatus: 'C', // fixo — essa tela é só liberação de corte
      idParceiro: rawParams.idParceiro?.id,
      idEmpresa: rawParams.idEmpresa?.id,
      codigoTipoMovimento,
      page: this.page,
      perPage: this.perPage,
    };
    delete params.tipoNegocio;

    params.dataInicio = params.dataInicio
      ? formatDate(params.dataInicio, 'yyyy-MM-dd', 'en-US')
      : undefined;
    params.dataFim = params.dataFim
      ? formatDate(params.dataFim, 'yyyy-MM-dd', 'en-US')
      : undefined;

    Object.keys(params).forEach((k) => params[k] == null && delete params[k]);

    this.conferenciaService.getFilaConferencias(params).pipe(
      finalize(() => (this.carregando = false)),
    ).subscribe({
      next: (resp: any) => {
        this.dataSource.data = Array.isArray(resp)
          ? resp
          : (resp?.data ?? resp?.content ?? resp?.items ?? []);

        this._hasNextPage = resp?.hasNextPage ?? resp?.has_next_page ?? false;
        this.total = this.dataSource.data.length;

        this.ultimaAtualizacao = new Date();
        if (this.autoRefreshAtivo) this.iniciarAutoRefresh();
      },
      error: () => (this.dataSource.data = []),
    });
  }

  onLimparCampos(): void {
    this.criarForm();
  }

  // Só consulta — a liberação em si acontece no Sankhya (manual ou
  // automática, pra corte 100% de peso).
  onConsultar(fila: FilaConferenciaDTO): void {
    this.router.navigate([`/separacao/${fila?.numeroUnico}`]);
  }

  displayDate(date: string | null | undefined): string {
    if (!date) return '—';
    if (/^\d{8}$/.test(date)) {
      return `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4, 8)}`;
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
    return date;
  }

  statusBadgeClass(_codigo: string): string {
    return 'badge--r';
  }

  statusIcon(_codigo: string): string {
    return 'lock_clock';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cardExpandido = null;
  }

  toggleCard(item: FilaConferenciaDTO): void {
    this.cardExpandido = this.cardExpandido === item.numeroUnico ? null : item.numeroUnico;
  }

  trackByItem(index: number, item: FilaConferenciaDTO): number {
    return item.numeroUnico;
  }

  getLabelTipoOperacao(codigo: unknown): string {
    const str = String(codigo ?? '');
    return this.listTipoOperacao.find(t => t.codigo === str)?.descricao ?? str;
  }

  isTipoOperacaoSelecionado(codigo: string | number | boolean | null): boolean {
    const val: string[] = this.filters.get('codigoTipoOperacao')?.value ?? [];
    return val.includes(String(codigo));
  }

  toggleTipoOperacao(codigo: string | number | boolean | null): void {
    const ctrl = this.filters.get('codigoTipoOperacao');
    const val: string[] = [...(ctrl?.value ?? [])];
    const str = String(codigo);
    const idx = val.indexOf(str);
    idx >= 0 ? val.splice(idx, 1) : val.push(str);
    ctrl?.setValue(val);
  }
}
