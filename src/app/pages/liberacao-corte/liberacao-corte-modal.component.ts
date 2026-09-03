import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { FilaConferenciaDTO, LiberacaoPendenteDTO } from '../../services/conferencia/conferencia.model';
import { ConferenciaService } from '../../services/conferencia/conferencia.service';

type Etapa = 'AUTENTICACAO' | 'REVISAO';

// Modal de liberação de corte, em duas etapas:
// 1) autentica usuário/senha do liberador no Sankhya;
// 2) mostra os itens divergentes pendentes, o operador seleciona quais
//    liberar/negar, e a ação roda em lote.
// A senha nunca fica guardada além da chamada em memória — não é persistida
// em lugar nenhum, nem enviada de novo sem o usuário confirmar de novo.
@Component({
  selector: 'app-liberacao-corte-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './liberacao-corte-modal.component.html',
  styleUrls: ['./liberacao-corte-modal.component.scss'],
})
export class LiberacaoCorteModalComponent {
  etapa: Etapa = 'AUTENTICACAO';

  usuario = '';
  senha = '';
  senhaVisivel = false;
  autenticando = false;
  erroAutenticacao: string | null = null;

  liberacoesPendentes: LiberacaoPendenteDTO[] = [];
  sequenciasSelecionadas = new Set<number>();
  carregandoLiberacoes = false;
  obs = '';
  processando = false;
  erroAcao: string | null = null;
  sucessoAcao: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<LiberacaoCorteModalComponent>,
    private conferenciaService: ConferenciaService,
    @Inject(MAT_DIALOG_DATA) public item: FilaConferenciaDTO,
  ) {}

  get podeAvancar(): boolean {
    return !!this.usuario && !!this.senha && !this.autenticando;
  }

  get todosSelecionados(): boolean {
    return this.liberacoesPendentes.length > 0
      && this.sequenciasSelecionadas.size === this.liberacoesPendentes.length;
  }

  toggleSenhaVisivel(): void {
    this.senhaVisivel = !this.senhaVisivel;
  }

  onAvancar(): void {
    if (!this.podeAvancar) return;
    this.erroAutenticacao = null;
    this.autenticando = true;

    this.conferenciaService.postValidarLiberador({ usuario: this.usuario, senha: this.senha })
      .pipe(finalize(() => (this.autenticando = false)))
      .subscribe({
        next: () => {
          this.etapa = 'REVISAO';
          this.carregarLiberacoesPendentes();
        },
        error: (err) => {
          this.erroAutenticacao = err?.error?.message || 'Usuário ou senha inválidos.';
        },
      });
  }

  onVoltar(): void {
    this.etapa = 'AUTENTICACAO';
    this.erroAutenticacao = null;
    this.erroAcao = null;
    this.sucessoAcao = null;
    this.liberacoesPendentes = [];
    this.sequenciasSelecionadas.clear();
  }

  private carregarLiberacoesPendentes(): void {
    if (!this.item.numeroConferencia) return;
    this.carregandoLiberacoes = true;
    this.conferenciaService.getLiberacoesPendentes(this.item.numeroConferencia)
      .pipe(finalize(() => (this.carregandoLiberacoes = false)))
      .subscribe({
        next: (lista) => (this.liberacoesPendentes = lista ?? []),
        error: () => (this.liberacoesPendentes = []),
      });
  }

  isSelecionado(sequencia: number): boolean {
    return this.sequenciasSelecionadas.has(sequencia);
  }

  toggleSelecao(sequencia: number): void {
    if (this.sequenciasSelecionadas.has(sequencia)) {
      this.sequenciasSelecionadas.delete(sequencia);
    } else {
      this.sequenciasSelecionadas.add(sequencia);
    }
  }

  toggleSelecionarTodos(): void {
    this.sequenciasSelecionadas = this.todosSelecionados
      ? new Set()
      : new Set(this.liberacoesPendentes.map((l) => l.sequencia));
  }

  diferencaClass(dif: number | null): string {
    if (dif == null) return '';
    return dif < 0 ? 'lib-modal-dif--corte' : dif > 0 ? 'lib-modal-dif--excesso' : '';
  }

  onLiberarOuNegar(decisao: 'S' | 'N'): void {
    if (!this.item.numeroConferencia || this.sequenciasSelecionadas.size === 0) return;
    this.erroAcao = null;
    this.sucessoAcao = null;
    this.processando = true;

    const sequencias = [...this.sequenciasSelecionadas];

    this.conferenciaService.postLiberarCorte({
      numeroConferencia: this.item.numeroConferencia,
      usuario: this.usuario,
      senha: this.senha,
      liberar: decisao,
      obs: this.obs || undefined,
      sequencias,
    }).pipe(finalize(() => (this.processando = false)))
      .subscribe({
        next: (res) => {
          this.houveAcao = true;
          this.sucessoAcao = decisao === 'S'
            ? `${res.itensProcessados} item(ns) liberado(s) com sucesso.`
            : `${res.itensProcessados} item(ns) negado(s).`;
          this.obs = '';
          const processados = new Set(sequencias);
          this.liberacoesPendentes = this.liberacoesPendentes.filter((l) => !processados.has(l.sequencia));
          this.sequenciasSelecionadas.clear();

          // Nada mais pendente pra essa conferência — fecha sozinho depois
          // de deixar a mensagem de sucesso visível por um instante.
          if (this.liberacoesPendentes.length === 0) {
            setTimeout(() => this.fechar(), 1500);
          }
        },
        error: (err) => {
          this.erroAcao = err?.error?.message || 'Falha ao processar a liberação.';
        },
      });
  }

  private houveAcao = false;

  fechar(): void {
    this.dialogRef.close(this.houveAcao);
  }
}
