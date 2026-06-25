import { Injectable, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SessaoService } from '../sessao/sessao.service';

@Injectable({ providedIn: 'root' })
export class HeartbeatService implements OnDestroy {
  private sub?: Subscription;
  private numeroConferencia?: number;

  constructor(
    private auth: AuthService,
    private sessao: SessaoService,
  ) {
    this.iniciar();
  }

  private iniciar() {
    this.enviar();
    this.sub = interval(120000).subscribe(() => this.enviar());
  }

  private enviar() {
    if (!this.auth.isAuthenticated()) return;
    this.sessao.heartbeat({ numeroConferencia: this.numeroConferencia }).subscribe();
  }

  setSeparando(numeroConferencia: number) {
    this.numeroConferencia = numeroConferencia;
    this.enviar();
  }

  clearSeparando() {
    this.numeroConferencia = undefined;
    this.enviar();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
