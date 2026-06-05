import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ArquivoService } from '../../services/arquivo/arquivo.service';
import { FilaConferenciaDTO } from '../../services/conferencia/conferencia.model';
import { ConferenciaService } from '../../services/conferencia/conferencia.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-impressao-etiquetas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
  ],
  templateUrl: './impressao-etiquetas.component.html',
  styleUrl: './impressao-etiquetas.component.scss',
})
export class ImpressaoEtiquetasComponent implements OnInit {
  filters!: FormGroup;
  items: FilaConferenciaDTO[] = [];
  carregando = false;
  imprimindo: number | null = null;
  filtroAberto = false;

  constructor(
    private fb: FormBuilder,
    private conferenciaService: ConferenciaService,
    private arquivoService: ArquivoService,
    private authService: AuthService,
  ) {}

  get nomeUsuario(): string {
    return this.authService.getUser()?.nome?.split(' ').slice(0, 2).join(' ') || '';
  }

  get iniciaisUsuario(): string {
    return (this.authService.getUser()?.nome || '')
      .split(' ').slice(0, 2)
      .map((w: string) => w[0]).join('').toUpperCase();
  }

  get temFiltroAtivo(): boolean {
    const v = this.filters?.value;
    return !!(v?.numeroUnico?.trim() || v?.numeroModial?.trim() || v?.numeroNota?.trim());
  }

  ngOnInit(): void {
    this.filters = this.fb.group({
      numeroUnico:  [''],
      numeroModial: [''],
      numeroNota:   [''],
    });

    this.filters.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.buscar());

    this.buscar();
  }

  buscar(): void {
    this.carregando = true;
    const v = this.filters.value;

    const params: any = { codigoStatus: 'F', perPage: 100, page: 0 };
    if (v.numeroUnico?.trim())  params.numeroUnico  = v.numeroUnico.trim();
    if (v.numeroModial?.trim()) params.numeroModial = v.numeroModial.trim();
    if (v.numeroNota?.trim())   params.numeroNota   = v.numeroNota.trim();

    this.conferenciaService.getFilaConferencias(params).pipe(
      finalize(() => (this.carregando = false)),
    ).subscribe({
      next: (resp: any) => {
        this.items = Array.isArray(resp) ? resp : (resp?.data ?? resp?.content ?? resp?.items ?? []);
      },
      error: () => (this.items = []),
    });
  }

  limpar(): void {
    this.filters.reset({ numeroUnico: '', numeroModial: '', numeroNota: '' });
  }

  imprimir(item: FilaConferenciaDTO): void {
    this.imprimindo = item.numeroConferencia;
    this.arquivoService.imprimirEtiqueta(item.numeroConferencia).pipe(
      finalize(() => (this.imprimindo = null)),
    ).subscribe({ error: (err) => console.error('Erro ao imprimir', err) });
  }

  displayDate(date: string | null | undefined): string {
    if (!date) return '—';
    if (/^\d{8}$/.test(date)) {
      return `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4, 8)}`;
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? date : d.toLocaleDateString('pt-BR');
  }
}
