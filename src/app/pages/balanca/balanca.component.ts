import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component, Inject, isDevMode, OnDestroy, OnInit, PLATFORM_ID,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
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
import { LocalScaleService } from '../../services/balanca/local-scale.service';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { Usuario } from '../../services/usuario/usuario.model';

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
    private localScale: LocalScaleService,
    private usuarioService: UsuarioService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  // ── Vista ────────────────────────────────────────────────────────────────────
  vista: 'lista' | 'configurar' = 'lista';
  editandoId: string | null = null;

  // ── Lista ────────────────────────────────────────────────────────────────────
  balancas: BalancaDTO[]  = [];
  carregando             = false;

  // ── Usuários (para vínculo balança↔usuário) ─────────────────────────────────
  usuarios: Usuario[] = [];

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
  private serialSub?: Subscription;

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

  ngOnInit() {
    this.carregar();
    this.usuarioService.getUsuarios({ perPage: 100, status: true }, { skipLoading: true }).subscribe({
      next: (res) => { this.usuarios = res.data; },
    });
  }

  ngOnDestroy() {
    this.pararPolling();
    this.pararStreamSerial();
    if (this.editandoId && this.lendoPeso && !this.isSerial) {
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
      idsUsuarios:      [[]],
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
      idsUsuarios:      [b.idsUsuarios ?? []],
    });

    this.vista = 'configurar';
    this.carregarPortas();
  }

  voltarLista() {
    this.pararPolling();
    this.pararStreamSerial();
    if (this.editandoId && this.lendoPeso && !this.isSerial) {
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
    // Portas COM físicas existem na máquina do operador, não no servidor —
    // por isso tenta primeiro o agente local (ws://localhost:3099) e só cai
    // para o endpoint do backend (útil apenas se o backend rodar on-premise).
    this.localScale.listarPortasAgente().subscribe({
      next: (portasAgente) => {
        if (portasAgente.length > 0) {
          this.portasCOM       = portasAgente;
          this.carregandoPortas = false;
          if (!this.form.get('portaCom')?.value) {
            this.form.get('portaCom')?.setValue(portasAgente[0]);
          }
          return;
        }
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
    this.mensagemStatus = 'Conectando ao agente local...';
    this.adicionarLog(`Abrindo porta ${v.portaCom} — Baud ${v.baudRate} — Protocolo ${v.protocoloSerial} (via agente local)`, 'info');

    this.iniciarStreamSerial(this.buildBalancaTempSerial(v));
  }

  testarHTTP() {
    const v = this.form.value;
    if (!v.ip || !v.porta) {
      this.adicionarLog('Preencha IP e Porta antes de testar.', 'erro');
      return;
    }
    this.statusConexao  = 'conectando';
    this.mensagemStatus = 'Conectando...';
    const balancaTemp: BalancaDTO = {
      id: '', nome: '', fabricante: '', modelo: null, ativo: true,
      tipoComunicacao: v.tipoComunicacao,
      portaCom: null, baudRate: 4800, dataBits: 8, paridade: 'NONE', stopBits: 1, protocoloSerial: 'P05',
      protocolo: v.tipoComunicacao === 'TOLEDO_TCP' ? 'TOLEDO_TCP' : 'HTTP',
      ip: v.ip, porta: v.porta, rota: v.rota ?? '/peso',
    };
    this.adicionarLog(`Testando ${v.tipoComunicacao} em http://${v.ip}:${v.porta}${v.rota ?? '/peso'}`, 'info');
    this.localScale.lerStatus(balancaTemp).subscribe({
      next: (res) => {
        if (res.conectado) {
          this.statusConexao  = 'conectado';
          this.mensagemStatus = `Peso atual: ${res.pesoAtual.toFixed(3).replace('.', ',')} kg`;
          this.pesoAtual      = res.pesoAtual;
          this.adicionarLog(`Conectado — peso: ${res.pesoAtual.toFixed(3)} kg`, 'ok');
          this.iniciarPollingHTTP(balancaTemp);
        } else {
          this.statusConexao  = 'erro';
          this.mensagemStatus = 'Sem resposta. Verifique IP, porta e CORS.';
          this.adicionarLog('Sem resposta da balança.', 'erro');
        }
      },
      error: () => {
        this.statusConexao  = 'erro';
        this.mensagemStatus = 'Falha na conexão. Verifique IP, porta e CORS.';
        this.adicionarLog('Erro de conexão.', 'erro');
      },
    });
  }

  private buildBalancaTempSerial(v: any): BalancaDTO {
    return {
      id: '', nome: v.nome ?? '', fabricante: v.fabricante ?? 'Toledo', modelo: v.modelo ?? null, ativo: true,
      tipoComunicacao: v.tipoComunicacao,
      portaCom: v.portaCom, baudRate: v.baudRate, dataBits: v.dataBits,
      paridade: v.paridade, stopBits: v.stopBits, protocoloSerial: v.protocoloSerial,
      protocolo: 'SERIAL',
      ip: null, porta: null, rota: '/peso',
    };
  }

  /** Assinatura contínua (push, via WebSocket do agente local) — sem polling. */
  private iniciarStreamSerial(balancaTemp: BalancaDTO) {
    this.pararStreamSerial();
    this.lendoPeso = true;
    let primeiraResposta = true;

    this.serialSub = this.localScale.lerStatus(balancaTemp).subscribe({
      next: (res) => {
        if (res.conectado) {
          if (primeiraResposta) {
            this.adicionarLog(`Conectado via agente local — peso: ${res.pesoAtual.toFixed(3)} kg`, 'ok');
          } else if (res.pesoAtual !== this.pesoAtual) {
            this.adicionarLog(`Peso: ${res.pesoAtual.toFixed(3).replace('.', ',')} kg`, 'info');
          }
          this.statusConexao  = 'conectado';
          this.mensagemStatus = `Peso atual: ${res.pesoAtual.toFixed(3).replace('.', ',')} kg`;
          this.pesoAtual       = res.pesoAtual;
        } else {
          this.statusConexao  = 'erro';
          this.mensagemStatus = 'Sem resposta do agente local. Verifique se ele está rodando na estação (ws://localhost:3099).';
          if (primeiraResposta) {
            this.adicionarLog('Agente local não respondeu. Confira se o agente está instalado e rodando nesta máquina.', 'erro');
          }
        }
        primeiraResposta = false;
      },
    });
  }

  private pararStreamSerial() {
    this.serialSub?.unsubscribe();
    this.serialSub = undefined;
  }

  private iniciarPollingHTTP(balancaTemp: BalancaDTO) {
    this.pararPolling();
    this.lendoPeso = true;
    this.pollingInterval = setInterval(() => {
      this.localScale.lerStatus(balancaTemp).subscribe({
        next: (res) => {
          if (res.conectado) {
            if (res.pesoAtual !== this.pesoAtual) {
              this.adicionarLog(`Peso: ${res.pesoAtual.toFixed(3).replace('.', ',')} kg`, 'info');
              this.pesoAtual = res.pesoAtual;
            }
            this.statusConexao = 'conectado';
          } else {
            this.statusConexao = 'erro';
            this.mensagemStatus = 'Balança não respondeu.';
          }
        },
      });
    }, 600);
  }

  iniciarLeitura() {
    if (!this.editandoId) {
      this.erroSalvar = 'Salve a configuração antes de iniciar a leitura contínua.';
      return;
    }
    if (this.lendoPeso) return;

    const v = this.form.value;
    this.adicionarLog(`Iniciando leitura contínua na porta ${v.portaCom} (via agente local)...`, 'info');
    this.iniciarStreamSerial(this.buildBalancaTempSerial(v));
  }

  pararLeitura() {
    if (!this.lendoPeso) return;
    this.pararPolling();
    this.pararStreamSerial();
    this.lendoPeso      = false;
    this.statusConexao  = 'desconectado';
    this.mensagemStatus = '';
    this.adicionarLog('Leitura encerrada.', 'info');

    // Backend só é relevante para o driver serial on-premise (não usado quando o
    // backend roda na nuvem, cenário em que a leitura acontece via agente local).
    if (this.editandoId && !this.isSerial) {
      this.balancaService.pararLeitura(this.editandoId).subscribe();
    }
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
    this.pararStreamSerial();
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
