import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
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
import { forkJoin, interval, Subscription } from 'rxjs';
import { filter, first, switchMap, timeout } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ArquivoService } from '../../services/arquivo/arquivo.service';
import { AuthService } from '../../services/auth/auth.service';
import { DadosBasicosPedidoDTO } from '../../services/conferencia/conferencia.model';
import { ConferenciaService } from '../../services/conferencia/conferencia.service';
import { ItemPedidoDTO } from '../../services/separacao/separacao.model';
import { SeparacaoService } from '../../services/separacao/separacao.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { VolumeFrontDTO, VolumeItemDTO } from '../../services/volume/volume.model';
import { VolumeService } from '../../services/volume/volume.service';

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
  ],
  templateUrl: './separacao.component.html',
  styleUrl: './separacao.component.scss',
})
export class SeparacaoComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private conferenciaService: ConferenciaService,
    private separacaoService: SeparacaoService,
    private arquivoService: ArquivoService,
    private volumeService: VolumeService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
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
    'quantidadeBase',
    'quantidadeConvertida',
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
    'quantidadeBase',
    'quantidadeConvertida',
    'idMarca',
    'nomeMarca',
    'idFornecedor',
    'nomeFornecedor',
    'controle',
    'complemento',
  ];
  dataSourceConferidos = new MatTableDataSource<ItemPedidoDTO>([]);

  dadosGerais!: DadosBasicosPedidoDTO;
  numeroUnico: number | null = null;
  idUsuario = this.authService.getUser().idUsuario;
  operadorNome = '';
  operadorIniciais = '';

  imagemAtual: string | null = null;

  // volume
  volumes: VolumeFrontDTO[] = [];
  volumeSelecionadoModal: VolumeFrontDTO | null = null;
  volumeExpandido: VolumeFrontDTO | null = null;
  volumesPainelColapsado = false;
  mostrarFormCriacaoLote = false;
  mostrarFormVolumesSimplificado = false;
  mostrarAtalhos = false;
  focusIndexPendentes = -1;
  private _ultimoBarcodeProcessado = '';

  get volumeAtivo(): VolumeFrontDTO | undefined {
    return this.volumes.find(v => v.ativo);
  }

  // form
  formConferencia!: FormGroup;
  formCubagem!: FormGroup;
  formModalVolume!: FormGroup;

  // control
  itemSelecionado: ItemPedidoDTO | null = null;
  ultimoProduto: ItemPedidoDTO | null = null;
  controlesDisponiveis: string[] = [];
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
  private itensDoProdutoAtual: ItemPedidoDTO[] = [];

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

  ngOnInit(): void {
    this.listenScanner();

    this.numeroUnico = Number(this.route.snapshot.paramMap.get('numeroUnico'));

    this.formConferencia = this.fb.group({
      identificador: [''],
      quantidadeConvertida: [null],
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

    if (!this.numeroUnico) return;

    this.inicializarConferencia();

    const user = this.authService.getUser();
    this.operadorNome = (user?.nome || '').split(' ').slice(0, 2).join(' ');
    this.operadorIniciais = (user?.nome || '')
      .split(' ').slice(0, 2)
      .map((w: string) => w[0]).join('').toUpperCase();
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.listenScanner);
    this.sessaoProntaSub?.unsubscribe();
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
    this.onBlurQuantidadeConvertida();

    if (!this.itemSelecionado || this.quantidadeConvertidaCtrl?.invalid) return;

    const valor = Number(this.quantidadeConvertidaCtrl?.value);
    if (!valor || valor <= 0) return;

    const max = Number(this.itemSelecionado.quantidadeConvertida);
    if (valor > max) {
      this.playSound('invalido');
      this.mostrarToast(`Quantidade ${valor} excede o pendente de ${max}.`, 'aviso');
      return;
    }

    const controleForm = this.normalizarControle(
      this.formConferencia.get('controle')?.value ?? '',
    );
    const controleItem = this.normalizarControle(this.itemSelecionado.controle ?? '');

    if (controleForm !== controleItem) {
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
          this.dadosGerais.numeroConferencia = res.numeroConferencia;
          this.preparandoSessao = true;

          // Polling leve (só banco local, sem Sankhya) até a sessão estar pronta
          this.sessaoProntaSub = interval(1000).pipe(
            switchMap(() => this.conferenciaService.getSessaoPronta(this.numeroUnico!)),
            filter((r) => r.pronta),
            first(),
            timeout(60000),
          ).subscribe({
            next: () => {
              this.preparandoSessao = false;
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
        const chave = (i: { idProduto: number; controle?: string }) =>
          `${i.idProduto}#${i.controle ?? ''}`;

        const mapConferidos = new Map<string, number>();
        itensConferidos.forEach((i) => {
          const k = chave(i);
          mapConferidos.set(k, (mapConferidos.get(k) || 0) + Number(i.quantidadeConvertida));
        });

        const pedidosAtualizados: ItemPedidoDTO[] = [];
        const conferidos: ItemPedidoDTO[] = [];

        itensPedido.forEach((item) => {
          const qtdConferida = mapConferidos.get(chave(item)) || 0;
          if (qtdConferida > 0) {
            const fator = item.quantidadeBase / item.quantidadeConvertida;
            const qtdBaseConferida = Number((qtdConferida * fator).toFixed(5));
            conferidos.push({ ...item, quantidadeConvertida: qtdConferida, quantidadeBase: qtdBaseConferida });
            const restanteConvertido = Number((item.quantidadeConvertida - qtdConferida).toFixed(5));
            const restanteBase = Number((item.quantidadeBase - qtdBaseConferida).toFixed(5));
            if (restanteConvertido > 0) {
              pedidosAtualizados.push({ ...item, quantidadeConvertida: restanteConvertido, quantidadeBase: restanteBase });
            }
          } else {
            pedidosAtualizados.push(item);
          }
        });

        // Reconstruir parciais: itens com quantidade já conferida mas ainda pendentes
        pedidosAtualizados.forEach(item => {
          if (mapConferidos.has(this.chaveItem(item))) {
            this.itensParciaisChaves.add(this.chaveItem(item));
          }
        });

        this.dataSourcePedidos.data = pedidosAtualizados;
        this.dataSourceConferidos.data = conferidos;

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
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  carregarItensPedido(numeroUnico: number) {
    this.separacaoService.getItensPedido(numeroUnico).subscribe({
      next: (itens) => (this.dataSourcePedidos.data = itens),
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
          mapConferidos.set(k, atual + Number(i.quantidadeConvertida));
        });

        const pedidosAtualizados: ItemPedidoDTO[] = [];
        const conferidos: ItemPedidoDTO[] = [];

        this.dataSourcePedidos.data.forEach((item) => {
          const qtdConferida = mapConferidos.get(chave(item)) || 0;

          if (qtdConferida > 0) {
            const fator = item.quantidadeBase / item.quantidadeConvertida;

            const qtdBaseConferida = Number((qtdConferida * fator).toFixed(5));

            conferidos.push({
              ...item,
              quantidadeConvertida: qtdConferida,
              quantidadeBase: qtdBaseConferida,
            });

            const restanteConvertido = Number(
              (item.quantidadeConvertida - qtdConferida).toFixed(5),
            );

            const restanteBase = Number(
              (item.quantidadeBase - qtdBaseConferida).toFixed(5),
            );

            if (restanteConvertido > 0) {
              pedidosAtualizados.push({
                ...item,
                quantidadeConvertida: restanteConvertido,
                quantidadeBase: restanteBase,
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

  get quantidadeConvertidaCtrl() {
    return this.formConferencia.get('quantidadeConvertida');
  }

  get produtoAtualExibido(): ItemPedidoDTO | null {
    return this.itemSelecionado ?? this.ultimoProduto;
  }

  get conferenciaFinalizada(): boolean {
    return this.dataSourcePedidos.data.length === 0;
  }

  get todosItensNosVolumes(): boolean {
    if (!this.conferenciaFinalizada) return false;

    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;

    const itensVolumes = new Map<string, number>();

    this.volumes.forEach((v) => {
      v.itens.forEach((i) => {
        const k = chave(i);
        itensVolumes.set(
          k,
          (itensVolumes.get(k) || 0) + i.quantidadeConvertida,
        );
      });
    });

    return this.dataSourceConferidos.data.every((i) => {
      return itensVolumes.get(chave(i)) === i.quantidadeConvertida;
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
    if (!this.conferenciaFinalizada) return false;

    if (this.isVolumesDetalhados()) {
      return this.todosItensNosVolumes && this.todosVolumesComDimensoes;
    }

    if (this.isVolumesSimplificadoTela()) {
      return true;
    }

    if (this.isVolumesSimplificadoFinal()) {
      return true;
    }

    return true;
  }

  // acoes
  finalizarConferencia() {
    if (this.isVolumesSimplificadoFinal()) {
      this.abrirModalVolumesSimplificado();
      return;
    }

    this.conferenciaService
      .postFinalizarConferencia({
        numeroConferencia: this.dadosGerais.numeroConferencia!,
      })
      .subscribe({
        next: () => this.abrirModalConferenciaFinalizada(),
      });
  }

  private finalizarConferenciaAposVolumes() {
    this.conferenciaService
      .postFinalizarConferencia({
        numeroConferencia: this.dadosGerais.numeroConferencia!,
      })
      .subscribe({
        next: () => this.abrirModalConferenciaFinalizada(),
      });
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
      this.focarCampoQuantidade();
      return;
    }

    // Controle não existe na sessão: usa fallback para manter itemSelecionado
    // e reaplica o valor escolhido para não sobrescrever o select
    const fallback = this.dataSourcePedidos.data.find((i) => i.idProduto === idProduto);
    if (!fallback) return;

    this.itensDoProdutoAtual = [];
    this.selecionarItem(fallback);
    this.formConferencia.patchValue({ controle }, { emitEvent: false });
    this.focarCampoQuantidade();
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
      this.quantidadeConvertidaCtrl?.setErrors(null);
    } else {
      this.onBlurQuantidadeConvertida();
    }
  }

  isItemParcial(item: ItemPedidoDTO): boolean {
    return this.itensParciaisChaves.has(this.chaveItem(item));
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
    this.onBlurQuantidadeConvertida();
    if (!this.itemSelecionado || !this.quantidadeConvertidaCtrl?.value || this.quantidadeConvertidaCtrl?.invalid) {
      this.playSound('invalido');
      this.focarCampoQuantidade();
      return;
    }
    this.onSubmitConferencia();
  }

  private focarSelectControle() {
    setTimeout(() => {
      this.selectControleRef?.focus();
    }, 50);
  }

  private prepararSelecaoItem(
    itensDoProduto: ItemPedidoDTO[],
    controlePreferido?: string,
  ) {
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
      this.focarCampoQuantidade();
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
      this.focarCampoQuantidade();
      return;
    }

    // Produto usa controles: sempre exige seleção manual pelo operador
    this.itensDoProdutoAtual = itensDoProduto;
    this.imagemAtual = itensDoProduto[0]?.imagem || null;
    this.formConferencia.patchValue({ controle: '' });
    this.produtoIdentificado = true;
    this.playSound('atencao');
    this.controleRequerAtencao = true;
    this.focarSelectControle();
    setTimeout(() => { this.controleRequerAtencao = false; }, 2500);
  }

  onDevolverItemConferido(item: ItemPedidoDTO) {
    if (this.devolvendoEmAndamento) return;
    this.devolvendoEmAndamento = true;

    this.separacaoService
      .postDevolverItemConferido({
        numeroConferencia: this.dadosGerais.numeroConferencia!,
        numeroUnico: this.numeroUnico!,
        idProduto: item.idProduto,
        controle: item.controle ?? '',
      })
      .subscribe({
        next: () => this.devolverItemOtimista(item),
        error: (err) => console.error(err),
        complete: () => { this.devolvendoEmAndamento = false; },
      });
  }

  private devolverItemOtimista(item: ItemPedidoDTO) {
    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;
    const k = chave(item);
    this.itensParciaisChaves.delete(k);

    // Remove dos conferidos
    const conferidos = this.dataSourceConferidos.data.filter((i) => chave(i) !== k);

    // Devolve aos pendentes (acumula se já existe parcial)
    const existente = this.dataSourcePedidos.data.find((i) => chave(i) === k);
    const pedidos = existente
      ? this.dataSourcePedidos.data.map((i) =>
          chave(i) === k
            ? { ...i, quantidadeConvertida: i.quantidadeConvertida + item.quantidadeConvertida, quantidadeBase: i.quantidadeBase + item.quantidadeBase }
            : i,
        )
      : [...this.dataSourcePedidos.data, { ...item }];

    this.dataSourceConferidos.data = conferidos;
    this.dataSourcePedidos.data = pedidos;

    // Remove do volume local se detalhado
    if (this.isVolumesDetalhados()) {
      this.volumes.forEach((v) => {
        v.itens = v.itens.filter((i) => `${i.idProduto}#${i.controle ?? ''}` !== k);
      });
    }
  }

  salvarDimensoes(volume: VolumeFrontDTO) {
    this.volumeService
      .postAtualizarDimensoesVolume({
        numeroConferencia: this.dadosGerais.numeroConferencia!,
        numeroVolume: volume.numeroVolume,
        largura: volume.largura,
        comprimento: volume.comprimento,
        altura: volume.altura,
        peso: volume.peso,
      })
      .subscribe();
  }

  onBlurQuantidadeConvertida() {
    const ctrl = this.quantidadeConvertidaCtrl;
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

  adicionarItemAoVolume(item: ItemPedidoDTO, quantidadeConvertida: number) {
    this.garantirVolumeAtivo();

    const ativo = this.volumeAtivo;
    if (!ativo) return;

    const existente = ativo.itens.find((i) => this.mesmaChaveItem(i, item));

    if (existente) {
      existente.quantidadeConvertida += quantidadeConvertida;
    } else {
      ativo.itens.push({
        idProduto: item.idProduto,
        descricaoProduto: item.nomeProduto,
        imagem: item.imagem || null,
        quantidadeConvertida,
        quantidadeBase: item.quantidadeBase,
        unidade: item.unidade,
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
        numeroConferencia: this.dadosGerais.numeroConferencia!,
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
      qtdDisponivel: item.quantidadeConvertida,
      qtdMover: item.quantidadeConvertida,
    };
  }

  iniciarMoverItemOrfao(item: ItemPedidoDTO) {
    this.itemMovendo = {
      idProduto: item.idProduto,
      controle: item.controle ?? '',
      seqVolOrigem: undefined,
      descricaoProduto: item.nomeProduto,
      qtdDisponivel: item.quantidadeConvertida,
      qtdMover: item.quantidadeConvertida,
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
      numeroConferencia: this.dadosGerais.numeroConferencia!,
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

        const fator = itemOrigem.quantidadeBase / itemOrigem.quantidadeConvertida;

        // Atualiza origem
        if (moverTudo) {
          volOrigem.itens = volOrigem.itens.filter((i) => `${i.idProduto}|${i.controle ?? ''}` !== chave);
        } else {
          itemOrigem.quantidadeConvertida = Number((itemOrigem.quantidadeConvertida - qtdMover).toFixed(5));
          itemOrigem.quantidadeBase = Number((itemOrigem.quantidadeConvertida * fator).toFixed(5));
        }

        // Atualiza destino
        const existente = volDest.itens.find((i) => `${i.idProduto}|${i.controle ?? ''}` === chave);
        if (existente) {
          existente.quantidadeConvertida += qtdMover;
          existente.quantidadeBase += Number((qtdMover * fator).toFixed(5));
        } else {
          volDest.itens.push({ ...itemOrigem, quantidadeConvertida: qtdMover, quantidadeBase: Number((qtdMover * fator).toFixed(5)) });
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

    const quantidadeConvertida = Number(this.quantidadeConvertidaCtrl?.value);
    if (!quantidadeConvertida || quantidadeConvertida <= 0) return;

    this.conferindoEmAndamento = true;
    this.itemConferindoGhost = { ...this.itemSelecionado };
    const item = { ...this.itemSelecionado };

    this.separacaoService
      .postItemConferidoVolume({
        numeroConferencia: this.dadosGerais.numeroConferencia!,
        numeroVolume: this.volumeAtivo?.numeroVolume || 1,
        idProduto: item.idProduto,
        controle: item.controle ?? '',
        quantidadeConvertida,
        unidade: this.codvolAtual || item.unidade,
      })
      .subscribe({
        next: () => {
          this.playSound('ok');
          this.ultimoProduto = { ...item };
          this.imagemAtual = this.ultimoProduto.imagem || null;
          this.limparFormulario();
          this.aplicarConferenciaOtimista(item, quantidadeConvertida);
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

  private aplicarConferenciaOtimista(item: ItemPedidoDTO, quantidadeConvertida: number) {
    const chave = (i: { idProduto: number; controle?: string }) =>
      `${i.idProduto}#${i.controle ?? ''}`;
    const k = chave(item);

    const fator = item.quantidadeBase / item.quantidadeConvertida;
    const qtdBaseConferida = Number((quantidadeConvertida * fator).toFixed(5));

    // Remove ou reduz o item dos pendentes
    const pedidosAtualizados = this.dataSourcePedidos.data
      .map((i) => {
        if (chave(i) !== k) return i;
        const restante = Number((i.quantidadeConvertida - quantidadeConvertida).toFixed(5));
        const restanteBase = Number((i.quantidadeBase - qtdBaseConferida).toFixed(5));
        return restante > 0 ? { ...i, quantidadeConvertida: restante, quantidadeBase: restanteBase } : null;
      })
      .filter((i): i is ItemPedidoDTO => i !== null);

    // Acumula no conferidos
    const existente = this.dataSourceConferidos.data.find((i) => chave(i) === k);
    const conferidos = existente
      ? this.dataSourceConferidos.data.map((i) =>
          chave(i) === k
            ? { ...i, quantidadeConvertida: i.quantidadeConvertida + quantidadeConvertida, quantidadeBase: i.quantidadeBase + qtdBaseConferida }
            : i,
        )
      : [...this.dataSourceConferidos.data, { ...item, quantidadeConvertida, quantidadeBase: qtdBaseConferida }];

    // Rastrear parciais: se o item ainda restou, é conferido parcial
    if (pedidosAtualizados.some(i => chave(i) === k)) {
      this.itensParciaisChaves.add(k);
    }

    this.dataSourcePedidos.data = pedidosAtualizados;
    this.dataSourceConferidos.data = conferidos;

    if (this.isVolumesDetalhados()) {
      this.adicionarItemAoVolume(item, quantidadeConvertida);
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
    this.produtoIdentificado = false;
    this._ultimoBarcodeProcessado = '';
    this.controleVeioDoScanner = false;
    this.controleRequerAtencao = false;
    this.itemConferindoGhost = null;

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

  imprimirEtiquetas() {
    const numeroConferencia = this.dadosGerais.numeroConferencia!;

    this.arquivoService.downloadEtiqueta(numeroConferencia).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `etiquetas_conferencia_${numeroConferencia}.pdf`;
        a.click();

        window.URL.revokeObjectURL(url);

        this.dialogRefConferenciaFinalizada?.close();
        this.router.navigate(['/fila-conferencia']);
      },
      error: (err) => {
        console.error('Erro ao baixar etiquetas', err);
      },
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

  trackByItem(_: number, i: ItemPedidoDTO): number {
    return i.idProduto;
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
           this.dadosGerais.formacaoVolumes === 'N';
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
    const values = [
      this.quantidadeCubagemCtrl?.value,
      this.larguraCubagemCtrl?.value,
      this.comprimentoCubagemCtrl?.value,
      this.alturaCubagemCtrl?.value,
      this.pesoCubagemCtrl?.value,
    ];

    return values.some((v) => !v || Number(v) <= 0);
  }

  gerarVolumesLote() {
    if (!this.formCubagem.valid) return;

    const payload = {
      numeroConferencia: this.dadosGerais.numeroConferencia,
      quantidadeLote: this.formCubagem.value.quantidade,
      altura: this.formCubagem.value.altura,
      largura: this.formCubagem.value.largura,
      comprimento: this.formCubagem.value.comprimento,
      peso: this.formCubagem.value.peso,
    };

    this.volumeService.gerarVolumesLote(payload).subscribe(() => {
      this.carregarVolumes(this.dadosGerais.numeroConferencia);
      this.formCubagem.reset();
      this.fecharModalCriarVolumes();
    });
  }

  deletarVolumeLote(volume: any) {
    const payload = {
      numeroConferencia: this.dadosGerais.numeroConferencia,
      altura: volume.altura,
      largura: volume.largura,
      comprimento: volume.comprimento,
      peso: volume.peso,
    };

    this.volumeService.deletarVolumesLote(payload).subscribe(() => {
      this.carregarVolumes(this.dadosGerais.numeroConferencia);
    });
  }

  abrirModalVolumesSimplificado() {
    this.formCubagem.reset();
    this.mostrarFormVolumesSimplificado = true;
  }

  fecharModalVolumesSimplificado() {
    this.mostrarFormVolumesSimplificado = false;
  }

  salvarVolumesSimplificado() {
    if (this.isGerarVolumeLoteDisabled()) return;

    this.volumeService.postAtualizarDimensoesVolume({
      numeroConferencia: this.dadosGerais.numeroConferencia!,
      numeroVolume: null,
      largura: this.formCubagem.value.largura,
      comprimento: this.formCubagem.value.comprimento,
      altura: this.formCubagem.value.altura,
      peso: this.formCubagem.value.peso,
      qtdVol: this.formCubagem.value.quantidade,
    }).subscribe({
      next: () => {
        this.fecharModalVolumesSimplificado();
        if (this.isVolumesSimplificadoFinal()) {
          this.finalizarConferenciaAposVolumes();
        }
      },
      error: (err) => console.error(err),
    });
  }

  salvarDimensoesVolumeLote(volume: any) {
    const payload = {
      numeroConferencia: this.dadosGerais.numeroConferencia,
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
