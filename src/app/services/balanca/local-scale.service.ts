import { Injectable } from '@angular/core';
import { Observable, from, of, catchError, map } from 'rxjs';
import { BalancaDTO, StatusBalancaResponse } from './balanca.model';

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
 * Fase 2 (futuro) — Agente local:
 *   Para serial RS232/USB e Toledo TCP, um pequeno serviço Windows (Electron/Node.js)
 *   roda na estação e expõe ws://localhost:3099. O método lerPesoViaAgente()
 *   está preparado para essa integração.
 */
@Injectable({ providedIn: 'root' })
export class LocalScaleService {
  /** Porta padrão do agente local para fase 2 (SERIAL / TOLEDO_TCP). */
  static readonly AGENT_WS_PORT = 3099;

  constructor() {}

  /** Retorna true quando a leitura deve acontecer no frontend (não no backend). */
  isLocal(balanca: BalancaDTO): boolean {
    return balanca.tipoComunicacao === 'HTTP' || balanca.tipoComunicacao === 'TOLEDO_TCP';
  }

  /**
   * Lê o peso e status da balança diretamente do browser.
   * - HTTP: chama http://{ip}:{porta}{rota}
   * - TOLEDO_TCP / SERIAL: aguarda agente local (fase 2)
   */
  lerStatus(balanca: BalancaDTO): Observable<StatusBalancaResponse> {
    if (balanca.tipoComunicacao === 'HTTP') {
      return this.lerViaHTTP(balanca);
    }
    // TOLEDO_TCP e SERIAL: agente local (fase 2)
    return this.lerViaAgente(balanca);
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

  // ─── Agente local (fase 2 — SERIAL RS232/USB e Toledo TCP) ──────────────────

  /**
   * Fase 2: conecta ao agente local via WebSocket em ws://localhost:3099.
   * O agente é um serviço Windows leve (Node.js/Electron) instalado na estação
   * que lê a porta serial ou abre socket TCP Toledo e transmite o peso.
   *
   * Protocolo esperado (JSON):
   *   { "tipo": "peso", "valor": 1.234, "estavel": true }
   *   { "tipo": "erro", "mensagem": "Porta COM3 não encontrada" }
   *
   * Por ora retorna desconectado; substitua pela implementação WebSocket quando
   * o agente estiver disponível.
   */
  private lerViaAgente(_balanca: BalancaDTO): Observable<StatusBalancaResponse> {
    return of({ conectado: false, pesoAtual: 0 });
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
