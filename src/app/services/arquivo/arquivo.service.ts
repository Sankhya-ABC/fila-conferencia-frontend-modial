import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ArquivoService {
  constructor(private http: HttpClient) {}

  downloadEtiqueta(numeroConferencia: number) {
    return this.http.get(`/arquivos/etiqueta/download`, {
      params: { numeroConferencia },
      responseType: 'blob',
    });
  }

  imprimirEtiqueta(numeroConferencia: number): Observable<void> {
    return new Observable((observer) => {
      this.downloadEtiqueta(numeroConferencia).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const w = window.open(url, '_blank');

          if (w) {
            let printed = false;
            const doPrint = () => {
              if (!printed) {
                printed = true;
                w.print();
              }
            };
            w.addEventListener('load', doPrint);
            setTimeout(doPrint, 2000);
          }

          setTimeout(() => URL.revokeObjectURL(url), 60000);
          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  getProdutoImagem(idProduto: number): Observable<{ imagem: string }> {
    return this.http.get<{ imagem: string }>(`/produto/${idProduto}/imagem`);
  }

  downloadMapaSeparacao(numeroUnico: number, tipo: 'PESAVEL' | 'NAO_PESAVEL') {
    return this.http.get(`/arquivos/mapa-separacao/download`, {
      params: { numeroUnico, tipo },
      responseType: 'blob',
    });
  }

  // A geração do PDF (puppeteer) pode levar vários segundos. Se a aba só é aberta
  // depois que a resposta chega, o navegador não reconhece mais como resultado direto
  // do clique do usuário e bloqueia o popup — de forma inconsistente. Por isso a aba
  // é aberta em branco de forma síncrona (no clique) e recebe o PDF depois, via `janela`.
  imprimirMapaSeparacao(
    numeroUnico: number,
    tipo: 'PESAVEL' | 'NAO_PESAVEL',
    janela: Window | null,
  ): Observable<void> {
    return new Observable((observer) => {
      this.downloadMapaSeparacao(numeroUnico, tipo).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const w = janela && !janela.closed ? janela : window.open(url, '_blank');

          if (w) {
            let printed = false;
            const doPrint = () => {
              if (!printed) {
                printed = true;
                w.print();
              }
            };
            w.addEventListener('load', doPrint);
            setTimeout(doPrint, 2000);
            w.location.href = url;
          }

          setTimeout(() => URL.revokeObjectURL(url), 60000);
          observer.next();
          observer.complete();
        },
        error: (err) => {
          janela?.close();
          observer.error(err);
        },
      });
    });
  }
}
