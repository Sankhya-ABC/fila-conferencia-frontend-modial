import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOption } from '@angular/material/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { forkJoin, interval, Subscription } from 'rxjs';
import { SessaoService } from '../../services/sessao/sessao.service';
import { HeartbeatService } from '../../services/heartbeat/heartbeat.service';
import { filter, first, map, switchMap, timeout } from 'rxjs/operators';
import { RoboLoaderComponent } from '../../shared/components/robo-loader/robo-loader.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ArquivoService } from '../../services/arquivo/arquivo.service';
import { AuthService } from '../../services/auth/auth.service';
import { DadosBasicosPedidoDTO, SessaoEtapaDTO, TipoEtapaConferencia, TopFaturamento } from '../../services/conferencia/conferencia.model';
import { ConferenciaService } from '../../services/conferencia/conferencia.service';
import { ItemPedidoDTO } from '../../services/separacao/separacao.model';
import { SeparacaoService } from '../../services/separacao/separacao.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { VolumeFrontDTO, VolumeItemDTO } from '../../services/volume/volume.model';
import { UmaDTO } from '../../services/separacao/separacao.model';

interface GrupoVolume {
  id: string;
  qtdVol: number;
  largura: number;
  comprimento: number;
  altura: number;
  peso: number;
}
import { VolumeService } from '../../services/volume/volume.service';
import { BalancaService } from '../../services/balanca/balanca.service';
import { LocalScaleService } from '../../services/balanca/local-scale.service';
import { BalancaDTO, StatusBalancaResponse } from '../../services/balanca/balanca.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-separacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatOption,
    MatSelect,
    MatTooltipModule,
    MatMenuModule,
    RoboLoaderComponent,
  ],
  templateUrl: './separacao.component.html',
  styleUrl: './separacao.component.scss',
})
export class SeparacaoComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private conferenciaService: ConferenciaService,
    private separacaoService: SeparacaoService,
    private arquivoService: ArquivoService,
    private volumeService: VolumeService,
    private balancaService: BalancaService,
    private localScale: LocalScaleService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private sessaoService: SessaoService,
    private heartbeatService: HeartbeatService,
  ) {}

  // read scanner
  buffer = '';
  lastKeyTime = Date.now();

  // data
  displayedColumnsPedidos = [
    'acoes',
    'imagem',
    'idProduto',
    'nomeProduto',
    'codigoBarras',
    'quantidadeComercial',
    'quantidadePadrao',
    'idMarca',
    'nomeMarca',
    'idFornecedor',
    'nomeFornecedor',
    'controle',
    'complemento',
  ];
  dataSourcePedidos = new MatTableDataSource<ItemPedidoDTO>([]);

  displayedColumnsConferidos = [
    'acoes',
    'imagem',
    'idProduto',
    'nomeProduto',
    'codigoBarras',
    'quantidadeComercial',
    'quantidadePadrao',
    'idMarca',
    'nomeMarca',
    'idFornecedor',
    'nomeFornecedor',
    'controle',
    'complemento',
  ];
  dataSourceConferidos = new MatTableDataSource<ItemPedidoDTO>([]);

  dadosGerais?: DadosBasicosPedidoDTO;
  numeroUnico: number | null = null;
  idUsuario = this.authService.getUser().idUsuario;
  operadorNome = '';
  operadorIniciais = '';

  imagemAtual: string | null = null;

  // volume
  volumes: VolumeFrontDTO[] = [];
  gruposSimplificados: GrupoVolume[] = [];
  volumeSelecionadoModal: VolumeFrontDTO | null = null;
  volumeExpandido: VolumeFrontDTO | null = null;
  volumesPainelColapsado = false;
  mostrarFormCriacaoLote = false;
  mostrarFormVolumesSimplificado = false;
  mostrarAtalhos = false;
  focusIndexPendentes = -1;
  private _ultimoBarcodeProcessado = '';

  // modal peso
  mostrarModalPeso = false;
  pesoAtualLeitura: number | null = null;
  pesoCapturadoDaBalanca = false;
  balancas: BalancaDTO[] = [];
  balancaSelecionadaId: string | null = null;
  capturandoPeso = false;
  erroCapturaBalanca: string | null = null;
  formPeso!: FormGroup;
  private _acaoAposPeso: (() => void) | null = null;

  // UMA (Unidade de Movimentação e Armazenagem)
  umasDisponiveis: UmaDTO[] = [];
  umaSelecionada: UmaDTO | null = null;

  // Peso capturado por item pesável (AD_PESAVEL='S'), key: `${idProduto}|${controle}`
  pesoPesavelMap: Map<string, number> = new Map();

  // Exclusão de sessão
  mostrarConfirmExcluirSessao = false;
  excluindoSessao = false;

  // Faturamento
  mostrarModalFaturamento = false;
  topsParaFaturamento: TopFaturamento[] = [];
  codTipOperFaturamento: number | null = null;
  faturandoNota = false;
  erroFaturamento: string | null = null;
  sucessoFaturamento = false;

  // Seletor de balança na top bar
  mostrarSeletorBalancaTopbar = false;

  // peso modal — modo integrado com balança
  modoEntradaPeso: 'manual' | 'balanca' = 'manual';
  statusBalancaConf: 'verificando' | 'conectado' | 'desconectado' = 'desconectado';
  pesoBalancaAtual = 0;
  capturaAutoAtiva = false;
  private taraValor = 0;
  private pollingPesoSub?: Subscription;
  private pesoAnteriorPoll: number | null = null;
  private estabilidadeTimer?: ReturnType<typeof setTimeout>;
  private readonly ESTABILIDADE_MS = 2000;

  get volumeAtivo(): VolumeFrontDTO | undefined {
    return this.volumes.find(v => v.ativo);
  }

  get usaBalanca(): boolean {
    return this.dadosGerais?.obterQtdBalanca !== 'N';
  }

  get balancaObrigatoria(): boolean {
    return this.dadosGerais?.obterQtdBalanca === 'B';
  }

  get balancaAtualNome(): string | null {
    if (!this.balancaSelecionadaId) return null;
    return this.balancas.find(b => b.id === this.balancaSelecionadaId)?.nome ?? null;
  }

  // form
  formConferencia!: FormGroup;
  formCubagem!: FormGroup;
  formModalVolume!: FormGroup;

  // control
  itemSelecionado: ItemPedidoDTO | null = null;
  ultimoProduto: ItemPedidoDTO | null = null;
  controlesDisponiveis: string[] = [];
  controleModoLote = false;
  produtoIdentificado = false;
  codvolAtual: string | null = null;
  itemMovendo: { idProduto: number; controle: string; seqVolOrigem?: number; descricaoProduto: string; qtdDisponivel: number; qtdMover: number } | null = null;
  controleVeioDoScanner = false;
  controleRequerAtencao = false;
  conferindoEmAndamento = false;
  carregando = true;
  preparandoSessao = false;
  private sessaoProntaSub?: Subscription;
  private devolvendoEmAndamento = false;
  itemConferindoGhost: ItemPedidoDTO | null = null;
  itensParciaisChaves = new Set<string>();
  // Chaves (idProduto#controle) com quantidade conferida acima do pedido —
  // usado pra marcar visualmente a linha na lista de Conferidos.
  itensExcedentesChaves = new Set<string>();
  private itensDoProdutoAtual: ItemPedidoDTO[] = [];

  // Conferência parcial (etapas pesável / não-pesável) — só ativo por tenant via módulo
  etapas: SessaoEtapaDTO[] = [];
  concluindoEtapa: TipoEtapaConferencia | null = null;

  // Lista completa (sem filtro de categoria) — fonte para o filtro por categoria selecionada
  private itensPedidoBrutos: ItemPedidoDTO[] = [];
  private itensConferidosBrutos: ItemPedidoDTO[] = [];

  categoriaAtiva: TipoEtapaConferencia | null = null;
  categoriasDisponiveis: TipoEtapaConferencia[] = [];
  mostrarSelecaoCategoria = false;

  // Divergência na finalização (itens do pedido não conferidos)
  mostrarModalDivergencia = false;
  private manterPendenteFinalizacao = false;

  // Excesso: item conferido a mais do que o pedido pede — precisa de corte
  // no Sankhya mesmo com tudo "completo" (sem faltar nada).
  temItemExcedente = false;
  mostrarAlertaExcesso = false;

  get temConferenciaParcial(): boolean {
    return this.authService.hasModulo('CONFERENCIA_PARCIAL');
  }

  get pendentesPesavel(): number {
    return this.itensPedidoBrutos.filter((i) => i.usaConfPeso).length;
  }

  get pendentesNaoPesavel(): number {
    return this.itensPedidoBrutos.filter((i) => !i.usaConfPeso).length;
  }

  // Decide se precisa perguntar a categoria (nota com os dois tipos pendentes)
  // ou selecionar automaticamente quando só há um tipo em aberto.
  private definirCategoriaDisponivel() {
    if (!this.temConferenciaParcial) return;

    const presentes = new Set<TipoEtapaConferencia>(
      this.itensPedidoBrutos.map((i) => (i.usaConfPeso ? 'PESAVEL' : 'NAO_PESAVEL')),
    );
    // Categoria já concluída (dada baixa, mesmo com pendência) não volta a
    // ser oferecida — os itens que sobraram lá são divergência resolvida no
    // envio final, não trabalho a refazer.
    this.categoriasDisponiveis = (['NAO_PESAVEL', 'PESAVEL'] as TipoEtapaConferencia[])
      .filter((t) => presentes.has(t) && this.etapa(t)?.status !== 'C');

    if (this.categoriasDisponiveis.length > 1 && !this.categoriaAtiva) {
      this.mostrarSelecaoCategoria = true;
    } else if (this.categoriasDisponiveis.length === 0) {
      this.mostrarSelecaoCategoria = false;
    } else if (this.categoriasDisponiveis.length === 1) {
      this.categoriaAtiva = this.categoriasDisponiveis[0];
      this.mostrarSelecaoCategoria = false;
    }
  }

  selecionarCategoria(tipo: TipoEtapaConferencia) {
    this.categoriaAtiva = tipo;
    this.mostrarSelecaoCategoria = false;
    this.aplicarFiltroCategoria();
  }

  private aplicarFiltroCategoria() {
    if (!this.temConferenciaParcial) {
      this.dataSourcePedidos.data = this.itensPedidoBrutos;
      this.dataSourceConferidos.data = this.itensConferidosBrutos;
      return;
    }
    if (this.mostrarSelecaoCategoria || !this.categoriaAtiva) {
      // Categoria ainda não escolhida — não expõe itens de nenhuma categoria
      this.dataSourcePedidos.data = [];
      this.dataSourceConferidos.data = [];
      return;
    }
    const match = (i: ItemPedidoDTO) => (this.categoriaAtiva === 'PESAVEL') === !!i.usaConfPeso;
    this.dataSourcePedidos.data = this.itensPedidoBrutos.filter(match);
    this.dataSourceConferidos.data = this.itensConferidosBrutos.filter(match);
  }

  etapa(tipo: TipoEtapaConferencia): SessaoEtapaDTO | undefined {
    return this.etapas.find((e) => e.tipo === tipo);
  }

  get todasEtapasConcluidas(): boolean {
    if (!this.temConferenciaParcial) return true;
    return this.etapas.every((e) => e.status === 'C');
  }

  carregarEtapas() {
    if (!this.temConferenciaParcial || !this.numeroUnico) return;
    this.conferenciaService.getEtapas(this.numeroUnico).subscribe({
      next: (etapas) => {
        this.etapas = etapas;
        // Etapas chegam depois dos itens do pedido — recalcula a categoria
        // disponível agora que dá pra saber quem já foi concluído.
        this.definirCategoriaDisponivel();
        this.aplicarFiltroCategoria();
      },
    });
  }

  // Conclui a etapa da categoria ativa e decide o que vem a seguir:
  // se a outra categoria já estava concluída, segue direto pra finalização real
  // (Sankhya); senão, avisa e volta pra fila — a outra pessoa continua depois.
  private concluirEtapaEProsseguir(tipo: TipoEtapaConferencia, manterPendente = false) {
    if (!this.dadosGerais?.numeroConferencia || !this.numeroUnico) return;
    this.concluindoEtapa = tipo;
    this.conferenciaService
      .postConcluirEtapa({ numeroConferencia: this.dadosGerais.numeroConferencia, tipo, manterPendente })
      .subscribe({
        next: () => {
          this.concluindoEtapa = null;
          this.conferenciaService.getEtapas(this.numeroUnico!).subscribe({
            next: (etapas) => {
              this.etapas = etapas;
              if (etapas.every((e) => e.status === 'C')) {
                this.prosseguirParaFinalizacaoReal();
              } else {
                this.mostrarToast(
                  `Etapa ${tipo === 'PESAVEL' ? 'pesável' : 'não pesável'} concluída. Aguardando a outra categoria.`,
                  'ok',
                );
                this.router.navigate(['/fila-conferencia']);
              }
            },
          });
        },
        error: () => (this.concluindoEtapa = null),
      });
  }

  // toast inline
  toast: { mensagem: string; tipo: 'erro' | 'aviso' | 'ok' } | null = null;
  private toastTimer: any;

  mostrarToast(mensagem: string, tipo: 'erro' | 'aviso' | 'ok' = 'erro') {
    clearTimeout(this.toastTimer);
    this.toast = { mensagem, tipo };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 3000);
  }

  // template
  @ViewChild('modalConferenciaFinalizada')
  modalConferenciaFinalizadaTpl!: TemplateRef<any>;
  dialogRefConferenciaFinalizada?: MatDialogRef<ModalComponent>;

  @ViewChild('inputIdentificador') inputIdentificador!: any;
  @ViewChild('inputQuantidade') inputQuantidade!: any;
  @ViewChild('selectControle') selectControleRef?: MatSelect;
  @ViewChild('inputControleLote') inputControleLoteRef?: any;

  ngOnInit(): void {
    this.listenScanner();

    this.numeroUnico = Number(this.route.snapshot.paramMap.get('numeroUnico'));

    this.formConferencia = this.fb.group({
      identificador: [''],
      quantidadePadrao: [null],
      controle: [''],
    });

    this.formCubagem = this.fb.group({
      quantidade: [null, Validators.min(1)],
      largura: [null, Validators.min(0.1)],
      comprimento: [null, Validators.min(0.1)],
      altura: [null, Validators.min(0.1)],
      peso: [null, Validators.min(0.1)],
    });

    this.formModalVolume = this.fb.group({
      largura: [null, [Validators.required, Validators.min(0.1)]],
      comprimento: [null, [Validators.required, Validators.min(0.1)]],
      altura: [null, [Validators.required, Validators.min(0.1)]],
      peso: [null, [Validators.required, Validators.min(0.1)]],
    });

    this.formPeso = this.fb.group({
      peso: [null, [Validators.required, Validators.min(0.001)]],
    });

    if (!this.numeroUnico) return;

    this.inicializarConferencia();
    this.iniciarHeartbeat();

    this.balancaService.listarMinhas().subscribe({
      next: (b) => {
        this.balancas = b;
        if (b.length === 0) return;
        const padrao = localStorage.getItem('balanca_padrao_conf');
        const achada = padrao ? b.find(x => x.id === padrao) : null;
        if (!this.balancaSelecionadaId) {
          this.balancaSelecionadaId = achada?.id ?? (b.length === 1 ? b[0].id : null);
        }
      },
    });

    const user = this.authService.getUser();
    this.operadorNome = (user?.nome || '').split(' ').slice(0, 2).join(' ');
    this.operadorIniciais = (user?.nome || '')
      .split(' ').slice(0, 2)
      .map((w: string) => w[0]).join('').toUpperCase();
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.listenScanner);
    this.sessaoProntaSub?.unsubscribe();
    this.pararHeartbeat();
    this.pararPollingPeso();
    this.registrarFechamentoSessao();
  }

  private iniciarHeartbeat() {
    if (this.dadosGerais?.numeroConferencia) {
      this.heartbeatService.setSeparando(this.dadosGerais.numeroConferencia);
    }
  }

  private pararHeartbeat() {
    this.heartbeatService.clearSeparando();
  }

  private registrarFechamentoSessao() {
    if (!this.numeroUnico) return;
    const token = this.authService.getUser().token;
    const url = `${environment.API_GATEWAY}/api/sessao/${this.numeroUnico}/fechar`;
    const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        this.focarCampoIdentificador();
        break;
      case 'F3':
        event.preventDefault();
        (document.querySelector('.field-quantidade input') as HTMLInputElement)?.focus();
        break;
      case 'F4':
        event.preventDefault();
        if (this.isPainelVolumesVisivel()) {
          this.volumesPainelColapsado = !this.volumesPainelColapsado;
        }
        break;
      case 'F9':
        event.preventDefault();
        this.onSubmitConferencia();
        break;
      case 'Escape':
        event.preventDefault();
        if (this.mostrarModalPeso) {
          this.cancelarPeso();
          return;
        }
        if (this.toast) {
          this.toast = null;
          return;
        }
        this.formConferencia.patchValue({ identificador: '' });
        this.focarCampoIdentificador();
        break;
      case 'ArrowDown':
        if (!isEditable) {
          event.preventDefault();
          const total = this.dataSourcePedidos.data.length;
          if (!total) break;
          this.focusIndexPendentes = Math.min(total - 1, this.focusIndexPendentes + 1);
          const rowsDown = document.querySelectorAll<HTMLElement>('.painel-pendentes .item-row');
          rowsDown[this.focusIndexPendentes]?.focus();
        }
        break;
      case 'ArrowUp':
        if (!isEditable) {
          event.preventDefault();
          if (this.focusIndexPendentes <= 0) {
            this.focusIndexPendentes = -1;
            this.focarCampoIdentificador();
          } else {
            this.focusIndexPendentes--;
            const rowsUp = document.querySelectorAll<HTMLElement>('.painel-pendentes .item-row');
            rowsUp[this.focusIndexPendentes]?.focus();
          }
        }
        break;
      case 'Enter':
        if (!isEditable && this.focusIndexPendentes >= 0) {
          event.preventDefault();
          const selected = this.dataSourcePedidos.data[this.focusIndexPendentes];
          if (selected) this.selecionarItem(selected);
        }
        break;
    }
  }

  // scanner
  listenScanner() {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - this.lastKeyTime;
      this.lastKeyTime = now;

      if (diff > 100) {
        this.buffer = '';
      }

      if (event.key === 'Enter') {
        this.processarLeitura(this.buffer);
        this.buffer = '';
        return;
      }

      if (event.key.length === 1) {
        this.buffer += event.key;
      }
    });
  }

  processarLeitura(codigo: string) {
    if (!codigo) return;
    if (this.mostrarModalPeso) return;

    this.formConferencia.patchValue({
      identificador: codigo,
    });

    this.onIdentificadorInserido();

    this.focarCampoIdentificador();
  }

  focarCampoIdentificador() {
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('.field-identificador input');
      if (el) { el.focus(); el.select(); }
    }, 150);
  }

  // conferir
  onSubmitConferencia(): void {
    this.formConferencia.markAllAsTouched();
    this.onBlurQuantidadePadrao();

    if (!this.itemSelecionado || this.quantidadePadraoCtrl?.invalid) return;

    const valor = Number(this.quantidadePadraoCtrl?.value);
    if (!valor || valor <= 0) return;

    const max = Number(this.itemSelecionado.quantidadePadrao);
    if (valor > max && this.dadosGerais?.qtdAmaior !== 'D') {
      this.playSound('invalido');
      this.mostrarToast(`Quantidade ${valor} excede o pendente de ${max}.`, 'aviso');
      return;
    }

    const controleForm = this.normalizarControle(
      this.formConferencia.get('controle')?.value ?? '',
    );
    const controleItem = this.normalizarControle(this.itemSelecionado.controle ?? '');

    if (this.controleModoLote && !controleForm) {
      this.playSound('erro');
      this.mostrarToast('Informe o número do lote.', 'aviso');
      this.focarSelectControle();
      return;
    }

    if (!this.controleModoLote && controleForm !== controleItem) {
      this.playSound('erro');
      this.mostrarToast('Controle inválido para este produto.', 'aviso');
      return;
    }

    this.onConferir();
  }

  // requests
  inicializarConferencia() {
    this.conferenciaService.getDadosBasicos(this.numeroUnico!).subscribe({
      next: (dados) => {
        this.dadosGerais = dados;

        //if (dados.codigoStatus !== 'AC' && dados.codigoStatus !== 'A') {
          //this.router.navigate(['/fila-conferencia']);
        //}

        if (dados.codigoStatus === 'AC') {
          this.iniciarConferencia(dados.numeroUnico);
          return;
        }

        this.sessaoService.registrarAbertura(this.numeroUnico!).subscribe();
        this.carregarEstadoConferencia();
      },
      error: (err) => console.error(err),
    });
  }

  private iniciarConferencia(numeroUnico: number) {
    this.conferenciaService
      .postIniciarConferencia({ idUsuario: this.idUsuario, numeroUnico })
      .subscribe({
        next: (res) => {
          this.dadosGerais!.numeroConferencia = res.numeroConferencia;
          this.preparandoSessao = true;

          // Polling leve (só banco local, sem Sankhya) até a sessão estar pronta
          this.sessaoProntaSub = interval(1000).pipe(
            switchMap(() => this.conferenciaService.getSessaoPronta(this.numeroUnico!)),
            filter((r: any) => r.pronta),
            first(),
            timeout(60000),
          ).subscribe({
            next: () => {
              this.preparandoSessao = false;
              this.sessaoService.registrarAbertura(this.numeroUnico!).subscribe();
              this.carregarEstadoConferencia();
            },
            error: () => {
              this.preparandoSessao = false;
              this.carregarEstadoConferencia();
            },
          });
        },
        error: (err) => console.error(err),
      });
  }

  carregarEstadoConferencia() {
    const numeroUnico = this.dadosGerais?.numeroUnico;
    const numeroConferencia = this.dadosGerais?.numeroConferencia;
    if (!numeroUnico || !numeroConferencia) return;

    this.carregando = true;

    forkJoin({
      itensPedido: this.separacaoService.getItensPedido(numeroUnico),
      itensConferidos: this.separacaoService.getItensConferidos(numeroConferencia),
      volumes: this.volumeService.getVolumes(numeroConferencia),
    }).subscribe({
      next: ({ itensPedido, itensConferidos, volumes }) => {
        // Lote livre (tipControle='L'): o pedido não tem o lote (controle em
        // branco), mas a leitura registra o lote real digitado — batendo só
        // por idProduto+controle o conferido nunca casa com o pedido, e o
        // item fica "pendente" pra sempre mesmo 100% conferido. Agrupa só por
        // produto nesse caso.
        const tipoControlePorProduto = new Map<number, string | null | undefined>();
        itensPedido.forEach((item) => {
          if (!tipoControlePorProduto.has(item.idProduto)) tipoControlePorProduto.set(item.idProduto, item.tipControle);
        });
        const chave = (i: { idProduto: number; controle?: string }) =>
          tipoControlePorProduto.get(i.idProduto) === 'L'
            ? `${i.idProduto}#L`
            : `${i.idProduto}#${i.controle ?? ''}`;

        // Total conferido por chave (idProduto+controle), vindo das leituras locais
        const totalConferidos = new Map<string, number>();
        itensConferidos.forEach((i) => {
          const k = chave(i);
          totalConferidos.set(k, (totalConferidos.get(k) || 0) + Number(i.quantidadePadrao));
        });
        // Rastreia quanto já foi distribuído por chave para itens com a mesma chave
        const distribuido = new Map<string, number>();

        const pedidosAtualizados: ItemPedidoDTO[] = [];
        const conferidos: ItemPedidoDTO[] = [];

        itensPedido.forEach((item) => {
          const k = chave(item);
          const total = totalConferidos.get(k) || 0;
          const jaDistribuido = distribuido.get(k) || 0;
          const qtdConferida = Math.min(Math.max(0, total - jaDistribuido), Number(item.quantidadePadrao));
          distribuido.set(k, jaDistribuido + qtdConferida);
          if (qtdConferida > 0) {
            const fator = item.quantidadeComercial / item.quantidadePadrao;
            const qtdComercialConferida = Number((qtdConferida * fator).toFixed(5));
            conferidos.push({ ...item, quantidadePadrao: qtdConferida, quantidadeComercial: qtdComercialConferida });
            const restantePadrao = Number((item.quantidadePadrao - qtdConferida).toFixed(5));
            const restanteComercial = Number((item.quantidadeComercial - qtdComercialConferida).toFixed(5));
            // Pesável: peso menor que o nominal é esperado (perda de água, aparas etc.)
            // — uma vez pesado, não fica pendente mesmo que abaixo do nominal.
            if (restantePadrao > 0 && !item.usaConfPeso) {
              pedidosAtualizados.push({ ...item, quantidadePadrao: restantePadrao, quantidadeComercial: restanteComercial });
            }
          } else {
            pedidosAtualizados.push(item);
          }
        });

        // Reconstruir parciais: itens com quantidade já conferida mas ainda pendentes
        pedidosAtualizados.forEach(item => {
          if ((totalConferidos.get(chave(item)) || 0) > 0) {
            this.itensParciaisChaves.add(this.chaveItem(item));
          }
        });

        // Excesso: depois de distribuir o conferido entre todas as linhas do
        // pedido pra essa chave, ainda sobrou quantidade lida — foi conferido
        // a mais do que o pedido pede. Isso precisa de corte no Sankhya
        // mesmo sem nenhum item faltando.
        let temExcesso = false;
        const chavesComExcesso = new Set<string>();
        totalConferidos.forEach((total, k) => {
          const usado = distribuido.get(k) || 0;
          if (total - usado > 0.0001) {
            temExcesso = true;
            chavesComExcesso.add(k);
          }
        });
        this.temItemExcedente = temExcesso;
        // Marca (pra exibir indicador na lista) todas as linhas de Conferidos
        // que pertencem a uma chave com sobra — a leitura excedente não vira
        // linha própria, então sinalizamos o grupo inteiro.
        this.itensExcedentesChaves = new Set(
          conferidos.filter((item) => chavesComExcesso.has(chave(item))).map((item) => this.chaveItem(item)),
        );

        this.itensPedidoBrutos = pedidosAtualizados;
        this.itensConferidosBrutos = conferidos;
        this.definirCategoriaDisponivel();
        this.aplicarFiltroCategoria();

        // Imagens carregadas em background após a lista renderizar
        this.separacaoService.getImagensItens(numeroUnico).subscribe({
          next: (imagens) => {
            const mapa = new Map(imagens.map((i) => [i.idProduto, i.imagem]));
            const aplicar = (item: ItemPedidoDTO): ItemPedidoDTO =>
              mapa.has(item.idProduto) ? { ...item, imagem: mapa.get(item.idProduto) } : item;
            this.dataSourcePedidos.data = this.dataSourcePedidos.data.map(aplicar);
            this.dataSourceConferidos.data = this.dataSourceConferidos.data.map(aplicar);
            // Atualiza imagem do produto atual se já estava selecionado
            if (this.ultimoProduto && mapa.has(this.ultimoProduto.idProduto)) {
              this.ultimoProduto = { ...this.ultimoProduto, imagem: mapa.get(this.ultimoProduto.idProduto) };
              this.imagemAtual = this.ultimoProduto.imagem || null;
            }
          },
        });

        const volumesApi = volumes.map((v) => ({
          ...v,
          _alturaAntiga: v.altura,
          _larguraAntiga: v.largura,
          _comprimentoAntigo: v.comprimento,
          _pesoAntigo: v.peso,
          ativo: false,
        }));

        const volumeLocalAtivo = this.volumes.find((v) => v.ativo);
        const apiConheceTodos = volumeLocalAtivo
          ? volumesApi.some((v) => v.numeroVolume === volumeLocalAtivo.numeroVolume)
          : true;

        if (volumeLocalAtivo && !apiConheceTodos) {
          this.volumes = [...volumesApi, volumeLocalAtivo];
        } else {
          this.volumes = volumesApi;
        }

        this.garantirVolumeAtivo();
        this.carregando = false;
        this.carregarEtapas();
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  carregarItensPedido(numeroUnico: number) {
    this.separacaoService.getItensPedido(numeroUnico).subscribe({
      next: (itens) => {
        this.itensPedidoBrutos = itens;
        this.definirCategoriaDisponivel();
        this.aplicarFiltroCategoria();
      },
    });
  }

  carregarItensConferidos(numeroConferencia: number) {
    this.separacaoService.getItensConferidos(numeroConferencia).subscribe({
      next: (itensConferidos) => {
        const chave = (i: { idProduto: number; controle?: string }) =>
          `${i.idProduto}#${i.controle ?? ''}`;

        const mapConferidos = new Map<string, number>();

        itensConferidos.forEach((i) => {
          const k = chave(i);
          const atual = mapConferidos.get(k) || 0;
          mapConferidos.set(k, atual + Number(i.quantidadePadrao));
        });

        const pedidosAtualizados: ItemPedidoDTO[] = [];
        const conferidos: ItemPedidoDTO[] = [];

        this.dataSourcePedidos.data.forEach((item) => {
          const qtdConferida = mapConferidos.get(chave(item)) || 0;

          if (qtdConferida > 0) {
            const fator = item.quantidadeComercial / item.quantidadePadrao;

            const qtdComercialConferida = Number((qtdConferida * fator).toFixed(5));

            conferidos.push({
              ...item,
              quantidadePadrao: qtdConferida,
              quantidadeComercial: qtdComercialConferida,
            });

            const restantePadrao = Number(
              (item.quantidadePadrao - qtdConferida).toFixed(5),
            );

            const restanteComercial = Number(
              (item.quantidadeComercial - qtdComercialConferida).toFixed(5),
            );

            if (restantePadrao > 0) {
              pedidosAtualizados.push({
                ...item,
                quantidadePadrao: restantePadrao,
                quantidadeComercial: restanteComercial,
              });
            }
          } else {
            pedidosAtualizados.push(item);
          }
        });

        this.dataSourcePedidos.data = pedidosAtualizados;
        this.dataSourceConferidos.data = conferidos;
      },
    });
  }

  carregarVolumes(numeroConferencia: number) {
    this.volumeService.getVolumes(numeroConferencia).subscribe({
      next: (volumes) => {
        const volumesApi = volumes.map((v) => ({
          ...v,
          _alturaAntiga: v.altura,
          _larguraAntiga: v.largura,
          _comprimentoAntigo: v.comprimento,
          _pesoAntigo: v.peso,
          ativo: false,
        }));

        // Preservar volume local ativo se a API ainda não o conhece
        // (ocorre antes do primeiro scan ou salvar dimensões)
        const volumeLocalAtivo = this.volumes.find(v => v.ativo);
        const apiConheceTodos = volumeLocalAtivo
          ? volumesApi.some(v => v.numeroVolume === volumeLocalAtivo.numeroVolume)
          : true;

        if (volumeLocalAtivo && !apiConheceTodos) {
          this.volumes = [...volumesApi, volumeLocalAtivo];
        } else {
          this.volumes = volumesApi;
        }

        this.garantirVolumeAtivo();
      },
    });
  }

  // helper
  chaveItem(i: { idProduto: number; controle?: string }) {
    return `${i.idProduto}#${i.controle ?? ''}`;
  }

  mesmaChaveItem(
    a: { idProduto: number; controle?: string },
    b: { idProduto: number; controle?: string },
  ) {
    return this.chaveItem(a) === this.chaveItem(b);
  }

  normalizarControle(controle?: string | null): string {
    return controle?.trim() || '';
  }

  existeVolumeVazio(): boolean {
    return this.volumes.some((v) => v.itens.length === 0);
  }

  proximoNumeroVolume(): number {
    if (!this.volumes.length) {
      return 1;
    }

    return Math.max(...this.volumes.map((v) => v.numeroVolume)) + 1;
  }

  removerVolumesVazios() {
    this.volumes = this.volumes.filter((v) => v.itens.length > 0);
  }

  get aindaHaItensParaConferir(): boolean {
    return this.dataSourcePedidos.data.length > 0;
  }

  get quantidadePadraoCtrl() {
    return this.formConferencia.get('quantidadePadrao');
  }

  get produtoAtualExibido(): ItemPedidoDTO | null {
    return this.itemSelecionado ?? this.ultimoProduto;
  }

  get conferenciaFinalizada(): boolean {
    return this.dataSourcePedidos.data.length === 0;
  }

  // Total de itens pendentes no pedido inteiro (não filtrado por categoria) —
  // usado no gate do envio real pro Sankhya e na mensagem do modal de corte.
  get totalPendentesPedido(): number {
    return this.itensPedidoBrutos.length;
  }

  get todosItensNosVolumes(): boolean {
    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;

    const itensVolumes = new Map<string, number>();

    this.volumes.forEach((v) => {
      v.itens.forEach((i) => {
        const k = chave(i);
        itensVolumes.set(
          k,
          (itensVolumes.get(k) || 0) + i.quantidadePadrao,
        );
      });
    });

    return this.dataSourceConferidos.data.every((i) => {
      return itensVolumes.get(chave(i)) === i.quantidadePadrao;
    });
  }

  get todosVolumesComDimensoes(): boolean {
    return (
      this.volumes.length > 0 &&
      this.volumes.every(
        (v) => !!v.largura && !!v.comprimento && !!v.altura && !!v.peso,
      )
    );
  }

  get podeConfirmarConferencia(): boolean {
    // Botão nunca fica bloqueado por item não conferido — divergência é
    // resolvida no modal (corte ou finalizar pendente). Modo detalhado ainda
    // exige consistência entre o que foi conferido e o que está nos volumes.
    if (this.isVolumesDetalhados()) {
      return this.todosItensNosVolumes && this.todosVolumesComDimensoes;
    }

    return true;
  }

  // acoes
  // Ponto único de ação do botão "Confirmar Conferência". Em conferência parcial,
  // a primeira pessoa a clicar apenas conclui a própria categoria (e volta pra fila);
  // quem clicar por último (com as duas categorias completas) dispara a finalização real.
  // Alerta simples (não é o modal de corte) ao concluir a própria categoria
  // com item faltando — avisa e deixa seguir, "dá baixa" mesmo incompleto.
  mostrarAlertaCategoriaIncompleta = false;

  finalizarConferencia() {
    if (this.temConferenciaParcial && this.categoriaAtiva) {
      const minhaEtapa = this.etapa(this.categoriaAtiva);
      if (minhaEtapa?.status !== 'C') {
        const pendentesCategoria = this.categoriaAtiva === 'PESAVEL' ? this.pendentesPesavel : this.pendentesNaoPesavel;
        if (pendentesCategoria > 0) {
          this.mostrarAlertaCategoriaIncompleta = true;
          return;
        }
        this.concluirEtapaEProsseguir(this.categoriaAtiva);
        return;
      }
    }
    this.prosseguirParaFinalizacaoReal();
  }

  // Confirma o alerta simples: conclui a categoria mesmo com item faltando.
  confirmarCategoriaIncompleta() {
    this.mostrarAlertaCategoriaIncompleta = false;
    if (this.categoriaAtiva) this.concluirEtapaEProsseguir(this.categoriaAtiva, true);
  }

  // Ponto único do envio real pro Sankhya (não é conferência parcial, ou as
  // duas categorias já foram concluídas): aqui sim cabe o modal de corte.
  private prosseguirParaFinalizacaoReal() {
    if (this.totalPendentesPedido > 0) {
      this.mostrarModalDivergencia = true;
      return;
    }
    // Nada faltando, mas tem item conferido a mais que o pedido — avisa que
    // vai rodar o corte pra corrigir a quantidade no Sankhya.
    if (this.temItemExcedente) {
      this.mostrarAlertaExcesso = true;
      return;
    }
    this.manterPendenteFinalizacao = false;
    this.finalizarConferenciaReal();
  }

  // Chamado pelo modal de divergência (só no envio final pro Sankhya): corta
  // (finaliza só o conferido) ou finaliza mantendo os itens não conferidos
  // pendentes no pedido.
  confirmarFinalizacaoDivergente(manterPendente: boolean) {
    this.mostrarModalDivergencia = false;
    this.manterPendenteFinalizacao = manterPendente;
    this.finalizarConferenciaReal();
  }

  // Confirma o alerta de excesso: sempre corta (manterPendente=false) — é o
  // corte que corrige a quantidade pra cima no Sankhya.
  confirmarFinalizacaoComExcesso() {
    this.mostrarAlertaExcesso = false;
    this.manterPendenteFinalizacao = false;
    this.finalizarConferenciaReal();
  }

  private finalizarConferenciaReal() {
    if (this.isVolumesSimplificadoFinal()) {
      this.abrirModalVolumesSimplificado();
      return;
    }

    this.conferenciaService
      .postFinalizarConferencia({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        manterPendente: this.manterPendenteFinalizacao,
      })
      .subscribe({
        next: () => this.posFinalizarConferencia(),
      });
  }

  private finalizarConferenciaAposVolumes() {
    this.conferenciaService
      .postFinalizarConferencia({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        manterPendente: this.manterPendenteFinalizacao,
      })
      .subscribe({
        next: () => this.posFinalizarConferencia(),
      });
  }

  private posFinalizarConferencia() {
    if (this.dadosGerais?.fataoConcluir === 'S') {
      const tipmov = this.dadosGerais.codigoTipoMovimento ?? 'V';
      this.conferenciaService.getTopsParaFaturamento(tipmov).subscribe({
        next: (tops) => {
          this.topsParaFaturamento = tops;
          this.codTipOperFaturamento = tops.length === 1 ? tops[0].codTipOper : null;
          this.erroFaturamento = null;
          this.sucessoFaturamento = false;
          this.mostrarModalFaturamento = true;
        },
        error: () => {
          this.abrirModalConferenciaFinalizada();
        },
      });
    } else {
      this.abrirModalConferenciaFinalizada();
    }
  }

  confirmarFaturamento() {
    if (!this.codTipOperFaturamento) return;
    this.faturandoNota = true;
    this.erroFaturamento = null;
    this.conferenciaService.faturarNota({
      nunota: this.dadosGerais!.numeroUnico,
      codTipOper: this.codTipOperFaturamento,
    }).subscribe({
      next: () => {
        this.faturandoNota = false;
        this.sucessoFaturamento = true;
      },
      error: (err) => {
        this.faturandoNota = false;
        this.erroFaturamento = err?.error?.message ?? err?.message ?? 'Erro ao faturar nota';
      },
    });
  }

  fecharModalFaturamento() {
    this.mostrarModalFaturamento = false;
    this.abrirModalConferenciaFinalizada();
  }

  onIniciarConferencia(item: ItemPedidoDTO) {
    this.controleVeioDoScanner = false;
    const itensDoProduto = this.dataSourcePedidos.data.filter(
      (i) => i.idProduto === item.idProduto,
    );

    this.prepararSelecaoItem(itensDoProduto);
  }

  onIdentificadorInserido() {
    const identificadorRaw = this.formConferencia.get('identificador')?.value;
    if (!identificadorRaw) return;

    const codigoBarras = identificadorRaw.toString().trim();
    if (!codigoBarras) return;
    if (codigoBarras === this._ultimoBarcodeProcessado) {
      // Mesmo barcode já processado: se item já foi identificado, avança para quantidade
      if (this.itemSelecionado) this.focarCampoQuantidade();
      return;
    }

    const numeroConferencia = this.dadosGerais?.numeroConferencia;
    if (!numeroConferencia) return;

    this._ultimoBarcodeProcessado = codigoBarras;

    this.separacaoService
      .resolverCodigoBarras(numeroConferencia, codigoBarras)
      .subscribe({
        next: (resolved) => {
          const controleNorm = resolved.controle?.trim() || '';

          const itensDoProduto = this.dataSourcePedidos.data.filter(
            (i) => i.idProduto === resolved.idProduto,
          );

          if (itensDoProduto.length === 0) {
            this.playSound('erro');
            this.mostrarToast(`Código "${codigoBarras}" não pertence a este pedido.`, 'erro');
            this.limparFormulario();
            return;
          }

          // Guarda a unidade do código de barras lido (pode ser CX, UN, etc.)
          this.codvolAtual = resolved.codvol || null;
          this.controleVeioDoScanner = !!(resolved.controle?.trim());

          // UMAs para produtos com conferência por peso
          this.umasDisponiveis = resolved.umas ?? [];
          this.umaSelecionada = this.umasDisponiveis.find(u => u.padrao) ?? null;

          const controlePreferido = controleNorm && controleNorm !== ' '
            ? controleNorm
            : undefined;

          this.prepararSelecaoItem(itensDoProduto, controlePreferido);
        },
        error: () => {
          this._ultimoBarcodeProcessado = '';
          this.playSound('erro');
          this.mostrarToast(`Código "${codigoBarras}" não pertence a este pedido.`, 'erro');
          this.limparFormulario();
        },
      });
  }

  onControleChange(controle: string) {
    const idProduto = this.itemSelecionado?.idProduto ?? this.itensDoProdutoAtual[0]?.idProduto;
    if (!idProduto) return;

    const exactItem = this.dataSourcePedidos.data.find(
      (i) => i.idProduto === idProduto && (i.controle ?? '') === controle,
    );

    if (exactItem) {
      this.itensDoProdutoAtual = [];
      this.selecionarItem(exactItem);
      this.onControleConfirmado();
      return;
    }

    // Controle não existe na sessão: usa fallback para manter itemSelecionado
    // e reaplica o valor escolhido para não sobrescrever o select
    const fallback = this.dataSourcePedidos.data.find((i) => i.idProduto === idProduto);
    if (!fallback) return;

    this.itensDoProdutoAtual = [];
    this.selecionarItem(fallback);
    this.formConferencia.patchValue({ controle }, { emitEvent: false });
    this.onControleConfirmado();
  }

  onUmaSelecionadaChange(codUma: string): void {
    this.umaSelecionada = this.umasDisponiveis.find(u => u.codUma === codUma) ?? null;
  }

  private calcularQtdPorPeso(): number {
    const peso = this.pesoAtualLeitura ?? 0;
    const umaPeso = this.umaSelecionada?.peso;
    if (umaPeso && umaPeso > 0) return Number((peso / umaPeso).toFixed(5));
    return peso;
  }

  onControleConfirmado(): void {
    const item = this.itemSelecionado;
    if (item?.usaConfPeso && this.pesoAtualLeitura !== null && this.pesoAtualLeitura > 0) {
      if (this.controleModoLote) {
        const lote = (this.formConferencia.get('controle')?.value ?? '').trim();
        if (!lote) { this.focarSelectControle(); return; }
      }
      this.formConferencia.patchValue({ quantidadePadrao: this.calcularQtdPorPeso() });
      this.onConferir();
    } else {
      this.focarCampoQuantidade();
    }
  }

  selecionarItem(item: ItemPedidoDTO, viaScanner = false) {
    this.itemSelecionado = item;

    if (!viaScanner) {
      this.codvolAtual = null;
    }

    this.formConferencia.patchValue({
      controle: this.normalizarControle(item.controle),
    });

    this.produtoIdentificado = true;
    this.imagemAtual = item.imagem || null;

    if (viaScanner) {
      this.quantidadePadraoCtrl?.setErrors(null);
    } else {
      this.onBlurQuantidadePadrao();
    }
  }

  isItemParcial(item: ItemPedidoDTO): boolean {
    return this.itensParciaisChaves.has(this.chaveItem(item));
  }

  isItemExcedente(item: ItemPedidoDTO): boolean {
    return this.itensExcedentesChaves.has(this.chaveItem(item));
  }

  private playSound(tipo: 'ok' | 'erro' | 'atencao' | 'invalido' | 'finalizado') {
    try {
      const ctx = new AudioContext();

      const beep = (
        freq: number,
        start: number,
        dur: number,
        vol = 0.75,
        type: OscillatorType = 'square',
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.008);
        gain.gain.setValueAtTime(vol, start + dur - 0.015);
        gain.gain.linearRampToValueAtTime(0, start + dur);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      };

      const now = ctx.currentTime;

      switch (tipo) {
        case 'ok':
          beep(900,  now,        0.13);
          beep(1200, now + 0.16, 0.13);
          setTimeout(() => ctx.close(), 700);
          break;
        case 'erro':
          beep(300, now,        0.22, 0.8);
          beep(260, now + 0.27, 0.14, 0.7);
          setTimeout(() => ctx.close(), 800);
          break;
        case 'atencao':
          beep(700, now, 0.18, 0.7);
          setTimeout(() => ctx.close(), 500);
          break;
        case 'invalido':
          beep(380, now, 0.10, 0.65);
          setTimeout(() => ctx.close(), 400);
          break;
        case 'finalizado':
          beep(800,  now,        0.12);
          beep(1000, now + 0.15, 0.12);
          beep(1300, now + 0.30, 0.18);
          setTimeout(() => ctx.close(), 900);
          break;
      }
    } catch {}
  }

  isControleLocked(): boolean {
    if (this.controleModoLote) return false;
    if (this.controlesDisponiveis.length === 0) return true;
    if (this.controleVeioDoScanner) return true;
    if (
      this.controlesDisponiveis.length === 1 &&
      this.controlesDisponiveis[0] === 'SEM_CONTROLE'
    ) return true;
    return false;
  }

  focarBtnConferir() {
    setTimeout(() => {
      (document.querySelector('.btn-conferir') as HTMLElement)?.focus();
    }, 50);
  }

  focarCampoQuantidade() {
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('.field-quantidade input');
      if (el) { el.focus(); el.select(); }
    }, 50);
  }

  onTabQuantidade() {
    this.onBlurQuantidadePadrao();
    if (!this.itemSelecionado || !this.quantidadePadraoCtrl?.value || this.quantidadePadraoCtrl?.invalid) {
      this.playSound('invalido');
      this.focarCampoQuantidade();
      return;
    }
    this.onSubmitConferencia();
  }

  private focarSelectControle() {
    setTimeout(() => {
      if (this.controleModoLote) {
        this.inputControleLoteRef?.nativeElement?.focus();
      } else {
        this.selectControleRef?.focus();
      }
    }, 50);
  }

  private prepararSelecaoItem(
    itensDoProduto: ItemPedidoDTO[],
    controlePreferido?: string,
  ) {
    const tipControle = itensDoProduto[0]?.tipControle;

    // Lote livre: operador digita qualquer valor alfanumérico
    if (tipControle === 'L') {
      this.controleModoLote = true;
      this.controlesDisponiveis = [];
      this.itensDoProdutoAtual = itensDoProduto;
      this.imagemAtual = itensDoProduto[0]?.imagem || null;
      this.produtoIdentificado = true;
      if (itensDoProduto[0]) this.selecionarItem(itensDoProduto[0], true);
      this.formConferencia.patchValue({ controle: '' });
      this.playSound('atencao');
      this.controleRequerAtencao = true;
      setTimeout(() => { this.controleRequerAtencao = false; }, 2500);
      const firstItem = itensDoProduto[0];
      if (this.usaBalanca && firstItem?.usaConfPeso) {
        this._acaoAposPeso = () => {
          this.formConferencia.patchValue({ quantidadePadrao: this.calcularQtdPorPeso() });
          this.focarSelectControle();
        };
        this.abrirModalPeso();
      } else {
        this.focarSelectControle();
      }
      return;
    }

    this.controleModoLote = false;
    const lisContest = itensDoProduto[0]?.lisControles?.trim();
    if (lisContest) {
      this.controlesDisponiveis = lisContest.split(/\r?\n/).map((c) => c.trim()).filter((c) => c);
    } else {
      // Fallback: une pendentes + conferidos para não encolher conforme itens são conferidos
      const idProduto = itensDoProduto[0]?.idProduto;
      const todosItens = idProduto
        ? [
            ...this.dataSourcePedidos.data.filter((i) => i.idProduto === idProduto),
            ...this.dataSourceConferidos.data.filter((i) => i.idProduto === idProduto),
          ]
        : itensDoProduto;
      this.controlesDisponiveis = Array.from(
        new Set(todosItens.map((i) => i.controle?.trim() || 'SEM_CONTROLE')),
      );
    }

    // Controle veio do código de barras do estoque (EST): confia e auto-preenche
    if (controlePreferido && this.controleVeioDoScanner) {
      this.formConferencia.patchValue({ controle: controlePreferido });
      const item =
        itensDoProduto.find(
          (i) =>
            this.normalizarControle(i.controle) ===
            this.normalizarControle(controlePreferido),
        ) ?? itensDoProduto[0];
      if (!item) return;
      this.selecionarItem(item, true);
      this.produtoIdentificado = true;
      this.controleRequerAtencao = false;
      if (this.usaBalanca && item.usaConfPeso) {
        this._acaoAposPeso = () => {
          this.formConferencia.patchValue({ quantidadePadrao: this.calcularQtdPorPeso() });
          this.onConferir();
        };
        this.abrirModalPeso();
      } else {
        this.focarCampoQuantidade();
      }
      return;
    }

    const semControle =
      this.controlesDisponiveis.length === 1 &&
      this.controlesDisponiveis[0] === 'SEM_CONTROLE';

    // Produto sem controle: seleciona diretamente
    if (semControle) {
      this.formConferencia.patchValue({ controle: '' });
      const item = itensDoProduto[0];
      if (!item) return;
      this.selecionarItem(item, true);
      this.produtoIdentificado = true;
      this.controleRequerAtencao = false;
      if (this.usaBalanca && item.usaConfPeso) {
        this._acaoAposPeso = () => {
          this.formConferencia.patchValue({ quantidadePadrao: this.calcularQtdPorPeso() });
          this.onConferir();
        };
        this.abrirModalPeso();
      } else {
        this.focarCampoQuantidade();
      }
      return;
    }

    // Produto usa controles: sempre exige seleção manual pelo operador
    this.itensDoProdutoAtual = itensDoProduto;
    this.imagemAtual = itensDoProduto[0]?.imagem || null;
    this.formConferencia.patchValue({ controle: '' });
    this.produtoIdentificado = true;
    this.playSound('atencao');
    this.controleRequerAtencao = true;
    setTimeout(() => { this.controleRequerAtencao = false; }, 2500);
    if (this.usaBalanca && itensDoProduto[0]?.usaConfPeso) {
      this._acaoAposPeso = () => this.focarSelectControle();
      this.abrirModalPeso();
    } else {
      this.focarSelectControle();
    }
  }

  onDevolverItemConferido(item: ItemPedidoDTO) {
    if (this.devolvendoEmAndamento) return;
    this.devolvendoEmAndamento = true;

    this.separacaoService
      .postDevolverItemConferido({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        numeroUnico: this.numeroUnico!,
        idProduto: item.idProduto,
        controle: item.controle ?? '',
      })
      .subscribe({
        next: () => this.devolverItemOtimista(item),
        error: (err) => {
          console.error(err);
          // Sem isso o flag fica travado em "true" pra sempre (RxJS não chama
          // complete depois de error) — nenhum "Desfazer" na tela funciona mais.
          this.devolvendoEmAndamento = false;
        },
        complete: () => { this.devolvendoEmAndamento = false; },
      });
  }

  private devolverItemOtimista(item: ItemPedidoDTO) {
    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;
    const k = chave(item);
    this.itensParciaisChaves.delete(k);
    this.itensExcedentesChaves.delete(k);

    // Remove dos conferidos (imediato)
    this.dataSourceConferidos.data = this.dataSourceConferidos.data.filter((i) => chave(i) !== k);

    // Remove do volume local se detalhado
    if (this.isVolumesDetalhados()) {
      this.volumes.forEach((v) => {
        v.itens = v.itens.filter((i) => `${i.idProduto}#${i.controle ?? ''}` !== k);
      });
    }

    // Recarrega pendentes do servidor para restaurar a quantidade original do pedido
    if (this.numeroUnico) {
      this.carregarItensPedido(this.numeroUnico);
    }
  }

  salvarDimensoes(volume: VolumeFrontDTO) {
    this.volumeService
      .postAtualizarDimensoesVolume({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        numeroVolume: volume.numeroVolume,
        largura: volume.largura,
        comprimento: volume.comprimento,
        altura: volume.altura,
        peso: volume.peso,
      })
      .subscribe();
  }

  onBlurQuantidadePadrao() {
    const ctrl = this.quantidadePadraoCtrl;
    if (!ctrl) return;

    if (ctrl.value === null || ctrl.value === '') {
      ctrl.setErrors(null);
      return;
    }

    const valor = Number(ctrl.value);

    if (valor <= 0) {
      ctrl.setErrors({ menorQueZero: true });
      return;
    }

    if (!this.itemSelecionado) {
      ctrl.setErrors(null);
      return;
    }

    ctrl.setErrors(null);
  }

  garantirVolumeAtivo() {
    if (!this.volumes.length) {
      if (this.isVolumesDetalhados()) {
        this.criarNovoVolume();
      }
      return;
    }

    const ativo = this.volumes.find(v => v.ativo);
    if (!ativo) {
      // Ativa o último volume (maior seqVol = caixa sendo preenchida)
      const ultimo = this.volumes[this.volumes.length - 1];
      ultimo.ativo = true;

      const prevNum = this.volumeSelecionadoModal?.numeroVolume;
      this.volumeSelecionadoModal = ultimo;
      this.volumeExpandido = ultimo;

      // Só reseta o form se trocou de volume (preserva o que o usuário digitou)
      if (prevNum !== ultimo.numeroVolume) {
        this.formModalVolume.patchValue({
          largura: ultimo.largura,
          comprimento: ultimo.comprimento,
          altura: ultimo.altura,
          peso: ultimo.peso,
        });
      }
    } else {
      // Já tem ativo — só atualiza a referência do modal sem mexer no form
      this.volumeSelecionadoModal = ativo;
      this.volumeExpandido = ativo;
    }
  }

  get volumesFechados(): VolumeFrontDTO[] {
    return this.volumes.filter((v) => !v.ativo);
  }

  getVolumeDoItem(item: ItemPedidoDTO): number | null {
    const chave = this.chaveItem(item);
    const sorted = [...this.volumes].sort((a, b) => a.numeroVolume - b.numeroVolume);
    for (let idx = 0; idx < sorted.length; idx++) {
      const v = sorted[idx];
      if (v.itens.some((i) => `${i.idProduto}#${i.controle ?? ''}` === chave)) {
        return idx + 1;
      }
    }
    return null;
  }

  getDisplayNumeroVolume(v: VolumeFrontDTO): number {
    const sorted = [...this.volumes].sort((a, b) => a.numeroVolume - b.numeroVolume);
    const idx = sorted.findIndex((s) => s.numeroVolume === v.numeroVolume);
    return idx >= 0 ? idx + 1 : v.numeroVolume;
  }

  salvarEAvancarVolume(volume: VolumeFrontDTO) {
    this.salvarDimensoes(volume);
    volume.ativo = false;

    this.volumes = [...this.volumes].sort((a, b) => b.numeroVolume - a.numeroVolume);

    if (!this.conferenciaFinalizada) {
      this.criarNovoVolume();
    }
  }

  adicionarItemAoVolume(item: ItemPedidoDTO, quantidadePadrao: number) {
    this.garantirVolumeAtivo();

    const ativo = this.volumeAtivo;
    if (!ativo) return;

    const existente = ativo.itens.find((i) => this.mesmaChaveItem(i, item));

    if (existente) {
      existente.quantidadePadrao += quantidadePadrao;
    } else {
      ativo.itens.push({
        idProduto: item.idProduto,
        descricaoProduto: item.nomeProduto,
        imagem: item.imagem || null,
        quantidadePadrao,
        quantidadeComercial: item.quantidadeComercial,
        unidade: item.unidadeComercial,
        controle: item.controle ?? '',
      });
    }
  }

  encerrarVolume(volume: VolumeFrontDTO) {
    if (!volume.itens.length || this.conferenciaFinalizada) return;

    volume.ativo = false;

    this.volumes = [...this.volumes].sort(
      (a, b) => b.numeroVolume - a.numeroVolume,
    );

    this.garantirVolumeAtivo();
  }

  selecionarVolume(volume: VolumeFrontDTO) {
    if (this.conferenciaFinalizada) return;

    this.volumes.forEach((v) => (v.ativo = false));
    volume.ativo = true;

    this.volumes = this.volumes.filter((v) => v !== volume);
    this.volumes.unshift(volume);
  }

  removerVolume(volume: VolumeFrontDTO) {
    const volumesAntes = this.volumes;
    this.volumes = this.volumes.filter((v) => v.numeroVolume !== volume.numeroVolume);
    if (this.isVolumesDetalhados()) this.garantirVolumeAtivo();

    this.separacaoService
      .postRemoverVolume({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        numeroVolume: volume.numeroVolume,
      })
      .subscribe({
        error: () => {
          this.volumes = volumesAntes;
          if (this.isVolumesDetalhados()) this.garantirVolumeAtivo();
        },
      });
  }

  iniciarMoverItem(item: VolumeItemDTO, volume: VolumeFrontDTO) {
    this.itemMovendo = {
      idProduto: item.idProduto,
      controle: item.controle ?? '',
      seqVolOrigem: volume.numeroVolume,
      descricaoProduto: item.descricaoProduto,
      qtdDisponivel: item.quantidadePadrao,
      qtdMover: item.quantidadePadrao,
    };
  }

  iniciarMoverItemOrfao(item: ItemPedidoDTO) {
    this.itemMovendo = {
      idProduto: item.idProduto,
      controle: item.controle ?? '',
      seqVolOrigem: undefined,
      descricaoProduto: item.nomeProduto,
      qtdDisponivel: item.quantidadePadrao,
      qtdMover: item.quantidadePadrao,
    };
  }

  cancelarMoverItem() {
    this.itemMovendo = null;
  }

  isMoverQtdValida(): boolean {
    if (!this.itemMovendo) return true;
    const qtd = Number(this.itemMovendo.qtdMover);
    return qtd > 0 && qtd <= this.itemMovendo.qtdDisponivel;
  }

  moverItemParaVolume(volumeDestino: VolumeFrontDTO) {
    if (!this.itemMovendo || volumeDestino.numeroVolume === this.itemMovendo.seqVolOrigem) return;

    const moving = { ...this.itemMovendo };
    // Clamp: nunca mover mais do que o disponível
    const qtdMover = Math.min(Math.max(Number(moving.qtdMover) || 0, 0), moving.qtdDisponivel);
    if (qtdMover <= 0) return;

    this.itemMovendo = null;

    const moverTudo = qtdMover >= moving.qtdDisponivel;

    this.separacaoService.moverItemVolume({
      numeroConferencia: this.dadosGerais!.numeroConferencia!,
      idProduto: moving.idProduto,
      controle: moving.controle,
      seqVolOrigem: moving.seqVolOrigem,
      seqVolDestino: volumeDestino.numeroVolume,
      qtd: moverTudo ? undefined : qtdMover,
    }).subscribe({
      next: () => {
        const chave = `${moving.idProduto}|${moving.controle}`;

        // Itens sem volume (órfão): recarrega pois a lógica é mais complexa
        if (moving.seqVolOrigem == null) {
          this.carregarEstadoConferencia();
          return;
        }

        const volOrigem = this.volumes.find((v) => v.numeroVolume === moving.seqVolOrigem);
        const volDest = this.volumes.find((v) => v.numeroVolume === volumeDestino.numeroVolume);
        if (!volOrigem || !volDest) return;

        const itemOrigem = volOrigem.itens.find((i) => `${i.idProduto}|${i.controle ?? ''}` === chave);
        if (!itemOrigem) return;

        const fator = itemOrigem.quantidadeComercial / itemOrigem.quantidadePadrao;

        // Atualiza origem
        if (moverTudo) {
          volOrigem.itens = volOrigem.itens.filter((i) => `${i.idProduto}|${i.controle ?? ''}` !== chave);
        } else {
          itemOrigem.quantidadePadrao = Number((itemOrigem.quantidadePadrao - qtdMover).toFixed(5));
          itemOrigem.quantidadeComercial = Number((itemOrigem.quantidadePadrao * fator).toFixed(5));
        }

        // Atualiza destino
        const existente = volDest.itens.find((i) => `${i.idProduto}|${i.controle ?? ''}` === chave);
        if (existente) {
          existente.quantidadePadrao += qtdMover;
          existente.quantidadeComercial += Number((qtdMover * fator).toFixed(5));
        } else {
          volDest.itens.push({ ...itemOrigem, quantidadePadrao: qtdMover, quantidadeComercial: Number((qtdMover * fator).toFixed(5)) });
        }

        this.volumes = [...this.volumes];
      },
      error: (err) => console.error(err),
    });
  }

  onConferir() {
    if (this.conferindoEmAndamento) return;
    if (!this.itemSelecionado) return;
    if (this.isVolumesDetalhados() && !this.volumeAtivo) return;

    const quantidadePadrao = Number(this.quantidadePadraoCtrl?.value);
    if (!quantidadePadrao || quantidadePadrao <= 0) return;

    const precisaPeso = this.usaBalanca && this.itemSelecionado?.usaConfPeso === true;
    if (precisaPeso && (this.pesoAtualLeitura === null || this.pesoAtualLeitura <= 0)) {
      this._acaoAposPeso = () => this.focarCampoQuantidade();
      this.abrirModalPeso();
      return;
    }

    this.conferindoEmAndamento = true;
    const controleEnvio = this.controleModoLote
      ? this.normalizarControle(this.formConferencia.get('controle')?.value ?? '')
      : (this.itemSelecionado!.controle ?? '');
    const item = this.controleModoLote
      ? { ...this.itemSelecionado!, controle: controleEnvio }
      : { ...this.itemSelecionado! };
    this.itemConferindoGhost = { ...item };

    // Itens pesáveis (AD_PESAVEL='S'): grava peso no Sankhya TGFITE (fire-and-forget)
    if (item.pesavel && item.sequencia != null && this.pesoAtualLeitura != null && this.pesoAtualLeitura > 0) {
      const chave = `${item.idProduto}|${controleEnvio}`;
      this.pesoPesavelMap.set(chave, this.pesoAtualLeitura);
      this.separacaoService.patchItemPeso({
        nunota: this.dadosGerais!.numeroUnico!,
        sequencia: item.sequencia,
        pesobruto: this.pesoAtualLeitura,
        pesoliq: this.pesoAtualLeitura,
      }).subscribe({ error: err => console.error('[pesavel] falha ao gravar peso no TGFITE:', err) });
    }

    this.separacaoService
      .postItemConferidoVolume({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        numeroVolume: this.volumeAtivo?.numeroVolume || 1,
        idProduto: item.idProduto,
        controle: controleEnvio,
        quantidadePadrao,
        unidade: this.codvolAtual || item.unidadeComercial,
        peso: this.pesoAtualLeitura ?? undefined,
      })
      .subscribe({
        next: () => {
          this.playSound('ok');
          this.ultimoProduto = { ...item };
          this.imagemAtual = this.ultimoProduto.imagem || null;
          this.limparFormulario();
          this.aplicarConferenciaOtimista(item, quantidadePadrao);
          if (this.isVolumesSimplificadoTela() && this.dataSourcePedidos.data.length === 0) {
            setTimeout(() => this.abrirModalVolumesSimplificado(), 300);
          }
          this.focarCampoIdentificador();
        },
        error: (err) => console.error(err),
        complete: () => {
          this.conferindoEmAndamento = false;
          this.itemConferindoGhost = null;
        },
      });
  }

  private aplicarConferenciaOtimista(item: ItemPedidoDTO, quantidadePadrao: number) {
    const modoLote = item.tipControle === 'L';
    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;
    // Em modo lote o controle nos pendentes é vazio/espaço (não vem da NF),
    // então fazemos match apenas por produto para reduzir o primeiro item encontrado.
    const chavePendente = (i: { idProduto: number }) =>
      modoLote ? `${i.idProduto}` : chave(i as any);
    const k = chave(item);
    const kPendente = chavePendente(item);

    const fator = item.quantidadeComercial / item.quantidadePadrao;

    // Quantidade ainda pendente pra esse item antes dessa leitura — usada pra
    // capar o que entra em "Conferidos". Leitura acima disso é excesso (divergência
    // pra maior): conta pro alerta de corte, mas não infla a linha do conferido
    // além do que o pedido pede (senão o estado local diverge do que o servidor
    // recalcula, e o "Desfazer" some sincronizado com um valor que nunca existiu ali).
    const pendenteAtual = this.dataSourcePedidos.data.find((i) => chavePendente(i) === kPendente);
    const restanteAntes = pendenteAtual?.quantidadePadrao ?? 0;
    const qtdCapada = Math.min(quantidadePadrao, restanteAntes);
    const qtdExcesso = Number((quantidadePadrao - qtdCapada).toFixed(5));
    if (qtdExcesso > 0.0001) {
      this.temItemExcedente = true;
      this.itensExcedentesChaves.add(k);
    }

    const qtdComercialConferida = Number((qtdCapada * fator).toFixed(5));

    // Remove ou reduz o item dos pendentes
    let pendenteTocado = false;
    const pedidosAtualizados = this.dataSourcePedidos.data
      .map((i) => {
        if (chavePendente(i) !== kPendente) return i;
        if (pendenteTocado) return i; // reduz apenas o primeiro match (evita reduzir linhas duplicadas)
        pendenteTocado = true;
        // Pesável: peso menor que o nominal é esperado (perda de água, aparas
        // etc.) — uma vez pesado, não fica pendente mesmo que abaixo do
        // nominal. Mesma exceção aplicada no recarregamento do servidor
        // (carregarItensPedido); sem ela o item pesável "trava" como pendente
        // aqui e o modal de divergência/corte dispara mesmo com tudo certo.
        if (i.usaConfPeso) return null;
        const restante = Number((i.quantidadePadrao - quantidadePadrao).toFixed(5));
        const restanteComercial = Number((i.quantidadeComercial - qtdComercialConferida).toFixed(5));
        return restante > 0 ? { ...i, quantidadePadrao: restante, quantidadeComercial: restanteComercial } : null;
      })
      .filter((i): i is ItemPedidoDTO => i !== null);

    // Acumula no conferidos (sempre por idProduto+controle digitado)
    const existente = this.dataSourceConferidos.data.find((i) => chave(i) === k);
    const conferidos = existente
      ? this.dataSourceConferidos.data.map((i) =>
          chave(i) === k
            ? { ...i, quantidadePadrao: i.quantidadePadrao + qtdCapada, quantidadeComercial: i.quantidadeComercial + qtdComercialConferida }
            : i,
        )
      : [...this.dataSourceConferidos.data, { ...item, quantidadePadrao: qtdCapada, quantidadeComercial: qtdComercialConferida }];

    // Rastrear parciais: se o item ainda restou, é conferido parcial
    if (pedidosAtualizados.some(i => chavePendente(i) === kPendente)) {
      this.itensParciaisChaves.add(k);
    }

    this.dataSourcePedidos.data = pedidosAtualizados;
    this.dataSourceConferidos.data = conferidos;

    if (this.isVolumesDetalhados()) {
      this.adicionarItemAoVolume(item, quantidadePadrao);
    }

    this.verificarSeFinalizouConferencia();
  }

  verificarSeFinalizouConferencia() {
    if (this.dataSourcePedidos.data.length !== 0) return;

    this.playSound('finalizado');
    this.removerVolumesVazios();
    this.volumes.forEach(v => v.ativo = false);
    this.volumes = [...this.volumes].sort((a, b) => b.numeroVolume - a.numeroVolume);
  }

  reordenarVolumesFinalizacao() {
    if (!this.volumes.length) return;

    this.volumes.forEach(v => v.ativo = false);
    this.volumes = [...this.volumes].sort((a, b) => b.numeroVolume - a.numeroVolume);
  }

  limparFormulario() {
    this.itemSelecionado = null;
    this.itensDoProdutoAtual = [];
    this.codvolAtual = null;
    this.controlesDisponiveis = [];
    this.controleModoLote = false;
    this.produtoIdentificado = false;
    this._ultimoBarcodeProcessado = '';
    this.controleVeioDoScanner = false;
    this.controleRequerAtencao = false;
    this.itemConferindoGhost = null;
    this.pesoAtualLeitura = null;
    this.pesoCapturadoDaBalanca = false;
    this.erroCapturaBalanca = null;
    this.mostrarModalPeso = false;
    this._acaoAposPeso = null;
    this.umasDisponiveis = [];
    this.umaSelecionada = null;
    if (this.formPeso) this.formPeso.reset();

    this.formConferencia.reset();

    Object.values(this.formConferencia.controls).forEach((ctrl) => {
      ctrl.setErrors(null);
      ctrl.markAsPristine();
      ctrl.markAsUntouched();
    });
  }


  abrirModalConferenciaFinalizada() {
    this.dialogRefConferenciaFinalizada = this.dialog.open(ModalComponent, {
      data: {
        template: this.modalConferenciaFinalizadaTpl,
      },
      disableClose: true,
    });
  }

  voltarParaFila() {
    this.dialogRefConferenciaFinalizada?.close();
    this.router.navigate(['/fila-conferencia']);
  }

  confirmarExcluirSessao() {
    this.mostrarConfirmExcluirSessao = true;
  }

  excluirSessao() {
    if (!this.dadosGerais?.numeroUnico) return;
    this.excluindoSessao = true;
    this.conferenciaService.deleteSessao(this.dadosGerais.numeroUnico).subscribe({
      next: () => this.router.navigate(['/fila-conferencia']),
      error: (err) => {
        console.error('Erro ao excluir sessão', err);
        this.excluindoSessao = false;
      },
    });
  }

  logout() {
    this.authService.logout();
  }

  imprimirEtiquetas() {
    const numeroConferencia = this.dadosGerais!.numeroConferencia!;

    this.arquivoService.imprimirEtiqueta(numeroConferencia).subscribe({
      next: () => {
        this.dialogRefConferenciaFinalizada?.close();
        this.router.navigate(['/fila-conferencia']);
      },
      error: (err) => console.error('Erro ao imprimir etiquetas', err),
    });
  }

  imprimirMapaSeparacao(tipo: TipoEtapaConferencia) {
    if (!this.numeroUnico) return;
    // Aba aberta de forma síncrona no clique — a geração do PDF pode levar
    // vários segundos e o navegador bloquearia um window.open() tardio.
    const janela = window.open('', '_blank');
    this.arquivoService.imprimirMapaSeparacao(this.numeroUnico, tipo, janela).subscribe({
      error: (err) => console.error('Erro ao imprimir mapa de separação', err),
    });
  }

getVolumeTooltip(v: VolumeFrontDTO): string {
    const base = `Vol. ${this.getDisplayNumeroVolume(v)}`;
    if (v.largura && v.comprimento && v.altura && v.peso) {
      return `${base} · ${v.largura}×${v.comprimento}×${v.altura} / ${v.peso}kg`;
    }
    return `${base} (medidas não informadas)`;
  }

  abrirModalCriarVolumes() {
    this.formCubagem.reset();
    this.mostrarFormCriacaoLote = true;
  }

  fecharModalCriarVolumes() {
    this.mostrarFormCriacaoLote = false;
  }

  trackByVolume(_: number, v: VolumeFrontDTO): number {
    return v.numeroVolume;
  }

  trackByItem(_: number, i: ItemPedidoDTO): string {
    // idProduto sozinho não é único: o mesmo produto pode ter várias linhas
    // (lotes/controles diferentes) na mesma lista. Com só idProduto, o
    // Angular trata linhas de lotes distintos como "a mesma" e embaralha o
    // DOM ao remover uma delas — parecia reverter todas ao desfazer uma só.
    return this.chaveItem(i);
  }

  expandirVolume(volume: VolumeFrontDTO) {
    if (this.volumeExpandido === volume) {
      this.volumeExpandido = null;
      this.volumeSelecionadoModal = null;
      return;
    }
    this.volumeExpandido = volume;
    this.volumeSelecionadoModal = volume;
    this.formModalVolume.patchValue({
      largura: volume.largura,
      comprimento: volume.comprimento,
      altura: volume.altura,
      peso: volume.peso,
    });
  }

  abrirModalVolume(volume: VolumeFrontDTO) {
    this.expandirVolume(volume);
  }

  fecharModalVolume() {
    this.volumeExpandido = null;
    this.volumeSelecionadoModal = null;
  }

  salvarMedidasVolume() {
    if (!this.volumeSelecionadoModal) return;
    const v = this.volumeSelecionadoModal;
    v.largura = this.formModalVolume.value.largura;
    v.comprimento = this.formModalVolume.value.comprimento;
    v.altura = this.formModalVolume.value.altura;
    v.peso = this.formModalVolume.value.peso;
    this.salvarDimensoes(v);
    if (!v.ativo) {
      this.fecharModalVolume();
    }
  }

  fecharVolumeModal() {
    if (!this.volumeSelecionadoModal) return;
    const v = this.volumeSelecionadoModal;
    v.largura = this.formModalVolume.value.largura;
    v.comprimento = this.formModalVolume.value.comprimento;
    v.altura = this.formModalVolume.value.altura;
    v.peso = this.formModalVolume.value.peso;
    this.fecharModalVolume();
    this.salvarEAvancarVolume(v);
  }

  criarNovoVolume() {
    if (this.existeVolumeVazio()) return;

    this.volumes.forEach(v => v.ativo = false);

    const novoVolume: VolumeFrontDTO = {
      numeroVolume: this.proximoNumeroVolume(),
      ativo: true,
      itens: [],
      largura: null,
      comprimento: null,
      altura: null,
      peso: null,
    };

    this.volumes.push(novoVolume);
    this.volumeSelecionadoModal = novoVolume;
    this.volumeExpandido = novoVolume;
    this.formModalVolume.reset();
  }

  isSemVolumes(): boolean {
    return !this.dadosGerais?.formacaoVolumes ||
           this.dadosGerais!.formacaoVolumes === 'N';
  }

  isVolumesDetalhados(): boolean {
    return this.dadosGerais?.formacaoVolumes === 'D';
  }

  isVolumesSimplificadoTela(): boolean {
    return this.dadosGerais?.formacaoVolumes === 'T';
  }

  isVolumesSimplificadoFinal(): boolean {
    return this.dadosGerais?.formacaoVolumes === 'S';
  }

  isVolumesNaoDetalhados(): boolean {
    return this.isVolumesSimplificadoTela() || this.isVolumesSimplificadoFinal();
  }

  exibirPendentes(): boolean {
    return !this.dadosGerais?.exibirProd || this.dadosGerais!.exibirProd === 'S';
  }

  isPainelVolumesVisivel(): boolean {
    return this.isVolumesDetalhados();
  }

  get quantidadeCubagemCtrl() {
    return this.formCubagem.get('quantidade');
  }

  get larguraCubagemCtrl() {
    return this.formCubagem.get('largura');
  }

  get comprimentoCubagemCtrl() {
    return this.formCubagem.get('comprimento');
  }

  get alturaCubagemCtrl() {
    return this.formCubagem.get('altura');
  }

  get pesoCubagemCtrl() {
    return this.formCubagem.get('peso');
  }

  onBlurFieldsFormCubagem(
    key: 'quantidade' | 'largura' | 'comprimento' | 'altura' | 'peso',
  ) {
    const ctrl = this.formCubagem.get(key);

    if (!ctrl) return;

    const value = ctrl.value;

    if (value === null || value === '') {
      ctrl.setErrors(null);
      return;
    }

    const valor = Number(value);

    if (Number.isNaN(valor)) {
      ctrl.setErrors({ invalido: true });
      return;
    }

    if (valor <= 0) {
      ctrl.setErrors({ menorOuIgualAZero: true });
      return;
    }

    ctrl.setErrors(null);
  }

  isGerarVolumeLoteDisabled(): boolean {
    const qtd = this.quantidadeCubagemCtrl?.value;
    if (!qtd || Number(qtd) <= 0) return true;
    if (!this.dadosGerais?.temCubagem) return false;
    const dims = [
      this.larguraCubagemCtrl?.value,
      this.comprimentoCubagemCtrl?.value,
      this.alturaCubagemCtrl?.value,
      this.pesoCubagemCtrl?.value,
    ];
    return dims.some((v) => !v || Number(v) <= 0);
  }

  gerarVolumesLote() {
    if (!this.formCubagem.valid) return;

    const payload = {
      numeroConferencia: this.dadosGerais!.numeroConferencia,
      quantidadeLote: this.formCubagem.value.quantidade,
      altura: this.formCubagem.value.altura,
      largura: this.formCubagem.value.largura,
      comprimento: this.formCubagem.value.comprimento,
      peso: this.formCubagem.value.peso,
    };

    this.volumeService.gerarVolumesLote(payload).subscribe(() => {
      this.carregarVolumes(this.dadosGerais!.numeroConferencia);
      this.formCubagem.reset();
      this.fecharModalCriarVolumes();
    });
  }

  deletarVolumeLote(volume: any) {
    const payload = {
      numeroConferencia: this.dadosGerais!.numeroConferencia,
      altura: volume.altura,
      largura: volume.largura,
      comprimento: volume.comprimento,
      peso: volume.peso,
    };

    this.volumeService.deletarVolumesLote(payload).subscribe(() => {
      this.carregarVolumes(this.dadosGerais!.numeroConferencia);
    });
  }

  get totalVolumesSimplificado(): number {
    return this.gruposSimplificados.reduce((s, g) => s + g.qtdVol, 0);
  }

  abrirModalVolumesSimplificado() {
    this.formCubagem.reset();
    this.gruposSimplificados = [];
    this.mostrarFormVolumesSimplificado = true;
  }

  fecharModalVolumesSimplificado() {
    this.mostrarFormVolumesSimplificado = false;
  }

  adicionarGrupoSimplificado() {
    if (this.isGerarVolumeLoteDisabled()) return;

    const grupo: GrupoVolume = {
      id: Date.now().toString(),
      qtdVol: Number(this.formCubagem.value.quantidade),
      largura: this.dadosGerais?.temCubagem ? Number(this.formCubagem.value.largura) : 0,
      comprimento: this.dadosGerais?.temCubagem ? Number(this.formCubagem.value.comprimento) : 0,
      altura: this.dadosGerais?.temCubagem ? Number(this.formCubagem.value.altura) : 0,
      peso: this.dadosGerais?.temCubagem ? Number(this.formCubagem.value.peso) : 0,
    };

    this.gruposSimplificados = [...this.gruposSimplificados, grupo];
    this.formCubagem.reset();
  }

  removerGrupoSimplificado(grupo: GrupoVolume) {
    this.gruposSimplificados = this.gruposSimplificados.filter(g => g.id !== grupo.id);
  }

  salvarVolumesSimplificado() {
    if (this.gruposSimplificados.length === 0) return;

    const requests = this.gruposSimplificados.map(grupo =>
      this.volumeService.postSalvarGrupoSimplificado({
        numeroConferencia: this.dadosGerais!.numeroConferencia!,
        qtdVol: grupo.qtdVol,
        largura: grupo.largura,
        comprimento: grupo.comprimento,
        altura: grupo.altura,
        peso: grupo.peso,
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.fecharModalVolumesSimplificado();
        if (this.isVolumesSimplificadoFinal()) {
          this.finalizarConferenciaAposVolumes();
        }
      },
      error: (err) => console.error(err),
    });
  }

  // ─── Modal de peso ───────────────────────────────────────────────────────────

  abrirModalPeso() {
    this.pesoCapturadoDaBalanca = false;
    this.erroCapturaBalanca = null;
    this.pesoBalancaAtual = 0;
    this.taraValor = 0;
    this.pesoAnteriorPoll = null;
    this.statusBalancaConf = 'verificando';
    this.formPeso.reset();

    if (this.usaBalanca && this.balancaSelecionadaId) {
      this.modoEntradaPeso = 'balanca';
      this.iniciarOuPollarBalanca();
    } else {
      this.modoEntradaPeso = 'manual';
      setTimeout(() => {
        (document.querySelector('.mp-peso-input') as HTMLInputElement)?.focus();
      }, 100);
    }

    this.mostrarModalPeso = true;
  }

  confirmarPeso() {
    this.formPeso.markAllAsTouched();
    if (this.formPeso.invalid) return;
    this.pararPollingPeso();
    this.pesoAtualLeitura = Number(this.formPeso.value.peso);

    if (this.modoEntradaPeso === 'balanca' && this.balancaSelecionadaId) {
      const bal = this.balancas.find(b => b.id === this.balancaSelecionadaId);
      if (bal) {
        this.mostrarToast(
          `Pesado via ${bal.nome}: ${this.pesoAtualLeitura.toFixed(3).replace('.', ',')} kg`,
          'ok',
        );
      }
    }

    this.mostrarModalPeso = false;
    const acao = this._acaoAposPeso;
    this._acaoAposPeso = null;
    acao?.();
  }

  cancelarPeso() {
    this.pararPollingPeso();
    this.mostrarModalPeso = false;
    this._acaoAposPeso = null;
    this.limparFormulario();
    this.focarCampoIdentificador();
  }

  capturarPesoDaBalanca() {
    if (!this.balancaSelecionadaId || this.capturandoPeso) return;
    this.capturandoPeso = true;
    this.erroCapturaBalanca = null;
    const bal = this.balancas.find(b => b.id === this.balancaSelecionadaId);
    const captura$ = bal && this.localScale.isLocal(bal)
      ? this.localScale.lerStatus(bal).pipe(
          map(res => ({ peso: res.pesoAtual, conectado: res.conectado })),
        )
      : this.balancaService.capturarPeso(this.balancaSelecionadaId!).pipe(
          map(res => ({ peso: res.peso, conectado: true })),
        );
    captura$.subscribe({
      next: (res) => {
        if (!res.conectado || res.peso <= 0) {
          this.erroCapturaBalanca = 'Balança não respondeu ou retornou peso inválido. Digite manualmente.';
          this.capturandoPeso = false;
          return;
        }
        const pesoLiquido = Math.max(0, res.peso - this.taraValor);
        this.formPeso.patchValue({ peso: pesoLiquido });
        this.pesoBalancaAtual = pesoLiquido;
        this.pesoCapturadoDaBalanca = true;
        this.capturandoPeso = false;
      },
      error: (err) => {
        this.erroCapturaBalanca =
          err?.error?.message || 'Falha na comunicação com a balança. Digite o peso manualmente.';
        this.capturandoPeso = false;
      },
    });
  }

  // ─── Modo e polling de balança ───────────────────────────────────────────────

  selecionarModoPeso(modo: 'manual' | 'balanca') {
    this.modoEntradaPeso = modo;
    if (modo === 'balanca') {
      this.iniciarPollingPeso();
    } else {
      this.pararPollingPeso();
      setTimeout(() => {
        (document.querySelector('.mp-peso-input') as HTMLInputElement)?.focus();
      }, 80);
    }
  }

  onBalancaSelecionadaChange() {
    if (this.balancaSelecionadaId) {
      localStorage.setItem('fila_balanca_id', this.balancaSelecionadaId);
    }
    this.statusBalancaConf = 'verificando';
    this.pesoBalancaAtual = 0;
    this.taraValor = 0;
    this.pesoAnteriorPoll = null;
    this.limparTimerEstabilidade();
    this.pararPollingPeso();
    if (this.mostrarModalPeso) this.iniciarPollingPeso();
  }

  onBalancaSelecionadaTopbarChange() {
    if (this.balancaSelecionadaId) {
      localStorage.setItem('fila_balanca_id', this.balancaSelecionadaId);
    }
    this.mostrarSeletorBalancaTopbar = false;
  }

  taraBalanca() {
    this.taraValor = this.pesoBalancaAtual;
    this.pesoBalancaAtual = 0;
    this.pesoAnteriorPoll = null;
    this.limparTimerEstabilidade();
  }

  atualizarStatusBalanca() {
    if (!this.balancaSelecionadaId) return;
    this.statusBalancaConf = 'verificando';
    const bal = this.balancas.find(b => b.id === this.balancaSelecionadaId);
    const status$ = bal && this.localScale.isLocal(bal)
      ? this.localScale.lerStatus(bal)
      : this.balancaService.verificarStatus(this.balancaSelecionadaId);
    status$.subscribe({
      next: (res) => this.onStatusAtualizado(res),
      error: () => { this.statusBalancaConf = 'desconectado'; },
    });
  }

  private iniciarPollingPeso() {
    this.pararPollingPeso();
    if (!this.balancaSelecionadaId) return;
    const id = this.balancaSelecionadaId;
    const bal = this.balancas.find(b => b.id === id);
    this.statusBalancaConf = 'verificando';
    const poll$ = bal && this.localScale.isLocal(bal)
      ? interval(600).pipe(switchMap(() => this.localScale.lerStatus(bal)))
      : interval(600).pipe(switchMap(() => this.balancaService.verificarStatus(id)));
    this.pollingPesoSub = poll$.subscribe({
      next: (res: any) => this.onStatusAtualizado(res),
      error: () => { this.statusBalancaConf = 'desconectado'; },
    });
  }

  private pararPollingPeso() {
    this.pollingPesoSub?.unsubscribe();
    this.pollingPesoSub = undefined;
    this.limparTimerEstabilidade();
  }

  private precisaIniciarDriverNoBackend(): boolean {
    const bal = this.balancas.find(b => b.id === this.balancaSelecionadaId);
    if (!bal || this.localScale.isLocal(bal)) return false;
    return bal.tipoComunicacao === 'SERIAL_RS232' || bal.tipoComunicacao === 'SERIAL_USB' || bal.tipoComunicacao === 'TOLEDO_TCP';
  }

  private iniciarOuPollarBalanca() {
    if (!this.balancaSelecionadaId) return;
    this.statusBalancaConf = 'verificando';
    if (this.precisaIniciarDriverNoBackend()) {
      this.balancaService.iniciarLeitura(this.balancaSelecionadaId).subscribe({
        next: () => this.iniciarPollingPeso(),
        error: () => this.iniciarPollingPeso(),
      });
    } else {
      this.iniciarPollingPeso();
    }
  }

  reconectarBalanca() {
    if (!this.balancaSelecionadaId) return;
    this.pararPollingPeso();
    this.iniciarOuPollarBalanca();
  }

  private onStatusAtualizado(res: StatusBalancaResponse) {
    this.statusBalancaConf = res.conectado ? 'conectado' : 'desconectado';

    // Se o peso bruto caiu significativamente abaixo da tara (container removido),
    // reseta a tara automaticamente para não travar o display em 0.
    if (this.taraValor > 0 && res.pesoAtual < this.taraValor - 0.1) {
      this.taraValor = 0;
    }

    const pesoLiquido = Math.max(0, res.pesoAtual - this.taraValor);
    this.pesoBalancaAtual = pesoLiquido;

    if (!this.capturaAutoAtiva || !res.conectado || pesoLiquido < 0.001) {
      if (!this.capturaAutoAtiva) this.limparTimerEstabilidade();
      this.pesoAnteriorPoll = pesoLiquido;
      return;
    }

    const diff = Math.abs(pesoLiquido - (this.pesoAnteriorPoll ?? -1));
    if (diff < 0.005) {
      if (!this.estabilidadeTimer) {
        this.estabilidadeTimer = setTimeout(() => this.autoCapturarPeso(), this.ESTABILIDADE_MS);
      }
    } else {
      this.limparTimerEstabilidade();
    }
    this.pesoAnteriorPoll = pesoLiquido;
  }

  private limparTimerEstabilidade() {
    if (this.estabilidadeTimer) {
      clearTimeout(this.estabilidadeTimer);
      this.estabilidadeTimer = undefined;
    }
  }

  private autoCapturarPeso() {
    this.limparTimerEstabilidade();
    if (this.pesoBalancaAtual < 0.001) return;
    this.formPeso.patchValue({ peso: this.pesoBalancaAtual });
    this.pesoCapturadoDaBalanca = true;
    this.beepCaptura();
    setTimeout(() => this.confirmarPeso(), 80);
  }

  private beepCaptura() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch { /* AudioContext pode ser bloqueado */ }
  }

  salvarDimensoesVolumeLote(volume: any) {
    const payload = {
      numeroConferencia: this.dadosGerais!.numeroConferencia,
      numeroVolume: null,

      alturaAntiga: volume._alturaAntiga ?? volume.altura,
      larguraAntiga: volume._larguraAntiga ?? volume.largura,
      comprimentoAntigo: volume._comprimentoAntigo ?? volume.comprimento,
      pesoAntigo: volume._pesoAntigo ?? volume.peso,

      altura: volume.altura,
      largura: volume.largura,
      comprimento: volume.comprimento,
      peso: volume.peso,
    };

    this.volumeService.postAtualizarDimensoesVolume(payload).subscribe(() => {
      volume._alturaAntiga = volume.altura;
      volume._larguraAntiga = volume.largura;
      volume._comprimentoAntigo = volume.comprimento;
      volume._pesoAntigo = volume.peso;
    });
  }
}
