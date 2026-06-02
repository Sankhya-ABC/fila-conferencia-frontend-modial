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
}
