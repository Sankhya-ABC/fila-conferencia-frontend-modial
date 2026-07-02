import { Injectable } from '@angular/core';
import { Observable, Subject, from, of } from 'rxjs';
import { BalancaDTO, StatusBalancaResponse } from './balanca.model';

interface AgenteMsg {
  tipo: 'peso' | 'erro' | 'portas';
  portaCom?: string;
  valor?: number;
  estavel?: boolean;
  mensagem?: string;
  valores?: string[];
}

/**
 * Leitura de balança no lado do cliente.
 *
 * Padrão de mercado para sistemas cloud: o backend nunca alcança uma balança
 * serial/USB/local — ela está fisicamente na estação do operador.
 * Este serviço faz a leitura diretamente do browser, onde localhost = máquina local.
 *
 * Fase 1 — HTTP:
 *   Frontend chama http://{ip}:{porta}{rota} diretamente.
 *   Requer que o servidor HTTP da balança envie header Access-Control-Allow-Origin.
 *
 * Fase 2 — Agente local (SERIAL RS232/USB e Toledo TCP):
 *   Um serviço Windows leve (projeto fila-conferencia-agente-local) roda na
 *   estação do operador, lê a(s) porta(s) COM local(is) e expõe os dados via
 *   ws://localhost:3099. Este serviço mantém uma conexão WebSocket singleton
 *   com o agente e distribui as mensagens por portaCom.
 */
@Injectable({ providedIn: 'root' })
export class LocalScaleService {
  /** Porta padrão do agente local. */
  static readonly AGENT_WS_PORT = 3099;

  private ws: WebSocket | null = null;
  private wsConectando = false;
  private mensagens$ = new Subject<AgenteMsg>();
  private filaEnvio: string[] = [];

  constructor() {}

  /** Retorna true quando a leitura deve acontecer no frontend (não no backend). */
  isLocal(balanca: BalancaDTO): boolean {
    return (
      balanca.tipoComunicacao === 'HTTP' ||
      balanca.tipoComunicacao === 'TOLEDO_TCP' ||
      balanca.tipoComunicacao === 'SERIAL_RS232' ||
      balanca.tipoComunicacao === 'SERIAL_USB'
    );
  }

  /**
   * Lê o peso e status da balança diretamente do browser.
   * - HTTP: chama http://{ip}:{porta}{rota}
   * - TOLEDO_TCP / SERIAL: via agente local (ws://localhost:3099)
   */
  lerStatus(balanca: BalancaDTO): Observable<StatusBalancaResponse> {
    if (balanca.tipoComunicacao === 'HTTP') {
      return this.lerViaHTTP(balanca);
    }
    return this.lerViaAgente(balanca);
  }

  /** Pede ao agente local a lista real de portas COM da máquina do operador. */
  listarPortasAgente(): Observable<string[]> {
    return new Observable<string[]>((subscriber) => {
      const sub = this.mensagens$.subscribe((msg) => {
        if (msg.tipo === 'portas') {
          subscriber.next(msg.valores ?? []);
          subscriber.complete();
        }
      });

      this.enviar({ tipo: 'listar-portas' });

      const timeout = setTimeout(() => {
        subscriber.next([]);
        subscriber.complete();
      }, 2000);

      return () => {
        sub.unsubscribe();
        clearTimeout(timeout);
      };
    });
  }

  // ─── HTTP ────────────────────────────────────────────────────────────────────

  private lerViaHTTP(balanca: BalancaDTO): Observable<StatusBalancaResponse> {
    if (!balanca.ip || !balanca.porta) {
      return of({ conectado: false, pesoAtual: 0 });
    }
    const url = `http://${balanca.ip}:${balanca.porta}${balanca.rota}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    return from(
      fetch(url, { signal: controller.signal })
        .then(r => r.text())
        .then(text => {
          clearTimeout(timer);
          const peso = this.extrairPeso(text);
          return { conectado: peso !== null, pesoAtual: peso ?? 0 } as StatusBalancaResponse;
        })
        .catch(() => {
          clearTimeout(timer);
          return { conectado: false, pesoAtual: 0 } as StatusBalancaResponse;
        })
    );
  }

  // ─── Agente local (SERIAL RS232/USB e Toledo TCP) ────────────────────────────

  /**
   * Conecta (ou reaproveita) o WebSocket singleton com o agente local, inscreve
   * na porta COM da balança e emite StatusBalancaResponse a cada peso/erro
   * recebido para essa porta.
   *
   * Protocolo (JSON):
   *   -> { "tipo": "subscribe", "portaCom": "COM8" }
   *   <- { "tipo": "peso", "portaCom": "COM8", "valor": 1.234, "estavel": true }
   *   <- { "tipo": "erro", "portaCom": "COM8", "mensagem": "Porta COM3 não encontrada" }
   */
  private lerViaAgente(balanca: BalancaDTO): Observable<StatusBalancaResponse> {
    const portaCom = balanca.portaCom;
    if (!portaCom) {
      return of({ conectado: false, pesoAtual: 0 });
    }

    return new Observable<StatusBalancaResponse>((subscriber) => {
      const sub = this.mensagens$.subscribe((msg) => {
        if (msg.portaCom !== portaCom) return;
        if (msg.tipo === 'peso') {
          subscriber.next({ conectado: true, pesoAtual: msg.valor ?? 0 });
        } else if (msg.tipo === 'erro') {
          subscriber.next({ conectado: false, pesoAtual: 0 });
        }
      });

      this.enviar({ tipo: 'subscribe', portaCom });

      // Se o agente não estiver acessível, avisa desconectado após timeout curto.
      const timeout = setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          subscriber.next({ conectado: false, pesoAtual: 0 });
        }
      }, 2000);

      return () => {
        sub.unsubscribe();
        clearTimeout(timeout);
        this.enviar({ tipo: 'unsubscribe', portaCom });
      };
    });
  }

  /** Garante uma conexão WebSocket única com o agente, reconectando se cair. */
  private garantirConexao(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.wsConectando) return;
    this.wsConectando = true;

    const socket = new WebSocket(`ws://localhost:${LocalScaleService.AGENT_WS_PORT}`);
    this.ws = socket;

    socket.onopen = () => {
      this.wsConectando = false;
      while (this.filaEnvio.length) {
        socket.send(this.filaEnvio.shift()!);
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as AgenteMsg;
        this.mensagens$.next(msg);
      } catch {
        // ignora mensagem malformada
      }
    };

    socket.onerror = () => {
      this.wsConectando = false;
    };

    socket.onclose = () => {
      this.wsConectando = false;
      if (this.ws === socket) this.ws = null;
      // reconecta com pequeno atraso — quem ainda tiver interesse (assinantes ativos) vai reenviar o subscribe
      setTimeout(() => {
        if (!this.ws) this.garantirConexao();
      }, 3000);
    };
  }

  private enviar(payload: Record<string, unknown>): void {
    this.garantirConexao();
    const data = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.filaEnvio.push(data);
    }
  }

  // ─── Extração de peso ────────────────────────────────────────────────────────

  private extrairPeso(data: unknown): number | null {
    if (typeof data === 'number') return isNaN(data) ? null : data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return this.extrairPeso(parsed);
      } catch {
        const n = parseFloat((data as string).replace(',', '.'));
        return isNaN(n) ? null : n;
      }
    }
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const val = obj['peso'] ?? obj['value'] ?? obj['weight'] ?? obj['data'];
      return this.extrairPeso(val);
    }
    return null;
  }
}
