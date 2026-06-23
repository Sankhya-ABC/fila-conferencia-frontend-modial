import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component, Inject, isDevMode, OnDestroy, OnInit, PLATFORM_ID,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BalancaDTO, CriarBalancaParams } from '../../services/balanca/balanca.model';
import { BalancaService } from '../../services/balanca/balanca.service';

interface LogEntry { hora: string; msg: string; tipo: 'info' | 'ok' | 'erro'; }

@Component({
  selector: 'app-balanca',
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
    MatProgressSpinnerModule,
  ],
  templateUrl: './balanca.component.html',
  styleUrl: './balanca.component.scss',
})
export class BalancaComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private balancaService: BalancaService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  // ── Vista ────────────────────────────────────────────────────────────────────
  vista: 'lista' | 'configurar' = 'lista';
  editandoId: string | null = null;

  // ── Lista ────────────────────────────────────────────────────────────────────
  balancas: BalancaDTO[]  = [];
  carregando             = false;

  // ── Form ─────────────────────────────────────────────────────────────────────
  form!: FormGroup;
  salvando  = false;
  erroSalvar = '';

  // ── Portas COM ───────────────────────────────────────────────────────────────
  portasCOM: string[]   = [];
  carregandoPortas      = false;

  // ── Teste ────────────────────────────────────────────────────────────────────
  statusConexao: 'desconectado' | 'conectando' | 'conectado' | 'erro' = 'desconectado';
  mensagemStatus = '';
  pesoAtual      = 0;
  lendoPeso      = false;
  logs: LogEntry[] = [];
  private pollingInterval?: ReturnType<typeof setInterval>;

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteInfo: { id: string; nome: string } | null = null;
  deleteCarregando = false;

  // ── Constantes ───────────────────────────────────────────────────────────────
  readonly modelos        = ['Checkout 8217', 'Prix 3 Fit', 'Prix 4', 'Prix 5', 'Outro'];
  readonly baudRates      = [1200, 2400, 4800, 9600, 19200];
  readonly databitsList   = [7, 8];
  readonly paridades      = [
    { value: 'NONE', label: 'None' },
    { value: 'EVEN', label: 'Even' },
    { value: 'ODD',  label: 'Odd'  },
  ];
  readonly stopBitsList   = [1, 2];
  readonly protocolosSerial = [
    { value: 'P05',            label: 'Toledo P05' },
    { value: 'PRT1',           label: 'Toledo PRT1' },
    { value: 'PRT2',           label: 'Toledo PRT2' },
    { value: 'CONTINUO',       label: 'Toledo Contínuo' },
    { value: 'SOB_REQUISICAO', label: 'Toledo Sob Requisição' },
  ];
  readonly tiposComunicacao = [
    { value: 'SERIAL_RS232', label: 'Serial RS-232' },
    { value: 'SERIAL_USB',   label: 'USB (COM Virtual)' },
    { value: 'HTTP',         label: 'HTTP' },
    { value: 'TOLEDO_TCP',   label: 'Toledo TCP (SICS)' },
  ];

  get isDevMode()  { return isDevMode(); }
  get isSerial()   { return this.form?.get('tipoComunicacao')?.value?.startsWith('SERIAL'); }
  get isHTTP()     { return this.form?.get('tipoComunicacao')?.value === 'HTTP'; }
  get isTCP()      { return this.form?.get('tipoComunicacao')?.value === 'TOLEDO_TCP'; }
  get pesoFormatado() {
    return this.pesoAtual.toFixed(3).replace('.', ',');
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit() { this.carregar(); }

  ngOnDestroy() {
    this.pararPolling();
    if (this.editandoId && this.lendoPeso) {
      this.balancaService.pararLeitura(this.editandoId).subscribe();
    }
  }

  // ── Lista ────────────────────────────────────────────────────────────────────

  carregar() {
    this.carregando = true;
    this.balancaService.listar().subscribe({
      next: (list) => { this.balancas = list; this.carregando = false; },
      error: ()    => { this.carregando = false; },
    });
  }

  // ── Navegação ────────────────────────────────────────────────────────────────

  novaBalanca() {
    this.editandoId = null;
    this.erroSalvar = '';
    this.resetTeste();

    this.form = this.fb.group({
      nome:             ['', Validators.required],
      fabricante:       ['Toledo'],
      modelo:           [null],
      tipoComunicacao:  ['SERIAL_RS232', Validators.required],
      portaCom:         [null],
      baudRate:         [4800, Validators.required],
      dataBits:         [8,    Validators.required],
      paridade:         ['NONE', Validators.required],
      stopBits:         [1,    Validators.required],
      protocoloSerial:  ['P05', Validators.required],
      ip:               [null],
      porta:            [null],
      rota:             ['/peso'],
    });

    this.vista = 'configurar';
    this.carregarPortas();
  }

  editarBalanca(b: BalancaDTO) {
    this.editandoId = b.id;
    this.erroSalvar = '';
    this.resetTeste();

    this.form = this.fb.group({
      nome:             [b.nome, Validators.required],
      fabricante:       [b.fabricante ?? 'Toledo'],
      modelo:           [b.modelo],
      tipoComunicacao:  [b.tipoComunicacao ?? 'HTTP', Validators.required],
      portaCom:         [b.portaCom],
      baudRate:         [b.baudRate ?? 4800, Validators.required],
      dataBits:         [b.dataBits ?? 8,   Validators.required],
      paridade:         [b.paridade ?? 'NONE', Validators.required],
      stopBits:         [b.stopBits ?? 1,   Validators.required],
      protocoloSerial:  [b.protocoloSerial ?? 'P05', Validators.required],
      ip:               [b.ip],
      porta:            [b.porta],
      rota:             [b.rota ?? '/peso'],
    });

    this.vista = 'configurar';
    this.carregarPortas();
  }

  voltarLista() {
    this.pararPolling();
    if (this.editandoId && this.lendoPeso) {
      this.balancaService.pararLeitura(this.editandoId).subscribe();
    }
    this.vista = 'lista';
    this.carregar();
  }

  // ── Salvar ───────────────────────────────────────────────────────────────────

  salvar() {
    if (this.form.invalid || this.salvando) return;
    this.salvando  = true;
    this.erroSalvar = '';

    const v = this.form.value as CriarBalancaParams;

    const req = this.editandoId
      ? this.balancaService.atualizar(this.editandoId, v)
      : this.balancaService.criar(v);

    req.subscribe({
      next: (saved) => {
        this.salvando    = false;
        this.editandoId  = saved.id;
        this.adicionarLog('Configuração salva com sucesso.', 'ok');
        this.carregar();
      },
      error: (err) => {
        this.salvando   = false;
        this.erroSalvar = err?.error?.message ?? 'Erro ao salvar.';
      },
    });
  }

  // ── Portas COM ───────────────────────────────────────────────────────────────

  carregarPortas() {
    this.carregandoPortas = true;
    this.balancaService.listarPortasCOM().subscribe({
      next: (portas) => {
        this.portasCOM       = portas;
        this.carregandoPortas = false;
        if (portas.length > 0 && !this.form.get('portaCom')?.value) {
          this.form.get('portaCom')?.setValue(portas[0]);
        }
      },
      error: () => {
        this.portasCOM       = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];
        this.carregandoPortas = false;
      },
    });
  }

  // ── Teste de comunicação ─────────────────────────────────────────────────────

  testarConexao() {
    const v = this.form.value;
    if (!v.portaCom) {
      this.adicionarLog('Selecione uma porta COM antes de testar.', 'erro');
      return;
    }

    this.statusConexao = 'conectando';
    this.mensagemStatus = 'Tentando conexão...';
    this.adicionarLog(`Abrindo porta ${v.portaCom} — Baud ${v.baudRate} — Protocolo ${v.protocoloSerial}`, 'info');

    this.balancaService.testarConexaoDireta({
      portaCom:        v.portaCom,
      baudRate:        v.baudRate,
      dataBits:        v.dataBits,
      paridade:        v.paridade,
      stopBits:        v.stopBits,
      protocoloSerial: v.protocoloSerial,
    }).subscribe({
      next: (res) => {
        if (res.sucesso) {
          this.statusConexao  = 'conectado';
          this.mensagemStatus = res.mensagem;
          if (res.peso != null) this.pesoAtual = res.peso;
          this.adicionarLog(res.mensagem, 'ok');
        } else {
          this.statusConexao  = 'erro';
          this.mensagemStatus = res.mensagem;
          this.adicionarLog(res.mensagem, 'erro');
        }
      },
      error: (err) => {
        this.statusConexao  = 'erro';
        this.mensagemStatus = err?.error?.message ?? 'Falha na comunicação.';
        this.adicionarLog(this.mensagemStatus, 'erro');
      },
    });
  }

  iniciarLeitura() {
    if (!this.editandoId) {
      this.erroSalvar = 'Salve a configuração antes de iniciar a leitura contínua.';
      return;
    }
    if (this.lendoPeso) return;

    this.adicionarLog(`Iniciando leitura contínua na porta ${this.form.get('portaCom')?.value}...`, 'info');

    this.balancaService.iniciarLeitura(this.editandoId).subscribe({
      next: () => {
        this.lendoPeso      = true;
        this.statusConexao  = 'conectado';
        this.mensagemStatus = 'Leitura contínua ativa.';
        this.adicionarLog('Leitura contínua iniciada.', 'ok');
        this.iniciarPolling();
      },
      error: (err) => {
        this.statusConexao  = 'erro';
        this.mensagemStatus = err?.error?.message ?? 'Falha ao iniciar leitura.';
        this.adicionarLog(this.mensagemStatus, 'erro');
      },
    });
  }

  pararLeitura() {
    if (!this.editandoId || !this.lendoPeso) return;
    this.pararPolling();

    this.balancaService.pararLeitura(this.editandoId).subscribe({
      next: () => {
        this.lendoPeso      = false;
        this.statusConexao  = 'desconectado';
        this.mensagemStatus = '';
        this.adicionarLog('Leitura encerrada.', 'info');
      },
    });
  }

  simularPeso() {
    if (!this.editandoId) {
      this.erroSalvar = 'Salve a configuração antes de simular.';
      return;
    }
    this.balancaService.simularPeso(this.editandoId).subscribe({
      next: (res) => {
        this.pesoAtual      = res.peso;
        this.statusConexao  = 'conectado';
        this.mensagemStatus = 'Peso simulado.';
        this.adicionarLog(`Peso simulado: ${res.peso.toFixed(3)} kg`, 'ok');
        if (!this.lendoPeso) {
          this.lendoPeso = true;
          this.iniciarPolling();
        }
      },
    });
  }

  // ── Polling ──────────────────────────────────────────────────────────────────

  private iniciarPolling() {
    this.pararPolling();
    if (!isPlatformBrowser(this.platformId) || !this.editandoId) return;

    this.pollingInterval = setInterval(() => {
      if (!this.editandoId) return;
      this.balancaService.pesoAtual(this.editandoId).subscribe({
        next: (res) => {
          if (res.lendo) {
            if (res.peso !== this.pesoAtual) {
              this.adicionarLog(`Peso recebido: ${res.peso.toFixed(3).replace('.', ',')} kg`, 'info');
              this.pesoAtual = res.peso;
            }
            this.statusConexao = 'conectado';
          } else if (res.erro) {
            this.statusConexao  = 'erro';
            this.mensagemStatus = res.erro;
            this.adicionarLog(res.erro, 'erro');
            this.pararPolling();
            this.lendoPeso = false;
          }
        },
      });
    }, 300);
  }

  private pararPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────

  adicionarLog(msg: string, tipo: LogEntry['tipo'] = 'info') {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    this.logs.unshift({ hora, msg, tipo });
    if (this.logs.length > 200) this.logs.length = 200;
  }

  limparLog() { this.logs = []; }

  // ── Delete ───────────────────────────────────────────────────────────────────

  pedirDelete(b: BalancaDTO) { this.deleteInfo = { id: b.id, nome: b.nome }; }

  cancelarDelete() { if (!this.deleteCarregando) this.deleteInfo = null; }

  confirmarDelete() {
    if (!this.deleteInfo || this.deleteCarregando) return;
    this.deleteCarregando = true;
    this.balancaService.remover(this.deleteInfo.id).subscribe({
      next: () => {
        this.deleteCarregando = false;
        this.deleteInfo = null;
        this.carregar();
      },
      error: () => { this.deleteCarregando = false; },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private resetTeste() {
    this.pararPolling();
    this.statusConexao  = 'desconectado';
    this.mensagemStatus = '';
    this.pesoAtual      = 0;
    this.lendoPeso      = false;
    this.logs           = [];
  }

  tipoBadgeLabel(b: BalancaDTO): string {
    const MAP: Record<string, string> = {
      SERIAL_RS232: 'Serial RS232',
      SERIAL_USB:   'USB COM',
      HTTP:         'HTTP',
      TOLEDO_TCP:   'Toledo TCP',
    };
    return MAP[b.tipoComunicacao] ?? b.tipoComunicacao;
  }

  enderecoLabel(b: BalancaDTO): string {
    if (b.tipoComunicacao?.startsWith('SERIAL')) {
      return b.portaCom
        ? `${b.portaCom} · ${b.baudRate ?? 4800} bps`
        : '—';
    }
    return b.ip ? `${b.ip}:${b.porta}` : '—';
  }
}
